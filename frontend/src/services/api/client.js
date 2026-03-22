import axios from 'axios';
import { getRefreshToken, getToken, removeToken, setToken } from '../../lib/auth';
import { getApiUrl } from '../../utils/api';

export const API_BASE_URL = getApiUrl();

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

let refreshPromise = null;

async function refreshSession() {
  // Backend uses httpOnly session_token cookie for refresh (not body token).
  // The cookie is sent automatically via withCredentials: true.
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );

    // Backend returns new session_token in both cookie and body
    const data = response?.data;
    if (data?.session_token || data?.access_token) {
      setToken(data.session_token || data.access_token, data.refresh_token);
      return true;
    }

    return false;
  } catch {
    return false;
  }
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

  // CSRF double-submit: send cookie value as header on mutating requests
  const method = (nextConfig.method || '').toUpperCase();
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

    if (error?.response?.status === 401 && originalRequest && !originalRequest.__isRetryRequest) {
      originalRequest.__isRetryRequest = true;

      if (!refreshPromise) {
        refreshPromise = refreshSession().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        const token = getToken();
        if (token) {
          originalRequest.headers = {
            ...(originalRequest.headers || {}),
            Authorization: `Bearer ${token}`,
          };
        }

        return httpClient(originalRequest);
      }

      removeToken();
      // Redirect to login if session is truly expired (refresh failed)
      // Only redirect for non-GET requests or protected routes to avoid redirect loops
      const publicPaths = ['/', '/products', '/login', '/register', '/auth', '/certificate', '/certificado', '/que-es', '/productor', '/influencer', '/importador', '/contacto', '/legal'];
      const isProtectedRoute = !publicPaths.some(
        (p) => window.location.pathname.startsWith(p)
      );
      if (isProtectedRoute && typeof window !== 'undefined') {
        window.location.href = `/login?expired=1&redirect=${encodeURIComponent(window.location.pathname)}`;
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
