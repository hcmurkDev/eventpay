import { useEffect } from 'react';

/**
 * Custom confirm dialog — themed to match EventPay design.
 * Usage: <ConfirmDialog {...dialog} />
 * where dialog = { open, title, message, confirmLabel, danger, onConfirm, onCancel }
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn .15s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${danger ? 'rgba(255,92,122,.3)' : 'var(--border)'}`,
          borderRadius: '18px',
          padding: '28px 24px 20px',
          width: '100%', maxWidth: '360px',
          animation: 'slideUp .2s ease',
          boxShadow: '0 24px 60px rgba(0,0,0,.6)',
        }}
      >
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto',
            background: danger ? 'rgba(255,92,122,.12)' : 'rgba(124,92,252,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i
              className={`ti ${danger ? 'ti-alert-triangle' : 'ti-info-circle'}`}
              style={{ fontSize: '24px', color: danger ? 'var(--red)' : 'var(--accent)' }}
            />
          </div>
        </div>

        {/* Text */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>{title}</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{message}</div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            style={{ flex: 1, padding: '12px' }}
          >
            Cancel
          </button>
          <button
            className="btn"
            onClick={onConfirm}
            style={{
              flex: 1, padding: '12px',
              background: danger
                ? 'linear-gradient(135deg, var(--red), #ff8fa3)'
                : 'linear-gradient(135deg, var(--accent), #9c7cfc)',
              color: '#fff',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
