import { useCallback, useEffect, useRef, useState } from 'react';
import { createGameSocket } from '../services/gameSocket';

export function useOnlineRoom({ session, onRoomState, onSessionRejected }) {
  const [connectionState, setConnectionState] = useState('connecting');
  const [serverError, setServerError] = useState('');
  const socketRef = useRef(null);
  const pendingRef = useRef(new Map());
  const sessionRef = useRef(session);
  const roomStateRef = useRef(onRoomState);
  const rejectedRef = useRef(onSessionRejected);

  useEffect(() => {
    sessionRef.current = session;
    roomStateRef.current = onRoomState;
    rejectedRef.current = onSessionRejected;
  });

  const request = useCallback((type, data = {}) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const response = { ok: false, error: 'Brak połączenia z serwerem gry.' };
      setServerError(response.error);
      resolve(response);
      return;
    }

    const requestId = window.crypto.randomUUID();
    pendingRef.current.set(requestId, resolve);
    socket.send(JSON.stringify({ type, requestId, data }));
  }), []);

  useEffect(() => {
    const socket = createGameSocket();
    socketRef.current = socket;

    socket.addEventListener('open', () => {
      setConnectionState('connected');
      setServerError('');
      const current = sessionRef.current;
      if (current?.code && current?.playerToken) {
        request('rejoin_room', { code: current.code, playerToken: current.playerToken }).then((response) => {
          if (!response.ok) {
            rejectedRef.current?.();
          }
        });
      }
    });

    socket.addEventListener('message', (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }

      if (message.type === 'room_state') {
        roomStateRef.current?.(message.room);
        return;
      }

      if (message.type !== 'response') {
        return;
      }

      const resolve = pendingRef.current.get(message.requestId);
      if (!resolve) {
        return;
      }

      pendingRef.current.delete(message.requestId);
      const payload = message.payload || { ok: false, error: 'Nieprawidłowa odpowiedź serwera.' };
      if (!payload.ok) {
        setServerError(payload.error || 'Serwer odrzucił żądanie.');
      } else if (payload.room) {
        roomStateRef.current?.(payload.room);
      }
      resolve(payload);
    });

    socket.addEventListener('close', () => setConnectionState('disconnected'));
    socket.addEventListener('error', () => setServerError('Nie można połączyć się z serwerem gry.'));

    return () => {
      socket.close();
      for (const resolve of pendingRef.current.values()) {
        resolve({ ok: false, error: 'Połączenie z serwerem zostało zamknięte.' });
      }
      pendingRef.current.clear();
    };
  }, [request]);

  return {
    connectionState,
    serverError,
    clearServerError: () => setServerError(''),
    createRoom: (color) => request('create_room', { color }),
    joinRoom: (code) => request('join_room', { code }),
    makeMove: (move) => request('make_move', move),
    offerDraw: () => request('offer_draw'),
    acceptDraw: () => request('accept_draw'),
    declineDraw: () => request('decline_draw'),
    resign: () => request('resign'),
    leaveRoom: () => request('leave_room'),
  };
}
