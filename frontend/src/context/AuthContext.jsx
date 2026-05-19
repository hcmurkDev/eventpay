import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRole]     = useState(null);
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token     = localStorage.getItem('ep_token');
    const savedRole = localStorage.getItem('ep_role');
    if (!token || !savedRole) { setLoading(false); return; }

    const restore = async () => {
      try {
        if (savedRole === 'attendee') {
          const { data } = await api.get('/attendees/me');
          setUser(data); setRole('attendee');
        } else if (savedRole === 'stall') {
          const { data } = await api.get('/stalls/me');
          setUser(data); setRole('stall');
        } else if (savedRole === 'admin') {
          setRole('admin');
        }
      } catch {
        // Token expired or invalid — clear everything
        localStorage.removeItem('ep_token');
        localStorage.removeItem('ep_role');
        localStorage.removeItem('ep_tab');
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = (token, userRole, userData = null) => {
    localStorage.setItem('ep_token', token);
    localStorage.setItem('ep_role', userRole);
    setRole(userRole);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('ep_token');
    localStorage.removeItem('ep_role');
    localStorage.removeItem('ep_tab');
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ role, user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
