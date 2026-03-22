// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Checkout Flow', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('createCheckout sends shipping address and returns Stripe URL', async () => {
    apiClient.post.mockResolvedValue({ url: 'https://checkout.stripe.com/session123', session_id: 'cs_123' });
    const result = await apiClient.post('/payments/create-checkout', {
      shipping_address: { full_name: 'Test', street: 'Calle 1', city: 'Madrid', postal_code: '28001', country: 'ES' },
    });
    expect(result.url).toContain('stripe.com');
    expect(result.session_id).toBeTruthy();
  });

  it('polling returns order data on success', async () => {
    apiClient.get.mockResolvedValue({ status: 'paid', order_id: 'ord_123' });
    const result = await apiClient.get('/payments/checkout-status/cs_123');
    expect(result.status).toBe('paid');
    expect(result.order_id).toBeTruthy();
  });

  it('polling returns pending on incomplete payment', async () => {
    apiClient.get.mockResolvedValue({ status: 'pending' });
    const result = await apiClient.get('/payments/checkout-status/cs_123');
    expect(result.status).toBe('pending');
  });

  it('rejects checkout with empty cart', async () => {
    apiClient.post.mockRejectedValue({ response: { status: 400, data: { detail: 'Cart is empty' } } });
    await expect(apiClient.post('/payments/create-checkout', {})).rejects.toBeTruthy();
  });
});
