/**
 * Onboarding API - 4-step flow
 */

import apiClient from './axiosConfig';

export const onboardingApi = {
  async getStatus() {
    const response = await apiClient.get('/onboarding/status');
    return response.data;
  },

  async saveInterests(interests) {
    const response = await apiClient.post('/onboarding/interests', { interests });
    return response.data;
  },

  async saveLocation(location) {
    const response = await apiClient.post('/onboarding/location', location);
    return response.data;
  },

  async getSuggestions(limit = 10) {
    const response = await apiClient.get('/onboarding/suggestions', {
      params: { limit }
    });
    return response.data;
  },

  async followUsers(userIds) {
    const response = await apiClient.post('/onboarding/follow', { user_ids: userIds });
    return response.data;
  },

  async complete() {
    const response = await apiClient.post('/onboarding/complete');
    return response.data;
  },

  async skip() {
    const response = await apiClient.post('/onboarding/skip');
    return response.data;
  }
};

export default onboardingApi;
