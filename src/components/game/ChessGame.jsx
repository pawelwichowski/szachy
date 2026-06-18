import { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import {
  createGameEvent,
  createInitialGameState,
  formatHistoryMove,
  getColorLabel,
  getGameStatus,
  normalizeGameState,
} from '../../domain/chess';
import ConfirmDialog from '../common/ConfirmDialog';
import ChessBoard from './ChessBoard';
import GameSidebar from './GameSidebar';
import PromotionDialog from './PromotionDialog';

export default function ChessGame({ mode, room, playerColor, gameState, onGameStateChange, onBackToLobby, onReturnHome }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [draggedSquare, setDraggedSquare] = useState(null);
  const [viewedMoveIndex, setViewedMoveIndex] = useState(null);
  const [promotionRequest, setPromotionRequest] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [dismissedEventId, setDismissedEventId] = useState(null);

  const state = normalizeGameState(gameState);
  const game = useMemo(() => new Chess(state.fen), [state.fen]);
  const history = state.history;
  const liveStatus = getGameStatus(game, state.result);
  const isHistoryPreview = viewedMoveIndex !== null;
  const isPlayerTurn = mode === 'local' || game.turn() === playerColor;
  const interactionLocked = isHistoryPreview || liveStatus.ended || !isPlayerTurn;
  const actionColor = mode === 'local' ? game.turn() : playerColor;
  const boardOrientation = mode === 'room' ? playerColor : 'w';

  const displayedGame = useMemo(() => {
    if (!isHistoryPreview) {
      return game;
    }

    return new Chess(history[viewedMoveIndex].fen);
  }, [game, history, isHistoryPreview, viewedMoveIndex]);

  const boardIndexes = useMemo(
    () => Array.from({ length: 64 }, (_, visualIndex) => (boardOrientation === 'b' ? 63 - visualIndex : visualIndex)),
    [boardOrientation],
  );

  const legalTargets = useMemo(() => {
    if (!selectedSquare || interactionLocked) {
      return [];
    }

    return game.moves({ square: selectedSquare, verbose: true }).map((move) => move.to);
  }, [game, interactionLocked, selectedSquare]);

  const displayedMove = isHistoryPreview ? history[viewedMoveIndex] : history[history.length - 1];
  const activeEvent = state.lastEvent?.id === dismissedEventId ? null : state.lastEvent;
  const drawWasDeclined = mode === 'room' && activeEvent?.type === 'draw-declined' && activeEvent.actor !== actionColor;
  const canRespondToDraw = mode === 'room' && Boolean(state.drawOffer && state.drawOffer !== actionColor && !liveStatus.ended);
  const canOfferDraw = mode === 'room' && !liveStatus.ended && !state.drawOffer;

  useEffect(() => {
    setSelectedSquare(null);
    setDraggedSquare(null);
    setPromotionRequest(null);
  }, [state.fen]);

  function clearSelection() {
    setSelectedSquare(null);
    setDraggedSquare(null);
  }

  function replaceGameState(partialState) {
    onGameStateChange({ ...state, ...partialState });
  }

  function startNewLocalGame() {
    setViewedMoveIndex(null);
    setPromotionRequest(null);
    setDismissedEventId(null);
    clearSelection();
    onGameStateChange(createInitialGameState());
  }

  function completeMove({ from, to, promotion }) {
    if (interactionLocked) {
      return;
    }

    const nextGame = new Chess(game.fen());

    try {
      const move = nextGame.move({ from, to, promotion });
      if (!move) {
        return;
      }

      const ply = history.length + 1;
      const nextEntry = {
        id: `${ply}-${move.from}-${move.to}-${move.san}`,
        ply,
        moveNumber: Math.ceil(ply / 2),
        color: move.color,
        san: move.san,
        from: move.from,
        to: move.to,
        fen: nextGame.fen(),
      };

      const drawDeclinedByMove = mode === 'room' && state.drawOffer && state.drawOffer !== move.color;

      setViewedMoveIndex(null);
      setPromotionRequest(null);
      clearSelection();
      onGameStateChange({
        ...state,
        fen: nextGame.fen(),
        history: [...history, nextEntry],
        drawOffer: drawDeclinedByMove ? null : state.drawOffer,
        lastEvent: drawDeclinedByMove ? createGameEvent('draw-declined', move.color) : null,
      });
    } catch {
      clearSelection();
    }
  }

  function requestMove(from, to) {
    const movingPiece = game.get(from);
    if (!movingPiece || movingPiece.color !== game.turn() || from === to || interactionLocked) {
      return;
    }

    const reachesPromotionRank = movingPiece.type === 'p' && (to.endsWith('1') || to.endsWith('8'));
    if (reachesPromotionRank) {
      setPromotionRequest({ from, to, color: movingPiece.color });
      return;
    }

    completeMove({ from, to });
  }

  function handleSquareClick(square) {
    if (interactionLocked) {
      return;
    }

    const piece = game.get(square);

    if (!selectedSquare) {
      if (piece?.color === game.turn()) {
        setSelectedSquare(square);
      }
      return;
    }

    if (square === selectedSquare) {
      clearSelection();
      return;
    }

    if (piece?.color === game.turn()) {
      setSelectedSquare(square);
      return;
    }

    requestMove(selectedSquare, square);
  }

  function handleDragStart(event, square) {
    const piece = game.get(square);
    if (interactionLocked || !piece || piece.color !== game.turn()) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', square);
    setDraggedSquare(square);
    setSelectedSquare(square);
  }

  function handleDrop(event, targetSquare) {
    event.preventDefault();
    if (interactionLocked) {
      return;
    }

    const sourceSquare = draggedSquare || event.dataTransfer.getData('text/plain');
    if (sourceSquare && sourceSquare !== targetSquare) {
      requestMove(sourceSquare, targetSquare);
    }

    setDraggedSquare(null);
  }

  function offerDraw() {
    if (canOfferDraw) {
      replaceGameState({ drawOffer: actionColor, lastEvent: null });
    }
  }

  function acceptDraw() {
    replaceGameState({
      drawOffer: null,
      result: { type: 'agreed-draw' },
      lastEvent: null,
    });
  }

  function declineDraw() {
    replaceGameState({
      drawOffer: null,
      lastEvent: createGameEvent('draw-declined', actionColor),
    });
  }

  function resignGame() {
    if (liveStatus.ended) {
      return;
    }

    replaceGameState({
      drawOffer: null,
      lastEvent: null,
      result: {
        type: 'resignation',
        resignedBy: actionColor,
        winner: actionColor === 'w' ? 'b' : 'w',
      },
    });
    setPendingAction(null);
  }

  function returnToHomeFromGame() {
    setPendingAction(null);
    onReturnHome({
      shouldNotifyOpponent: mode === 'room' && !liveStatus.ended,
      gameState: state,
      playerColor: actionColor,
    });
  }

  const whiteName = mode === 'local' ? 'Gracz biały' : playerColor === 'w' ? 'Ty — białe' : 'Gracz biały';
  const blackName = mode === 'local' ? 'Gracz czarny' : playerColor === 'b' ? 'Ty — czarne' : 'Gracz czarny';
  const gameModeLabel = mode === 'local' ? 'Gra lokalna' : `Pokój ${room.code}`;

  return (
    <main className="app-shell">
      <header className="topbar game-topbar">
        <div>
          <p className="eyebrow">{gameModeLabel.toUpperCase()}</p>
          <h1>Szachy online</h1>
        </div>
        <div className="game-topbar-actions">
          {mode === 'room' && <span className="room-code-pill">Kod: {room.code}</span>}
          {mode === 'room' && (
            <button type="button" className="text-button" onClick={onBackToLobby}>
              ← Pokój
            </button>
          )}
          <button type="button" className="text-button" onClick={() => setPendingAction('menu')}>
            Menu główne
          </button>
        </div>
      </header>

      <section className="game-layout" aria-label="Widok partii szachowej">
        <div className="board-section">
          <div className={`player-row player-row-black ${game.turn() === 'b' && !liveStatus.ended ? 'player-active' : ''}`}>
            <span className="player-avatar">♚</span>
            <div>
              <strong>{blackName}</strong>
              <p>{game.turn() === 'b' && !liveStatus.ended ? 'Wykonuje ruch' : 'Czeka na ruch'}</p>
            </div>
            <span className="clock">10:00</span>
          </div>

          {isHistoryPreview && (
            <div className="history-preview-banner" role="status">
              <div>
                <strong>Podgląd pozycji po ruchu: {formatHistoryMove(history[viewedMoveIndex])}</strong>
                <span>Plansza jest tylko do odczytu.</span>
              </div>
              <button type="button" onClick={() => setViewedMoveIndex(null)}>
                Wróć do bieżącej pozycji
              </button>
            </div>
          )}

          <ChessBoard
            displayedGame={displayedGame}
            game={game}
            boardIndexes={boardIndexes}
            selectedSquare={selectedSquare}
            legalTargets={legalTargets}
            displayedMove={displayedMove}
            isHistoryPreview={isHistoryPreview}
            interactionLocked={interactionLocked}
            onSquareClick={handleSquareClick}
            onDragStart={handleDragStart}
            onDragEnd={() => setDraggedSquare(null)}
            onDrop={handleDrop}
          />

          <div className={`player-row player-row-white ${game.turn() === 'w' && !liveStatus.ended ? 'player-active' : ''}`}>
            <span className="player-avatar">♔</span>
            <div>
              <strong>{whiteName}</strong>
              <p>{game.turn() === 'w' && !liveStatus.ended ? 'Wykonuje ruch' : 'Czeka na ruch'}</p>
            </div>
            <span className="clock">10:00</span>
          </div>
        </div>

        <GameSidebar
          mode={mode}
          liveStatus={liveStatus}
          isHistoryPreview={isHistoryPreview}
          viewedMoveEntry={history[viewedMoveIndex]}
          isPlayerTurn={isPlayerTurn}
          selectedSquare={selectedSquare}
          drawOffer={state.drawOffer}
          canRespondToDraw={canRespondToDraw}
          canOfferDraw={canOfferDraw}
          drawWasDeclined={drawWasDeclined}
          activeEvent={activeEvent}
          history={history}
          viewedMoveIndex={viewedMoveIndex}
          onDismissEvent={setDismissedEventId}
          onAcceptDraw={acceptDraw}
          onDeclineDraw={declineDraw}
          onShowHistoryPosition={setViewedMoveIndex}
          onOfferDraw={offerDraw}
          onResign={() => setPendingAction('resign')}
          onStartNewGame={startNewLocalGame}
        />
      </section>

      <PromotionDialog
        promotionRequest={promotionRequest}
        onChoose={completeMove}
        onCancel={() => setPromotionRequest(null)}
      />

      {pendingAction === 'resign' && (
        <ConfirmDialog
          title="Czy na pewno chcesz się poddać?"
          description="Partia zostanie od razu zakończona, a zwycięstwo otrzyma przeciwnik."
          confirmLabel="Poddaj partię"
          onConfirm={resignGame}
          onCancel={() => setPendingAction(null)}
        />
      )}

      {pendingAction === 'menu' && (
        <ConfirmDialog
          title="Wrócić do menu głównego?"
          description={mode === 'room'
            ? 'Opuścisz bieżący pokój w tej karcie. Drugi gracz zostanie poinformowany, że opuściłeś partię.'
            : 'Bieżąca lokalna partia zostanie zamknięta.'}
          confirmLabel="Wróć do menu"
          confirmClassName="primary-action"
          onConfirm={returnToHomeFromGame}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </main>
  );
}
