/**
 * Cliente API Hispaloshop
 * Wrapper de fetch con manejo de tokens, retry logic y manejo de errores
 */

import { getToken, setToken, removeToken, getRefreshToken } from './auth';
import { getApiUrl } from '../utils/api';

const API_BASE_URL = getApiUrl();
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
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    
    const config = {
      ...options,
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-Client-Version': '1.0.0',
        ...options.headers,
      },
    };

    if (!isFormData && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    if (isFormData && config.headers['Content-Type']) {
      delete config.headers['Content-Type'];
    }

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
        credentials: 'include',
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

  async getFeed(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.cursor) queryParams.set('skip', params.cursor);
    if (params.limit) queryParams.set('limit', params.limit);
    if (params.source === 'following') queryParams.set('scope', 'following');

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const normalized = (data) => {
      const posts = Array.isArray(data?.posts)
        ? data.posts
        : Array.isArray(data?.data?.posts)
          ? data.data.posts
          : [];

      const mappedPosts = posts.map((post) => ({
        ...post,
        id: post.id || post.post_id,
        post_id: post.post_id || post.id,
        caption: post.caption || post.content || '',
        image_url: post.image_url || post.thumbnail || post.media?.[0]?.url || null,
        media: Array.isArray(post.media) && post.media.length > 0
          ? post.media
          : (post.image_url || post.thumbnail
              ? [{ url: post.image_url || post.thumbnail, ratio: '1:1' }]
              : []),
        user_name: post.user_name || post.author_name,
        user_profile_image: post.user_profile_image || post.author_avatar,
        user_role: post.user_role || post.author_type,
        comments_count: post.comments_count ?? 0,
        likes_count: post.likes_count ?? 0,
        shares_count: post.shares_count ?? 0,
      }));

      const hasMore = Boolean(data?.has_more ?? data?.data?.meta?.has_more);
      return {
        items: mappedPosts,
        has_more: hasMore,
        next_cursor: hasMore ? String(mappedPosts.length + Number(params.cursor || 0)) : null,
        total: data?.total || data?.data?.meta?.total || mappedPosts.length,
      };
    };

    try {
      const data = await this.get(`/feed${query}`);
      return normalized(data);
    } catch (primaryError) {
      try {
        if (params.source !== 'following') {
          const legacyQuery = query ? `${query}&scope=hybrid` : '?scope=hybrid';
          const legacyData = await this.get(`/feed${legacyQuery}`);
          return normalized(legacyData);
        }
      } catch (legacyError) {
        // silently handled
      }

      try {
        const page = Math.floor(Number(params.cursor || 0) / Number(params.limit || 20)) + 1;
        const type = params.source === 'following' ? 'following' : 'for_you';
        const modularData = await this.get(`/posts/feed?type=${type}&page=${page}&limit=${params.limit || 20}`);
        return normalized(modularData);
      } catch (modularError) {
        // silently handled
      }

      return {
        items: [],
        has_more: false,
        next_cursor: null,
        total: 0,
      };
    }
  }

  async getPost(postId) {
    const post = await this.get(`/posts/${postId}`);
    return {
      ...post,
      id: post?.id || post?.post_id || postId,
      post_id: post?.post_id || postId,
    };
  }

  async toggleLikePost(postId) {
    return this.post(`/posts/${postId}/like`, {});
  }

  async toggleSavePost(postId) {
    return this.post(`/posts/${postId}/bookmark`, {});
  }

  async getPostComments(postId) {
    return this.get(`/posts/${postId}/comments`);
  }

  async createComment(postId, data) {
    const text = data?.text || data?.content || '';
    return this.post(`/posts/${postId}/comments`, { text });
  }

  async getStoriesFeed() {
    return this.get('/stories');
  }

  async viewStory(storyId) {
    return this.post(`/stories/${storyId}/view`, {});
  }

  // ==========================================
  // PRODUCTS
  // ==========================================

  /**
   * Fetch product catalog with optional filters (country, category, search, etc.)
   */
  getProducts(filters = {}) {
    const params = {};
    if (filters.country)       params.country        = filters.country;
    if (filters.category)      params.category       = filters.category;
    if (filters.search)        params.search         = filters.search;
    if (filters.sort)          params.sort           = filters.sort;
    if (filters.min_price != null) params.min_price  = filters.min_price;
    if (filters.max_price != null) params.max_price  = filters.max_price;
    if (filters.certifications) params.certifications = filters.certifications;
    if (filters.seller_id)     params.seller_id      = filters.seller_id;
    if (filters.featured_only) params.featured_only  = filters.featured_only;
    if (filters.lang)          params.lang           = filters.lang;
    if (filters.limit)         params.limit          = filters.limit;
    if (filters.cursor)        params.cursor         = filters.cursor;
    return this.get('/products', params);
  }

  getProduct(productId, filters = {}) {
    const params = {};
    if (filters.country) params.country = filters.country;
    if (filters.lang)    params.lang    = filters.lang;
    return this.get(`/products/${productId}`, params);
  }

  // ==========================================
  // STORES
  // ==========================================

  getStores(params = {}) {
    return this.get('/stores', params);
  }

  getStore(slug) {
    return this.get(`/store/${slug}`);
  }

  // ==========================================
  // SOCIAL / TRENDING
  // ==========================================

  getTrendingHashtags() {
    return this.get('/feed/trending-hashtags');
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

    this.ws = new WebSocket(WS_BASE_URL);

    this.ws.onopen = () => {
      const token = getToken();
      if (token) {
        this.ws.send(JSON.stringify({ type: 'auth', token }));
      }
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        this.emit(type, payload);
      } catch (error) {
        // silently handled
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected', {});
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };

    return this.ws;
  }

  /**
   * Reconexión automática
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

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
