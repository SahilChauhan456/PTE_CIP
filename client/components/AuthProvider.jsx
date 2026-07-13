'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getUser, getToken, clearSession } from '@/lib/api';

const AuthContext = createContext({ user: null, ready: false, logout: () => {} });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getToken()) setUser(getUser());
    setReady(true);
  }, []);

  function logout() {
    clearSession();
    setUser(null);
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, setUser, ready, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
