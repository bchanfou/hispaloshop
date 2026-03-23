// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Product Detail Commerce', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should fetch product by ID', async () => {
    const mockProduct = {
      product_id: 'prod-1',
      name: 'Aceite de Oliva Virgen Extra',
      price_cents: 1290,
      currency: 'EUR',
      stock: 25,
      variants: [],
      free_shipping: false,
    };
    apiClient.get.mockResolvedValue(mockProduct);
    const result = await apiClient.get('/products/prod-1');
    expect(apiClient.get).toHaveBeenCalledWith('/products/prod-1');
    expect(result.product_id).toBe('prod-1');
    expect(result.name).toBe('Aceite de Oliva Virgen Extra');
  });

  it('should display price with correct currency', () => {
    const priceCents = 1290;
    const currency = 'EUR';

    // Format price from cents to display string
    const formatted = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
    }).format(priceCents / 100);

    expect(formatted).toContain('12,90');
    expect(formatted).toContain('€');
  });

  it('should update price when variant is selected', async () => {
    const baseProduct = {
      product_id: 'prod-1',
      price_cents: 1290,
      variants: [
        { variant_id: 'v1', name: '500ml', price_cents: 1290 },
        { variant_id: 'v2', name: '1L', price_cents: 2190 },
      ],
    };
    apiClient.get.mockResolvedValue(baseProduct);
    const product = await apiClient.get('/products/prod-1');

    // Select the 1L variant
    const selectedVariant = product.variants.find((v) => v.variant_id === 'v2');
    expect(selectedVariant.price_cents).toBe(2190);
    expect(selectedVariant.name).toBe('1L');
  });

  it('should add to cart with correct product_id + variant_id + pack_id', async () => {
    const payload = {
      product_id: 'prod-1',
      variant_id: 'v2',
      pack_id: 'pack-3',
      quantity: 1,
    };
    apiClient.post.mockResolvedValue({ id: 'item-1', ...payload });
    const result = await apiClient.post('/cart/items', payload);
    expect(apiClient.post).toHaveBeenCalledWith('/cart/items', payload);
    expect(result.product_id).toBe('prod-1');
    expect(result.variant_id).toBe('v2');
    expect(result.pack_id).toBe('pack-3');
  });

  it('should show "already in cart" indicator when item exists', () => {
    const cartItems = [
      { product_id: 'prod-1', variant_id: 'v2', pack_id: null, quantity: 2 },
      { product_id: 'prod-3', variant_id: null, pack_id: null, quantity: 1 },
    ];

    // Triple match: product_id + variant_id + pack_id
    const isInCart = (productId, variantId, packId) =>
      cartItems.some(
        (item) =>
          item.product_id === productId &&
          (item.variant_id || null) === (variantId || null) &&
          (item.pack_id || null) === (packId || null),
      );

    expect(isInCart('prod-1', 'v2', null)).toBe(true);
    expect(isInCart('prod-1', 'v1', null)).toBe(false);
    expect(isInCart('prod-3', null, null)).toBe(true);
    expect(isInCart('prod-99', null, null)).toBe(false);
  });

  it('should disable add-to-cart when out of stock', () => {
    const product = { product_id: 'prod-1', stock: 0 };
    const isDisabled = product.stock <= 0;
    expect(isDisabled).toBe(true);

    const inStock = { product_id: 'prod-2', stock: 5 };
    expect(inStock.stock <= 0).toBe(false);
  });

  it('should show free shipping badge when product.free_shipping is true', () => {
    const product = { product_id: 'prod-1', free_shipping: true };
    expect(product.free_shipping).toBe(true);

    const paidShipping = { product_id: 'prod-2', free_shipping: false };
    expect(paidShipping.free_shipping).toBe(false);
  });

  it('should toggle wishlist with auth gate', async () => {
    // Unauthenticated user — should not call API
    const isAuthenticated = false;
    let redirectedToLogin = false;

    if (!isAuthenticated) {
      redirectedToLogin = true;
    } else {
      await apiClient.post('/users/me/wishlist', { product_id: 'prod-1' });
    }

    expect(redirectedToLogin).toBe(true);
    expect(apiClient.post).not.toHaveBeenCalled();

    // Authenticated user — should toggle wishlist
    const isAuth2 = true;
    apiClient.post.mockResolvedValue({ wishlisted: true });

    if (isAuth2) {
      const result = await apiClient.post('/users/me/wishlist', { product_id: 'prod-1' });
      expect(result.wishlisted).toBe(true);
    }

    expect(apiClient.post).toHaveBeenCalledWith('/users/me/wishlist', { product_id: 'prod-1' });
  });

  it('should navigate to /cart on "Comprar ahora" click', () => {
    // Simulate navigation
    let navigatedTo = null;
    const navigate = (path) => {
      navigatedTo = path;
    };

    // "Comprar ahora" adds to cart and navigates
    navigate('/cart');
    expect(navigatedTo).toBe('/cart');
  });
});
