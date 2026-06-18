import { useCallback, useState } from 'react';
import ChessGame from './components/game/ChessGame';
import ConnectionNotice from './components/common/ConnectionNotice';
import CreateRoomDialog from './components/common/CreateRoomDialog';
import HomeScreen from './components/lobby/HomeScreen';
import RoomLobby from './components/lobby/RoomLobby';
import { createInitialGameState } from './domain/chess';
import {
  getRandomColor,
  getRoomLink,
  loadSession,
  normalizeRoomCode,
  SESSION_STORAGE_KEY,
} from './domain/room';
import { useOnlineRoom } from './hooks/useOnlineRoom';
import './lobby.css';
import './stage35.css';
import './stage36.css';
import './online.css';

export default function App() {
  const roomFromUrl = normalizeRoomCode(new URLSearchParams(window.location.search).get('room') || '');
  const initialSession = roomFromUrl ? null : loadSession();

  const [session, setSession] = useState(initialSession);
  const [room, setRoom] = useState(null);
  const [screen, setScreen] = useState(initialSession ? 'game' : 'home');
  const [localGameState, setLocalGameState] = useState(createInitialGameState);
  const [joinCode, setJoinCode] = useState(roomFromUrl);
  const [joinError, setJoinError] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [selectedHostColor, setSelectedHostColor] = useState('w');

  const clearSessionAndReturnHome = useCallback(() => {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Brak sessionStorage nie blokuje powrotu do menu.
    }

    setSession(null);
    setRoom(null);
    setScreen('home');
    setCopiedMessage('');
    setJoinError('');
  }, []);

  const handleRoomState = useCallback((nextRoom) => {
    setRoom(nextRoom);
    setScreen(nextRoom.status === 'waiting' ? 'lobby' : 'game');
  }, []);

  const online = useOnlineRoom({
    session,
    onRoomState: handleRoomState,
    onSessionRejected: clearSessionAndReturnHome,
  });

  function saveSession(nextSession) {
    setSession(nextSession);

    try {
      if (nextSession) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Bieżąca karta nadal może działać do chwili odświeżenia strony.
    }
  }

  async function createPrivateRoom() {
    const color = selectedHostColor === 'random' ? getRandomColor() : selectedHostColor;
    const response = await online.createRoom(color);

    if (!response.ok) {
      return;
    }

    saveSession(response.session);
    handleRoomState(response.room);
    setCreateRoomOpen(false);
    setCopiedMessage('');
  }

  async function joinPrivateRoom() {
    const code = normalizeRoomCode(joinCode);
    setJoinError('');

    if (code.length !== 6) {
      setJoinError('Kod pokoju musi mieć dokładnie 6 znaków.');
      return;
    }

    const response = await online.joinRoom(code);
    if (!response.ok) {
      setJoinError(response.error || 'Nie udało się dołączyć do pokoju.');
      return;
    }

    saveSession(response.session);
    handleRoomState(response.room);
  }

  function startLocalGame() {
    saveSession(null);
    setRoom(null);
    setLocalGameState(createInitialGameState());
    setScreen('game');
  }

  async function returnToHome({ shouldNotifyOpponent = false } = {}) {
    if (shouldNotifyOpponent && session && room?.status === 'active') {
      await online.leaveRoom();
    }

    clearSessionAndReturnHome();
  }

  async function copyText(text, message) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessage(message);
    } catch {
      setCopiedMessage('Nie udało się skopiować automatycznie. Zaznacz tekst ręcznie.');
    }
  }

  let content;

  if (screen === 'home') {
    content = (
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
  } else if (screen === 'lobby' && room && session) {
    content = (
      <RoomLobby
        room={room}
        playerColor={session.color}
        copiedMessage={copiedMessage}
        onCopyCode={() => copyText(room.code, 'Kod pokoju skopiowano do schowka.')}
        onCopyLink={() => copyText(getRoomLink(room.code), 'Link do pokoju skopiowano do schowka.')}
        onContinue={() => setScreen('game')}
        onLeaveRoom={() => returnToHome({ shouldNotifyOpponent: false })}
      />
    );
  } else {
    const isRoomGame = Boolean(room && session);

    content = (
      <ChessGame
        mode={isRoomGame ? 'room' : 'local'}
        room={room}
        playerColor={session?.color}
        gameState={isRoomGame ? room.state : localGameState}
        onLocalGameStateChange={setLocalGameState}
        roomActions={isRoomGame ? {
          makeMove: online.makeMove,
          offerDraw: online.offerDraw,
          acceptDraw: online.acceptDraw,
          declineDraw: online.declineDraw,
          resign: online.resign,
        } : null}
        onBackToLobby={() => setScreen('lobby')}
        onReturnHome={returnToHome}
      />
    );
  }

  return (
    <>
      {content}
      <ConnectionNotice
        connectionState={online.connectionState}
        message={online.serverError}
        onDismiss={online.clearServerError}
      />
    </>
  );
}
