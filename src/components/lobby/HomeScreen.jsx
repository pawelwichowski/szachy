import { normalizeRoomCode } from '../../domain/room';

export default function HomeScreen({
  joinCode,
  onJoinCodeChange,
  onOpenCreateRoom,
  onJoinRoom,
  onStartLocalGame,
  joinError,
}) {
  function handleSubmit(event) {
    event.preventDefault();
    onJoinRoom();
  }

  return (
    <main className="lobby-shell">
      <header className="landing-header">
        <div className="brand-mark" aria-hidden="true">♞</div>
        <div>
          <p className="eyebrow">PROJEKT · APLIKACJE INTERNETOWE</p>
          <h1>Szachy online</h1>
        </div>
        <span className="stage-badge">Etap 3.6: komunikaty pokojów</span>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="hero-kicker">ZAGRAJ OD RAZU</p>
          <h2>Wybierz sposób rozpoczęcia partii</h2>
          <p>
            Możesz zagrać na jednym urządzeniu albo utworzyć prywatny pokój, wybrać kolor i przekazać kod
            przeciwnikowi.
          </p>
        </div>
        <div className="hero-board-preview" aria-hidden="true">
          <span>♜</span><span>♞</span><span>♝</span><span>♛</span>
          <span>♟</span><span>♟</span><span>♟</span><span>♟</span>
          <span>♙</span><span>♙</span><span>♙</span><span>♙</span>
          <span>♖</span><span>♘</span><span>♗</span><span>♕</span>
        </div>
      </section>

      <section className="lobby-actions" aria-label="Opcje rozpoczęcia gry">
        <article className="lobby-card lobby-card-featured">
          <span className="lobby-card-icon">♔</span>
          <h2>Gra lokalna</h2>
          <p>Dwóch graczy wykonuje ruchy naprzemiennie na tej samej planszy i tym samym urządzeniu.</p>
          <button type="button" className="primary-action" onClick={onStartLocalGame}>
            Rozpocznij grę lokalną
          </button>
        </article>

        <article className="lobby-card">
          <span className="lobby-card-icon">＋</span>
          <h2>Utwórz prywatny pokój</h2>
          <p>Wybierz białe, czarne albo losowy kolor. Otrzymasz sześcioliterowy kod oraz link.</p>
          <button type="button" className="secondary-action" onClick={onOpenCreateRoom}>
            Utwórz pokój
          </button>
        </article>

        <article className="lobby-card">
          <span className="lobby-card-icon">⌁</span>
          <h2>Dołącz kodem</h2>
          <p>Wpisz kod utworzony przez drugiego gracza, aby otrzymać wolny kolor w pokoju.</p>
          <form className="join-form" onSubmit={handleSubmit}>
            <label htmlFor="room-code">Kod pokoju</label>
            <input
              id="room-code"
              value={joinCode}
              onChange={(event) => onJoinCodeChange(normalizeRoomCode(event.target.value))}
              placeholder="NP. A7K9QP"
              maxLength="6"
              autoComplete="off"
            />
            {joinError && <p className="form-error" role="alert">{joinError}</p>}
            <button type="submit" className="secondary-action">
              Dołącz do pokoju
            </button>
          </form>
        </article>
      </section>

      <p className="front-end-note">
        W tej wersji pokoje synchronizują pozycję między kartami tej samej przeglądarki. W kolejnym etapie ich
        działanie między różnymi urządzeniami przejmie serwer Flask i WebSocket.
      </p>
    </main>
  );
}
