import { useMutation } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

interface OnboardingPayload {
  [key: string]: any;
}

export function useSaveOnboardingMutation() {
  return useMutation({
    mutationFn: (payload: OnboardingPayload) => apiClient.post('/onboarding/complete', payload),
  });
}
