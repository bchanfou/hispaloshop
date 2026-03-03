import useSWR from 'swr';
import { api } from '@/lib/api';

export function useProducerOrders(params?: { status?: string; page?: number }) {
  const key = ['/producer/orders', params?.status || '', String(params?.page || 1)];
  const { data, error, isLoading, mutate } = useSWR(key, () => api.getProducerOrders(params));

  return {
    orders: data || [],
    isLoading,
    error,
    refresh: mutate,
    fulfill: async (itemId: string, action: 'process' | 'ship' | 'deliver', tracking_number?: string) => {
      await api.fulfillOrderItem(itemId, { action, tracking_number });
      await mutate();
    },
  };
}
