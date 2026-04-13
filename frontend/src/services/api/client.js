import axios from 'axios';
import { getRefreshToken, getToken, removeToken, setToken } from '../../lib/auth';
import { getApiUrl } from '../../utils/api';
import { showNetworkError, showServerError } from '../toastManager';

export const API_BASE_URL = getApiUrl();

// Online/offline awareness
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { isOnline = true; });
  window.addEventListener('offline', () => { isOnline = false; });
}

function generateRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeApiError(error) {
  const detail = error?.response?.data?.detail;
  let message;

  if (Array.isArray(detail)) {
    // FastAPI 422 validation errors: [{loc: [...], msg: "...", type: "..."}]
    message = detail
      .map((e) => {
        const field = (e.loc || []).filter((l) => l !== 'body').join('.');
        return field ? `${field}: ${e.msg}` : e.msg;
      })
      .join('. ');
  } else if (typeof detail === 'object' && detail !== null) {
    // Structured error: {message: "...", issues: [...]}
    message = detail.message || JSON.stringify(detail);
  } else {
    message = detail || error?.response?.data?.message || error?.message || 'API request failed';
  }

  const apiError = new Error(message);
  apiError.name = 'ApiClientError';
  apiError.status = error?.response?.status ?? 0;
  apiError.code = error?.code ?? null;
  apiError.data = error?.response?.data ?? null;
  apiError.requestId =
    error?.response?.headers?.['x-request-id'] ||
    error?.response?.headers?.['x-correlation-id'] ||
    error?.response?.data?.request_id ||
    null;
  return apiError;
}

function isAuthInvalidError(error) {
  const status = error?.response?.status;
  return status === 400 || status === 401 || status === 403;
}

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'X-Client-Version': '1.0.0',
  },
});

// --- Refresh queue: ensures only ONE refresh runs at a time ---
let isRefreshing = false;
let failedQueue = []; // { resolve, reject } entries waiting for refresh

function removeStoredAccountByToken(token) {
  const targetToken = String(token || '');
  if (!targetToken) return;
  try {
    const raw = localStorage.getItem('hsp_accounts');
    if (!raw) return;
    const accounts = JSON.parse(raw);
    if (!Array.isArray(accounts)) return;
    const filtered = accounts.filter((a) => String(a?.token || '') !== targetToken);
    localStorage.setItem('hsp_accounts', JSON.stringify(filtered));
  } catch {
    // Best effort only.
  }
}

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
}

async function refreshSession() {
  // Backend uses httpOnly session_token cookie for refresh (not body token).
  // The cookie is sent automatically via withCredentials: true.
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true },
  );

  const data = response?.data;
  const newToken = data?.session_token || data?.access_token || null;
  if (newToken) {
    // Read old token BEFORE setToken overwrites it
    const prevToken = localStorage.getItem('hsp_token');
    setToken(newToken, data.refresh_token);
    // Sync refreshed token into hsp_accounts so account switcher uses fresh token
    try {
      const raw = localStorage.getItem('hsp_accounts');
      if (raw) {
        const accounts = JSON.parse(raw);
        if (Array.isArray(accounts)) {
          const idx = accounts.findIndex(a => a.token === prevToken);
          if (idx >= 0) {
            accounts[idx].token = newToken;
            localStorage.setItem('hsp_accounts', JSON.stringify(accounts));
          }
        }
      }
    } catch { /* best-effort */ }
    return newToken;
  }

  throw new Error('Refresh returned no token');
}

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

httpClient.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  nextConfig.headers = nextConfig.headers || {};

  const token = getToken();
  if (token && !nextConfig.headers.Authorization) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  if (!nextConfig.headers['X-Request-ID']) {
    nextConfig.headers['X-Request-ID'] = generateRequestId();
  }

  // Auto-append lang parameter to GET requests for dynamic content translation
  const method = (nextConfig.method || '').toUpperCase();
  if (method === 'GET') {
    const lang = localStorage.getItem('hispaloshop_language');
    if (lang && lang !== 'es') {
      nextConfig.params = nextConfig.params || {};
      if (!nextConfig.params.lang) {
        nextConfig.params.lang = lang;
      }
    }
  }

  // CSRF double-submit: send cookie value as header on mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      nextConfig.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return nextConfig;
});

// Debounced global error toast — prevent spam on cascading failures
// Debounce para errores de servidor (legacy, ahora se usa toastManager)
let lastServerErrorToast = 0;
const SERVER_ERROR_DEBOUNCE_MS = 30000;

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    // Global 5xx toast (debounced via toastManager)
    if (status >= 500) {
      showServerError('Servidor no disponible. Inténtalo de nuevo en unos segundos.');
    }

    // Network error (no response at all) - debounced via toastManager
    if (!error?.response && error?.code !== 'ERR_CANCELED') {
      showNetworkError('Sin conexión. Comprueba tu red.');
    }

    // Section 3.5b — moderation block. Surface a global event so the
    // ModerationBlockedModal can render. We DO NOT swallow the error;
    // the original promise still rejects so the caller's catch runs.
    if (status === 403) {
      try {
        const data = error?.response?.data;
        const detail = data?.detail || data;
        if (detail && (detail.error === 'content_blocked_by_moderation' || data?.error === 'content_blocked_by_moderation')) {
          const payload = detail?.error ? detail : data;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('moderation:blocked', { detail: payload }));
          }
        }
      } catch {
        /* never let the interceptor crash */
      }
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      // Section 3.6.7 — Bloque 2: if the user was never logged in (no token),
      // dispatch the registration prompt event instead of trying to refresh or
      // redirecting to /login. Public pages work without auth; the 401 means the
      // user tried an action that requires auth (like, comment, follow, etc.).
      const hadToken = Boolean(getToken());
      if (!hadToken) {
        if (typeof window !== 'undefined') {
          const method = (originalRequest.method || '').toUpperCase();
          const action = method === 'DELETE' ? 'default'
            : originalRequest.url?.includes('/like') ? 'like'
            : originalRequest.url?.includes('/comment') ? 'comment'
            : originalRequest.url?.includes('/follow') ? 'follow'
            : originalRequest.url?.includes('/save') ? 'save'
            : originalRequest.url?.includes('/cart') ? 'buy'
            : 'default';
          window.dispatchEvent(new CustomEvent('auth:prompt_registration', {
            detail: { action, url: originalRequest.url, method },
          }));
        }
        return Promise.reject(normalizeApiError(error));
      }

      // If a refresh is already in flight, queue this request to retry later
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${token}`,
          };
          return httpClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshSession();
        // Refresh succeeded — retry this request + flush the queue
        processQueue(null, newToken);
        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newToken}`,
        };
        return httpClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed — reject all queued requests, logout once
        processQueue(refreshError, null);
        if (isAuthInvalidError(refreshError)) {
          const activeToken = getToken() || '';
          // Policy 1-B: remove only active broken account, keep other saved accounts.
          removeStoredAccountByToken(activeToken);
          removeToken();

          if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?redirect=${returnUrl}&expired=true`;
          }
        }
        return Promise.reject(normalizeApiError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

async function request(config) {
  const response = await httpClient.request(config);
  return response.data;
}

export const apiClient = {
  request,
  get(url, config = {}) {
    return request({ ...config, method: 'GET', url });
  },
  post(url, data, config = {}) {
    return request({ ...config, method: 'POST', url, data });
  },
  put(url, data, config = {}) {
    return request({ ...config, method: 'PUT', url, data });
  },
  patch(url, data, config = {}) {
    return request({ ...config, method: 'PATCH', url, data });
  },
  delete(url, config = {}) {
    return request({ ...config, method: 'DELETE', url });
  },
};

export { httpClient };

// Helper for WebSocket — centralizes the URL base:
export const getWSUrl = (path) => {
  if (process.env.REACT_APP_WS_URL) {
    return `${process.env.REACT_APP_WS_URL}${path}`;
  }
  // Strip /api suffix — WebSocket routes are mounted at the root (e.g. /ws/chat)
  const origin = API_BASE_URL.replace(/\/api\/?$/, '').replace(/^http/, 'ws');
  return `${origin}${path}`;
};

export default apiClient;
