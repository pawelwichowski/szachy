export default function RoomConnectionScreen({ connectionState, onReturnHome }) {
  const disconnected = connectionState === 'disconnected';

  return (
    <main className="lobby-shell room-connection-shell">
      <section className="room-connection-card" aria-live="polite">
        <span className="room-connection-icon" aria-hidden="true">♞</span>
        <p className="eyebrow">POKÓJ ONLINE</p>
        <h1>{disconnected ? 'Nie udało się połączyć z serwerem' : 'Przywracanie pokoju…'}</h1>
        <p>
          {disconnected
            ? 'Serwer gry nie odpowiada. Sprawdź, czy backend Flask działa i czy adres WebSocket jest prawidłowy.'
            : 'Pobieramy aktualną pozycję, historię ruchów oraz Twój kolor z serwera gry.'}
        </p>
        {disconnected && (
          <button type="button" className="primary-action" onClick={onReturnHome}>
            Wróć do menu głównego
          </button>
        )}
      </section>
    </main>
  );
}
