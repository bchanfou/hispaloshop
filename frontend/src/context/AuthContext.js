import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../lib/authApi';
import { setUser as setSentryUser } from '../lib/sentry';

const AuthContext = createContext(null);

function normalizeRole(rawRole) {
  if (!rawRole) return null;
  const role = String(rawRole).toLowerCase().replace(/-/g, '_');

  const roleMap = {
    superadmin: 'super_admin',
    consumer: 'customer',
    seller: 'producer',
  };

  return roleMap[role] || role;
}

function normalizeUser(rawUser) {
  if (!rawUser) return null;

  const normalizedUser = { ...rawUser };
  const onboardingCompleted =
    normalizedUser.onboarding_completed ??
    normalizedUser.onboardingCompleted ??
    false;

  normalizedUser.role = normalizeRole(normalizedUser.role);
  normalizedUser.onboarding_completed = Boolean(onboardingCompleted);
  normalizedUser.onboardingCompleted = Boolean(onboardingCompleted);

  return normalizedUser;
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const checkingRef = useRef(false);

  const setUser = useCallback((value) => {
    if (typeof value === 'function') {
      setUserState((currentUser) => normalizeUser(value(currentUser)));
      return;
    }

    setUserState(normalizeUser(value));
  }, []);

  const checkAuth = useCallback(async () => {
    if (checkingRef.current) return user; // Prevent concurrent calls
    checkingRef.current = true;
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      const normalizedUser = normalizeUser(currentUser || null);

      if (mountedRef.current) {
        setUser(normalizedUser);
      }

      return normalizedUser;
    } catch (err) {
      if (mountedRef.current) {
        setUser(null);
      }
      return null;
    } finally {
      checkingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [setUser]);

  useEffect(() => {
    checkAuth();

    return () => {
      mountedRef.current = false;
    };
  }, [checkAuth]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.login(credentials);
      const normalizedUser = normalizeUser(data?.user || null);

      if (mountedRef.current) {
        setUser(normalizedUser);
        setInitialized(true);
      }

      if (normalizedUser) {
        setSentryUser({ id: normalizedUser.user_id, username: normalizedUser.username, email: normalizedUser.email });
      }

      return { ...data, user: normalizedUser };
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
  }, [setUser]);

  const register = useCallback(async (payload) => {
    setLoading(true);
    setError(null);

    try {
      const referralCode = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('ref')
        : null;
      const data = await authApi.register(payload, { ref: referralCode });
      const normalizedUser = normalizeUser(data?.user || null);

      if (mountedRef.current) {
        setUser(normalizedUser);
        setInitialized(true);
      }

      return { ...data, user: normalizedUser };
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
  }, [setUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (logoutError) {
      // silently handled
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setError(null);
        setInitialized(true);
      }
      setSentryUser(null);
    }
  }, [setUser]);

  const refreshUser = useCallback(async () => checkAuth(), [checkAuth]);

  const hasRole = useCallback((role) => user?.role === role, [user]);
  const hasAnyRole = useCallback((roles) => roles.includes(user?.role), [user]);
  const isOnboardingComplete = useCallback(() => user?.onboarding_completed === true, [user]);

  const role = user?.role || null;
  const onboarding_completed = Boolean(user?.onboarding_completed);

  const value = useMemo(() => ({
    user,
    setUser,
    loading,
    initialized,
    error,
    checkAuth,
    refreshUser,
    login,
    register,
    logout,
    role,
    onboarding_completed,
    hasRole,
    hasAnyRole,
    isOnboardingComplete,
    isAuthenticated: !!user,
  }), [
    user,
    setUser,
    loading,
    initialized,
    error,
    checkAuth,
    refreshUser,
    login,
    register,
    logout,
    role,
    onboarding_completed,
    hasRole,
    hasAnyRole,
    isOnboardingComplete,
  ]);

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
