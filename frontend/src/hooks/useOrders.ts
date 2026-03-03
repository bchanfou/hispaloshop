import useSWR from 'swr';
import { api } from '@/lib/api';

export function useOrders(params?: { status?: string; page?: number }) {
  const key = ['/orders', params?.status || '', String(params?.page || 1)];
  const { data, error, isLoading, mutate } = useSWR(key, () => api.getMyOrders(params));

  return {
    orders: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}
