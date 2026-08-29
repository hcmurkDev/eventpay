import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import QrScanner from '../components/QrScanner';
import { toast } from '../components/Toast';
import api from '../utils/api';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const KEYS = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];

function Numpad({ onConfirm, maxCredits }) {
  const [display, setDisplay] = useState('0');
  const amountRef = useRef('');

  const press = useCallback((k) => {
    if (k === '⌫') {
      amountRef.current = amountRef.current.slice(0, -1);
    } else if (k === '✓') {
      const val = parseInt(amountRef.current || '0');
      if (!val) { toast.error('Enter an amount first'); return; }
      if (val > maxCredits) { toast.error(`Max available: ${maxCredits} credits`); return; }
      onConfirm(val);
      amountRef.current = '';
      setDisplay('0');
      return;
    } else {
      if (amountRef.current.length >= 4) return;
      amountRef.current += k;
    }
    setDisplay(String(parseInt(amountRef.current || '0')));
  }, [onConfirm, maxCredits]);

  return (
    <div>
      <div className="amount-display">{display}</div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', marginBottom: '8px' }}>credits to deduct</div>
      <div className="numpad">
        {KEYS.map(k => (
          <button
            key={k}
            className={`numpad-btn ${k === '✓' ? 'numpad-confirm' : k === '⌫' ? 'numpad-cancel' : ''}`}
            onPointerDown={e => { e.preventDefault(); press(k); }}>
            {k === '⌫'
              ? <i className="ti ti-backspace" style={{ fontSize: '20px' }} />
              : k === '✓'
              ? <i className="ti ti-check" style={{ fontSize: '20px' }} />
              : k}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StallPage({ onHome }) {
  const { user, setUser, login, role } = useAuth();
  const [stallEmail, setStallEmail] = useState('');
  const [loading, setLoading]       = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [scanning, setScanning]     = useState(false);
  const [attendee, setAttendee]     = useState(null);
  const [charging, setCharging]     = useState(false);

  useEffect(() => {
    if (role === 'stall' && user) fetchTx();
  }, [role, user]);

  const fetchTx = async () => {
    try {
      const { data } = await api.get('/stalls/me/transactions');
      setTransactions(data);
    } catch {}
  };

  const refreshMe = async () => {
    try {
      const { data } = await api.get('/stalls/me');
      setUser(data);
      fetchTx();
    } catch {}
  };

  const handleLogin = async () => {
    if (!stallEmail.trim()) return toast.error('Enter your email address');
    setLoading(true);
    try {
      const { data } = await api.post('/stalls/login', { email: stallEmail });
      login(data.token, 'stall', data.stall);
      toast.success('Welcome back, ' + data.stall.name + '!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Stall not found');
    } finally { setLoading(false); }
  };

  const onQrScan = async (qrId) => {
    setScanning(false);
    try {
      const { data } = await api.get('/stalls/attendee/' + qrId);
      setAttendee(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Attendee not found');
    }
  };

  const handleManualLoad = async () => {
    const val = document.getElementById('manualQrInput')?.value?.trim();
    if (!val) return toast.error('Paste an attendee ID');
    await onQrScan(val);
    if (document.getElementById('manualQrInput')) {
      document.getElementById('manualQrInput').value = '';
    }
  };

  const handleCharge = useCallback(async (amount) => {
    if (!attendee) return;
    setCharging(true);
    try {
      const { data } = await api.post('/stalls/charge', { attendee_id: attendee.id, amount });
      toast.success(`Charged ${amount} credits from ${data.attendee_name}`);
      setAttendee(null);
      refreshMe();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Charge failed');
    } finally { setCharging(false); }
  }, [attendee]);

  if (role === 'stall' && user) {
    return (
      <div className="fade-in" style={{ paddingBottom: '80px' }}>
        <div className="hero">
          <h1>Stall Owner</h1>
          <p>Sign in to your stall</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className="pill-row">
            <span className="tag tag-amber">
              <i className="ti ti-building-store" style={{ marginRight: '4px' }} />{user.name}
            </span>
            <span className="tag tag-green">
              <i className="ti ti-circle-check" style={{ marginRight: '4px' }} />Open
            </span>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>
            <i className="ti ti-coin" style={{ marginRight: '4px' }} />Credits Earned Today
          </div>
          <div style={{ fontSize: '52px', fontWeight: 700, color: 'var(--amber)', lineHeight: 1 }}>{user.earned}</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </div>
          <button className="btn btn-ghost btn-sm mt" onClick={refreshMe}>
            <i className="ti ti-refresh" style={{ marginRight: '4px' }} />Refresh
          </button>
        </div>

        <div className="card">
          <div className="card-title">
            <i className="ti ti-scan" style={{ marginRight: '6px' }} />Charge an Attendee
          </div>

          {!attendee && !scanning && (
            <>
              <button className="btn btn-primary" onClick={() => setScanning(true)}>
                <i className="ti ti-camera" style={{ marginRight: '8px' }} />Scan Attendee QR Code
              </button>
              <hr className="divider" />
              <div className="card-title">Or Paste QR ID Manually</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input id="manualQrInput" placeholder="Attendee UUID" style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={handleManualLoad}>
                  <i className="ti ti-arrow-right" />
                </button>
              </div>
            </>
          )}

          {scanning && (
            <QrScanner onScan={onQrScan} onClose={() => setScanning(false)} />
          )}

          {attendee && (
            <div>
              <div className="user-info-row">
                <div className="user-avatar">{attendee.name[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{attendee.name}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--green)' }}>
                    {attendee.credits} <span style={{ fontSize: '13px', fontWeight: 400 }}>credits</span>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setAttendee(null)}>
                  <i className="ti ti-x" />
                </button>
              </div>
              {charging
                ? <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)' }}>
                    <i className="ti ti-loader" style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }} />
                    Processing…
                  </div>
                : <Numpad onConfirm={handleCharge} maxCredits={attendee.credits} />
              }
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <i className="ti ti-history" style={{ marginRight: '6px' }} />Recent Transactions
          </div>
          {transactions.length === 0
            ? <div className="empty-state">No transactions yet</div>
            : transactions.slice(0, 15).map(tx => (
              <div className="tx-item" key={tx.id}>
                <div>
                  <div className="tx-name">{tx.attendee_name}</div>
                  <div className="tx-time">{formatTime(tx.created_at)}</div>
                </div>
                <div className="tx-amount" style={{ color: 'var(--green)' }}>+{tx.amount}</div>
              </div>
            ))
          }
        </div>
      </div>
    );
  }

return (
  <div className="attendee-page fade-in">

    {/* HEADER */}
    <header className="attendee-header">

      <button
        className="attendee-brand"
        onClick={onHome}
        type="button"
      >
        <span className="attendee-brand-mark">
          <i className="ti ti-seedling" />
        </span>

        <span>
          <strong>Farmers Pitso</strong>
          <small>EVENTPAY 2026</small>
        </span>
      </button>

      <div className="attendee-header-event">
        <span>SEPTEMBER 12, 2026</span>
        <strong>Manthabiseng Convention Centre</strong>
      </div>

    </header>


    {/* BACK BUTTON */}
    <button
      className="attendee-back-btn"
      onClick={onHome}
      type="button"
    >
      <i className="ti ti-arrow-left" />
      <span>Back to Farmers Pitso</span>
    </button>


    {/* MAIN */}
    <main className="attendee-login">

      {/* LEFT / LOGIN */}
      <section className="attendee-login-panel">

        <div className="attendee-login-heading">

          <span className="attendee-eyebrow">
            <i className="ti ti-building-store" />
            STALL ACCESS
          </span>

          <h1>
            Welcome back to<br />
            <em>Farmers Pitso.</em>
          </h1>

          <p>
            Sign in to your stall account to start accepting
            cashless payments from attendees.
          </p>

        </div>


        <form
          className="attendee-login-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >

          <div className="attendee-field">

            <label htmlFor="stall-email">
              <span>
                <i className="ti ti-mail" />
                Email Address
              </span>

              <small>
                Email registered by the organizer
              </small>
            </label>

            <div className="attendee-input-wrap">

              <i className="ti ti-mail attendee-input-icon" />

              <input
                id="stall-email"
                type="email"
                placeholder="your@email.com"
                value={stallEmail}
                onChange={e => setStallEmail(e.target.value)}
                autoFocus
                autoComplete="email"
              />

            </div>

          </div>


          <button
            className="attendee-signin-btn"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="ti ti-loader attendee-spin" />
                Checking stall...
              </>
            ) : (
              <>
                Open my stall
                <i className="ti ti-arrow-right" />
              </>
            )}
          </button>

        </form>


        <div className="attendee-login-help">

          <i className="ti ti-info-circle" />

          <p>
            Can't access your stall?
            <span> Contact the event organizer.</span>
          </p>

        </div>

      </section>


      {/* RIGHT / STALL CARD */}
      <aside className="attendee-event-panel">

        <div className="attendee-event-glow" />

        <div className="attendee-event-content">

          <span className="attendee-event-label">
            YOUR STALL DASHBOARD
          </span>

          <div className="attendee-wallet-icon">
            <i className="ti ti-building-store" />
          </div>

          <h2>
            Run your stall,
            <br />
            <span>cashless & simple.</span>
          </h2>

          <p>
            EventPay makes it easy to accept attendee payments
            and keep track of everything you earn.
          </p>


          <div className="attendee-benefits">

            <div>
              <span className="benefit-icon">
                <i className="ti ti-scan" />
              </span>

              <span>
                <strong>Scan attendee QR</strong>
                <small>Quickly load a customer's wallet</small>
              </span>
            </div>


            <div>
              <span className="benefit-icon">
                <i className="ti ti-coin" />
              </span>

              <span>
                <strong>Accept credits</strong>
                <small>Charge purchases instantly</small>
              </span>
            </div>


            <div>
              <span className="benefit-icon">
                <i className="ti ti-chart-bar" />
              </span>

              <span>
                <strong>Track your sales</strong>
                <small>Monitor transactions and earnings</small>
              </span>
            </div>

          </div>

        </div>


        <div className="attendee-event-footer">
          <i className="ti ti-map-pin" />
          Manthabiseng Convention Centre
        </div>

      </aside>

    </main>


    <footer className="attendee-footer">
      <span>
        EventPay • Farmers Pitso 2026
      </span>
    </footer>

  </div>
);
}