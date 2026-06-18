import { createInitialGameState, normalizeGameState } from './chess';

export const ROOM_STORAGE_PREFIX = 'szachy:room:';
export const SESSION_STORAGE_KEY = 'szachy:session';
export const ROOM_CHANNEL_NAME = 'szachy:rooms';

export function normalizeRoomCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function getRoomStorageKey(code) {
  return `${ROOM_STORAGE_PREFIX}${code}`;
}

export function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint32Array(6);
  window.crypto.getRandomValues(values);

  return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}

export function getRandomColor() {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);

  return values[0] % 2 === 0 ? 'w' : 'b';
}

export function getGuestColor(room) {
  return room.hostColor === 'w' ? 'b' : 'w';
}

export function normalizeRoom(room) {
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

export function createRoom(code, hostColor) {
  return {
    code,
    status: 'waiting',
    hostColor,
    whitePlayer: hostColor === 'w',
    blackPlayer: hostColor === 'b',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    state: createInitialGameState(),
  };
}

export function readRoom(code) {
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

export function loadSession() {
  try {
    const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function getRoomLink(code) {
  return `${window.location.origin}${window.location.pathname}?room=${code}`;
}
