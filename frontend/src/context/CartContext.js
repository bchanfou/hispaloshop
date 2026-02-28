import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

// Smart API URL: Use relative URL for production, env var for development
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('hispaloshop.com') || host.includes('preview.emergentagent.com')) {
      return '/api';
    }
  }
  return '/api';
};

const API = getApiUrl();

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
      const response = await axios.get(`${API}/cart`, { withCredentials: true });
      // Cart API returns {items: [], discount: null}
      const data = response.data;
      setCartItems(data.items || []);
      setAppliedDiscount(data.discount || null);
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCartItems([]);
      setAppliedDiscount(null);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity, variantId = null, packId = null) => {
    console.log('[CartContext] Adding to cart:', { productId, quantity, variantId, packId });
    
    try {
      const payload = { product_id: productId, quantity };
      if (variantId) payload.variant_id = variantId;
      if (packId) payload.pack_id = packId;
      
      const response = await axios.post(
        `${API}/cart/add`,
        payload,
        { withCredentials: true }
      );
      console.log('[CartContext] Add to cart response:', response.data);
      
      await fetchCart();
      return true;
    } catch (error) {
      console.error('[CartContext] Error adding to cart:', error);
      console.error('[CartContext] Error response:', error.response?.data);
      
      // If 401 (unauthorized), redirect to login
      if (error.response?.status === 401) {
        // Store the intended action to resume after login
        sessionStorage.setItem('pendingCartAction', JSON.stringify({ productId, quantity, variantId, packId }));
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        return 'redirect';
      }
      
      return false;
    }
  };

  const removeFromCart = async (productId, variantId = null, packId = null) => {
    try {
      let url = `${API}/cart/${productId}`;
      const params = new URLSearchParams();
      if (variantId) params.append('variant_id', variantId);
      if (packId) params.append('pack_id', packId);
      if (params.toString()) url += `?${params.toString()}`;
      
      await axios.delete(url, { withCredentials: true });
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const applyDiscount = async (code) => {
    try {
      const response = await axios.post(
        `${API}/cart/apply-discount?code=${encodeURIComponent(code)}`,
        {},
        { withCredentials: true }
      );
      await fetchCart();
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error applying discount:', error);
      return { success: false, error: error.response?.data?.detail || 'Failed to apply discount' };
    }
  };

  const removeDiscount = async () => {
    try {
      await axios.delete(`${API}/cart/remove-discount`, { withCredentials: true });
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Error removing discount:', error);
      return { success: false, error: error.response?.data?.detail || 'Failed to remove discount' };
    }
  };

  const getTotalItems = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
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