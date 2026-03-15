import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api/client';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCartItems([]);
      setAppliedDiscount(null);
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/cart');
      const d = res.data || res;
      setCartItems(d.items || []);
      setAppliedDiscount(
        d.coupon_code
          ? { code: d.coupon_code, discount_cents: d.discount_cents || 0 }
          : null
      );
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartItems([]);
      setAppliedDiscount(null);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity, variantId = null, packId = null) => {
    try {
      const payload = { product_id: productId, quantity };
      if (variantId) payload.variant_id = variantId;
      if (packId) payload.pack_id = packId;

      await apiClient.post('/cart/items', payload);
      await fetchCart();
      return true;
    } catch (error) {
      console.error('[CartContext] Error adding to cart:', error);

      if (error.status === 401) {
        sessionStorage.setItem('pendingCartAction', JSON.stringify({ productId, quantity, variantId, packId }));
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        return 'redirect';
      }

      return false;
    }
  };

  const removeFromCart = async (productId, variantId = null, packId = null) => {
    try {
      let path = `/cart/items/${productId}`;
      const params = new URLSearchParams();
      if (variantId) params.append('variant_id', variantId);
      if (packId) params.append('pack_id', packId);
      if (params.toString()) path += `?${params.toString()}`;

      await apiClient.delete(path);
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const applyDiscount = async (code) => {
    try {
      const data = await apiClient.post(`/cart/apply-coupon?code=${encodeURIComponent(code)}`, {});
      await fetchCart();
      return { success: true, data };
    } catch (error) {
      console.error('Error applying discount:', error);
      return { success: false, error: error.message || 'Failed to apply discount' };
    }
  };

  const removeDiscount = async () => {
    try {
      await apiClient.delete('/cart/coupon');
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Error removing discount:', error);
      return { success: false, error: error.message || 'Failed to remove discount' };
    }
  };

  const getShippingPreview = async () => {
    try {
      const res = await apiClient.post('/cart/shipping-preview', {});
      return (res.data || res);
    } catch (error) {
      console.error('Error fetching shipping preview:', error);
      return { stores: [], total_shipping_cents: 0, total_savings_cents: 0, store_count: 0 };
    }
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => sum + (item.unit_price_cents || 0) * item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        appliedDiscount,
        loading,
        addToCart,
        removeFromCart,
        applyDiscount,
        removeDiscount,
        fetchCart,
        getShippingPreview,
        getTotalItems,
        getTotalPrice
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/**
 * Legacy runtime cart source.
 * Kept active until the cart UI is migrated away from context in a later phase.
 */
export function useCart() {
  return useContext(CartContext);
}
