import { pieceNames, pieceSymbols, promotionChoices } from '../../domain/chess';

export default function PromotionDialog({ promotionRequest, onChoose, onCancel }) {
  if (!promotionRequest) {
    return null;
  }

  return (
    <div className="promotion-backdrop" role="presentation">
      <section className="promotion-dialog" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
        <p className="panel-label">PROMOCJA PIONKA</p>
        <h2 id="promotion-title">Wybierz figurę</h2>
        <p>Pion dotarł do ostatniego rzędu. Wybierz figurę, w którą ma zostać zamieniony.</p>
        <div className="promotion-options">
          {promotionChoices.map((pieceType) => (
            <button
              key={pieceType}
              type="button"
              onClick={() => onChoose({ ...promotionRequest, promotion: pieceType })}
              aria-label={`Promuj na ${pieceNames[pieceType]}`}
            >
              {pieceSymbols[promotionRequest.color][pieceType]}
            </button>
          ))}
        </div>
        <button className="promotion-cancel" type="button" onClick={onCancel}>
          Anuluj ruch
        </button>
      </section>
    </div>
  );
}
