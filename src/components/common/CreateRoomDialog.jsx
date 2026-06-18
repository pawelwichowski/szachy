function ColorChoice({ value, selectedColor, onColorChange, symbol, label, description, className = '' }) {
  return (
    <button
      className={`color-choice ${selectedColor === value ? 'color-choice-selected' : ''}`}
      type="button"
      role="radio"
      aria-checked={selectedColor === value}
      onClick={() => onColorChange(value)}
    >
      <span className={`choice-piece ${className}`}>{symbol}</span>
      <strong>{label}</strong>
      <small>{description}</small>
    </button>
  );
}

export default function CreateRoomDialog({ selectedColor, onColorChange, onCreate, onCancel }) {
  return (
    <div className="action-backdrop" role="presentation">
      <section className="action-dialog create-room-dialog" role="dialog" aria-modal="true" aria-labelledby="create-room-title">
        <p className="panel-label">NOWY PRYWATNY POKÓJ</p>
        <h2 id="create-room-title">Wybierz kolor</h2>
        <p>Twoje figury będą ustawione na dole planszy. Drugi gracz automatycznie otrzyma przeciwny kolor.</p>

        <div className="color-options" role="radiogroup" aria-label="Kolor gospodarza pokoju">
          <ColorChoice
            value="w"
            selectedColor={selectedColor}
            onColorChange={onColorChange}
            symbol="♔"
            label="Białe"
            description="Zaczynasz partię"
            className="choice-piece-white"
          />
          <ColorChoice
            value="b"
            selectedColor={selectedColor}
            onColorChange={onColorChange}
            symbol="♚"
            label="Czarne"
            description="Drugi gracz zaczyna"
            className="choice-piece-black"
          />
          <ColorChoice
            value="random"
            selectedColor={selectedColor}
            onColorChange={onColorChange}
            symbol="?"
            label="Losowo"
            description="Kolor zostanie wylosowany"
          />
        </div>

        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={onCancel}>
            Anuluj
          </button>
          <button type="button" className="primary-action" onClick={onCreate}>
            Utwórz pokój
          </button>
        </div>
      </section>
    </div>
  );
}
