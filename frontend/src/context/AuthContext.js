import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../lib/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const mountedRef = useRef(true);

  const checkAuth = useCallback(async () => {
    if (mountedRef.current) {
      setLoading(true);
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      if (mountedRef.current) {
        setUser(currentUser || null);
      }
      return currentUser || null;
    } catch {
      if (mountedRef.current) {
        setUser(null);
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, []);

  useEffect(() => {
    checkAuth();

    return () => {
      mountedRef.current = false;
    };
  }, [checkAuth]);

  const login = useCallback(async (credentials) => {
    setLoading(true);

    try {
      const data = await authApi.login(credentials);
      if (mountedRef.current) {
        setUser(data?.user || null);
        setInitialized(true);
      }
      return data;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      if (mountedRef.current) {
        setUser(null);
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      initialized,
      checkAuth,
      login,
      logout,
    }),
    [user, loading, initialized, checkAuth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
