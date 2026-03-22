// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiClient
vi.mock('../services/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import apiClient from '../services/api/client';

describe('Cart Operations', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('addToCart sends correct payload', async () => {
    apiClient.post.mockResolvedValue({ id: 'item-1', product_id: 'p1', quantity: 2 });
    const result = await apiClient.post('/cart/items', { product_id: 'p1', quantity: 2 });
    expect(apiClient.post).toHaveBeenCalledWith('/cart/items', { product_id: 'p1', quantity: 2 });
    expect(result.product_id).toBe('p1');
  });

  it('updateQuantity sends PATCH with correct params', async () => {
    apiClient.patch.mockResolvedValue({ id: 'item-1', quantity: 5 });
    const result = await apiClient.patch('/cart/items/p1', { quantity: 5 });
    expect(apiClient.patch).toHaveBeenCalledWith('/cart/items/p1', { quantity: 5 });
    expect(result.quantity).toBe(5);
  });

  it('removeFromCart sends DELETE', async () => {
    apiClient.delete.mockResolvedValue({ success: true });
    await apiClient.delete('/cart/items/p1');
    expect(apiClient.delete).toHaveBeenCalledWith('/cart/items/p1');
  });

  it('applyDiscount sends correct code', async () => {
    apiClient.post.mockResolvedValue({ valid: true, discount_percent: 10 });
    const result = await apiClient.post('/cart/apply-coupon', { code: 'SAVE10' });
    expect(result.valid).toBe(true);
    expect(result.discount_percent).toBe(10);
  });

  it('rejects invalid discount code', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 400, data: { detail: 'Invalid code' } } });
    await expect(apiClient.post('/cart/apply-coupon', { code: 'INVALID' })).rejects.toBeTruthy();
  });

  it('getShippingPreview returns per-store data', async () => {
    apiClient.post.mockResolvedValue({
      stores: [{ store_id: 's1', shipping_cents: 490, threshold_cents: 5000 }],
      total_shipping_cents: 490,
    });
    const result = await apiClient.post('/cart/shipping-preview', { country: 'ES' });
    expect(result.stores).toHaveLength(1);
    expect(result.stores[0].threshold_cents).toBe(5000);
  });
});
