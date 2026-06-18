import { useState } from 'react';
import { Chess } from 'chess.js';
import ChessGame from './components/game/ChessGame';
import ConfirmDialog from './components/common/ConfirmDialog';
import CreateRoomDialog from './components/common/CreateRoomDialog';
import HomeScreen from './components/lobby/HomeScreen';
import RoomLobby from './components/lobby/RoomLobby';
import { createInitialGameState, getGameStatus, normalizeGameState } from './domain/chess';
import {
  createRoom,
  generateRoomCode,
  getGuestColor,
  getRandomColor,
  getRoomLink,
  getRoomStorageKey,
  loadSession,
  normalizeGameState as unusedNormalizeGameState,
  normalizeRoom,
  normalizeRoomCode,
  readRoom,
  SESSION_STORAGE_KEY,
} from './domain/room';
import { useRoomSync } from './hooks/useRoomSync';

// Uwaga: normalizeGameState jest importowane z domain/chess. Alias poniżej usuwa się przy pierwszym kolejnym czyszczeniu importów.
void unusedNormalizeGameState;

export default function App() {
  const roomFromUrl = normalizeRoomCode(new URLSearchParams(window.location.search).get('room') || '');
  const initialSession = roomFromUrl ? null : loadSession();
  const initialRoom = initialSession?.code ? readRoom(initialSession.code) : null;

  const [session, setSession] = useState(initialRoom ? initialSession : null);
  const [room, setRoom] = useState(initialRoom);
  const [screen, setScreen] = useState(initialRoom ? (initialRoom.status === 'waiting' ? 'lobby' : 'game') : 'home');
  const [localGameState, setLocalGameState] = useState(createInitialGameState);
  const [joinCode, setJoinCode] = useState(roomFromUrl);
  const [joinError, setJoinError] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [selectedHostColor, setSelectedHostColor] = useState('w');

  const publishRoomUpdate = useRoomSync(session, setRoom);

  function saveSession(nextSession) {
    setSession(nextSession);

    try {
      if (nextSession) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Bieżąca karta nadal może działać, gdy sessionStorage jest niedostępne.
    }
  }

  function persistRoom(nextRoom) {
    const normalizedRoom = normalizeRoom(nextRoom);

    try {
      window.localStorage.setItem(getRoomStorageKey(normalizedRoom.code), JSON.stringify(normalizedRoom));
      publishRoomUpdate(normalizedRoom.code);
    } catch {
      // Bieżąca karta nadal pokazuje nowy stan nawet bez localStorage.
    }

    setRoom(normalizedRoom);
  }

  function createPrivateRoom() {
    let code = generateRoomCode();
    while (readRoom(code)) {
      code = generateRoomCode();
    }

    const hostColor = selectedHostColor === 'random' ? getRandomColor() : selectedHostColor;
    const nextRoom = createRoom(code, hostColor);

    saveSession({ code, color: hostColor });
    persistRoom(nextRoom);
    setCopiedMessage('');
    setCreateRoomOpen(false);
    setScreen('lobby');
  }

  function joinPrivateRoom() {
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

    if (foundRoom.status === 'completed') {
      setJoinError('Ta partia została już zakończona.');
      return;
    }

    const guestColor = getGuestColor(foundRoom);
    const guestSpotTaken = guestColor === 'w' ? foundRoom.whitePlayer : foundRoom.blackPlayer;
    if (guestSpotTaken) {
      setJoinError('Ten pokój jest już pełny.');
      return;
    }

    const joinedRoom = {
      ...foundRoom,
      status: 'active',
      whitePlayer: guestColor === 'w' ? true : foundRoom.whitePlayer,
      blackPlayer: guestColor === 'b' ? true : foundRoom.blackPlayer,
      updatedAt: new Date().toISOString(),
    };

    saveSession({ code, color: guestColor });
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

    const normalizedState = normalizeGameState(nextState);
    const nextGame = new Chess(normalizedState.fen);
    const nextRoom = {
      ...room,
      status: getGameStatus(nextGame, normalizedState.result).ended ? 'completed' : 'active',
      updatedAt: new Date().toISOString(),
      state: normalizedState,
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

  function returnToHome({ shouldNotifyOpponent = false, gameState = null, playerColor = null } = {}) {
    if (shouldNotifyOpponent && room && gameState && playerColor) {
      const nextState = normalizeGameState({
        ...gameState,
        drawOffer: null,
        lastEvent: null,
        result: { type: 'opponent-left', leftBy: playerColor },
      });

      persistRoom({
        ...room,
        status: 'completed',
        updatedAt: new Date().toISOString(),
        state: nextState,
      });
    }

    saveSession(null);
    setRoom(null);
    setScreen('home');
    setCopiedMessage('');
    setJoinError('');
  }

  if (screen === 'home') {
    return (
      <>
        <HomeScreen
          joinCode={joinCode}
          onJoinCodeChange={(nextCode) => {
            setJoinCode(nextCode);
            setJoinError('');
          }}
          onOpenCreateRoom={() => setCreateRoomOpen(true)}
          onJoinRoom={joinPrivateRoom}
          onStartLocalGame={startLocalGame}
          joinError={joinError}
        />
        {createRoomOpen && (
          <CreateRoomDialog
            selectedColor={selectedHostColor}
            onColorChange={setSelectedHostColor}
            onCreate={createPrivateRoom}
            onCancel={() => setCreateRoomOpen(false)}
          />
        )}
      </>
    );
  }

  if (screen === 'lobby' && room && session) {
    return (
      <RoomLobby
        room={room}
        playerColor={session.color}
        copiedMessage={copiedMessage}
        onCopyCode={() => copyText(room.code, 'Kod pokoju skopiowano do schowka.')}
        onCopyLink={() => copyText(getRoomLink(room.code), 'Link do pokoju skopiowano do schowka.')}
        onContinue={() => setScreen('game')}
        onLeaveRoom={returnToHome}
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
        }
      }}
      onReturnHome={returnToHome}
    />
  );
}
