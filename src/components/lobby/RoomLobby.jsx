import { getColorLabel } from '../../domain/chess';
import { getRoomLink } from '../../domain/room';

export default function RoomLobby({ room, playerColor, copiedMessage, onCopyCode, onCopyLink, onContinue, onLeaveRoom }) {
  const isWaiting = room.status === 'waiting';
  const roomLink = getRoomLink(room.code);

  function playerDescription(color, occupied) {
    if (playerColor === color) {
      return 'Ty';
    }

    return occupied ? 'Drugi gracz' : 'Oczekuje na gracza';
  }

  function PlayerRow({ color, icon, occupied }) {
    return (
      <div className={`room-player room-player-${color === 'w' ? 'white' : 'black'}`}>
        <span>{icon}</span>
        <div>
          <strong>{getColorLabel(color)}</strong>
          <small>{playerDescription(color, occupied)}</small>
        </div>
        <em className={occupied ? 'player-ready' : 'player-waiting'}>{occupied ? 'Gotowy' : 'Oczekuje'}</em>
      </div>
    );
  }

  return (
    <main className="lobby-shell room-lobby-shell">
      <header className="landing-header">
        <div className="brand-mark" aria-hidden="true">♞</div>
        <div>
          <p className="eyebrow">PRYWATNA ROZGRYWKA</p>
          <h1>Pokój {room.code}</h1>
        </div>
        <button type="button" className="text-button" onClick={onLeaveRoom}>
          Menu główne
        </button>
      </header>

      <section className="room-status-panel">
        <div className={`room-status-icon ${isWaiting ? 'room-status-waiting' : 'room-status-ready'}`} aria-hidden="true">
          {isWaiting ? '…' : '✓'}
        </div>
        <div>
          <p className="hero-kicker">{isWaiting ? 'OCZEKIWANIE NA GRACZA' : 'OBA MIEJSCA SĄ ZAJĘTE'}</p>
          <h2>
            {isWaiting
              ? 'Przekaż kod drugiemu graczowi'
              : room.status === 'completed'
                ? 'Partia została zakończona'
                : 'Partia jest gotowa do kontynuowania'}
          </h2>
          <p>
            {isWaiting
              ? 'Gdy drugi gracz dołączy, aplikacja automatycznie przejdzie do planszy.'
              : `Grasz po stronie: ${getColorLabel(playerColor)}. Twoje figury będą na dole planszy.`}
          </p>
        </div>
      </section>

      <section className="room-details-grid">
        <article className="room-code-card">
          <p className="panel-label">KOD POKOJU</p>
          <output>{room.code}</output>
          <button type="button" className="secondary-action" onClick={onCopyCode}>
            Skopiuj kod
          </button>
        </article>

        <article className="room-link-card">
          <p className="panel-label">LINK DO POKOJU</p>
          <p className="room-link-preview">{roomLink}</p>
          <button type="button" className="secondary-action" onClick={onCopyLink}>
            Skopiuj link
          </button>
        </article>
      </section>

      {copiedMessage && <p className="copy-notice" role="status">{copiedMessage}</p>}

      <section className="room-players-card">
        <PlayerRow color="w" icon="♔" occupied={room.whitePlayer} />
        <PlayerRow color="b" icon="♚" occupied={room.blackPlayer} />
      </section>

      {!isWaiting && (
        <button type="button" className="primary-action continue-button" onClick={onContinue}>
          {room.status === 'completed' ? 'Zobacz zakończoną partię' : 'Przejdź do gry'}
        </button>
      )}

      {isWaiting && (
        <p className="front-end-note">
          Aby przetestować synchronizację, otwórz skopiowany link w nowej karcie tej samej przeglądarki i dołącz do
          pokoju. Kolor otrzymasz automatycznie.
        </p>
      )}
    </main>
  );
}
