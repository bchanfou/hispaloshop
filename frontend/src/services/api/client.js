import axios from 'axios';
import { getRefreshToken, getToken, removeToken, setToken } from '../../lib/auth';
import { getApiUrl } from '../../utils/api';

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
  return apiError;
}

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'X-Client-Version': '1.0.0',
  },
});

// --- Refresh queue: ensures only ONE refresh runs at a time ---
let isRefreshing = false;
let failedQueue = []; // { resolve, reject } entries waiting for refresh

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
let lastServerErrorToast = 0;
const SERVER_ERROR_DEBOUNCE_MS = 5000;

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    // Global 5xx toast (debounced)
    if (status >= 500 && Date.now() - lastServerErrorToast > SERVER_ERROR_DEBOUNCE_MS) {
      lastServerErrorToast = Date.now();
      try {
        const { toast } = await import('sonner');
        toast.error('Servidor no disponible. Inténtalo de nuevo en unos segundos.');
      } catch { /* sonner not loaded */ }
    }

    // Network error (no response at all)
    if (!error?.response && error?.code !== 'ERR_CANCELED' && Date.now() - lastServerErrorToast > SERVER_ERROR_DEBOUNCE_MS) {
      lastServerErrorToast = Date.now();
      try {
        const { toast } = await import('sonner');
        toast.error('Sin conexión. Comprueba tu red.');
      } catch { /* sonner not loaded */ }
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
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
        removeToken();

        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?redirect=${returnUrl}&expired=true`;
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

async function request(config) {
  if (!isOnline) {
    const error = new Error('Sin conexión a internet');
    error.isOffline = true;
    throw error;
  }
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
