import { httpClient as apiClient } from '../services/api/client';

export const onboardingApi = {
  async getStatus() {
    const response = await apiClient.get('/onboarding/status');
    return response.data;
  },

  async saveInterests(interests) {
    const response = await apiClient.post('/users/me/interests', { interests });
    return response.data;
  },

  async saveLocation(location) {
    const response = await apiClient.post('/users/me/location', location);
    return response.data;
  },

  async getSuggestions(limit = 3) {
    const response = await apiClient.get('/onboarding/suggestions', {
      params: { limit },
    });
    return response.data;
  },

  async followUsers(followedIds) {
    const response = await apiClient.post('/users/me/follows', { followed_ids: followedIds });
    return response.data;
  },

  async complete() {
    const response = await apiClient.post('/users/me/onboarding-complete');
    return response.data;
  },

  async skip() {
    return this.complete();
  },
};

export default onboardingApi;
