/**
 * @deprecated Legacy local cart hook based on localStorage.
 * Prefer `context/CartContext` for current runtime behavior or `features/cart/queries` for new data work.
 */

import { useState, useCallback, useEffect, createContext, useContext } from 'react';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'hispaloshop_cart';
const CART_EXPIRY_DAYS = 30;

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const { items: savedItems, expiresAt } = JSON.parse(saved);
        if (new Date(expiresAt) > new Date()) {
          setItems(savedItems);
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Error loading cart:', e);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + CART_EXPIRY_DAYS);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
        items,
        expiresAt: expiresAt.toISOString()
      }));
    }
  }, [items]);

  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
    setLastAdded({ ...product, quantity });
    return true;
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(item => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen(prev => !prev), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const clearLastAdded = useCallback(() => setLastAdded(null), []);

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      totalItems,
      subtotal,
      lastAdded,
      clearLastAdded
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default useCart;
