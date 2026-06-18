import { formatHistoryMove, getColorLabel } from '../../domain/chess';

function HistoryList({ history, viewedMoveIndex, onShowHistoryPosition }) {
  return (
    <section className="moves-card">
      <div className="card-heading">
        <h2>Historia ruchów</h2>
        <span>{history.length}</span>
      </div>
      {history.length === 0 ? (
        <p className="empty-moves">Pierwszy ruch jeszcze nie został wykonany.</p>
      ) : (
        <ol className="move-list">
          {history.map((entry, index) => (
            <li key={entry.id}>
              <button
                className={`move-button ${viewedMoveIndex === index ? 'move-button-active' : ''}`}
                type="button"
                onClick={() => onShowHistoryPosition(index)}
                aria-pressed={viewedMoveIndex === index}
              >
                <span>{entry.ply}.</span>
                {formatHistoryMove(entry)}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function DrawOfferCard({ drawOffer, canRespondToDraw, onAcceptDraw, onDeclineDraw }) {
  if (!drawOffer) {
    return null;
  }

  if (canRespondToDraw) {
    return (
      <section className="draw-offer-card" aria-live="polite">
        <p className="panel-label">OFERTA REMISU</p>
        <h2>{getColorLabel(drawOffer)} proponują remis</h2>
        <p>Zaakceptowanie oferty zakończy partię remisem.</p>
        <div className="draw-offer-actions">
          <button type="button" className="secondary-action" onClick={onDeclineDraw}>
            Odrzuć
          </button>
          <button type="button" className="primary-action" onClick={onAcceptDraw}>
            Akceptuj remis
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="draw-offer-card draw-offer-sent" aria-live="polite">
      <p className="panel-label">OFERTA REMISU</p>
      <h2>Oferta została wysłana</h2>
      <p>Oczekujesz na decyzję gracza po stronie {getColorLabel(drawOffer).toLowerCase()}.</p>
    </section>
  );
}

export default function GameSidebar({
  mode,
  liveStatus,
  isHistoryPreview,
  viewedMoveEntry,
  isPlayerTurn,
  selectedSquare,
  drawOffer,
  canRespondToDraw,
  canOfferDraw,
  drawWasDeclined,
  activeEvent,
  history,
  viewedMoveIndex,
  onDismissEvent,
  onAcceptDraw,
  onDeclineDraw,
  onShowHistoryPosition,
  onOfferDraw,
  onResign,
  onStartNewGame,
}) {
  return (
    <aside className="game-panel">
      <section className={`turn-card ${liveStatus.ended ? 'turn-card-ended' : ''}`}>
        <p className="panel-label">{isHistoryPreview ? 'PODGLĄD HISTORII' : 'STATUS PARTII'}</p>
        <h2>{isHistoryPreview ? `Po ruchu ${formatHistoryMove(viewedMoveEntry)}` : liveStatus.title}</h2>
        <p>
          {isHistoryPreview
            ? 'Kliknij „Wróć do bieżącej pozycji”, aby dalej grać.'
            : !isPlayerTurn && !liveStatus.ended
              ? 'Teraz ruch wykonuje drugi gracz. Po aktualizacji pozycji plansza odblokuje się automatycznie.'
              : selectedSquare
                ? `Wybrano ${selectedSquare}. Podświetlone pola są legalnymi celami.`
                : liveStatus.description}
        </p>
      </section>

      {drawWasDeclined && (
        <section className="game-event-card" aria-live="polite">
          <div>
            <p className="panel-label">OFERTA REMISU</p>
            <h2>Przeciwnik odrzucił ofertę remisu</h2>
            <p>Partia trwa dalej.</p>
          </div>
          <button type="button" onClick={() => onDismissEvent(activeEvent.id)} aria-label="Zamknij komunikat">
            ×
          </button>
        </section>
      )}

      {mode === 'room' && !liveStatus.ended && (
        <DrawOfferCard
          drawOffer={drawOffer}
          canRespondToDraw={canRespondToDraw}
          onAcceptDraw={onAcceptDraw}
          onDeclineDraw={onDeclineDraw}
        />
      )}

      <HistoryList
        history={history}
        viewedMoveIndex={viewedMoveIndex}
        onShowHistoryPosition={onShowHistoryPosition}
      />

      {mode === 'room' && (
        <section className="game-actions-card">
          <p className="panel-label">DZIAŁANIA W PARTII</p>
          <button className="secondary-action" type="button" onClick={onOfferDraw} disabled={!canOfferDraw}>
            {drawOffer ? 'Oferta remisu wysłana' : 'Zaproponuj remis'}
          </button>
          <button className="danger-action" type="button" onClick={onResign} disabled={liveStatus.ended}>
            Poddaj partię
          </button>
        </section>
      )}

      {mode === 'local' && (
        <button className="reset-button" type="button" onClick={onStartNewGame}>
          Rozpocznij nową partię
        </button>
      )}

      <p className="demo-note">
        Zasady ruchów, szach, mat, pat, roszada, bicie w przelocie i promocja pionka są sprawdzane przez silnik
        reguł szachowych. Kliknięcie ruchu w historii pokazuje pozycję dokładnie po tym ruchu.
      </p>
    </aside>
  );
}
