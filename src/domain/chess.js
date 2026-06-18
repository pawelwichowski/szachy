import { Chess } from 'chess.js';

export const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const pieceSymbols = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

export const pieceNames = {
  k: 'król',
  q: 'hetman',
  r: 'wieża',
  b: 'goniec',
  n: 'skoczek',
  p: 'pion',
};

export const promotionChoices = ['q', 'r', 'b', 'n'];

export function createInitialGameState() {
  return {
    fen: new Chess().fen(),
    history: [],
    drawOffer: null,
    result: null,
    lastEvent: null,
  };
}

export function normalizeGameState(state) {
  const initialState = createInitialGameState();

  return {
    fen: state?.fen || initialState.fen,
    history: Array.isArray(state?.history) ? state.history : [],
    drawOffer: state?.drawOffer || null,
    result: state?.result || null,
    lastEvent: state?.lastEvent || null,
  };
}

export function getSquareName(index) {
  const row = Math.floor(index / 8);
  const column = index % 8;
  return `${files[column]}${8 - row}`;
}

export function getColorLabel(color) {
  return color === 'w' ? 'Białe' : 'Czarne';
}

export function getPieceLabel(piece) {
  return `${getColorLabel(piece.color)}: ${pieceNames[piece.type]}`;
}

export function createGameEvent(type, actor) {
  return {
    id: `${type}-${actor}-${Date.now()}`,
    type,
    actor,
  };
}

export function getGameStatus(game, result = null) {
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

export function formatHistoryMove(entry) {
  return entry.color === 'w' ? `${entry.moveNumber}. ${entry.san}` : `${entry.moveNumber}... ${entry.san}`;
}
