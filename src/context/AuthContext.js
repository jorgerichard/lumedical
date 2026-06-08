import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { authLogin, authRegister, getProfile } from '../services/api';

const AuthContext = createContext();

const parseJwt = (token) => {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

const getTokenExpiration = (token) => {
  const payload = parseJwt(token);
  return payload?.exp ? payload.exp * 1000 : null;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [expiresAt, setExpiresAt] = useState(() => {
    const tokenValue = localStorage.getItem('token');
    return tokenValue ? getTokenExpiration(tokenValue) : null;
  });
  const timeoutRef = useRef(null);

  const clearSessionTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setExpiresAt(null);
    clearSessionTimeout();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // allow other parts of app to react
    window.location.href = '/login';
  }, [clearSessionTimeout]);

  const scheduleSessionLogout = useCallback((tokenValue) => {
    clearSessionTimeout();
    const expiry = getTokenExpiration(tokenValue);
    if (!expiry) return;

    const now = Date.now();
    const delay = expiry - now;
    setExpiresAt(expiry);

    if (delay <= 0) {
      logout();
      return;
    }

    timeoutRef.current = setTimeout(() => {
      logout();
    }, delay);
  }, [clearSessionTimeout, logout]);

  useEffect(() => {
    const initializeSession = async () => {
      if (!token) {
        setInitializing(false);
        return;
      }

      if (user) {
        setInitializing(false);
        return;
      }

      try {
        const res = await getProfile();
        setUser(res.data.user || null);
        localStorage.setItem('user', JSON.stringify(res.data.user || null));
      } catch (e) {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setInitializing(false);
      }
    };

    initializeSession();
  }, [token, user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authLogin(email, password);
      const t = res.data.token;
      const u = res.data.user;
      setToken(t);
      setUser(u);
      localStorage.setItem('token', t);
      localStorage.setItem('user', JSON.stringify(u));
      scheduleSessionLogout(t);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const register = async (firstName, lastName, email, password, role) => {
    setLoading(true);
    try {
      const res = await authRegister(firstName, lastName, email, password, role);
      const t = res.data.token;
      const u = res.data.user;
      setToken(t);
      setUser(u);
      localStorage.setItem('token', t);
      localStorage.setItem('user', JSON.stringify(u));
      scheduleSessionLogout(t);
      return res;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = () => {
      logout();
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [logout]);

  useEffect(() => {
    if (token) {
      scheduleSessionLogout(token);
    } else {
      clearSessionTimeout();
      setExpiresAt(null);
    }
    return clearSessionTimeout;
  }, [token, scheduleSessionLogout, clearSessionTimeout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        initializing,
        expiresAt,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
