/**
 * Hooks para Carrito y Checkout
 * Gestión de carrito, checkout y órdenes
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const CART_KEYS = {
  cart: ['cart'],
  orders: ['orders'],
  order: (id) => ['order', id],
  tracking: (id) => ['order', id, 'tracking'],
};

// ==========================================
// CARRITO
// ==========================================

/**
 * Hook para obtener carrito
 */
export function useCart() {
  return useQuery({
    queryKey: CART_KEYS.cart,
    queryFn: () => api.get('/cart'),
    staleTime: 0, // Siempre fresh
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para añadir item al carrito
 */
export function useAddToCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, quantity, variantId }) => 
      api.post('/cart/items', { 
        product_id: productId, 
        quantity, 
        variant_id: variantId 
      }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEYS.cart });
    },
  });
}

/**
 * Hook para actualizar cantidad
 */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ itemId, quantity }) => 
      api.put(`/cart/items/${itemId}`, { quantity }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEYS.cart });
    },
  });
}

/**
 * Hook para eliminar item
 */
export function useRemoveFromCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (itemId) => api.delete(`/cart/items/${itemId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEYS.cart });
    },
  });
}

/**
 * Hook para aplicar cupón
 */
export function useApplyCoupon() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (couponCode) => 
      api.post('/cart/apply-coupon', { code: couponCode }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEYS.cart });
    },
  });
}

/**
 * Hook para sincronizar carrito (cross-device)
 */
export function useSyncCart() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (items) => api.post('/cart/sync', { items }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEYS.cart });
    },
  });
}

// ==========================================
// CHECKOUT
// ==========================================

/**
 * Hook para iniciar checkout
 */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: ({ items, shippingAddress, shippingMethod, paymentMethod }) => 
      api.post('/checkout', {
        items,
        shipping_address: shippingAddress,
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
      }),
  });
}

/**
 * Hook para obtener estado de checkout
 */
export function useCheckout(checkoutId) {
  return useQuery({
    queryKey: ['checkout', checkoutId],
    queryFn: () => api.get(`/checkout/${checkoutId}`),
    enabled: !!checkoutId,
    refetchInterval: (data) => {
      // Refetch mientras esté pendiente
      return data?.status === 'pending' ? 5000 : false;
    },
  });
}

/**
 * Hook para confirmar pago (después de Stripe)
 */
export function useConfirmPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ checkoutId, paymentIntentId }) => 
      api.post(`/checkout/${checkoutId}/confirm`, { 
        payment_intent_id: paymentIntentId 
      }),
    
    onSuccess: () => {
      // Limpiar carrito y órdenes
      queryClient.invalidateQueries({ queryKey: CART_KEYS.cart });
      queryClient.invalidateQueries({ queryKey: CART_KEYS.orders });
    },
  });
}

// ==========================================
// ÓRDENES
// ==========================================

/**
 * Hook para historial de órdenes
 */
export function useOrders() {
  return useQuery({
    queryKey: CART_KEYS.orders,
    queryFn: () => api.get('/orders'),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para detalle de orden
 */
export function useOrder(orderId) {
  return useQuery({
    queryKey: CART_KEYS.order(orderId),
    queryFn: () => api.get(`/orders/${orderId}`),
    enabled: !!orderId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para tracking de envío
 */
export function useOrderTracking(orderId) {
  return useQuery({
    queryKey: CART_KEYS.tracking(orderId),
    queryFn: () => api.get(`/orders/${orderId}/tracking`),
    enabled: !!orderId,
    refetchInterval: 30000, // Cada 30 seg
  });
}

/**
 * Hook para cancelar orden
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderId) => api.post(`/orders/${orderId}/cancel`),
    
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ 
        queryKey: CART_KEYS.order(orderId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: CART_KEYS.orders 
      });
    },
  });
}

/**
 * Hook para reordenar (clonar a carrito)
 */
export function useReorder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderId) => api.post(`/orders/${orderId}/reorder`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEYS.cart });
    },
  });
}
