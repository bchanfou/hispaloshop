const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  private token: string | null;

  constructor() {
    this.baseUrl = `${API_URL}/api/v1`;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    this.setToken(data.access_token);
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
    const query = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
    return this.request(`/posts${query}`);
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
    return this.request('/stories/feed');
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
