export default function ConnectionNotice({ connectionState, message, onDismiss }) {
  if (!message && connectionState === 'connected') {
    return null;
  }

  const text = message || 'Łączenie z serwerem gry…';
  const kind = message ? 'connection-notice-error' : 'connection-notice-info';

  return (
    <div className={`connection-notice ${kind}`} role="status">
      <span>{text}</span>
      {message && (
        <button type="button" onClick={onDismiss} aria-label="Zamknij komunikat">
          ×
        </button>
      )}
    </div>
  );
}
