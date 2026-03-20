import useSWR from 'swr';
import { api } from '../lib/api';
import { useCallback } from 'react';

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Order {
  id: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  created_at: string;
  shipping_address?: {
    name: string;
    line1: string;
    city: string;
    postal_code: string;
    country: string;
  };
}

// Hook para obtener órdenes del usuario
export function useOrders(params?: { status?: string; page?: number }) {
  const queryString = new URLSearchParams();
  if (params?.status) queryString.append('status', params.status);
  if (params?.page) queryString.append('page', params.page.toString());

  const { data, error, isLoading } = useSWR(
    ['orders', params],
    () => api.getMyOrders({ status: params?.status, page: params?.page }),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    orders: data?.orders || [],
    pagination: data?.pagination,
    isLoading,
    error,
  };
}

// Hook para obtener una orden específica
export function useOrder(orderId: string) {
  const { data, error, isLoading } = useSWR(
    orderId ? ['order', orderId] : null,
    () => api.getOrder(orderId),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    order: data,
    isLoading,
    error,
  };
}

// Hook para crear checkout
export function useCreateCheckout() {
  const createCheckout = useCallback(async (shippingAddress: {
    name: string;
    line1: string;
    city: string;
    postal_code: string;
    country: string;
    phone?: string;
  }) => {
    const response = await api.createCheckout(shippingAddress);
    return response;
  }, []);

  return { createCheckout };
}
