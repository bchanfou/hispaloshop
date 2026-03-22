import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '../lib/authApi';
import { getToken, removeToken } from '../lib/auth';
import { setUser as setSentryUser } from '../lib/sentry';

const AuthContext = createContext(null);
const ACCOUNTS_KEY = 'hsp_accounts';

function accountId(accountLike) {
  return String(accountLike?.user_id || accountLike?.id || '');
}

function readStoredAccounts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(Array.isArray(accounts) ? accounts : []));
}

function upsertStoredAccount(account) {
  const id = accountId(account);
  if (!id) return;
  const accounts = readStoredAccounts();
  const idx = accounts.findIndex((a) => accountId(a) === id);
  if (idx >= 0) accounts[idx] = account;
  else accounts.push(account);
  writeStoredAccounts(accounts);
}

function removeStoredAccountById(userId) {
  const targetId = String(userId || '');
  if (!targetId) return;
  const accounts = readStoredAccounts();
  writeStoredAccounts(accounts.filter((a) => accountId(a) !== targetId));
}

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

function toAccountObject(user, token) {
  if (!user) return null;
  return {
    token: token || '',
    user_id: user.user_id || user.id,
    username: user.username,
    name: user.name || user.full_name,
    avatar_url: user.profile_image || user.avatar_url,
    email: user.email,
    role: user.role,
  };
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

        const token = data?.session_token || data?.access_token || localStorage.getItem('hispalo_access_token') || localStorage.getItem('hsp_token') || '';
        upsertStoredAccount(toAccountObject(normalizedUser, token));
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

      if (normalizedUser) {
        const token = data?.session_token || data?.access_token || localStorage.getItem('hispalo_access_token') || localStorage.getItem('hsp_token') || '';
        upsertStoredAccount(toAccountObject(normalizedUser, token));
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
    const prevToken = getToken() || '';
    const prevUser = user;
    try {
      if (!account?.token) throw new Error('missing account token');

      // Save current account to hsp_accounts before switching
      if (prevToken && user) {
        upsertStoredAccount(toAccountObject(user, prevToken));
      }

      // Set new account token
      localStorage.setItem('hispalo_access_token', account.token);
      localStorage.setItem('hsp_token', account.token);

      // Re-authenticate with new token
      const newUser = await checkAuth();

      // Update the switched account in localStorage with fresh data from server
      if (newUser) {
        upsertStoredAccount(toAccountObject(newUser, account.token));
      } else {
        throw new Error('Unable to resolve user for switched account');
      }
    } catch (err) {
      console.error('Switch account failed', err);
      toast.error('Error al cambiar de cuenta. Inicia sesión de nuevo.');
      // Remove invalid account from localStorage
      removeStoredAccountById(account?.user_id || account?.id);

      // Try to restore previous account token
      if (prevToken) {
        localStorage.setItem('hispalo_access_token', prevToken);
        localStorage.setItem('hsp_token', prevToken);
        if (prevUser) setUser(prevUser);
      } else {
        removeToken();
        if (mountedRef.current) setUser(null);
      }
    }
  }, [user, checkAuth, setUser]);

  const logoutAccount = useCallback(async (account) => {
    const targetId = accountId(account) || accountId(user);
    const currentId = accountId(user);
    const isActiveTarget = !targetId || targetId === currentId;

    if (isActiveTarget) {
      try {
        await authApi.logout();
      } catch {
        // silently handled
      }

      removeStoredAccountById(currentId);
      const remaining = readStoredAccounts();
      const fallback = remaining.find((a) => a?.token);

      if (fallback?.token) {
        localStorage.setItem('hispalo_access_token', fallback.token);
        localStorage.setItem('hsp_token', fallback.token);
        const nextUser = await checkAuth();
        if (nextUser) {
          upsertStoredAccount(toAccountObject(nextUser, fallback.token));
          return { switched: true, user: nextUser };
        }
      }

      removeToken();
      if (mountedRef.current) {
        setUser(null);
        setError(null);
        setInitialized(true);
      }
      setSentryUser(null);
      return { switched: false, user: null };
    }

    removeStoredAccountById(targetId);
    return { switched: false, user };
  }, [user, checkAuth, setUser]);

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
    logoutAccount,
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
    logoutAccount,
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
