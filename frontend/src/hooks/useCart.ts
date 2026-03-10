/**
 * @deprecated Legacy SWR cart hook.
 * Prefer `features/cart/queries` for React Query-based fetching.
 */

import useSWR, { useSWRConfig } from 'swr';
import { api } from '@/lib/api';
import { useCallback } from 'react';

export interface CartItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
  image?: string;
  variant_id?: string;
  pack_id?: string;
}

export interface Cart {
  items: CartItem[];
  total: number;
  item_count: number;
}

// Hook para obtener el carrito
export function useCart() {
  const { data, error, isLoading, mutate } = useSWR(
    'cart',
    () => api.getCart(),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return {
    cart: data,
    items: data?.items || [],
    total: data?.total || 0,
    itemCount: data?.item_count || 0,
    isLoading,
    error,
    mutate,
  };
}

// Hook para añadir al carrito
export function useAddToCart() {
  const { mutate } = useSWRConfig();

  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    const response = await api.addToCart({ product_id: productId, quantity });
    mutate('cart');
    return response;
  }, [mutate]);

  return { addToCart };
}

// Hook para eliminar del carrito
export function useRemoveFromCart() {
  const { mutate } = useSWRConfig();

  const removeFromCart = useCallback(async (itemId: string) => {
    const response = await api.removeFromCart(itemId);
    mutate('cart');
    return response;
  }, [mutate]);

  return { removeFromCart };
}

// Hook para actualizar cantidad
export function useUpdateCartItem() {
  const { mutate } = useSWRConfig();

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    const response = await api.updateCartItem(itemId, quantity);
    mutate('cart');
    return response;
  }, [mutate]);

  return { updateQuantity };
}
