import { useCallback, useEffect, useRef } from 'react';
import { getRoomStorageKey, readRoom, ROOM_CHANNEL_NAME } from '../domain/room';

export function useRoomSync(session, setRoom) {
  const channelRef = useRef(null);
  const roomCode = session?.code;

  useEffect(() => {
    const channel = new BroadcastChannel(ROOM_CHANNEL_NAME);
    channelRef.current = channel;

    function refreshRoom(code) {
      if (!roomCode || roomCode !== code) {
        return;
      }

      const updatedRoom = readRoom(code);
      if (updatedRoom) {
        setRoom(updatedRoom);
      }
    }

    function handleStorage(event) {
      if (event.key === getRoomStorageKey(roomCode)) {
        refreshRoom(roomCode);
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
  }, [roomCode, setRoom]);

  return useCallback((code) => {
    channelRef.current?.postMessage({ type: 'room-updated', code });
  }, []);
}
