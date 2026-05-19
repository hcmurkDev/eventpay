import { useState, useCallback, useRef } from 'react';

let _showToast = null;

export function Toast() {
  const [state, setState] = useState({ msg: '', type: 'success', visible: false });
  const timer = useRef(null);

  _showToast = useCallback((msg, type = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setState({ msg, type, visible: true });
    timer.current = setTimeout(() => setState(s => ({ ...s, visible: false })), 2400);
  }, []);

  return (
    <div className={`toast ${state.type} ${state.visible ? 'show' : ''}`}>
      {state.msg}
    </div>
  );
}

export const toast = {
  success: (msg) => _showToast?.(msg, 'success'),
  error: (msg) => _showToast?.(msg, 'error'),
};
