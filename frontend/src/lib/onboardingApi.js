import { httpClient as apiClient } from '../services/api/client';

export const onboardingApi = {
  async getStatus() {
    const response = await apiClient.get('/onboarding/status');
    return response;
  },

  async saveInterests(interests) {
    const response = await apiClient.post('/users/me/interests', { interests });
    return response;
  },

  async saveLocation(location) {
    const response = await apiClient.post('/users/me/location', location);
    return response;
  },

  async getSuggestions(limit = 3) {
    const response = await apiClient.get('/onboarding/suggestions', {
      params: { limit },
    });
    return response;
  },

  async followUsers(followedIds) {
    const response = await apiClient.post('/users/me/follows', { followed_ids: followedIds });
    return response;
  },

  async complete() {
    const response = await apiClient.post('/users/me/onboarding-complete');
    return response;
  },

  async skip() {
    return this.complete();
  },
};

export default onboardingApi;
