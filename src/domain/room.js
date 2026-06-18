export const SESSION_STORAGE_KEY = 'szachy:online-session';

export function normalizeRoomCode(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function getRandomColor() {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % 2 === 0 ? 'w' : 'b';
}

export function getRoomLink(code) {
  return `${window.location.origin}${window.location.pathname}?room=${code}`;
}

export function loadSession() {
  try {
    const rawSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}
