import { useMutation } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export function useSaveOnboardingMutation() {
  return useMutation({
    mutationFn: (payload) => apiClient.post('/onboarding/complete', payload),
  });
}
