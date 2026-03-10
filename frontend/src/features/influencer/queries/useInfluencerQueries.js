import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const influencerKeys = {
  dashboard: ['influencer', 'dashboard'],
  stripeStatus: ['influencer', 'stripe-status'],
  withdrawals: ['influencer', 'withdrawals'],
};

export function useInfluencerDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: influencerKeys.dashboard,
    queryFn: async () => {
      try {
        return await apiClient.get('/influencer/dashboard');
      } catch (error) {
        if (error?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled,
  });
}

export function useInfluencerStripeStatusQuery(enabled = true) {
  return useQuery({
    queryKey: influencerKeys.stripeStatus,
    queryFn: () => apiClient.get('/influencer/stripe/status'),
    enabled,
  });
}

export function useInfluencerWithdrawalsQuery(enabled = true) {
  return useQuery({
    queryKey: influencerKeys.withdrawals,
    queryFn: async () => {
      const data = await apiClient.get('/influencer/withdrawals');
      return data?.withdrawals || [];
    },
    enabled,
  });
}

export function useCheckWithdrawalNotificationMutation() {
  return useMutation({
    mutationFn: () => apiClient.post('/influencer/check-withdrawal-notification', {}),
  });
}

export function useRequestWithdrawalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post('/influencer/request-withdrawal', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: influencerKeys.withdrawals });
      queryClient.invalidateQueries({ queryKey: influencerKeys.dashboard });
    },
  });
}

export function useCreateInfluencerCodeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code) => apiClient.post('/influencer/create-code', { code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: influencerKeys.dashboard });
    },
  });
}

export function useInfluencerStripeConnectMutation() {
  return useMutation({
    mutationFn: () => apiClient.post('/influencer/stripe/connect', {}),
  });
}

export function useVerifyInfluencerEmailMutation() {
  return useMutation({
    mutationFn: (code) => apiClient.post(`/auth/verify-email?code=${code}`, {}),
  });
}

export function useResendInfluencerVerificationMutation() {
  return useMutation({
    mutationFn: () => apiClient.post('/auth/resend-verification', {}),
  });
}
