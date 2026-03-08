const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API_PREFIX = process.env.REACT_APP_API_PREFIX || '/api';
const API_FALLBACK_PREFIX = process.env.REACT_APP_API_FALLBACK_PREFIX || '/api/v1';
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504, 520]);
const RETRY_DELAYS_MS = [400, 900];
export interface CartItemCreateRequest {
  product_id: string;
  quantity: number;
  affiliate_code?: string;
}

export interface AffiliateLinkCreateRequest {
  product_id?: string | null;
  custom_code?: string;
}

export interface InfluencerDashboardResponse {
  profile: Record<string, unknown>;
  earnings: Record<string, unknown>;
  this_month: Record<string, unknown>;
  trend: Record<string, unknown>;
  next_tier?: Record<string, unknown> | null;
}


export interface ReelViewTrackRequest {
  watch_time_seconds: number;
  watched_full: boolean;
  device_type: 'mobile' | 'tablet' | 'desktop';
  source?: 'for_you' | 'following' | 'hashtag' | 'profile';
}

export interface SavedCollectionCreateRequest {
  name: string;
  description?: string;
  is_private?: boolean;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string;
}

class ApiClient {
  private baseUrl: string;
  private fallbackBaseUrl: string | null;
  private token: string | null;

  constructor() {
    this.baseUrl = `${API_URL}${API_PREFIX}`;
    this.fallbackBaseUrl = API_FALLBACK_PREFIX !== API_PREFIX ? `${API_URL}${API_FALLBACK_PREFIX}` : null;
    // Cookie-based auth - token is sent automatically via cookies
    this.token = null;
  }

  setToken(token: string) {
    // Token is now managed via cookies by the backend
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      // Cookie-based auth - session_token is sent automatically via cookies
      ...((options.headers as Record<string, string>) || {}),
    };

    const doRequest = async (baseUrl: string) =>
      fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

    let response: Response | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        response = await doRequest(this.baseUrl);

        if (response.status === 404 && this.fallbackBaseUrl) {
          response = await doRequest(this.fallbackBaseUrl);
        }

        if (!RETRYABLE_STATUSES.has(response.status) || attempt === RETRY_DELAYS_MS.length) {
          break;
        }
      } catch (error) {
        lastError = error as Error;
        if (attempt === RETRY_DELAYS_MS.length) {
          throw error;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }

    if (!response) {
      throw lastError || new Error('Network request failed');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (data?.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  }

  async register(userData: { email: string; password: string; full_name: string; role: string }) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateMe(data: Partial<{ full_name: string; bio: string; avatar_url: string }>) {
    return this.request('/auth/me', { method: 'PATCH', body: JSON.stringify(data) });
  }

  async getCategories(parentId?: string) {
    const query = parentId ? `?parent_id=${parentId}` : '';
    return this.request(`/categories${query}`);
  }

  async getCategory(slug: string) {
    return this.request(`/categories/${slug}`);
  }

  async getProducts(params?: Record<string, string>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/products${query}`);
  }

  async getProduct(slug: string) {
    return this.request(`/products/${slug}`);
  }

  async createProduct(data: Record<string, unknown>) {
    return this.request('/producer/products', { method: 'POST', body: JSON.stringify(data) });
  }

  async uploadProductImage(productId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(`/producer/products/${productId}/images`, { method: 'POST', body: formData, headers: {} });
  }

  async getCart() {
    return this.request('/cart');
  }

  async addToCart(data: CartItemCreateRequest) {
    return this.request('/cart/items', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateCartItem(itemId: string, quantity: number) {
    return this.request(`/cart/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
  }

  async removeFromCart(itemId: string) {
    return this.request(`/cart/items/${itemId}`, { method: 'DELETE' });
  }

  async createCheckout(shippingAddress: ShippingAddress) {
    return this.request('/checkout/session', { method: 'POST', body: JSON.stringify({ shipping_address: shippingAddress }) });
  }

  async getMyOrders(params?: { status?: string; page?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/orders${query}`);
  }

  async getOrder(orderId: string) {
    return this.request(`/orders/${orderId}`);
  }

  async getProducerOrders(params?: { status?: string; page?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/producer/orders${query}`);
  }

  async fulfillOrderItem(itemId: string, data: { action: 'process' | 'ship' | 'deliver'; tracking_number?: string }) {
    return this.request(`/producer/orders/${itemId}/fulfill`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  // Influencer
  async getInfluencerDashboard(): Promise<InfluencerDashboardResponse> {
    return this.request('/influencer/dashboard');
  }

  async getAffiliateLinks(params?: { status?: string; page?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/influencer/affiliate-links${query}`);
  }

  async createAffiliateLink(data: AffiliateLinkCreateRequest) {
    return this.request('/influencer/affiliate-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deactivateAffiliateLink(linkId: string) {
    return this.request(`/influencer/affiliate-links/${linkId}/deactivate`, {
      method: 'POST',
    });
  }

  async getCommissions(params?: { status?: string }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/influencer/commissions${query}`);
  }

  async getPayouts() {
    return this.request('/influencer/payouts');
  }

  async requestPayout() {
    return this.request('/influencer/payouts', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // Productor - Afiliados
  async getAffiliateRequests() {
    return this.request('/producer/affiliate/requests');
  }

  async approveAffiliateRequest(requestId: string) {
    return this.request(`/producer/affiliate/requests/${requestId}/approve`, {
      method: 'POST',
    });
  }

  async rejectAffiliateRequest(requestId: string, reason?: string) {
    return this.request(`/producer/affiliate/requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getProducerAffiliateStats() {
    return this.request('/producer/affiliate/stats');
  }



  // Recommendations
  async getPersonalizedRecommendations(params?: { limit?: number; category?: string }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/recommendations/personalized${query}`);
  }

  async getSimilarProducts(productId: string, limit: number = 6) {
    return this.request(`/recommendations/similar/${productId}?limit=${limit}`);
  }

  async getTrendingProducts(limit: number = 10) {
    return this.request(`/recommendations/trending?limit=${limit}`);
  }

  // Chat
  async createChatSession(context?: Record<string, unknown>) {
    return this.request('/chat/sessions', { method: 'POST', body: JSON.stringify({ context }) });
  }

  async sendChatMessage(sessionId: string, content: string) {
    return this.request(`/chat/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ content }) });
  }

  async getChatHistory(sessionId: string) {
    return this.request(`/chat/sessions/${sessionId}/messages`);
  }

  async closeChatSession(sessionId: string, data?: { satisfaction_rating?: number; feedback?: string }) {
    return this.request(`/chat/sessions/${sessionId}/close`, { method: 'POST', body: JSON.stringify(data || {}) });
  }

  async getConversations() {
    return this.request('/chat/conversations');
  }

  async createConversation(data: Record<string, unknown>) {
    return this.request('/chat/conversations', { method: 'POST', body: JSON.stringify(data) });
  }

  async getConversationMessages(conversationId: string, cursor?: string) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request(`/chat/conversations/${conversationId}/messages${query}`);
  }

  async sendConversationMessage(conversationId: string, data: Record<string, unknown>) {
    return this.request(`/chat/conversations/${conversationId}/messages`, { method: 'POST', body: JSON.stringify(data) });
  }

  async markConversationRead(conversationId: string, readAt?: string) {
    return this.request(`/chat/conversations/${conversationId}/read`, {
      method: 'POST',
      body: JSON.stringify(readAt ? { read_at: readAt } : {}),
    });
  }


  // Matching
  async getProducerMatches(limit: number = 10) {
    return this.request(`/matching/producer/suggestions?limit=${limit}`);
  }

  async contactInfluencer(data: Record<string, unknown>) {
    return this.request('/matching/contact', { method: 'POST', body: JSON.stringify(data) });
  }

  async getInfluencerOpportunities(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request(`/matching/influencer/opportunities${query}`);
  }

  // Social posts
  async createPost(data: FormData) {
    return this.request('/posts', { method: 'POST', body: data, headers: {} });
  }

  async getFeed(params?: { cursor?: string; limit?: number; source?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.cursor) queryParams.set('skip', params.cursor);
    if (params?.limit) queryParams.set('limit', String(params.limit));
    if (params?.source === 'following') queryParams.set('scope', 'following');

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const data = await this.request(`/feed${query}`);
    const posts = Array.isArray((data as any)?.posts) ? (data as any).posts : [];

    return {
      items: posts.map((post: any) => ({
        ...post,
        id: post.id || post.post_id,
      })),
      has_more: Boolean((data as any)?.has_more),
      next_cursor: (data as any)?.has_more ? String(posts.length + Number(params?.cursor || 0)) : null,
      total: (data as any)?.total || posts.length,
    };
  }

  async getPost(postId: string) {
    return this.request(`/posts/${postId}`);
  }

  async deletePost(postId: string) {
    return this.request(`/posts/${postId}`, { method: 'DELETE' });
  }

  async toggleLikePost(postId: string) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' });
  }

  async getPostLikes(postId: string, params?: { limit?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/posts/${postId}/likes${query}`);
  }

  async createComment(postId: string, data: { content: string; parent_id?: string | null }) {
    return this.request(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) });
  }

  async getPostComments(postId: string) {
    return this.request(`/posts/${postId}/comments`);
  }

  async toggleSavePost(postId: string) {
    return this.request(`/posts/${postId}/save`, { method: 'POST' });
  }

  async getSavedPosts(collection?: string) {
    const query = collection ? `?collection=${collection}` : '';
    return this.request(`/users/me/saved-posts${query}`);
  }

  async toggleFollow(userId: string) {
    return this.request(`/follows/${userId}`, { method: 'POST' });
  }

  async getUserFollowers(userId: string, params?: { limit?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/users/${userId}/followers${query}`);
  }

  async getUserFollowing(userId: string, params?: { limit?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/users/${userId}/following${query}`);
  }

  async getUserPosts(userId: string, params?: { limit?: number }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/users/${userId}/posts${query}`);
  }

  async getPublicProfile(username: string) {
    return this.request(`/profiles/${username}`);
  }


  // Reels
  async createReel(data: FormData) {
    return this.request('/reels', { method: 'POST', body: data, headers: {} });
  }

  async getReelsFeed(params?: { cursor?: string; source?: string; hashtag?: string }) {
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/reels${query}`);
  }

  async trackReelView(reelId: string, data: ReelViewTrackRequest) {
    return this.request(`/reels/${reelId}/view`, { method: 'POST', body: JSON.stringify(data) });
  }

  // Hashtags
  async getTrendingHashtags() {
    return this.request('/hashtags/trending');
  }

  async searchHashtags(query: string) {
    return this.request(`/hashtags/search?q=${encodeURIComponent(query)}`);
  }

  async getHashtagDetail(name: string) {
    return this.request(`/hashtags/${name}`);
  }

  // Stories
  async createStory(data: FormData) {
    return this.request('/stories', { method: 'POST', body: data, headers: {} });
  }

  async getStoriesFeed() {
    return this.request('/stories');
  }

  async getUserStories(userId: string) {
    return this.request(`/stories/${userId}`);
  }

  async viewStory(storyId: string) {
    return this.request(`/stories/${storyId}/view`, { method: 'POST' });
  }

  // Collections
  async createCollection(data: SavedCollectionCreateRequest) {
    return this.request('/collections', { method: 'POST', body: JSON.stringify(data) });
  }

  async addToCollection(collectionId: string, postId: string) {
    return this.request(`/collections/${collectionId}/posts/${postId}`, { method: 'POST' });
  }

}

export const api = new ApiClient();
