import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const pieceSymbols = {
  w: {
    k: '♔',
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘',
    p: '♙',
  },
  b: {
    k: '♚',
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞',
    p: '♟',
  },
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

function isGameFinished(game) {
  return game.isCheckmate() || game.isDraw();
}

function getGameStatus(game) {
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

export default function App() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [draggedSquare, setDraggedSquare] = useState(null);
  const [history, setHistory] = useState([]);
  const [viewedMoveIndex, setViewedMoveIndex] = useState(null);
  const [promotionRequest, setPromotionRequest] = useState(null);

  const isHistoryPreview = viewedMoveIndex !== null;
  const displayedGame = useMemo(() => {
    if (!isHistoryPreview) {
      return game;
    }

    return new Chess(history[viewedMoveIndex].fen);
  }, [game, history, isHistoryPreview, viewedMoveIndex]);

  const displayedMove = isHistoryPreview ? history[viewedMoveIndex] : history.at(-1);
  const liveStatus = getGameStatus(game);
  const interactionLocked = isHistoryPreview || isGameFinished(game);

  const legalTargets = useMemo(() => {
    if (!selectedSquare || interactionLocked) {
      return [];
    }

    return game.moves({ square: selectedSquare, verbose: true }).map((move) => move.to);
  }, [game, interactionLocked, selectedSquare]);

  function clearSelection() {
    setSelectedSquare(null);
    setDraggedSquare(null);
  }

  function resetGame() {
    setGame(new Chess());
    setHistory([]);
    setViewedMoveIndex(null);
    setPromotionRequest(null);
    clearSelection();
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

      setGame(nextGame);
      setHistory((previousHistory) => [...previousHistory, nextEntry]);
      setViewedMoveIndex(null);
      setPromotionRequest(null);
      clearSelection();
    } catch {
      // chess.js odrzuca nielegalny ruch. Nie zmieniamy wtedy stanu aplikacji.
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PROJEKT · APLIKACJE INTERNETOWE</p>
          <h1>Szachy online</h1>
        </div>
        <span className="stage-badge">Etap 2: legalne ruchy i mat</span>
      </header>

      <section className="game-layout" aria-label="Widok partii szachowej">
        <div className="board-section">
          <div className={`player-row player-row-black ${game.turn() === 'b' && !liveStatus.ended ? 'player-active' : ''}`}>
            <span className="player-avatar">♚</span>
            <div>
              <strong>Gracz czarny</strong>
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
              <button type="button" onClick={returnToLivePosition}>
                Wróć do bieżącej pozycji
              </button>
            </div>
          )}

          <div className="board-frame">
            <div className={`chessboard ${interactionLocked ? 'chessboard-readonly' : ''}`} role="grid" aria-label="Szachownica">
              {Array.from({ length: 64 }, (_, index) => {
                const row = Math.floor(index / 8);
                const column = index % 8;
                const square = getSquareName(index);
                const piece = displayedGame.get(square);
                const isLightSquare = (row + column) % 2 === 0;
                const isSelected = !isHistoryPreview && selectedSquare === square;
                const isLegalTarget = !isHistoryPreview && legalTargets.includes(square);
                const isCaptureTarget = isLegalTarget && Boolean(game.get(square));
                const isLastMove = displayedMove?.from === square || displayedMove?.to === square;

                return (
                  <button
                    className={`square ${isLightSquare ? 'square-light' : 'square-dark'} ${
                      isSelected ? 'square-selected' : ''
                    } ${isLastMove ? 'square-last-move' : ''} ${isLegalTarget ? 'square-legal' : ''} ${
                      isCaptureTarget ? 'square-legal-capture' : ''
                    }`}
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
                    {column === 0 && <span className="rank-label">{8 - row}</span>}
                    {row === 7 && <span className="file-label">{files[column]}</span>}
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
              <strong>Gracz biały</strong>
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
                : selectedSquare
                  ? `Wybrano ${selectedSquare}. Podświetlone pola są legalnymi celami.`
                  : liveStatus.description}
            </p>
          </section>

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

          <button className="reset-button" type="button" onClick={resetGame}>
            Rozpocznij nową partię
          </button>

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
            <button className="promotion-cancel" type="button" onClick={() => setPromotionRequest(null)}>
              Anuluj ruch
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
