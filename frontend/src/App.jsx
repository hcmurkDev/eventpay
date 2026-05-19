import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toast } from './components/Toast';
import HomePage from './pages/HomePage';
import AttendeePage from './pages/AttendeePage';
import StallPage from './pages/StallPage';
import AdminPage from './pages/AdminPage';
import './index.css';

function AppInner() {
  const [tab, setTab] = useState(() => localStorage.getItem('ep_tab') || 'home');
  const { loading, role, logout } = useAuth();

  useEffect(() => {
    if (role && tab === 'home') {
      const dest = role === 'attendee' ? 'attendee' : role === 'stall' ? 'stall' : 'admin';
      changeTab(dest);
    }
    // If logged out, go home
    if (!role && tab !== 'home') {
      changeTab('home');
    }
  }, [role]);

  const changeTab = (t) => {
    setTab(t);
    localStorage.setItem('ep_tab', t);
  };

  const handleLogout = () => {
    logout();
    changeTab('home');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)', flexDirection: 'column', gap: '12px' }}>
        <i className="ti ti-ticket" style={{ fontSize: '32px', color: 'var(--accent)' }} />
        <div style={{ fontSize: '14px' }}>Loading EventPay…</div>
      </div>
    );
  }

  const isHome = tab === 'home';

  // Role-aware nav: only show what the current user needs
  // Not logged in → no bottom nav (home page handles entry)
  // Logged in → Home + Logout only (no cross-role tabs)
  const showNav = !isHome && role;

  return (
    <div className="app-shell">
      <Toast />
      <main style={{ paddingBottom: showNav ? '80px' : 0 }}>
        {tab === 'home'     && <HomePage onNavigate={changeTab} />}
        {tab === 'attendee' && <AttendeePage />}
        {tab === 'stall'    && <StallPage />}
        {tab === 'admin'    && <AdminPage />}
      </main>

      {showNav && (
        <nav className="bottom-nav">
          <button onClick={() => changeTab('home')}>
            <i className="ti ti-home nav-icon" aria-hidden="true" />
            <span>Home</span>
          </button>
          <button className="nav-role-label">
            <i className={`ti ${role === 'attendee' ? 'ti-ticket' : role === 'stall' ? 'ti-building-store' : 'ti-layout-dashboard'} nav-icon`} aria-hidden="true" />
            <span style={{ textTransform: 'capitalize' }}>{role === 'admin' ? 'Admin' : role === 'stall' ? 'Stall' : 'Wallet'}</span>
          </button>
          <button onClick={handleLogout} className="nav-logout">
            <i className="ti ti-logout nav-icon" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
