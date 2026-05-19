import { useEffect, useRef, useState } from 'react';

/**
 * QrScanner — built on native getUserMedia + jsQR canvas loop.
 * No html5-qrcode, no React StrictMode double-mount issues,
 * no duplicate video elements, camera LED stops immediately on unmount.
 */
export default function QrScanner({ onScan, onClose }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const doneRef    = useRef(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const stopEverything = () => {
    // Cancel animation frame
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    // Stop all camera tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    // Clear video
    if (videoRef.current) { videoRef.current.srcObject = null; }
  };

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) { stream.getTracks().forEach(t => t.stop()); return; }

        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        await video.play();
        setReady(true);
        scan();
      } catch (err) {
        console.warn('Camera error:', err);
        setError('Camera not available. Use manual entry below.');
      }
    };

    const scan = () => {
      if (doneRef.current) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }

      const { videoWidth: w, videoHeight: h } = video;
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      // Dynamically import jsQR so it doesn't bloat initial bundle
      import('jsqr').then(({ default: jsQR }) => {
        if (doneRef.current) return;
        const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          doneRef.current = true;
          stopEverything();
          onScan(code.data.trim());
        } else {
          rafRef.current = requestAnimationFrame(scan);
        }
      });
    };

    start();

    return () => {
      cancelled = true;
      doneRef.current = true;
      stopEverything();
    };
  }, []);

  const handleCancel = () => {
    doneRef.current = true;
    stopEverything();
    onClose();
  };

  return (
    <div>
      {error ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
          <i className="ti ti-camera-off" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', color: 'var(--red)' }} />
          {error}
        </div>
      ) : (
        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
          {/* Single video element — the only viewfinder */}
          <video
            ref={videoRef}
            style={{ width: '100%', display: 'block', maxHeight: '320px', objectFit: 'cover' }}
            muted
            playsInline
          />
          {/* Targeting overlay */}
          {ready && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                width: '220px', height: '220px',
                border: '2px solid rgba(124,92,252,.8)',
                borderRadius: '16px',
                boxShadow: '0 0 0 9999px rgba(0,0,0,.45)',
              }} />
            </div>
          )}
          {/* Canvas is hidden — only used for pixel sampling */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      <button className="btn btn-ghost mt" onClick={handleCancel}>
        <i className="ti ti-x" style={{ marginRight: '6px' }} />
        Cancel Scanner
      </button>
    </div>
  );
}
