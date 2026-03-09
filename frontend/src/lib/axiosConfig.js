/**
 * Configuración global de Axios
 * Manejo de cookies, refresh token automático, y errores
 */

import axios from 'axios';
import { API } from '../utils/api';

// Crear instancia de axios configurada
const apiClient = axios.create({
  baseURL: API,
  withCredentials: true, // Importante para cookies
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag para evitar loops de refresh
let isRefreshing = false;
let refreshSubscribers = [];
const NON_REFRESHABLE_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/google',
  '/auth/session',
];

const shouldAttemptRefresh = (config) => {
  if (!config || config._skipAuthRefresh) return false;
  const url = config.url || '';
  return !NON_REFRESHABLE_AUTH_PATHS.some((path) => url.includes(path));
};

// Suscribirse al refresh
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// Notificar a suscriptores
const onTokenRefreshed = () => {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
};

// Interceptor de requests
apiClient.interceptors.request.use(
  (config) => {
    // Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de responses
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si no hay response, es error de red
    if (!error.response) {
      console.error('[API] Network Error:', error.message);
      return Promise.reject(error);
    }

    // 401 Unauthorized - intentar refresh
    if (
      error.response.status === 401 &&
      !originalRequest?._retry &&
      shouldAttemptRefresh(originalRequest)
    ) {
      if (isRefreshing) {
        // Esperar a que termine el refresh
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Intentar refresh (el backend lee la cookie automáticamente)
        const response = await apiClient.post('/auth/refresh', undefined, {
          _skipAuthRefresh: true,
        });
        
        if (response.data?.session_token) {
          onTokenRefreshed();
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('[API] Refresh failed:', refreshError);
        // Redirigir a login
        window.location.href = '/login?expired=true';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 Forbidden - cuenta pendiente de aprobación
    if (error.response.status === 403) {
      const detail = error.response.data?.detail;
      if (detail?.includes('pending admin approval')) {
        // Redirigir a página de espera
        window.location.href = '/pending-approval';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
