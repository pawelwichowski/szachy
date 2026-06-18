export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmClassName = 'danger-action',
  onConfirm,
  onCancel,
}) {
  return (
    <div className="action-backdrop" role="presentation">
      <section className="action-dialog" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title">
        <p className="panel-label">POTWIERDZENIE</p>
        <h2 id="action-dialog-title">{title}</h2>
        <p>{description}</p>
        <div className="dialog-actions">
          <button type="button" className="dialog-cancel" onClick={onCancel}>
            Anuluj
          </button>
          <button type="button" className={confirmClassName} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
