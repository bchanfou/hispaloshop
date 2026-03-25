import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import apiClient from '../services/api/client';
import { useAuth } from './AuthContext';
import { captureException } from '../lib/sentry';
import { toast } from 'sonner';

const CartContext = createContext();

const GUEST_CART_KEY = 'hsp_cart_guest';

/** Normalize null/undefined/'' to empty string, then build a stable cart key */
function cartKey(productId, variantId, packId) {
  const v = variantId != null && variantId !== '' ? String(variantId) : '';
  const p = packId != null && packId !== '' ? String(packId) : '';
  return p ? `${productId}-${v}-${p}` : v ? `${productId}-${v}` : String(productId);
}

function itemKey(item) {
  return cartKey(item.product_id, item.variant_id, item.pack_id);
}

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
      if (process.env.NODE_ENV === 'development') console.error('Error fetching cart:', error);
      captureException(error);
      setCartItems([]);
      setAppliedDiscount(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Merge guest cart into server cart — skip items that already exist
  const mergeGuestCart = useCallback(async () => {
    const guestItems = readGuestCart();
    if (guestItems.length === 0) return;

    try {
      // Fetch current server cart to detect duplicates
      let serverKeys = new Set();
      try {
        const res = await apiClient.get('/cart');
        const serverItems = (res.data || res)?.items || [];
        serverKeys = new Set(serverItems.map(itemKey));
      } catch { /* if fetch fails, merge everything */ }

      const mergedKeys = new Set();
      for (const item of guestItems) {
        if (serverKeys.has(itemKey(item))) {
          mergedKeys.add(itemKey(item));
          continue; // already in server cart
        }
        try {
          await apiClient.post('/cart/items', {
            product_id: item.product_id,
            quantity: item.quantity,
            ...(item.variant_id != null && item.variant_id !== '' && { variant_id: item.variant_id }),
            ...(item.pack_id != null && item.pack_id !== '' && { pack_id: item.pack_id }),
          });
          mergedKeys.add(itemKey(item));
        } catch (e) {
          if (process.env.NODE_ENV === 'development') console.error('Merge failed for', item.product_id, e);
        }
      }
      // Clear only merged items, keep failed ones
      if (mergedKeys.size === guestItems.length) {
        clearGuestCart();
      } else {
        const remaining = guestItems.filter(i => !mergedKeys.has(itemKey(i)));
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(remaining));
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('[CartContext] Error merging guest cart:', error);
      try { toast.error('Algunos items del carrito no se pudieron recuperar'); } catch { /* toast not ready */ }
    }
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

  const addToCart = useCallback(async (productId, quantity, variantId = null, packId = null, displayInfo = {}) => {
    const MAX_GUEST_QTY = 20;
    if (!user) {
      // Guest cart — localStorage
      const guest = readGuestCart();
      const key = cartKey(productId, variantId, packId);
      const idx = guest.findIndex((i) => itemKey(i) === key);
      if (idx >= 0) {
        guest[idx].quantity = Math.min(guest[idx].quantity + quantity, MAX_GUEST_QTY);
        // Update display info if provided
        if (displayInfo.productName) guest[idx].product_name = displayInfo.productName;
        if (displayInfo.productImage) guest[idx].product_image = displayInfo.productImage;
        if (displayInfo.unitPriceCents != null) guest[idx].unit_price_cents = displayInfo.unitPriceCents;
        if (displayInfo.sellerName) guest[idx].seller_name = displayInfo.sellerName;
      } else {
        guest.push({
          product_id: productId,
          quantity: Math.min(quantity, MAX_GUEST_QTY),
          variant_id: variantId,
          pack_id: packId,
          product_name: displayInfo.productName || '',
          product_image: displayInfo.productImage || '',
          unit_price_cents: displayInfo.unitPriceCents || 0,
          seller_id: displayInfo.sellerId || '',
          seller_name: displayInfo.sellerName || '',
        });
      }
      writeGuestCart(guest);
      setCartItems(guest);
      return true;
    }

    try {
      const payload = { product_id: productId, quantity };
      if (variantId != null && variantId !== '') payload.variant_id = variantId;
      if (packId != null && packId !== '') payload.pack_id = packId;

      await apiClient.post('/cart/items', payload);
      await fetchCart();
      return true;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('[CartContext] Error adding to cart:', error);
      captureException(error);

      const status = error?.response?.status || error?.status || error?.statusCode;
      if (status === 401) {
        sessionStorage.setItem('pendingCartAction', JSON.stringify({ productId, quantity, variantId, packId }));
        return 'redirect';  // Let the caller handle navigation
      }

      return false;
    }
  }, [user, fetchCart]);

  const removeFromCart = useCallback(async (productId, variantId = null, packId = null) => {
    if (!user) {
      const guest = readGuestCart();
      const key = cartKey(productId, variantId, packId);
      const filtered = guest.filter((i) => itemKey(i) !== key);
      writeGuestCart(filtered);
      setCartItems(filtered);
      return;
    }

    // Optimistic remove — hide item immediately, revert on error
    const key = cartKey(productId, variantId, packId);
    const removedItem = cartItems.find(i => itemKey(i) === key);
    setCartItems(prev => prev.filter(item => itemKey(item) !== key));

    try {
      let path = `/cart/items/${productId}`;
      const params = new URLSearchParams();
      if (variantId) params.append('variant_id', variantId);
      if (packId) params.append('pack_id', packId);
      if (params.toString()) path += `?${params.toString()}`;

      await apiClient.delete(path);
      await fetchCart();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error removing from cart:', error);
      setCartItems(prev => removedItem ? [...prev, removedItem] : prev); // Revert on error
      toast.error('No se pudo eliminar el producto');
      captureException(error);
    }
  }, [user, fetchCart, cartItems]);

  const updateQuantity = useCallback(async (productId, newQuantity, variantId = null, packId = null) => {
    if (newQuantity <= 0) {
      return removeFromCart(productId, variantId, packId);
    }

    if (!user) {
      const guest = readGuestCart();
      const key = cartKey(productId, variantId, packId);
      const idx = guest.findIndex((i) => itemKey(i) === key);
      if (idx >= 0) {
        guest[idx].quantity = Math.min(newQuantity, 20);
        writeGuestCart(guest);
        setCartItems(guest);
      }
      return;
    }

    // Optimistic update — update UI immediately, revert on error
    const key = cartKey(productId, variantId, packId);
    let origQty;
    setCartItems(prev => {
      const found = prev.find(i => itemKey(i) === key);
      origQty = found?.quantity;
      return prev.map(item => itemKey(item) === key ? { ...item, quantity: newQuantity } : item);
    });

    try {
      await apiClient.patch(`/cart/items/${productId}`, {
        quantity: newQuantity,
        ...(variantId != null && variantId !== '' ? { variant_id: variantId } : {}),
        ...(packId != null && packId !== '' ? { pack_id: packId } : {}),
      });
      await fetchCart();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error updating quantity:', error);
      setCartItems(prev => prev.map(i =>
        itemKey(i) === key ? { ...i, quantity: origQty } : i
      )); // Revert on error
      toast.error('No se pudo actualizar la cantidad');
      captureException(error);
    }
  }, [user, fetchCart, removeFromCart, cartItems]);

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
      if (process.env.NODE_ENV === 'development') console.error('Error clearing cart:', error);
      toast.error('No se pudo vaciar el carrito');
    }
  }, [user]);

  const applyDiscount = useCallback(async (code) => {
    try {
      const data = await apiClient.post(`/cart/apply-coupon?code=${encodeURIComponent(code)}`, {});
      await fetchCart();
      return { success: true, data };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error applying discount:', error);
      return { success: false, error: error.message || 'Failed to apply discount' };
    }
  }, [fetchCart]);

  const removeDiscount = useCallback(async () => {
    try {
      await apiClient.delete('/cart/coupon');
      await fetchCart();
      return { success: true };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error removing discount:', error);
      return { success: false, error: error.message || 'Failed to remove discount' };
    }
  }, [fetchCart]);

  const getShippingPreview = useCallback(async () => {
    try {
      const res = await apiClient.post('/cart/shipping-preview', {});
      return (res.data || res);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error fetching shipping preview:', error);
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

  const value = useMemo(() => ({
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
    getTotalPrice,
  }), [cartItems, appliedDiscount, loading, addToCart, removeFromCart, updateQuantity, clearCart, applyDiscount, removeDiscount, fetchCart, getShippingPreview, getTotalItems, getTotalPrice]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
