import { useState } from 'react';

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const pieces = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
};

const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

function createPiece(color, type, square) {
  return {
    id: `${color}-${type}-${square}`,
    color,
    type,
    symbol: pieces[color][type],
  };
}

function createInitialBoard() {
  const board = Array(64).fill(null);

  files.forEach((file, column) => {
    board[column] = createPiece('black', backRank[column], `${file}8`);
    board[8 + column] = createPiece('black', 'pawn', `${file}7`);
    board[48 + column] = createPiece('white', 'pawn', `${file}2`);
    board[56 + column] = createPiece('white', backRank[column], `${file}1`);
  });

  return board;
}

function getSquareName(index) {
  const row = Math.floor(index / 8);
  const column = index % 8;
  return `${files[column]}${8 - row}`;
}

function getColorLabel(color) {
  return color === 'white' ? 'Białe' : 'Czarne';
}

function getPieceLabel(piece) {
  const names = {
    king: 'król',
    queen: 'hetman',
    rook: 'wieża',
    bishop: 'goniec',
    knight: 'skoczek',
    pawn: 'pion',
  };

  return `${getColorLabel(piece.color)}: ${names[piece.type]}`;
}

export default function App() {
  const [board, setBoard] = useState(createInitialBoard);
  const [turn, setTurn] = useState('white');
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [draggedSquare, setDraggedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);

  function resetGame() {
    setBoard(createInitialBoard());
    setTurn('white');
    setSelectedSquare(null);
    setDraggedSquare(null);
    setLastMove(null);
    setMoveHistory([]);
  }

  function movePiece(from, to) {
    const movingPiece = board[from];
    const targetPiece = board[to];

    if (!movingPiece || movingPiece.color !== turn || from === to) {
      return;
    }

    if (targetPiece?.color === movingPiece.color) {
      setSelectedSquare(to);
      return;
    }

    const nextBoard = [...board];
    nextBoard[to] = movingPiece;
    nextBoard[from] = null;

    const fromSquare = getSquareName(from);
    const toSquare = getSquareName(to);
    const separator = targetPiece ? '×' : '→';

    setBoard(nextBoard);
    setLastMove({ from, to });
    setMoveHistory((previousMoves) => [
      ...previousMoves,
      {
        id: `${movingPiece.id}-${previousMoves.length}`,
        text: `${movingPiece.symbol} ${fromSquare} ${separator} ${toSquare}`,
      },
    ]);
    setSelectedSquare(null);
    setTurn((currentTurn) => (currentTurn === 'white' ? 'black' : 'white'));
  }

  function handleSquareClick(index) {
    const piece = board[index];

    if (selectedSquare === null) {
      if (piece?.color === turn) {
        setSelectedSquare(index);
      }
      return;
    }

    if (index === selectedSquare) {
      setSelectedSquare(null);
      return;
    }

    if (piece?.color === turn) {
      setSelectedSquare(index);
      return;
    }

    movePiece(selectedSquare, index);
  }

  function handleDragStart(event, index) {
    const piece = board[index];

    if (!piece || piece.color !== turn) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    setDraggedSquare(index);
    setSelectedSquare(index);
  }

  function handleDrop(event, targetIndex) {
    event.preventDefault();
    const sourceIndex = draggedSquare ?? Number(event.dataTransfer.getData('text/plain'));

    if (Number.isInteger(sourceIndex) && sourceIndex !== targetIndex) {
      movePiece(sourceIndex, targetIndex);
    }

    setDraggedSquare(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">PROJEKT · APLIKACJE INTERNETOWE</p>
          <h1>Szachy online</h1>
        </div>
        <span className="stage-badge">Etap 1: szachownica</span>
      </header>

      <section className="game-layout" aria-label="Widok partii szachowej">
        <div className="board-section">
          <div className="player-row player-row-black">
            <span className="player-avatar">♚</span>
            <div>
              <strong>Gracz czarny</strong>
              <p>Oczekuje na ruch</p>
            </div>
            <span className="clock">10:00</span>
          </div>

          <div className="board-frame">
            <div className="chessboard" role="grid" aria-label="Szachownica">
              {board.map((piece, index) => {
                const row = Math.floor(index / 8);
                const column = index % 8;
                const squareName = getSquareName(index);
                const isLightSquare = (row + column) % 2 === 0;
                const isSelected = selectedSquare === index;
                const isLastMove = lastMove?.from === index || lastMove?.to === index;

                return (
                  <button
                    className={`square ${isLightSquare ? 'square-light' : 'square-dark'} ${
                      isSelected ? 'square-selected' : ''
                    } ${isLastMove ? 'square-last-move' : ''}`}
                    key={squareName}
                    type="button"
                    role="gridcell"
                    aria-label={piece ? `${squareName}, ${getPieceLabel(piece)}` : `${squareName}, puste pole`}
                    onClick={() => handleSquareClick(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => handleDrop(event, index)}
                  >
                    {column === 0 && <span className="rank-label">{8 - row}</span>}
                    {row === 7 && <span className="file-label">{files[column]}</span>}
                    {piece && (
                      <span
                        className={`piece piece-${piece.color}`}
                        draggable={piece.color === turn}
                        onDragStart={(event) => handleDragStart(event, index)}
                        onDragEnd={() => setDraggedSquare(null)}
                        aria-hidden="true"
                      >
                        {piece.symbol}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="player-row player-row-white">
            <span className="player-avatar">♔</span>
            <div>
              <strong>Gracz biały</strong>
              <p>Twoja strona</p>
            </div>
            <span className="clock">10:00</span>
          </div>
        </div>

        <aside className="game-panel">
          <section className="turn-card">
            <p className="panel-label">TERAZ GRA</p>
            <h2>{getColorLabel(turn)}</h2>
            <p>
              {selectedSquare === null
                ? 'Wybierz figurę kliknięciem lub przeciągnij ją na wybrane pole.'
                : `Wybrano pole ${getSquareName(selectedSquare)}. Wybierz pole docelowe.`}
            </p>
          </section>

          <section className="moves-card">
            <div className="card-heading">
              <h2>Historia ruchów</h2>
              <span>{moveHistory.length}</span>
            </div>
            {moveHistory.length === 0 ? (
              <p className="empty-moves">Pierwszy ruch jeszcze nie został wykonany.</p>
            ) : (
              <ol className="move-list">
                {moveHistory.map((move, index) => (
                  <li key={move.id}>
                    <span>{index + 1}.</span>
                    {move.text}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <button className="reset-button" type="button" onClick={resetGame}>
            Ustaw figurki od nowa
          </button>

          <p className="demo-note">
            W tym etapie figury można przesuwać oraz zbijać przeciwnika, ale aplikacja nie sprawdza jeszcze
            szczegółowych zasad ruchu, szacha ani mata.
          </p>
        </aside>
      </section>
    </main>
  );
}
