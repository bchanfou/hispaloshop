import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../services/api/client';
import { useAuth } from './AuthContext';
import { captureException } from '../lib/sentry';
import { toast } from 'sonner';

const CartContext = createContext();

const GUEST_CART_KEY = 'hsp_cart_guest';

function readGuestCart() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || [];
  } catch {
    return [];
  }
}

function writeGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [loading, setLoading] = useState(false);
  const prevUserRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchCart = useCallback(async () => {
    if (fetchingRef.current) return; // Guard against concurrent calls
    fetchingRef.current = true;
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
      captureException(error);
      setCartItems([]);
      setAppliedDiscount(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Merge guest cart into server cart
  const mergeGuestCart = useCallback(async () => {
    const guestItems = readGuestCart();
    if (guestItems.length === 0) return;

    try {
      for (const item of guestItems) {
        await apiClient.post('/cart/items', {
          product_id: item.product_id,
          quantity: item.quantity,
          ...(item.variant_id && { variant_id: item.variant_id }),
          ...(item.pack_id && { pack_id: item.pack_id }),
        });
      }
    } catch (error) {
      console.error('[CartContext] Error merging guest cart:', error);
    }
    clearGuestCart();
  }, []);

  useEffect(() => {
    const wasLoggedOut = !prevUserRef.current;
    prevUserRef.current = user;

    if (user) {
      // User just logged in — merge guest cart then fetch
      if (wasLoggedOut) {
        const guestItems = readGuestCart();
        if (guestItems.length > 0) {
          mergeGuestCart().then(() => fetchCart());
        } else {
          fetchCart();
        }
      } else {
        fetchCart();
      }
    } else {
      // Logged out — load guest cart from localStorage
      setCartItems(readGuestCart());
      setAppliedDiscount(null);
    }
  }, [user, fetchCart, mergeGuestCart]);

  // Cross-tab sync for guest cart via storage event
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === GUEST_CART_KEY && !user) {
        setCartItems(readGuestCart());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user]);

  const addToCart = useCallback(async (productId, quantity, variantId = null, packId = null) => {
    if (!user) {
      // Guest cart — localStorage
      const guest = readGuestCart();
      const key = `${productId}-${variantId || ''}-${packId || ''}`;
      const idx = guest.findIndex(
        (i) => `${i.product_id}-${i.variant_id || ''}-${i.pack_id || ''}` === key
      );
      if (idx >= 0) {
        guest[idx].quantity += quantity;
      } else {
        guest.push({ product_id: productId, quantity, variant_id: variantId, pack_id: packId });
      }
      writeGuestCart(guest);
      setCartItems(guest);
      return true;
    }

    try {
      const payload = { product_id: productId, quantity };
      if (variantId) payload.variant_id = variantId;
      if (packId) payload.pack_id = packId;

      await apiClient.post('/cart/items', payload);
      await fetchCart();
      return true;
    } catch (error) {
      console.error('[CartContext] Error adding to cart:', error);
      captureException(error);

      if (error.status === 401) {
        sessionStorage.setItem('pendingCartAction', JSON.stringify({ productId, quantity, variantId, packId }));
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        return 'redirect';
      }

      return false;
    }
  }, [user, fetchCart]);

  const removeFromCart = useCallback(async (productId, variantId = null, packId = null) => {
    if (!user) {
      const guest = readGuestCart();
      const key = `${productId}-${variantId || ''}-${packId || ''}`;
      const filtered = guest.filter(
        (i) => `${i.product_id}-${i.variant_id || ''}-${i.pack_id || ''}` !== key
      );
      writeGuestCart(filtered);
      setCartItems(filtered);
      return;
    }

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
      toast.error('No se pudo eliminar el producto');
      captureException(error);
    }
  }, [user, fetchCart]);

  const updateQuantity = useCallback(async (productId, newQuantity, variantId = null, packId = null) => {
    if (newQuantity <= 0) {
      return removeFromCart(productId, variantId, packId);
    }

    if (!user) {
      const guest = readGuestCart();
      const key = `${productId}-${variantId || ''}-${packId || ''}`;
      const idx = guest.findIndex(
        (i) => `${i.product_id}-${i.variant_id || ''}-${i.pack_id || ''}` === key
      );
      if (idx >= 0) {
        guest[idx].quantity = newQuantity;
        writeGuestCart(guest);
        setCartItems(guest);
      }
      return;
    }

    try {
      await apiClient.patch(`/cart/items/${productId}`, {
        quantity: newQuantity,
        ...(variantId && { variant_id: variantId }),
        ...(packId && { pack_id: packId }),
      });
      await fetchCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('No se pudo actualizar la cantidad');
      captureException(error);
    }
  }, [user, fetchCart, removeFromCart]);

  const clearCart = useCallback(async () => {
    if (!user) {
      clearGuestCart();
      setCartItems([]);
      return;
    }

    try {
      await apiClient.delete('/cart');
      setCartItems([]);
      setAppliedDiscount(null);
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('No se pudo vaciar el carrito');
    }
  }, [user]);

  const applyDiscount = useCallback(async (code) => {
    try {
      const data = await apiClient.post(`/cart/apply-coupon?code=${encodeURIComponent(code)}`, {});
      await fetchCart();
      return { success: true, data };
    } catch (error) {
      console.error('Error applying discount:', error);
      return { success: false, error: error.message || 'Failed to apply discount' };
    }
  }, [fetchCart]);

  const removeDiscount = useCallback(async () => {
    try {
      await apiClient.delete('/cart/coupon');
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Error removing discount:', error);
      return { success: false, error: error.message || 'Failed to remove discount' };
    }
  }, [fetchCart]);

  const getShippingPreview = useCallback(async () => {
    try {
      const res = await apiClient.post('/cart/shipping-preview', {});
      return (res.data || res);
    } catch (error) {
      console.error('Error fetching shipping preview:', error);
      return { stores: [], total_shipping_cents: 0, total_savings_cents: 0, store_count: 0 };
    }
  }, []);

  const getTotalItems = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Estimate only — backend cartSummary is the source of truth for checkout.
  // Do NOT use this for payment amounts. Only for UI display hints.
  // Returns total in CENTS — callers must divide by 100 for display
  const getTotalPrice = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + (item.unit_price_cents || 0) * item.quantity, 0);
  }, [cartItems]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        appliedDiscount,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
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

export function useCart() {
  return useContext(CartContext);
}
