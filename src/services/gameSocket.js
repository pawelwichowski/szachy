const socketUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

export function createGameSocket() {
  return new WebSocket(socketUrl);
}
