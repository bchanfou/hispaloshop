const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async login(email: string, password: string) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async register(userData: { email: string; password: string; full_name: string; role: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async updateMe(data: Partial<{ full_name: string; bio: string; avatar_url: string }>) {
    return this.request('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
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
    return this.request('/producer/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadProductImage(productId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request(`/producer/products/${productId}/images`, {
      method: 'POST',
      body: formData,
      headers: {},
    });
  }
}

export const api = new ApiClient();
