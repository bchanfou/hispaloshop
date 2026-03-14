/**
 * Hooks para Productor / Tienda
 * Dashboard, productos, pedidos, analytics
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api/client';

const PRODUCER_KEYS = {
  dashboard: ['producer', 'dashboard'],
  products: ['producer', 'products'],
  orders: ['producer', 'orders'],
  analytics: ['producer', 'analytics'],
  hiInsights: ['producer', 'hi-insights'],
};

/**
 * Hook para dashboard de productor
 */
export function useProducerDashboard() {
  return useQuery({
    queryKey: PRODUCER_KEYS.dashboard,
    queryFn: () => apiClient.get('/producer/dashboard'),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 30000, // Refetch cada 30 seg para stats live
  });
}

/**
 * Hook para productos del productor
 */
export function useProducerProducts() {
  return useQuery({
    queryKey: PRODUCER_KEYS.products,
    queryFn: () => apiClient.get('/producer/products'),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para crear producto
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productData) => apiClient.post('/producer/products', productData),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCER_KEYS.products });
    },
  });
}

/**
 * Hook para actualizar producto
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, data }) => 
      apiClient.put(`/producer/products/${productId}`, data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCER_KEYS.products });
    },
  });
}

/**
 * Hook para eliminar/pausar producto
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productId) => apiClient.delete(`/producer/products/${productId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCER_KEYS.products });
    },
  });
}

/**
 * Hook para pedidos recibidos
 */
export function useProducerOrders() {
  return useQuery({
    queryKey: PRODUCER_KEYS.orders,
    queryFn: () => apiClient.get('/producer/orders'),
    staleTime: 30 * 1000,
    refetchInterval: 30000,
  });
}

/**
 * Hook para actualizar estado de pedido
 */
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, status, trackingNumber }) => 
      apiClient.put(`/producer/orders/${orderId}/status`, { 
        status, 
        tracking_number: trackingNumber 
      }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCER_KEYS.orders });
    },
  });
}

/**
 * Hook para analytics detallado
 */
export function useProducerAnalytics() {
  return useQuery({
    queryKey: PRODUCER_KEYS.analytics,
    queryFn: () => apiClient.get('/producer/analytics'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para insights de HI AI
 */
export function useProducerHIInsights() {
  return useQuery({
    queryKey: PRODUCER_KEYS.hiInsights,
    queryFn: () => apiClient.get('/producer/hi-insights'),
    staleTime: 10 * 60 * 1000,
  });
}
