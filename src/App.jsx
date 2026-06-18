import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import './lobby.css';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ROOM_STORAGE_PREFIX = 'szachy:room:';
const SESSION_STORAGE_KEY = 'szachy:session';
const CHANNEL_NAME = 'szachy:rooms';

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

function createInitialGameState() {
  return {
    fen: new Chess().fen(),
    history: [],
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

function getRoomStorageKey(code) {
  return `${ROOM_STORAGE_PREFIX}${code}`;
}

function readRoom(code) {
  if (!code) {
    return null;
  }

  try {
    const rawRoom = window.localStorage.getItem(getRoomStorageKey(code));
    return rawRoom ? JSON.parse(rawRoom) : null;
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

function HomeScreen({ joinCode, onJoinCodeChange, onCreateRoom, onJoinRoom, onStartLocalGame, joinError }) {
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
        <span className="stage-badge">Etap 3: lobby i pokoje</span>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="hero-kicker">ZAGRAJ OD RAZU</p>
          <h2>Wybierz sposób rozpoczęcia partii</h2>
          <p>
            Możesz zagrać na jednym urządzeniu albo utworzyć prywatny pokój i przekazać jego kod drugiemu
            graczowi.
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
          <p>Otrzymasz sześcioliterowy kod i link, który można przekazać przeciwnikowi.</p>
          <button type="button" className="secondary-action" onClick={onCreateRoom}>
            Utwórz pokój
          </button>
        </article>

        <article className="lobby-card">
          <span className="lobby-card-icon">⌁</span>
          <h2>Dołącz kodem</h2>
          <p>Wpisz kod utworzony przez drugiego gracza, aby zająć stronę czarnych.</p>
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
  const isWhitePlayer = playerColor === 'w';
  const roomLink = `${window.location.origin}${window.location.pathname}?room=${room.code}`;

  return (
    <main className="lobby-shell room-lobby-shell">
      <header className="landing-header">
        <div className="brand-mark" aria-hidden="true">♞</div>
        <div>
          <p className="eyebrow">PRYWATNA ROZGRYWKA</p>
          <h1>Pokój {room.code}</h1>
        </div>
        <button type="button" className="text-button" onClick={onLeaveRoom}>
          Opuść pokój
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
              ? 'Gdy drugi gracz dołączy jako czarne, aplikacja automatycznie przejdzie do planszy.'
              : `Grasz po stronie: ${getColorLabel(playerColor)}.`}
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
            <small>{isWhitePlayer ? 'Ty' : 'Drugi gracz'}</small>
          </div>
          <em>Gotowy</em>
        </div>
        <div className="room-player room-player-black">
          <span>♚</span>
          <div>
            <strong>Czarne</strong>
            <small>{isWhitePlayer ? 'Drugi gracz' : 'Ty'}</small>
          </div>
          <em>{room.blackPlayer ? 'Gotowy' : 'Oczekuje'}</em>
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
          pokoju jako czarne.
        </p>
      )}
    </main>
  );
}

function ChessGame({ mode, room, playerColor, gameState, onGameStateChange, onBackToLobby }) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [draggedSquare, setDraggedSquare] = useState(null);
  const [viewedMoveIndex, setViewedMoveIndex] = useState(null);
  const [promotionRequest, setPromotionRequest] = useState(null);

  const game = useMemo(() => new Chess(gameState.fen), [gameState.fen]);
  const history = gameState.history;
  const isHistoryPreview = viewedMoveIndex !== null;
  const displayedGame = useMemo(() => {
    if (!isHistoryPreview) {
      return game;
    }

    return new Chess(history[viewedMoveIndex].fen);
  }, [game, history, isHistoryPreview, viewedMoveIndex]);

  const displayedMove = isHistoryPreview ? history[viewedMoveIndex] : history[history.length - 1];
  const liveStatus = getGameStatus(game);
  const isPlayerTurn = mode === 'local' || game.turn() === playerColor;
  const interactionLocked = isHistoryPreview || liveStatus.ended || !isPlayerTurn;

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
  }, [gameState.fen]);

  function clearSelection() {
    setSelectedSquare(null);
    setDraggedSquare(null);
  }

  function startNewGame() {
    setViewedMoveIndex(null);
    setPromotionRequest(null);
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

      setViewedMoveIndex(null);
      setPromotionRequest(null);
      clearSelection();
      onGameStateChange({
        fen: nextGame.fen(),
        history: [...history, nextEntry],
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
          <button type="button" className="text-button" onClick={onBackToLobby}>
            {mode === 'room' ? '← Wróć do pokoju' : '← Wróć do menu'}
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

          <button className="reset-button" type="button" onClick={startNewGame}>
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

export default function App() {
  const initialSession = loadSession();
  const initialRoom = initialSession?.code ? readRoom(initialSession.code) : null;
  const roomFromUrl = normalizeRoomCode(new URLSearchParams(window.location.search).get('room') || '');

  const [session, setSession] = useState(initialRoom ? initialSession : null);
  const [room, setRoom] = useState(initialRoom);
  const [screen, setScreen] = useState(initialRoom ? (initialRoom.status === 'waiting' ? 'lobby' : 'game') : 'home');
  const [localGameState, setLocalGameState] = useState(createInitialGameState);
  const [joinCode, setJoinCode] = useState(roomFromUrl);
  const [joinError, setJoinError] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');
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
    try {
      window.localStorage.setItem(getRoomStorageKey(nextRoom.code), JSON.stringify(nextRoom));
      channelRef.current?.postMessage({ type: 'room-updated', code: nextRoom.code });
    } catch {
      // Stan nadal pozostaje widoczny w bieżącej karcie.
    }

    setRoom(nextRoom);
  }

  function createRoom() {
    let code = generateRoomCode();

    while (readRoom(code)) {
      code = generateRoomCode();
    }

    const nextRoom = {
      code,
      status: 'waiting',
      whitePlayer: true,
      blackPlayer: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      state: createInitialGameState(),
    };

    saveSession({ code, color: 'w' });
    persistRoom(nextRoom);
    setCopiedMessage('');
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

    if (foundRoom.blackPlayer) {
      setJoinError('Ten pokój jest już pełny.');
      return;
    }

    if (foundRoom.status === 'completed') {
      setJoinError('Ta partia została już zakończona.');
      return;
    }

    const joinedRoom = {
      ...foundRoom,
      status: 'active',
      blackPlayer: true,
      updatedAt: new Date().toISOString(),
    };

    saveSession({ code, color: 'b' });
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

    const nextGame = new Chess(nextState.fen);
    const nextRoom = {
      ...room,
      status: getGameStatus(nextGame).ended ? 'completed' : 'active',
      updatedAt: new Date().toISOString(),
      state: nextState,
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

  function leaveRoom() {
    saveSession(null);
    setRoom(null);
    setScreen('home');
    setCopiedMessage('');
  }

  if (screen === 'home') {
    return (
      <HomeScreen
        joinCode={joinCode}
        onJoinCodeChange={(nextCode) => {
          setJoinCode(nextCode);
          setJoinError('');
        }}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onStartLocalGame={startLocalGame}
        joinError={joinError}
      />
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
        onLeaveRoom={leaveRoom}
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
        } else {
          setScreen('home');
        }
      }}
    />
  );
}
