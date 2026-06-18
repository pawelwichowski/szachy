import { getPieceLabel, getSquareName, pieceSymbols } from '../../domain/chess';

export default function ChessBoard({
  displayedGame,
  game,
  boardIndexes,
  selectedSquare,
  legalTargets,
  displayedMove,
  isHistoryPreview,
  interactionLocked,
  onSquareClick,
  onDragStart,
  onDragEnd,
  onDrop,
}) {
  return (
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
              onClick={() => onSquareClick(square)}
              onDragOver={(event) => {
                if (!interactionLocked) {
                  event.preventDefault();
                }
              }}
              onDrop={(event) => onDrop(event, square)}
            >
              {visualColumn === 0 && <span className="rank-label">{square[1]}</span>}
              {visualRow === 7 && <span className="file-label">{square[0]}</span>}
              {piece && (
                <span
                  className={`piece piece-${piece.color === 'w' ? 'white' : 'black'}`}
                  draggable={!interactionLocked && piece.color === game.turn()}
                  onDragStart={(event) => onDragStart(event, square)}
                  onDragEnd={onDragEnd}
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
  );
}
