import useSWR from 'swr';
import { api, CartItemCreateRequest } from '@/lib/api';

export function useCart() {
  const { data, error, isLoading, mutate } = useSWR('/cart', () => api.getCart());

  return {
    cart: data,
    isLoading,
    error,
    addToCart: async (payload: CartItemCreateRequest) => {
      await api.addToCart(payload);
      await mutate();
    },
    updateItem: async (itemId: string, quantity: number) => {
      await api.updateCartItem(itemId, quantity);
      await mutate();
    },
    removeItem: async (itemId: string) => {
      await api.removeFromCart(itemId);
      await mutate();
    },
  };
}
