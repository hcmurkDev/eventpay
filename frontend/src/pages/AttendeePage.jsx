// import { useState, useEffect } from 'react';
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
//   const [email, setEmail]         = useState('');
//   const [loading, setLoading]     = useState(false);
//   const [transactions, setTransactions] = useState([]);

//   useEffect(() => {
//     if (role === 'attendee' && user) fetchTx();
//   }, [role, user]);

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
  const [email, setEmail]             = useState('');
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
    if (!email.trim()) return toast.error('Enter your email address');
    setLoading(true);
    try {
      const { data } = await api.post('/attendees/login', { email });
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
    <div className="fade-in">
      <div className="hero">
        <h1>Attendee Sign In</h1>
        <p>Enter the email you registered with</p>
      </div>

      <div className="card">
        <div className="form-row">
          <label>
            <i className="ti ti-mail" style={{ marginRight: '4px' }} />Email Address
          </label>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
        </div>
        <button className="btn btn-primary mt" disabled={loading} onClick={handleLogin}>
          {loading
            ? <><i className="ti ti-loader" style={{ marginRight: '6px' }} />Checking…</>
            : <><i className="ti ti-login" style={{ marginRight: '6px' }} />Sign In</>
          }
        </button>
        <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '14px', textAlign: 'center', lineHeight: 1.6 }}>
          <i className="ti ti-info-circle" style={{ marginRight: '4px' }} />
          Don't have access? Please purchase a ticket first.
        </p>
      </div>
      <nav className="bottom-nav">
        <button onClick={onHome} style={{ flex: 1 }}>
          <i className="ti ti-home nav-icon" />
          <span>Home</span>
        </button>
      </nav>
    </div>
  );
}