import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const cartKeys = {
  cart: ['cart'],
  orders: ['orders'],
  order: (id) => ['order', id],
  checkout: (id) => ['checkout', id],
  tracking: (id) => ['order', id, 'tracking'],
};

export function useCart() {
  return useQuery({
    queryKey: cartKeys.cart,
    queryFn: () => apiClient.get('/cart'),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity, variantId, packId }) =>
      apiClient.post('/cart/items', {
        product_id: productId,
        quantity,
        ...(variantId ? { variant_id: variantId } : {}),
        ...(packId ? { pack_id: packId } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }) =>
      apiClient.put(`/cart/items/${itemId}`, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId) => apiClient.delete(`/cart/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart });
    },
  });
}

export function useApplyCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (couponCode) =>
      apiClient.post('/cart/apply-coupon', { code: couponCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart });
    },
  });
}

export function useSyncCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items) => apiClient.post('/cart/sync', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart });
    },
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: ({ items, shippingAddress, shippingMethod, paymentMethod }) =>
      apiClient.post('/checkout', {
        items,
        shipping_address: shippingAddress,
        shipping_method: shippingMethod,
        payment_method: paymentMethod,
      }),
  });
}

export function useCheckout(checkoutId) {
  return useQuery({
    queryKey: cartKeys.checkout(checkoutId),
    queryFn: () => apiClient.get(`/checkout/${checkoutId}`),
    enabled: Boolean(checkoutId),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 5000 : false,
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ checkoutId, paymentIntentId }) =>
      apiClient.post(`/checkout/${checkoutId}/confirm`, {
        payment_intent_id: paymentIntentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart });
      queryClient.invalidateQueries({ queryKey: cartKeys.orders });
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: cartKeys.orders,
    queryFn: () => apiClient.get('/orders'),
    staleTime: 60 * 1000,
  });
}

export function useOrder(orderId) {
  return useQuery({
    queryKey: cartKeys.order(orderId),
    queryFn: () => apiClient.get(`/orders/${orderId}`),
    enabled: Boolean(orderId),
    staleTime: 60 * 1000,
  });
}

export function useOrderTracking(orderId) {
  return useQuery({
    queryKey: cartKeys.tracking(orderId),
    queryFn: () => apiClient.get(`/orders/${orderId}/tracking`),
    enabled: Boolean(orderId),
    refetchInterval: 30000,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId) => apiClient.post(`/orders/${orderId}/cancel`, {}),
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: cartKeys.order(orderId) });
      queryClient.invalidateQueries({ queryKey: cartKeys.orders });
    },
  });
}

export function useReorder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId) => apiClient.post(`/orders/${orderId}/reorder`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart });
    },
  });
}
