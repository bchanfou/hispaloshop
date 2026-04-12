import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '../lib/authApi';
import { getToken, setToken, removeToken, TOKEN_KEY, isTokenExpired } from '../lib/auth';
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

function removeStoredAccountByToken(token) {
  const targetToken = String(token || '');
  if (!targetToken) return;
  const accounts = readStoredAccounts();
  writeStoredAccounts(accounts.filter((a) => String(a?.token || '') !== targetToken));
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

    // Guard: if no localStorage token AND not in an OAuth callback,
    // skip /auth/me to prevent a stale httpOnly cookie from creating a ghost session.
    // OAuth callbacks arrive with ?code= or ?state= params and may only have a cookie.
    const hasToken = !!getToken();
    const search = window.location.search || '';
    const isOAuthCallback = search.includes('code=') || search.includes('state=');

    if (!hasToken && !isOAuthCallback) {
      if (mountedRef.current) {
        setUser(null);
        setLoading(false);
        setInitialized(true);
      }
      checkingRef.current = false;
      return null;
    }

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
      const status = err?.status ?? err?.response?.status;
      const isAuthFailure = status === 401 || status === 403;

      if (isAuthFailure) {
        const activeToken = getToken() || '';
        if (activeToken) {
          // Policy 1-B: invalidate only the active broken session, keep other saved accounts.
          removeStoredAccountByToken(activeToken);
        }
        if (mountedRef.current) {
          setUser(null);
        }
        // Only clear tokens when backend explicitly rejects auth.
        removeToken();
        return null;
      }

      // Network/server/transient errors should not force logout.
      if (mountedRef.current) {
        setError(err);
      }

      const activeToken = getToken() || '';
      if (!user && activeToken) {
        const fallbackAccount = readStoredAccounts().find((a) => String(a?.token || '') === activeToken);
        const fallbackUser = normalizeUser(fallbackAccount || null);
        if (fallbackUser && mountedRef.current) {
          setUser(fallbackUser);
        }
        if (fallbackUser) {
          return fallbackUser;
        }
      }

      return user;
    } finally {
      checkingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [setUser, user]);

  useEffect(() => {
    checkAuth();

    return () => {
      mountedRef.current = false;
    };
  }, [checkAuth]);

  // Multi-tab sync: detect token removal from another tab and force logout
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === TOKEN_KEY && !e.newValue && e.oldValue) {
        // Token was removed in another tab — reload to clean state
        window.location.href = '/login';
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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

        // GDPR 4.1: Link anonymous cookie consents to authenticated user
        try { const { linkConsentToUser } = await import('../components/ui/ConsentBanner'); linkConsentToUser(); } catch { /* noop */ }
      }

      // GDPR 4.1: Reactivated account toast
      if (data?.reactivated) {
        return { ...data, user: normalizedUser, reactivated: true };
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

        // GDPR 4.1: Link anonymous cookie consents to authenticated user
        try { const { linkConsentToUser } = await import('../components/ui/ConsentBanner'); linkConsentToUser(); } catch { /* noop */ }
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

  // Normal "logout" — closes ONLY the active account. If other saved
  // accounts remain, auto-switches to the first valid one (IG/Twitter behavior).
  // Falls back to /login only when no other valid account exists.
  // B6 fix (4.5d): previously logout() navigated to /login even when other
  // accounts existed, which the founder perceived as "all accounts closed".
  const logout = useCallback(async () => {
    const currentId = accountId(user);
    try {
      await authApi.logout();
    } catch (logoutError) {
      // silently handled — server-side cookie invalidation is best-effort
    }

    // Remove ONLY the current account from stored accounts — never wipe the list.
    if (currentId) {
      removeStoredAccountById(currentId);
    }

    // Look for a valid fallback account to auto-switch to.
    const remaining = readStoredAccounts().filter((a) => a?.token);
    const validFallback = remaining.find((a) => !isTokenExpired(a.token));

    // Clear caches scoped to the session we're leaving (safe for both paths)
    queryClient.clear();
    try { localStorage.removeItem('hsp_plan_cache'); } catch (e) { /* noop */ }

    if (validFallback) {
      // Auto-switch: set fallback token and reload. Same pattern as switchAccount
      // to avoid cookie mismatch between the just-logged-out session and the
      // fallback account.
      localStorage.setItem(TOKEN_KEY, validFallback.token);
      authDebug('logout:fallback-reload', {
        fallbackId: accountId(validFallback),
        fallbackUsername: validFallback?.username || null,
      });
      window.location.href = '/';
      return;
    }

    // No valid fallback — drop to login, clean up any stale entries.
    for (const stale of remaining) {
      removeStoredAccountById(stale.user_id || stale.id);
    }
    removeToken();
    setSentryUser(null);
    window.location.href = '/login';
  }, [user, queryClient, authDebug]);

  const switchAccount = useCallback(async (account) => {
    authDebug('switch:start', {
      targetId: accountId(account),
      hasTargetToken: Boolean(account?.token),
      currentId: accountId(user),
    });

    // ── Guard: missing token ──
    if (!account?.token) {
      toast.error('Token de cuenta no encontrado. Inicia sesión de nuevo.');
      removeStoredAccountById(account?.user_id || account?.id);
      return { ok: false, errorCode: 'missing_token' };
    }

    // ── Guard: expired JWT (local check, no API call) ──
    if (isTokenExpired(account.token)) {
      authDebug('switch:token_expired', { targetId: accountId(account) });
      toast.error('La sesión de esta cuenta ha expirado. Inicia sesión de nuevo.');
      removeStoredAccountById(account?.user_id || account?.id);
      return { ok: false, errorCode: 'token_expired' };
    }

    // ── Save current account before overwriting ──
    const prevToken = getToken() || '';
    if (prevToken && user) {
      upsertStoredAccount(toAccountObject(user, prevToken));
    }

    // ── Set target account token + clear caches ──
    localStorage.setItem(TOKEN_KEY, account.token);
    try { localStorage.removeItem('hsp_plan_cache'); } catch { /* noop */ }

    // ── Full page reload ──
    // This destroys all stale React state, closures, and the httpOnly cookie
    // mismatch (cookie belongs to user A but we want user B). On reload,
    // checkAuth() sends Bearer B → backend authenticates B and sets fresh cookie.
    // Instagram and Twitter also reload on account switch — it's the safe approach.
    authDebug('switch:reload', { targetId: accountId(account) });
    window.location.href = '/';
    // Return ok:true so callers don't show error toasts before the reload fires
    return { ok: true };
  }, [user, authDebug]);

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

      // Clear plan cache on any active-account logout (prevent stale plan gate for next user)
      try { localStorage.removeItem('hsp_plan_cache'); } catch (e) { /* noop */ }

      removeStoredAccountById(currentId);
      const remaining = readStoredAccounts().filter((a) => a?.token);

      // Find a valid fallback account (non-expired token)
      const validFallback = remaining.find((a) => !isTokenExpired(a.token));

      if (validFallback) {
        // Set fallback token and reload — same pattern as switchAccount
        // to avoid cookie mismatch between the just-logged-out session
        // and the fallback account.
        localStorage.setItem(TOKEN_KEY, validFallback.token);
        authDebug('logout-account:fallback-reload', {
          fallbackId: accountId(validFallback),
          fallbackUsername: validFallback?.username || null,
        });
        window.location.href = '/';
        return { switched: true, user: null };
      }

      // No valid fallback — clean up all stale accounts and go to login
      for (const stale of remaining) {
        removeStoredAccountById(stale.user_id || stale.id);
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
  }, [user, setUser, authDebug]);

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
