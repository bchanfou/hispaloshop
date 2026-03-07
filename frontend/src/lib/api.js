/**
 * Cliente API Hispaloshop
 * Wrapper de fetch con manejo de tokens, retry logic y manejo de errores
 */

import { getToken, setToken, removeToken, getRefreshToken } from './auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

class APIError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'APIError';
  }
}

class HispaloAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.ws = null;
    this.wsListeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  /**
   * Request base con manejo de tokens y errores
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client-Version': '1.0.0',
        ...options.headers,
      },
    };

    // Añadir token de autorización
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Añadir X-Request-ID para tracing
    config.headers['X-Request-ID'] = generateUUID();

    try {
      const response = await fetch(url, config);
      
      // Manejar 401 - Intentar refresh token
      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Reintentar request original
          config.headers.Authorization = `Bearer ${getToken()}`;
          const retryResponse = await fetch(url, config);
          return this.handleResponse(retryResponse);
        } else {
          removeToken();
          window.location.href = '/login?expired=true';
          throw new APIError(401, 'Sesión expirada');
        }
      }

      return this.handleResponse(response);
    } catch (error) {
      if (error instanceof APIError) throw error;
      
      // Error de red
      throw new APIError(0, 'Error de conexión. Verifica tu internet.', error);
    }
  }

  /**
   * Manejar respuesta HTTP
   */
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        response.status,
        errorData.detail || errorData.message || `Error ${response.status}`,
        errorData
      );
    }

    // 204 No Content
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  /**
   * Refresh token
   */
  async refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.access_token, data.refresh_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Métodos HTTP shorthand
   */
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  /**
   * Batch request - múltiples requests en uno
   */
  async batch(requests) {
    return this.post('/batch', { requests });
  }

  // ==========================================
  // WEBSOCKET
  // ==========================================

  /**
   * Conectar WebSocket
   */
  connectWebSocket() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    const token = getToken();
    const wsUrl = `${WS_BASE_URL}?token=${token}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('[WebSocket] Conectado');
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        this.emit(type, payload);
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Desconectado');
      this.emit('disconnected', {});
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      this.emit('error', error);
    };

    return this.ws;
  }

  /**
   * Reconexión automática
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Máximo de reconexiones alcanzado');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[WebSocket] Reconectando en ${delay}ms...`);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  /**
   * Enviar mensaje WebSocket
   */
  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('[WebSocket] No conectado');
    }
  }

  /**
   * Subscribe a eventos WebSocket
   */
  on(event, callback) {
    if (!this.wsListeners.has(event)) {
      this.wsListeners.set(event, []);
    }
    this.wsListeners.get(event).push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.wsListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  /**
   * Emitir evento a listeners
   */
  emit(event, payload) {
    const listeners = this.wsListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(payload));
    }
  }

  /**
   * Desconectar WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Generar UUID para request tracing
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Singleton instance
export const api = new HispaloAPI();

export { APIError };
export default api;
