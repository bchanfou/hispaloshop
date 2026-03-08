/**
 * AuthContext - Mejorado con manejo robusto de sesión
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../lib/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Verificar sesión al cargar
  const checkAuth = useCallback(async () => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      if (mountedRef.current) {
        setUser(currentUser || null);
      }
      return currentUser || null;
    } catch (err) {
      console.log('[Auth] No active session');
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

  // Login
  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.login(credentials);
      if (mountedRef.current) {
        setUser(data?.user || null);
        setInitialized(true);
      }
      return data;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Register
  const register = useCallback(async (payload) => {
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.register(payload);
      if (mountedRef.current) {
        setUser(data?.user || null);
        setInitialized(true);
      }
      return data;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setError(null);
      }
    }
  }, []);

  // Verificar si tiene rol específico
  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  // Verificar si tiene alguno de los roles
  const hasAnyRole = useCallback((roles) => {
    return roles.includes(user?.role);
  }, [user]);

  // Verificar si onboarding está completo
  const isOnboardingComplete = useCallback(() => {
    return user?.onboarding_completed === true;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      initialized,
      error,
      checkAuth,
      login,
      register,
      logout,
      hasRole,
      hasAnyRole,
      isOnboardingComplete,
      isAuthenticated: !!user,
    }),
    [user, loading, initialized, error, checkAuth, login, register, logout, hasRole, hasAnyRole, isOnboardingComplete]
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

export default AuthContext;
