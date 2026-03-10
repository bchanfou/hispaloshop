import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const dashboardShellKeys = {
  customerStats: ['dashboard-shell', 'customer-stats'],
  producerStats: ['dashboard-shell', 'producer-stats'],
  adminStats: ['dashboard-shell', 'admin-stats'],
};

export function useCustomerDashboardStats(enabled = true) {
  return useQuery({
    queryKey: dashboardShellKeys.customerStats,
    queryFn: () => apiClient.get('/customer/stats'),
    enabled,
  });
}

export function useProducerDashboardStats(enabled = true) {
  return useQuery({
    queryKey: dashboardShellKeys.producerStats,
    queryFn: () => apiClient.get('/producer/stats'),
    enabled,
  });
}

export function useAdminDashboardStats(enabled = true) {
  return useQuery({
    queryKey: dashboardShellKeys.adminStats,
    queryFn: () => apiClient.get('/admin/stats'),
    enabled,
  });
}

export function useDashboardLogout() {
  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout', {}),
  });
}
