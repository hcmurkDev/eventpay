

// import { useState, useEffect, useRef } from 'react';
// import { QRCodeSVG } from 'qrcode.react';
// import { useAuth } from '../context/AuthContext';
// import CreditRing from '../components/CreditRing';
// import { toast } from '../components/Toast';
// import api from '../utils/api';

// function formatTime(iso) {
//   return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
// }

// export default function AttendeePage({ onHome }) {
//   const { user, setUser, login, role } = useAuth();
//   const [email, setEmail]             = useState('');
//   const [loading, setLoading]         = useState(false);
//   const [transactions, setTransactions] = useState([]);
//   const sseRef = useRef(null); // hold the EventSource reference

//   useEffect(() => {
//     if (role === 'attendee' && user) {
//       fetchTx();
//       connectSSE();
//     }

//     // Cleanup SSE when component unmounts or user logs out
//     return () => {
//       if (sseRef.current) {
//         sseRef.current.close();
//         sseRef.current = null;
//       }
//     };
//   }, [role, user?.id]);

//   const connectSSE = () => {
//     // Don't open a second connection if one already exists
//     if (sseRef.current) return;

//     const token = localStorage.getItem('ep_token');
//     const url = `${import.meta.env.VITE_API_URL}/attendees/events?token=${token}`;

//     const es = new EventSource(url);

//     es.onopen = () => {
//       console.log('SSE connected');
//     };

//     es.onmessage = (e) => {
//       const { credits } = JSON.parse(e.data);
//       // Update credits in state instantly without a full refresh
//       setUser(prev => ({ ...prev, credits }));
//       // Also fetch latest transactions so the list updates too
//       fetchTx();
//       toast.success('Credits updated!');
//     };

//     es.onerror = () => {
//       console.log('SSE error — will retry automatically');
//     };

//     sseRef.current = es;
//   };

//   const fetchTx = async () => {
//     try {
//       const { data } = await api.get('/attendees/me/transactions');
//       setTransactions(data);
//     } catch {}
//   };

//   const refreshMe = async () => {
//     try {
//       const { data } = await api.get('/attendees/me');
//       setUser(data);
//       fetchTx();
//     } catch {}
//   };

//   const handleLogin = async () => {
//     if (!email.trim()) return toast.error('Enter your email address');
//     setLoading(true);
//     try {
//       const { data } = await api.post('/attendees/login', { email });
//       login(data.token, 'attendee', data.attendee);
//       toast.success('Welcome, ' + data.attendee.name + '!');
//     } catch (err) {
//       toast.error(err.response?.data?.error || 'Login failed');
//     } finally { setLoading(false); }
//   };

//   if (role === 'attendee' && user) {
//     return (
//       <div className="fade-in">
//         <div className="hero">
//           <h1>My Wallet</h1>
//           <p>Show your QR code at any stall</p>
//         </div>

//         <div className="card" style={{ textAlign: 'center' }}>
//           <div className="pill-row">
//             <span className="tag tag-purple">
//               <i className="ti ti-user" style={{ marginRight: '4px' }} />{user.name}
//             </span>
//             <span className="tag tag-green">
//               <i className="ti ti-circle-check" style={{ marginRight: '4px' }} />Active
//             </span>
//           </div>
//           <CreditRing credits={user.credits} />
//           <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
//             <i className="ti ti-qrcode" style={{ marginRight: '4px' }} />
//             Show this QR at any stall
//           </p>
//           <div className="qr-box">
//             <QRCodeSVG value={user.id} size={190} level="M" />
//           </div>
//           <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{user.id}</p>
//           <button className="btn btn-ghost btn-sm mt" onClick={refreshMe}>
//             <i className="ti ti-refresh" style={{ marginRight: '4px' }} />Refresh
//           </button>
//         </div>

//         <div className="card">
//           <div className="card-title">
//             <i className="ti ti-receipt" style={{ marginRight: '6px' }} />Transaction History
//           </div>
//           {transactions.length === 0
//             ? <div className="empty-state">No transactions yet — go visit a stall!</div>
//             : transactions.map(tx => (
//               <div className="tx-item" key={tx.id}>
//                 <div>
//                   <div className="tx-name">{tx.stall_name}</div>
//                   <div className="tx-time">{formatTime(tx.created_at)}</div>
//                 </div>
//                 <div className="tx-amount" style={{ color: 'var(--red)' }}>-{tx.amount}</div>
//               </div>
//             ))
//           }
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="fade-in">
//       <div className="hero">
//         <h1>Attendee Sign In</h1>
//         <p>Enter the email you registered with</p>
//       </div>

//       <div className="card">
//         <div className="form-row">
//           <label>
//             <i className="ti ti-mail" style={{ marginRight: '4px' }} />Email Address
//           </label>
//           <input
//             type="email"
//             placeholder="you@email.com"
//             value={email}
//             onChange={e => setEmail(e.target.value)}
//             onKeyDown={e => e.key === 'Enter' && handleLogin()}
//             autoFocus
//           />
//         </div>
//         <button className="btn btn-primary mt" disabled={loading} onClick={handleLogin}>
//           {loading
//             ? <><i className="ti ti-loader" style={{ marginRight: '6px' }} />Checking…</>
//             : <><i className="ti ti-login" style={{ marginRight: '6px' }} />Sign In</>
//           }
//         </button>
//         <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '14px', textAlign: 'center', lineHeight: 1.6 }}>
//           <i className="ti ti-info-circle" style={{ marginRight: '4px' }} />
//           Don't have access? Please purchase a ticket first.
//         </p>
//       </div>
//       <nav className="bottom-nav">
//         <button onClick={onHome} style={{ flex: 1 }}>
//           <i className="ti ti-home nav-icon" />
//           <span>Home</span>
//         </button>
//       </nav>
//     </div>
//   );
// }


import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import CreditRing from '../components/CreditRing';
import { toast } from '../components/Toast';
import api from '../utils/api';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AttendeePage({ onHome }) {
  const { user, setUser, login, role } = useAuth();
  const [ticketCode, setTicketCode]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [transactions, setTransactions] = useState([]);
  const sseRef = useRef(null); // hold the EventSource reference

  useEffect(() => {
    if (role === 'attendee' && user) {
      fetchTx();
      connectSSE();
    }

    // Cleanup SSE when component unmounts or user logs out
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [role, user?.id]);

  const connectSSE = () => {
    // Don't open a second connection if one already exists
    if (sseRef.current) return;

    const token = localStorage.getItem('ep_token');
    const url = `${import.meta.env.VITE_API_URL}/attendees/events?token=${token}`;

    const es = new EventSource(url);

    es.onopen = () => {
      console.log('SSE connected');
    };

    es.onmessage = (e) => {
      const { credits } = JSON.parse(e.data);
      // Update credits in state instantly without a full refresh
      setUser(prev => ({ ...prev, credits }));
      // Also fetch latest transactions so the list updates too
      fetchTx();
      toast.success('Credits updated!');
    };

    es.onerror = () => {
      console.log('SSE error — will retry automatically');
    };

    sseRef.current = es;
  };

  const fetchTx = async () => {
    try {
      const { data } = await api.get('/attendees/me/transactions');
      setTransactions(data);
    } catch {}
  };

  const refreshMe = async () => {
    try {
      const { data } = await api.get('/attendees/me');
      setUser(data);
      fetchTx();
    } catch {}
  };

  const handleLogin = async () => {
    if (!ticketCode.trim()) return toast.error('Enter your ticket code');
    setLoading(true);
    try {
      const { data } = await api.post('/attendees/login', { ticket_code: ticketCode });
      login(data.token, 'attendee', data.attendee);
      toast.success('Welcome, ' + data.attendee.name + '!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  if (role === 'attendee' && user) {
    return (
      <div className="fade-in">
        <div className="hero">
          <h1>My Wallet</h1>
          <p>Show your QR code at any stall</p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div className="pill-row">
            <span className="tag tag-purple">
              <i className="ti ti-user" style={{ marginRight: '4px' }} />{user.name}
            </span>
            <span className="tag tag-green">
              <i className="ti ti-circle-check" style={{ marginRight: '4px' }} />Active
            </span>
          </div>
          <CreditRing credits={user.credits} />
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
            <i className="ti ti-qrcode" style={{ marginRight: '4px' }} />
            Show this QR at any stall
          </p>
          <div className="qr-box">
            <QRCodeSVG value={user.id} size={190} level="M" />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{user.id}</p>
          <button className="btn btn-ghost btn-sm mt" onClick={refreshMe}>
            <i className="ti ti-refresh" style={{ marginRight: '4px' }} />Refresh
          </button>
        </div>

        <div className="card">
          <div className="card-title">
            <i className="ti ti-receipt" style={{ marginRight: '6px' }} />Transaction History
          </div>
          {transactions.length === 0
            ? <div className="empty-state">No transactions yet — go visit a stall!</div>
            : transactions.map(tx => (
              <div className="tx-item" key={tx.id}>
                <div>
                  <div className="tx-name">{tx.stall_name}</div>
                  <div className="tx-time">{formatTime(tx.created_at)}</div>
                </div>
                <div className="tx-amount" style={{ color: 'var(--red)' }}>-{tx.amount}</div>
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
            <i className="ti ti-ticket" />
            ATTENDEE ACCESS
          </span>

          <h1>
            Welcome to<br />
            <em>Farmers Pitso.</em>
          </h1>

          <p>
            Enter the ticket code from your ticket to access
            your EventPay wallet.
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

            <label htmlFor="ticket-code">
              <span>
                <i className="ti ti-ticket" />
                Ticket Code
              </span>

              <small>
                From your event ticket
              </small>
            </label>

            <div className="attendee-input-wrap">

              <i className="ti ti-ticket attendee-input-icon" />

              <input
                id="ticket-code"
                type="text"
                placeholder="e.g. ABC-1234"
                value={ticketCode}
                onChange={e => setTicketCode(e.target.value)}
                autoFocus
                autoComplete="off"
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
                Checking ticket...
              </>
            ) : (
              <>
                Sign in to my wallet
                <i className="ti ti-arrow-right" />
              </>
            )}

          </button>

        </form>


        <div className="attendee-login-help">

          <i className="ti ti-info-circle" />

          <p>
            Don't have access yet?
            <span> Please purchase a ticket first.</span>
          </p>

        </div>

      </section>


      {/* RIGHT / EVENT CARD */}
      <aside className="attendee-event-panel">

        <div className="attendee-event-glow" />

        <div className="attendee-event-content">

          <span className="attendee-event-label">
            YOUR DIGITAL WALLET
          </span>

          <div className="attendee-wallet-icon">
            <i className="ti ti-wallet" />
          </div>

          <h2>
            Everything you need,
            <br />
            <span>in one place.</span>
          </h2>

          <p>
            Your EventPay wallet lets you enjoy Farmers Pitso
            without carrying cash.
          </p>


          <div className="attendee-benefits">

            <div>
              <span className="benefit-icon">
                <i className="ti ti-bolt" />
              </span>

              <span>
                <strong>Fast & cashless</strong>
                <small>Pay at participating stalls</small>
              </span>
            </div>


            <div>
              <span className="benefit-icon">
                <i className="ti ti-qrcode" />
              </span>

              <span>
                <strong>Your own QR wallet</strong>
                <small>Show your QR when purchasing</small>
              </span>
            </div>


            <div>
              <span className="benefit-icon">
                <i className="ti ti-chart-bar" />
              </span>

              <span>
                <strong>Track your spending</strong>
                <small>See your transaction history</small>
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


    {/* MOBILE / GENERAL FOOTER */}
    <footer className="attendee-footer">



      <span>
        EventPay • Farmers Pitso 2026
      </span>

    </footer>

  </div>
);
}