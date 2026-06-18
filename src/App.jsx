import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import './lobby.css';
import './stage35.css';
import './stage36.css';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ROOM_STORAGE_PREFIX = 'szachy:room:';
const SESSION_STORAGE_KEY = 'szachy:session';
const CHANNEL_NAME = 'szachy:rooms';

const pieceSymbols = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

const pieceNames = {
  k: 'król',
  q: 'hetman',
  r: 'wieża',
  b: 'goniec',
  n: 'skoczek',
  p: 'pion',
};

const promotionChoices = ['q', 'r', 'b', 'n'];

function createInitialGameState() {
  return {
    fen: new Chess().fen(),
    history: [],
    drawOffer: null,
    result: null,
    lastEvent: null,
  };
}

function normalizeGameState(state) {
  const initialState = createInitialGameState();

  return {
    fen: state?.fen || initialState.fen,
    history: Array.isArray(state?.history) ? state.history : [],
    drawOffer: state?.drawOffer || null,
    result: state?.result || null,
    lastEvent: state?.lastEvent || null,
  };
}

function normalizeRoom(room) {
  if (!room) {
    return null;
  }

  const hostColor = room.hostColor === 'b' ? 'b' : 'w';

  return {
    ...room,
    hostColor,
    whitePlayer: typeof room.whitePlayer === 'boolean' ? room.whitePlayer : hostColor === 'w',
    blackPlayer: typeof room.blackPlayer === 'boolean' ? room.blackPlayer : hostColor === 'b',
    state: normalizeGameState(room.state),
  };
}

function getSquareName(index) {
  const row = Math.floor(index / 8);
  const column = index % 8;
  return `${files[column]}${8 - row}`;
}

function getColorLabel(color) {
  return color === 'w' ? 'Białe' : 'Czarne';
}

function getPieceLabel(piece) {
  return `${getColorLabel(piece.color)}: ${pieceNames[piece.type]}`;
}

function normalizeRoomCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint32Array(6);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

function getRandomColor() {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % 2 === 0 ? 'w' : 'b';
}

function getRoomStorageKey(code) {
  return `${ROOM_STORAGE_PREFIX}${code}`;
}

function readRoom(code) {
  if (!code) {
    return null;
  }

  try {
    const rawRoom = window.localStorage.getItem(getRoomStorageKey(code));
    return rawRoom ? normalizeRoom(JSON.parse(rawRoom)) : null;
  } catch {
    return null;
  }
}

function loadSession() {
  try {
    const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

function createEvent(type, actor) {
  return {
    id: `${type}-${actor}-${Date.now()}`,
    type,
    actor,
  };
}

function getGameStatus(game, result = null) {
  if (result?.type === 'resignation') {
    return {
      title: `Poddanie — wygrywają ${getColorLabel(result.winner)}`,
      description: `${getColorLabel(result.resignedBy)} poddały partię.`,
      ended: true,
    };
  }

  if (result?.type === 'agreed-draw') {
    return {
      title: 'Remis uzgodniony',
      description: 'Obaj gracze zgodzili się zakończyć partię remisem.',
      ended: true,
    };
  }

  if (result?.type === 'opponent-left') {
    return {
      title: 'Przeciwnik opuścił partię',
      description: `Gracz po stronie ${getColorLabel(result.leftBy).toLowerCase()} opuścił pokój. Aktualna pozycja została zachowana.`,
      ended: true,
    };
  }

  const sideToMove = getColorLabel(game.turn());

  if (game.isCheckmate()) {
    const winner = getColorLabel(game.turn() === 'w' ? 'b' : 'w');
    return {
      title: `Mat — wygrywają ${winner}`,
      description: `Król strony ${sideToMove.toLowerCase()} jest w szachu i nie ma legalnego ruchu.`,
      ended: true,
    };
  }

  if (game.isStalemate()) {
    return {
      title: 'Pat — remis',
      description: `Strona ${sideToMove.toLowerCase()} nie ma legalnego ruchu, ale jej król nie jest szachowany.`,
      ended: true,
    };
  }

  if (game.isDraw()) {
    return {
      title: 'Remis',
      description: 'Partia zakończyła się remisem zgodnie z zasadami szachowymi.',
      ended: true,
    };
  }

  if (game.isCheck()) {
    return {
      title: `Szach — ${sideToMove}`,
      description: 'Musisz wykonać ruch, po którym własny król nie pozostanie w szachu.',
      ended: false,
    };
  }

  return {
    title: `${sideToMove} na ruchu`,
    description: 'Wybierz figurę. Podświetlone pola oznaczają tylko legalne ruchy.',
    ended: false,
  };
}

function formatHistoryMove(entry) {
  return entry.color === 'w' ? `${entry.moveNumber}. ${entry.san}` : `${entry.moveNumber}... ${entry.san}`;
}

function ConfirmDialog({ title, description, confirmLabel, confirmClassName = 'danger-action', onConfirm, onCancel }) {
  return (
    <div className="action-backdrop" role="presentation">
      <section className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title">
        <p className="panel-label">POTWIERDZENIE</p>
        <h2 id="action-dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={onCancel}>
            Anuluj
          </button>
          <button type="button" className={confirmClassName} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function CreateRoomDialog({ selectedColor, onColorChange, onCreate, onCancel }) {
  return (
    <div className="action-backdrop" role="presentation">
      <section className="action-dialog create-room-dialog" role="dialog" aria-modal="true" aria-labelledby="create-room-title">
        <p className="panel-label">NOWY PRYWATNY POKÓJ</p>
        <h2 id="create-room-title">Wybierz kolor</h2>
        <p>Twoje figury będą ustawione na dole planszy. Drugi gracz automatycznie otrzyma przeciwny kolor.</p>

        <div className="color-options" role="radiogroup" aria-label="Kolor gospodarza pokoju">
          <button
            className={`color-choice ${selectedColor === 'w' ? 'color-choice-selected' : ''}`}
            type="button"
            role="radio"
            aria-checked={selectedColor === 'w'}
            onClick={() => onColorChange('w')}
          >
            <span className="choice-piece choice-piece-white">♔</span>
            <strong>Białe</strong>
            <small>Zaczynasz partię</small>
          </button>
          <button
            className={`color-choice ${selectedColor === 'b' ? 'color-choice-selected' : ''}`}
            type="button"
            role="radio"
            aria-checked={selectedColor === 'b'}
            onClick={() => onColorChange('b')}
          >
            <span className="choice-piece choice-piece-black">♚</span>
            <strong>Czarne</strong>
            <small>Drugi gracz zaczyna</small>
          </button>
          <button
            className={`color-choice ${selectedColor === 'random' ? 'color-choice-selected' : ''}`}
            type="button"
            role="radio"
            aria-checked={selectedColor === 'random'}
            onClick={() => onColorChange('random')}
          >
            <span className="choice-piece">?</span>
            <strong>Losowo</strong>
            <small>Kolor zostanie wylosowany</small>
          </button>
        </div>

        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={onCancel}>
            Anuluj
          </button>
          <button type="button" className="primary-action" onClick={onCreate}>
            Utwórz pokój
          </button>
        </div>
      </section>
    </div>
  );
}

function HomeScreen({ joinCode, onJoinCodeChange, onOpenCreateRoom, onJoinRoom, onStartLocalGame, joinError }) {
  function handleSubmit(event) {
    event.preventDefault();
    onJoinRoom();
  }

  return (
    <main className="lobby-shell">
      <header className="landing-header">
        <div className="brand-mark" aria-hidden="true">♞</div>
        <div>
          <p className="eyebrow">PROJEKT · APLIKACJE INTERNETOWE</p>
          <h1>Szachy online</h1>
        </div>
        <span className="stage-badge">Etap 3.6: komunikaty pokojów</span>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="hero-kicker">ZAGRAJ OD RAZU</p>
          <h2>Wybierz sposób rozpoczęcia partii</h2>
          <p>
            Możesz zagrać na jednym urządzeniu albo utworzyć prywatny pokój, wybrać kolor i przekazać kod
            przeciwnikowi.
          </p>
        </div>
        <div className="hero-board-preview" aria-hidden="true">
          <span>♜</span><span>♞</span><span>♝</span><span>♛</span>
          <span>♟</span><span>♟</span><span>♟</span><span>♟</span>
          <span>♙</span><span>♙</span><span>♙</span><span>♙</span>
          <span>♖</span><span>♘</span><span>♗</span><span>♕</span>
        </div>
      </section>

      <section className="lobby-actions" aria-label="Opcje rozpoczęcia gry">
        <article className="lobby-card lobby-card-featured">
          <span className="lobby-card-icon">♔</span>
          <h2>Gra lokalna</h2>
          <p>Dwóch graczy wykonuje ruchy naprzemiennie na tej samej planszy i tym samym urządzeniu.</p>
          <button type="button" className="primary-action" onClick={onStartLocalGame}>
            Rozpocznij grę lokalną
          </button>
        </article>

        <article className="lobby-card">
          <span className="lobby-card-icon">＋</span>
          <h2>Utwórz prywatny pokój</h2>
          <p>Wybierz białe, czarne albo losowy kolor. Otrzymasz sześcioliterowy kod oraz link.</p>
          <button type="button" className="secondary-action" onClick={onOpenCreateRoom}>
            Utwórz pokój
          </button>
        </article>

        <article className="lobby-card">
          <span className="lobby-card-icon">⌁</span>
          <h2>Dołącz kodem</h2>
          <p>Wpisz kod utworzony przez drugiego gracza, aby otrzymać wolny kolor w pokoju.</p>
          <form className="join-form" onSubmit={handleSubmit}>
            <label htmlFor="room-code">Kod pokoju</label>
            <input
              id="room-code"
              value={joinCode}
              onChange={(event) => onJoinCodeChange(normalizeRoomCode(event.target.value))}
              placeholder="NP. A7K9QP"
              maxLength="6"
              autoComplete="off"
            />
            {joinError && <p className="form-error" role="alert">{joinError}</p>}
            <button type="submit" className="secondary-action">
              Dołącz do pokoju
            </button>
          </form>
        </article>
      </section>

      <p className="front-end-note">
        W tej wersji pokoje synchronizują pozycję między kartami tej samej przeglądarki. W kolejnym etapie ich
        działanie między różnymi urządzeniami przejmie serwer Flask i WebSocket.
      </p>
    </main>
  );
}

function RoomLobby({ room, playerColor, onCopyCode, onCopyLink, copiedMessage, onContinue, onLeaveRoom }) {
  const isWaiting = room.status === 'waiting';
  const roomLink = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
  const whiteOccupied = room.whitePlayer;
  const blackOccupied = room.blackPlayer;

  function playerDescription(color, occupied) {
    if (playerColor === color) {
      return 'Ty';
    }

    return occupied ? 'Drugi gracz' : 'Oczekuje na gracza';
  }

  return (
    <main className="lobby-shell room-lobby-shell">
      <header className="landing-header">
        <div className="brand-mark" aria-hidden="true">♞</div>
        <div>
          <p className="eyebrow">PRYWATNA ROZGRYWKA</p>
          <h1>Pokój {room.code}</h1>
        </div>
        <button type="button" className="text-button" onClick={onLeaveRoom}>
          Menu główne
        </button>
      </header>

      <section className="room-status-panel">
        <div className={`room-status-icon ${isWaiting ? 'room-status-waiting' : 'room-status-ready'}`} aria-hidden="true">
          {isWaiting ? '…' : '✓'}
        </div>
        <div>
          <p className="hero-kicker">{isWaiting ? 'OCZEKIWANIE NA GRACZA' : 'OBA MIEJSCA SĄ ZAJĘTE'}</p>
          <h2>
            {isWaiting
              ? 'Przekaż kod drugiemu graczowi'
              : room.status === 'completed'
                ? 'Partia została zakończona'
                : 'Partia jest gotowa do kontynuowania'}
          </h2>
          <p>
            {isWaiting
              ? 'Gdy drugi gracz dołączy, aplikacja automatycznie przejdzie do planszy.'
              : `Grasz po stronie: ${getColorLabel(playerColor)}. Twoje figury będą na dole planszy.`}
          </p>
        </div>
      </section>

      <section className="room-details-grid">
        <article className="room-code-card">
          <p className="panel-label">KOD POKOJU</p>
          <output>{room.code}</output>
          <button type="button" className="secondary-action" onClick={onCopyCode}>
            Skopiuj kod
          </button>
        </article>

        <article className="room-link-card">
          <p className="panel-label">LINK DO POKOJU</p>
          <p className="room-link-preview">{roomLink}</p>
          <button type="button" className="secondary-action" onClick={onCopyLink}>
            Skopiuj link
          </button>
        </article>
      </section>

      {copiedMessage && <p className="copy-notice" role="status">{copiedMessage}</p>}

      <section className="room-players-card">
        <div className="room-player room-player-white">
          <span>♔</span>
          <div>
            <strong>Białe</strong>
            <small>{playerDescription('w', whiteOccupied)}</small>
          </div>
          <em className={whiteOccupied ? 'player-ready' : 'player-waiting'}>{whiteOccupied ? 'Gotowy' : 'Oczekuje'}</em>
        </div>
        <div className="room-player room-player-black">
          <span>♚</span>
          <div>
            <strong>Czarne</strong>
            <small>{playerDescription('b', blackOccupied)}</small>
          </div>
          <em className={blackOccupied ? 'player-ready' : 'player-waiting'}>{blackOccupied ? 'Gotowy' : 'Oczekuje'}</em>
        </div>
      </section>

      {!isWaiting && (
        <button type="button" className="primary-action continue-button" onClick={onContinue}>
          {room.status === 'completed' ? 'Zobacz zakończoną partię' : 'Przejdź do gry'}
        </button>
      )}

      {isWaiting && (
        <p className="front-end-note">
          Aby przetestować synchronizację, otwórz skopiowany link w nowej karcie tej samej przeglądarki i dołącz do
          pokoju. Kolor otrzymasz automatycznie.
        </p>
      )}
    </main>
  );
}

function ChessGame({ mode, room, playerColor, gameState, onGameStateChange, onBackToLobby, onReturnHome }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [draggedSquare, setDraggedSquare] = useState(null);
  const [viewedMoveIndex, setViewedMoveIndex] = useState(null);
  const [promotionRequest, setPromotionRequest] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [dismissedEventId, setDismissedEventId] = useState(null);

  const state = normalizeGameState(gameState);
  const game = useMemo(() => new Chess(state.fen), [state.fen]);
  const history = state.history;
  const result = state.result;
  const drawOffer = state.drawOffer;
  const isHistoryPreview = viewedMoveIndex !== null;
  const displayedGame = useMemo(() => {
    if (!isHistoryPreview) {
      return game;
    }

    return new Chess(history[viewedMoveIndex].fen);
  }, [game, history, isHistoryPreview, viewedMoveIndex]);

  const displayedMove = isHistoryPreview ? history[viewedMoveIndex] : history[history.length - 1];
  const liveStatus = getGameStatus(game, result);
  const isPlayerTurn = mode === 'local' || game.turn() === playerColor;
  const interactionLocked = isHistoryPreview || liveStatus.ended || !isPlayerTurn;
  const actionColor = mode === 'local' ? game.turn() : playerColor;
  const canRespondToDraw = mode === 'room' && Boolean(drawOffer && drawOffer !== actionColor && !liveStatus.ended);
  const canOfferDraw = mode === 'room' && !liveStatus.ended && !drawOffer;
  const boardOrientation = mode === 'room' ? playerColor : 'w';
  const activeEvent = state.lastEvent?.id === dismissedEventId ? null : state.lastEvent;
  const drawWasDeclined = mode === 'room' && activeEvent?.type === 'draw-declined' && activeEvent.actor !== actionColor;

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

  function startNewGame() {
    if (mode !== 'local') {
      return;
    }

    setViewedMoveIndex(null);
    setPromotionRequest(null);
    setDismissedEventId(null);
    clearSelection();
    onGameStateChange(createInitialGameState());
  }

  function selectSquare(square) {
    if (interactionLocked) {
      return;
    }

    const piece = game.get(square);
    if (piece?.color === game.turn()) {
      setSelectedSquare(square);
    }
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

      const declinedByMove = mode === 'room' && drawOffer && drawOffer !== move.color;
      const nextEvent = declinedByMove ? createEvent('draw-declined', move.color) : null;

      setViewedMoveIndex(null);
      setPromotionRequest(null);
      clearSelection();
      onGameStateChange({
        ...state,
        fen: nextGame.fen(),
        history: [...history, nextEntry],
        drawOffer: declinedByMove ? null : drawOffer,
        lastEvent: nextEvent,
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
      selectSquare(square);
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

  function showHistoryPosition(index) {
    setViewedMoveIndex(index);
    setPromotionRequest(null);
    clearSelection();
  }

  function returnToLivePosition() {
    setViewedMoveIndex(null);
    clearSelection();
  }

  function offerDraw() {
    if (!canOfferDraw) {
      return;
    }

    replaceGameState({ drawOffer: actionColor, lastEvent: null });
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
      lastEvent: createEvent('draw-declined', actionColor),
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
  const offeredByLabel = drawOffer ? getColorLabel(drawOffer).toLowerCase() : '';

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
              <button type="button" onClick={returnToLivePosition}>Wróć do bieżącej pozycji</button>
            </div>
          )}

          <div className="board-frame">
            <div className={`chessboard ${interactionLocked ? 'chessboard-readonly' : ''}`} role="grid" aria-label="Szachownica">
              {boardIndexes.map((index, visualIndex) => {
                const visualRow = Math.floor(visualIndex / 8);
                const visualColumn = visualIndex % 8;
                const boardRow = Math.floor(index / 8);
                const boardColumn = index % 8;
                const square = getSquareName(index);
                const piece = displayedGame.get(square);
                const isLightSquare = (boardRow + boardColumn) % 2 === 0;
                const isSelected = !isHistoryPreview && selectedSquare === square;
                const isLegalTarget = !isHistoryPreview && legalTargets.includes(square);
                const isCaptureTarget = isLegalTarget && Boolean(game.get(square));
                const isLastMove = displayedMove?.from === square || displayedMove?.to === square;

                return (
                  <button
                    className={`square ${isLightSquare ? 'square-light' : 'square-dark'} ${isSelected ? 'square-selected' : ''} ${
                      isLastMove ? 'square-last-move' : ''
                    } ${isLegalTarget ? 'square-legal' : ''} ${isCaptureTarget ? 'square-legal-capture' : ''}`}
                    key={square}
                    type="button"
                    role="gridcell"
                    aria-label={piece ? `${square}, ${getPieceLabel(piece)}` : `${square}, puste pole`}
                    onClick={() => handleSquareClick(square)}
                    onDragOver={(event) => {
                      if (!interactionLocked) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={(event) => handleDrop(event, square)}
                  >
                    {visualColumn === 0 && <span className="rank-label">{square[1]}</span>}
                    {visualRow === 7 && <span className="file-label">{square[0]}</span>}
                    {piece && (
                      <span
                        className={`piece piece-${piece.color === 'w' ? 'white' : 'black'}`}
                        draggable={!interactionLocked && piece.color === game.turn()}
                        onDragStart={(event) => handleDragStart(event, square)}
                        onDragEnd={() => setDraggedSquare(null)}
                        aria-hidden="true"
                      >
                        {pieceSymbols[piece.color][piece.type]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`player-row player-row-white ${game.turn() === 'w' && !liveStatus.ended ? 'player-active' : ''}`}>
            <span className="player-avatar">♔</span>
            <div>
              <strong>{whiteName}</strong>
              <p>{game.turn() === 'w' && !liveStatus.ended ? 'Wykonuje ruch' : 'Czeka na ruch'}</p>
            </div>
            <span className="clock">10:00</span>
          </div>
        </div>

        <aside className="game-panel">
          <section className={`turn-card ${liveStatus.ended ? 'turn-card-ended' : ''}`}>
            <p className="panel-label">{isHistoryPreview ? 'PODGLĄD HISTORII' : 'STATUS PARTII'}</p>
            <h2>{isHistoryPreview ? `Po ruchu ${formatHistoryMove(history[viewedMoveIndex])}` : liveStatus.title}</h2>
            <p>
              {isHistoryPreview
                ? 'Kliknij „Wróć do bieżącej pozycji”, aby dalej grać.'
                : !isPlayerTurn && !liveStatus.ended
                  ? 'Teraz ruch wykonuje drugi gracz. Po aktualizacji pozycji plansza odblokuje się automatycznie.'
                  : selectedSquare
                    ? `Wybrano ${selectedSquare}. Podświetlone pola są legalnymi celami.`
                    : liveStatus.description}
            </p>
          </section>

          {drawWasDeclined && (
            <section className="game-event-card" aria-live="polite">
              <div>
                <p className="panel-label">OFERTA REMISU</p>
                <h2>Przeciwnik odrzucił ofertę remisu</h2>
                <p>Partia trwa dalej.</p>
              </div>
              <button type="button" onClick={() => setDismissedEventId(activeEvent.id)} aria-label="Zamknij komunikat">
                ×
              </button>
            </section>
          )}

          {canRespondToDraw && (
            <section className="draw-offer-card" aria-live="polite">
              <p className="panel-label">OFERTA REMISU</p>
              <h2>{getColorLabel(drawOffer)} proponują remis</h2>
              <p>Zaakceptowanie oferty zakończy partię remisem.</p>
              <div className="draw-offer-actions">
                <button type="button" className="secondary-action" onClick={declineDraw}>Odrzuć</button>
                <button type="button" className="primary-action" onClick={acceptDraw}>Akceptuj remis</button>
              </div>
            </section>
          )}

          {mode === 'room' && drawOffer && !canRespondToDraw && !liveStatus.ended && (
            <section className="draw-offer-card draw-offer-sent" aria-live="polite">
              <p className="panel-label">OFERTA REMISU</p>
              <h2>Oferta została wysłana</h2>
              <p>Oczekujesz na decyzję gracza po stronie {offeredByLabel}.</p>
            </section>
          )}

          <section className="moves-card">
            <div className="card-heading">
              <h2>Historia ruchów</h2>
              <span>{history.length}</span>
            </div>
            {history.length === 0 ? (
              <p className="empty-moves">Pierwszy ruch jeszcze nie został wykonany.</p>
            ) : (
              <ol className="move-list">
                {history.map((entry, index) => (
                  <li key={entry.id}>
                    <button
                      className={`move-button ${viewedMoveIndex === index ? 'move-button-active' : ''}`}
                      type="button"
                      onClick={() => showHistoryPosition(index)}
                      aria-pressed={viewedMoveIndex === index}
                    >
                      <span>{entry.ply}.</span>
                      {formatHistoryMove(entry)}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {mode === 'room' && (
            <section className="game-actions-card">
              <p className="panel-label">DZIAŁANIA W PARTII</p>
              <button className="secondary-action" type="button" onClick={offerDraw} disabled={!canOfferDraw}>
                {drawOffer === actionColor ? 'Oferta remisu wysłana' : 'Zaproponuj remis'}
              </button>
              <button className="danger-action" type="button" onClick={() => setPendingAction('resign')} disabled={liveStatus.ended}>
                Poddaj partię
              </button>
            </section>
          )}

          {mode === 'local' && (
            <button className="reset-button" type="button" onClick={startNewGame}>
              Rozpocznij nową partię
            </button>
          )}

          <p className="demo-note">
            Zasady ruchów, szach, mat, pat, roszada, bicie w przelocie i promocja pionka są sprawdzane przez
            silnik reguł szachowych. Kliknięcie ruchu w historii pokazuje pozycję dokładnie po tym ruchu.
          </p>
        </aside>
      </section>

      {promotionRequest && (
        <div className="promotion-backdrop" role="presentation">
          <section className="promotion-dialog" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
            <p className="panel-label">PROMOCJA PIONKA</p>
            <h2 id="promotion-title">Wybierz figurę</h2>
            <p>Pion dotarł do ostatniego rzędu. Wybierz figurę, w którą ma zostać zamieniony.</p>
            <div className="promotion-options">
              {promotionChoices.map((pieceType) => (
                <button
                  key={pieceType}
                  type="button"
                  onClick={() => completeMove({ ...promotionRequest, promotion: pieceType })}
                  aria-label={`Promuj na ${pieceNames[pieceType]}`}
                >
                  {pieceSymbols[promotionRequest.color][pieceType]}
                </button>
              ))}
            </div>
            <button className="promotion-cancel" type="button" onClick={() => setPromotionRequest(null)}>Anuluj ruch</button>
          </section>
        </div>
      )}

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
          description={mode === 'room' ? 'Opuścisz bieżący pokój w tej karcie. Drugi gracz zostanie poinformowany, że opuściłeś partię.' : 'Bieżąca lokalna partia zostanie zamknięta.'}
          confirmLabel="Wróć do menu"
          confirmClassName="primary-action"
          onConfirm={returnToHomeFromGame}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </main>
  );
}

export default function App() {
  const roomFromUrl = normalizeRoomCode(new URLSearchParams(window.location.search).get('room') || '');
  const initialSession = roomFromUrl ? null : loadSession();
  const initialRoom = initialSession?.code ? readRoom(initialSession.code) : null;

  const [session, setSession] = useState(initialRoom ? initialSession : null);
  const [room, setRoom] = useState(initialRoom);
  const [screen, setScreen] = useState(initialRoom ? (initialRoom.status === 'waiting' ? 'lobby' : 'game') : 'home');
  const [localGameState, setLocalGameState] = useState(createInitialGameState);
  const [joinCode, setJoinCode] = useState(roomFromUrl);
  const [joinError, setJoinError] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [selectedHostColor, setSelectedHostColor] = useState('w');
  const channelRef = useRef(null);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    function refreshRoom(code) {
      if (session?.code !== code) {
        return;
      }

      const updatedRoom = readRoom(code);
      if (updatedRoom) {
        setRoom(updatedRoom);
      }
    }

    function handleStorage(event) {
      if (event.key === getRoomStorageKey(session?.code)) {
        refreshRoom(session.code);
      }
    }

    channel.onmessage = (event) => {
      if (event.data?.type === 'room-updated') {
        refreshRoom(event.data.code);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      channel.close();
      channelRef.current = null;
    };
  }, [session]);

  useEffect(() => {
    if (room?.status === 'active' && screen === 'lobby') {
      setScreen('game');
    }
  }, [room?.status, screen]);

  function saveSession(nextSession) {
    setSession(nextSession);

    try {
      if (nextSession) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Brak sessionStorage nie blokuje gry lokalnej ani bieżącej sesji pokoju.
    }
  }

  function persistRoom(nextRoom) {
    const normalizedRoom = normalizeRoom(nextRoom);

    try {
      window.localStorage.setItem(getRoomStorageKey(normalizedRoom.code), JSON.stringify(normalizedRoom));
      channelRef.current?.postMessage({ type: 'room-updated', code: normalizedRoom.code });
    } catch {
      // Stan nadal pozostaje widoczny w bieżącej karcie.
    }

    setRoom(normalizedRoom);
  }

  function createRoom() {
    let code = generateRoomCode();
    while (readRoom(code)) {
      code = generateRoomCode();
    }

    const hostColor = selectedHostColor === 'random' ? getRandomColor() : selectedHostColor;
    const nextRoom = {
      code,
      status: 'waiting',
      hostColor,
      whitePlayer: hostColor === 'w',
      blackPlayer: hostColor === 'b',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: createInitialGameState(),
    };

    saveSession({ code, color: hostColor });
    persistRoom(nextRoom);
    setCopiedMessage('');
    setCreateRoomOpen(false);
    setScreen('lobby');
  }

  function joinRoom() {
    const code = normalizeRoomCode(joinCode);
    setJoinError('');

    if (code.length !== 6) {
      setJoinError('Kod pokoju musi mieć dokładnie 6 znaków.');
      return;
    }

    const foundRoom = readRoom(code);
    if (!foundRoom) {
      setJoinError('Nie znaleziono pokoju o takim kodzie.');
      return;
    }

    if (foundRoom.status === 'completed') {
      setJoinError('Ta partia została już zakończona.');
      return;
    }

    const guestColor = foundRoom.hostColor === 'w' ? 'b' : 'w';
    const guestSpotTaken = guestColor === 'w' ? foundRoom.whitePlayer : foundRoom.blackPlayer;
    if (guestSpotTaken) {
      setJoinError('Ten pokój jest już pełny.');
      return;
    }

    const joinedRoom = {
      ...foundRoom,
      status: 'active',
      whitePlayer: guestColor === 'w' ? true : foundRoom.whitePlayer,
      blackPlayer: guestColor === 'b' ? true : foundRoom.blackPlayer,
      updatedAt: new Date().toISOString(),
    };

    saveSession({ code, color: guestColor });
    persistRoom(joinedRoom);
    setScreen('game');
  }

  function startLocalGame() {
    saveSession(null);
    setRoom(null);
    setLocalGameState(createInitialGameState());
    setScreen('game');
  }

  function updateRoomGameState(nextState) {
    if (!room) {
      return;
    }

    const normalizedState = normalizeGameState(nextState);
    const nextGame = new Chess(normalizedState.fen);
    const nextRoom = {
      ...room,
      status: getGameStatus(nextGame, normalizedState.result).ended ? 'completed' : 'active',
      updatedAt: new Date().toISOString(),
      state: normalizedState,
    };

    persistRoom(nextRoom);
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(message);
    } catch {
      setCopiedMessage('Nie udało się skopiować automatycznie. Zaznacz tekst ręcznie.');
    }
  }

  function returnToHome({ shouldNotifyOpponent = false, gameState = null, playerColor = null } = {}) {
    if (shouldNotifyOpponent && room && gameState && playerColor) {
      const nextState = normalizeGameState({
        ...gameState,
        drawOffer: null,
        lastEvent: null,
        result: { type: 'opponent-left', leftBy: playerColor },
      });

      persistRoom({
        ...room,
        status: 'completed',
        updatedAt: new Date().toISOString(),
        state: nextState,
      });
    }

    saveSession(null);
    setRoom(null);
    setScreen('home');
    setCopiedMessage('');
    setJoinError('');
  }

  if (screen === 'home') {
    return (
      <>
        <HomeScreen
          joinCode={joinCode}
          onJoinCodeChange={(nextCode) => {
            setJoinCode(nextCode);
            setJoinError('');
          }}
          onOpenCreateRoom={() => setCreateRoomOpen(true)}
          onJoinRoom={joinRoom}
          onStartLocalGame={startLocalGame}
          joinError={joinError}
        />
        {createRoomOpen && (
          <CreateRoomDialog
            selectedColor={selectedHostColor}
            onColorChange={setSelectedHostColor}
            onCreate={createRoom}
            onCancel={() => setCreateRoomOpen(false)}
          />
        )}
      </>
    );
  }

  if (screen === 'lobby' && room && session) {
    return (
      <RoomLobby
        room={room}
        playerColor={session.color}
        onCopyCode={() => copyText(room.code, 'Kod pokoju skopiowano do schowka.')}
        onCopyLink={() => copyText(`${window.location.origin}${window.location.pathname}?room=${room.code}`, 'Link do pokoju skopiowano do schowka.')}
        copiedMessage={copiedMessage}
        onContinue={() => setScreen('game')}
        onLeaveRoom={returnToHome}
      />
    );
  }

  const isRoomGame = Boolean(room && session);

  return (
    <ChessGame
      mode={isRoomGame ? 'room' : 'local'}
      room={room}
      playerColor={session?.color}
      gameState={isRoomGame ? room.state : localGameState}
      onGameStateChange={isRoomGame ? updateRoomGameState : setLocalGameState}
      onBackToLobby={() => {
        if (isRoomGame) {
          setScreen('lobby');
        }
      }}
      onReturnHome={returnToHome}
    />
  );
}
