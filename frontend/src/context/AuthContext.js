import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '../lib/authApi';
import { getToken, setToken, removeToken, TOKEN_KEY } from '../lib/auth';
import { setUser as setSentryUser } from '../lib/sentry';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const checkingRef = useRef(false);

  const authDebug = useCallback((event, payload = {}) => {
    if (process.env.NODE_ENV === 'production') return;
    console.info('[auth-debug]', event, payload);
  }, []);

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

    // Always hit /auth/me: Google OAuth establishes session via httpOnly cookie
    // and may not have a localStorage token yet.

    try {
      const currentUser = await authApi.getCurrentUser();
      const normalizedUser = normalizeUser(currentUser || null);
      const activeToken = getToken() || '';

      if (mountedRef.current) {
        setUser(normalizedUser);
      }

      if (normalizedUser && activeToken) {
        upsertStoredAccount(toAccountObject(normalizedUser, activeToken));
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

        const token = data?.session_token || data?.access_token || getToken() || '';
        if (token) setToken(token, data?.refresh_token);
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
        const token = data?.session_token || data?.access_token || getToken() || '';
        if (token) setToken(token, data?.refresh_token);
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
    const currentId = accountId(user);
    try {
      await authApi.logout();
    } catch (logoutError) {
      // silently handled
    } finally {
      if (currentId) {
        removeStoredAccountById(currentId);
      }
      // Clear all cached data from previous session
      queryClient.clear();
      // Clear localStorage tokens so subsequent API calls don't send stale Bearer headers
      removeToken();
      // Clear producer plan cache so next user doesn't see previous user's plan
      try { localStorage.removeItem('hsp_plan_cache'); } catch {}
      if (mountedRef.current) {
        setUser(null);
        setError(null);
        setInitialized(true);
      }
      setSentryUser(null);
    }
  }, [setUser, user]);

  const resolveUserFromActiveToken = useCallback(async () => {
    const currentUser = await authApi.getCurrentUser();
    const normalizedUser = normalizeUser(currentUser || null);
    if (mountedRef.current) {
      setUser(normalizedUser);
      setInitialized(true);
    }
    return normalizedUser;
  }, [setUser]);

  const switchAccount = useCallback(async (account) => {
    const prevToken = getToken() || '';
    const prevUser = user;
    authDebug('switch:start', {
      targetId: accountId(account),
      hasTargetToken: Boolean(account?.token),
      currentId: accountId(user),
      hasPrevToken: Boolean(prevToken),
    });
    try {
      if (!account?.token) {
        const error = new Error('missing account token');
        error.code = 'missing_token';
        throw error;
      }

      // Save current account to hsp_accounts before switching
      if (prevToken && user) {
        upsertStoredAccount(toAccountObject(user, prevToken));
      }

      // Set new account token
      localStorage.setItem(TOKEN_KEY, account.token);

      // Clear all cached data from previous account
      queryClient.clear();

      // Re-authenticate deterministically with the new token
      const newUser = await resolveUserFromActiveToken();

      // Update the switched account in localStorage with fresh data from server
      if (newUser) {
        upsertStoredAccount(toAccountObject(newUser, account.token));
        setSentryUser({ id: newUser.user_id, username: newUser.username, email: newUser.email });
        authDebug('switch:success', {
          targetId: accountId(account),
          resolvedId: accountId(newUser),
          username: newUser.username,
        });
        return { ok: true, user: newUser };
      } else {
        const error = new Error('Unable to resolve user for switched account');
        error.code = 'expired_or_invalid';
        throw error;
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Switch account failed', err);
      authDebug('switch:failed', {
        targetId: accountId(account),
        code: err?.code || 'switch_failed',
        message: err?.message || null,
      });
      const errorCode = err?.code || 'switch_failed';
      if (errorCode === 'missing_token' || errorCode === 'expired_or_invalid') {
        toast.error('La sesión guardada de esta cuenta ya no es válida. Se ha eliminado del dispositivo.');
      } else {
        toast.error('Error al cambiar de cuenta. Inicia sesión de nuevo.');
      }
      // Remove invalid account from localStorage
      removeStoredAccountById(account?.user_id || account?.id);

      // Try to restore previous account token
      if (prevToken) {
        localStorage.setItem(TOKEN_KEY, prevToken);
        if (prevUser) {
          setUser(prevUser);
          setSentryUser({ id: prevUser.user_id, username: prevUser.username, email: prevUser.email });
        }
      } else {
        removeToken();
        if (mountedRef.current) setUser(null);
      }
      return { ok: false, user: null, error: err, errorCode };
    }
  }, [user, resolveUserFromActiveToken, setUser, authDebug]);

  const logoutAccount = useCallback(async (account) => {
    const targetId = accountId(account) || accountId(user);
    const currentId = accountId(user);
    const isActiveTarget = !targetId || targetId === currentId;

    authDebug('logout-account:start', {
      targetId,
      currentId,
      isActiveTarget,
    });

    if (isActiveTarget) {
      try {
        await authApi.logout();
      } catch {
        // silently handled
      }

      removeStoredAccountById(currentId);
      const remaining = readStoredAccounts().filter((a) => a?.token);

      for (const fallback of remaining) {
        localStorage.setItem(TOKEN_KEY, fallback.token);
        authDebug('logout-account:fallback-attempt', {
          fallbackId: accountId(fallback),
          fallbackUsername: fallback?.username || null,
        });

        let nextUser = null;
        try {
          nextUser = await resolveUserFromActiveToken();
        } catch (err) {
          authDebug('logout-account:fallback-failed', {
            fallbackId: accountId(fallback),
            code: err?.code || null,
            message: err?.message || null,
          });
          nextUser = null;
        }

        if (nextUser) {
          upsertStoredAccount(toAccountObject(nextUser, fallback.token));
          setSentryUser({ id: nextUser.user_id, username: nextUser.username, email: nextUser.email });
          authDebug('logout-account:fallback-success', {
            fallbackId: accountId(fallback),
            resolvedId: accountId(nextUser),
            username: nextUser.username,
          });
          return { switched: true, user: nextUser };
        }

        removeStoredAccountById(fallback.user_id || fallback.id);
      }

      removeToken();
      if (mountedRef.current) {
        setUser(null);
        setError(null);
        setInitialized(true);
      }
      setSentryUser(null);
      authDebug('logout-account:ended-without-fallback', { targetId });
      return { switched: false, user: null };
    }

    removeStoredAccountById(targetId);
    authDebug('logout-account:removed-secondary', { targetId });
    return { switched: false, user };
  }, [user, resolveUserFromActiveToken, setUser, authDebug]);

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
