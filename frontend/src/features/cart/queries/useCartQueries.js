import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const cartKeys = {
  cart: ['cart'],
  pricing: ['cart', 'pricing'],
  verification: ['cart', 'verification'],
  addresses: ['cart', 'addresses'],
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

export function useCartPricing(options = {}) {
  return useQuery({
    queryKey: cartKeys.pricing,
    queryFn: async () => {
      const data = await apiClient.get('/cart');

      return {
        subtotalCents: data?.subtotal_cents || 0,
        shippingCents: data?.shipping_cents || 0,
        taxCents: data?.tax_cents || 0,
        taxRateBp: data?.tax_rate_bp || 2100,
        stockIssues: (data?.items || []).filter((item) => !item.stock_available),
      };
    },
    ...options,
  });
}

export function useEmailVerificationStatus(options = {}) {
  return useQuery({
    queryKey: cartKeys.verification,
    queryFn: () => apiClient.get('/auth/verification-status'),
    ...options,
  });
}

export function useSavedAddresses(options = {}) {
  return useQuery({
    queryKey: cartKeys.addresses,
    queryFn: async () => {
      const data = await apiClient.get('/customer/addresses');
      return data?.addresses || [];
    },
    ...options,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => apiClient.post('/customer/addresses', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.addresses });
    },
  });
}

export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token) => apiClient.post(`/auth/verify-email?token=${encodeURIComponent(token)}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.verification });
    },
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => apiClient.post('/auth/resend-verification', {}),
  });
}

export function useCreateStripeCheckout() {
  return useMutation({
    mutationFn: async ({ shippingAddress, origin }) => {
      const data = await apiClient.post('/payments/create-checkout', {
        shipping_address: shippingAddress,
        origin,
      });

      return {
        ...data,
        url: data?.url || data?.checkout_url || null,
        checkout_url: data?.checkout_url || data?.url || null,
      };
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }) =>
      apiClient.patch(`/cart/items/${itemId}`, null, {
        params: { quantity },
      }),
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
    mutationFn: async (items) => {
      try {
        return await apiClient.post('/cart/sync', { items });
      } catch {
        // Legacy backends may not expose /cart/sync.
        return { success: false };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart });
    },
  });
}

export function useCheckout(checkoutId) {
  return useQuery({
    queryKey: cartKeys.checkout(checkoutId),
    queryFn: async () => {
      try {
        return await apiClient.get(`/checkout/${checkoutId}`);
      } catch {
        return { status: 'unavailable' };
      }
    },
    enabled: Boolean(checkoutId),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 5000 : false,
  });
}

export function useConfirmPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ checkoutId, paymentIntentId }) => {
      try {
        return await apiClient.post(`/checkout/${checkoutId}/confirm`, {
          payment_intent_id: paymentIntentId,
        });
      } catch {
        return { success: false };
      }
    },
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
    queryFn: async () => {
      try {
        return await apiClient.get(`/orders/${orderId}/tracking`);
      } catch {
        return null;
      }
    },
    enabled: Boolean(orderId),
    refetchInterval: 30000,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId) => {
      try {
        return await apiClient.post(`/orders/${orderId}/cancel`, {});
      } catch {
        return { success: false };
      }
    },
    onSuccess: (data, orderId) => {
      queryClient.invalidateQueries({ queryKey: cartKeys.order(orderId) });
      queryClient.invalidateQueries({ queryKey: cartKeys.orders });
    },
  });
}

export function useReorder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId) => {
      try {
        return await apiClient.post(`/orders/${orderId}/reorder`, {});
      } catch {
        return { success: false };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.cart });
    },
  });
}
