import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '../lib/authApi';
import { getToken, removeToken } from '../lib/auth';
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

  // Normalize avatar field — backend may return profile_image or picture
  const avatar = normalizedUser.avatar_url || normalizedUser.profile_image || normalizedUser.picture || null;
  normalizedUser.avatar_url = avatar;
  normalizedUser.avatar = avatar;

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

    // Skip API call if there's no token — avoids unnecessary 401 + refresh cycle
    if (!getToken()) {
      checkingRef.current = false;
      if (mountedRef.current) {
        setUser(null);
        setLoading(false);
        setInitialized(true);
      }
      return null;
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
      // If session check failed (e.g. 401), clear stale tokens from localStorage
      // so the API client doesn't keep sending expired Bearer headers
      removeToken();
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
      // Clear localStorage tokens so subsequent API calls don't send stale Bearer headers
      removeToken();
      if (mountedRef.current) {
        setUser(null);
        setError(null);
        setInitialized(true);
      }
      setSentryUser(null);
    }
  }, [setUser]);

  const switchAccount = useCallback(async (account) => {
    try {
      // Save current account to hsp_accounts before switching
      const currentToken = localStorage.getItem('hispalo_access_token') || localStorage.getItem('hsp_token');
      if (currentToken && user) {
        let accounts = [];
        try { accounts = JSON.parse(localStorage.getItem('hsp_accounts') || '[]'); } catch { accounts = []; }
        const idx = accounts.findIndex(a => String(a.user_id) === String(user.user_id || user.id));
        const currentObj = {
          token: currentToken,
          user_id: user.user_id || user.id,
          username: user.username,
          name: user.name || user.full_name,
          avatar_url: user.profile_image || user.avatar_url,
          email: user.email,
          role: user.role,
        };
        if (idx >= 0) accounts[idx] = currentObj;
        else accounts.push(currentObj);
        localStorage.setItem('hsp_accounts', JSON.stringify(accounts));
      }

      // Set new account token
      localStorage.setItem('hispalo_access_token', account.token);
      localStorage.setItem('hsp_token', account.token);

      // Re-authenticate with new token
      const newUser = await checkAuth();

      // Update the switched account in localStorage with fresh data from server
      if (newUser) {
        try {
          let accs = JSON.parse(localStorage.getItem('hsp_accounts') || '[]');
          const accIdx = accs.findIndex(a => String(a.user_id) === String(newUser.user_id || newUser.id));
          const freshObj = {
            token: account.token,
            user_id: newUser.user_id || newUser.id,
            username: newUser.username,
            name: newUser.name || newUser.full_name,
            avatar_url: newUser.profile_image || newUser.avatar_url,
            email: newUser.email,
            role: newUser.role,
          };
          if (accIdx >= 0) accs[accIdx] = freshObj;
          else accs.push(freshObj);
          localStorage.setItem('hsp_accounts', JSON.stringify(accs));
        } catch {}
      }
    } catch (err) {
      console.error('Switch account failed', err);
      toast.error('Error al cambiar de cuenta. Inicia sesión de nuevo.');
      // Remove invalid account from localStorage
      try {
        const accounts = JSON.parse(localStorage.getItem('hsp_accounts') || '[]');
        const filtered = accounts.filter(a => String(a.user_id) !== String(account.user_id));
        localStorage.setItem('hsp_accounts', JSON.stringify(filtered));
      } catch {}
    }
  }, [user, checkAuth]);

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
    switchAccount,
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
    switchAccount,
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
