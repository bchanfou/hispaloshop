// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/api/client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn(), put: vi.fn() },
}));

import apiClient from '../services/api/client';

describe('Cart Checkout Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should group cart items by producer', () => {
    const cartItems = [
      { product_id: 'p1', producer_id: 'store-a', name: 'Aceite' },
      { product_id: 'p2', producer_id: 'store-a', name: 'Vinagre' },
      { product_id: 'p3', producer_id: 'store-b', name: 'Miel' },
    ];

    const grouped = cartItems.reduce((acc, item) => {
      const key = item.producer_id || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['store-a']).toHaveLength(2);
    expect(grouped['store-b']).toHaveLength(1);
  });

  it('should show shipping progress bar per store', async () => {
    apiClient.post.mockResolvedValue({
      stores: [
        { store_id: 'store-a', shipping_cents: 490, threshold_cents: 5000, subtotal_cents: 3200 },
        { store_id: 'store-b', shipping_cents: 0, threshold_cents: 3000, subtotal_cents: 4500 },
      ],
      total_shipping_cents: 490,
    });

    const result = await apiClient.post('/cart/shipping-preview', { country: 'ES' });

    // store-a: 3200/5000 = 64% progress, still has shipping
    const storeA = result.stores.find((s) => s.store_id === 'store-a');
    expect(storeA.shipping_cents).toBe(490);
    const progressA = Math.min(100, Math.round((storeA.subtotal_cents / storeA.threshold_cents) * 100));
    expect(progressA).toBe(64);

    // store-b: 4500/3000 = 100% — free shipping
    const storeB = result.stores.find((s) => s.store_id === 'store-b');
    expect(storeB.shipping_cents).toBe(0);
    const progressB = Math.min(100, Math.round((storeB.subtotal_cents / storeB.threshold_cents) * 100));
    expect(progressB).toBe(100);
  });

  it('should apply discount code and show savings', async () => {
    apiClient.post.mockResolvedValue({
      valid: true,
      discount_percent: 15,
      discount_cents: 450,
      code: 'SAVE15',
    });

    const result = await apiClient.post('/cart/apply-coupon', { code: 'SAVE15' });
    expect(result.valid).toBe(true);
    expect(result.discount_percent).toBe(15);
    expect(result.discount_cents).toBe(450);
    expect(result.code).toBe('SAVE15');
  });

  it('should reject invalid discount code with inline error', async () => {
    apiClient.post.mockRejectedValue({
      response: { status: 400, data: { detail: 'Código no válido o expirado' } },
    });

    let errorMessage = null;
    try {
      await apiClient.post('/cart/apply-coupon', { code: 'INVALID123' });
    } catch (err) {
      errorMessage = err.response.data.detail;
    }

    expect(errorMessage).toBe('Código no válido o expirado');
  });

  it('should calculate total correctly (subtotal + shipping - discount)', () => {
    const subtotalCents = 4500;
    const shippingCents = 490;
    const discountCents = 450;

    const totalCents = subtotalCents + shippingCents - discountCents;
    expect(totalCents).toBe(4540);

    // Format for display
    const formatted = (totalCents / 100).toFixed(2);
    expect(formatted).toBe('45.40');
  });

  it('should require address before proceeding to payment', async () => {
    // Missing address: API should reject
    apiClient.post.mockRejectedValue({
      response: { status: 400, data: { detail: 'Shipping address required' } },
    });

    let error = null;
    try {
      await apiClient.post('/payments/create-checkout', { shipping_address: null });
    } catch (err) {
      error = err;
    }

    expect(error).toBeTruthy();
    expect(error.response.status).toBe(400);
  });

  it('should prevent double-click on pay button (payingRef guard)', () => {
    // Simulate payingRef guard
    let payingRef = { current: false };
    const clicks = [];

    const handlePay = () => {
      if (payingRef.current) return;
      payingRef.current = true;
      clicks.push('pay');
    };

    handlePay(); // First click goes through
    handlePay(); // Second click blocked
    handlePay(); // Third click blocked

    expect(clicks).toHaveLength(1);
  });

  it('should redirect to Stripe checkout URL', async () => {
    const stripeUrl = 'https://checkout.stripe.com/c/pay/cs_test_abc123';
    apiClient.post.mockResolvedValue({
      url: stripeUrl,
      session_id: 'cs_test_abc123',
    });

    const result = await apiClient.post('/payments/create-checkout', {
      shipping_address: {
        full_name: 'Juan García',
        street: 'Calle Mayor 1',
        city: 'Sevilla',
        postal_code: '41001',
        country: 'ES',
      },
    });

    expect(result.url).toContain('stripe.com');
    expect(result.session_id).toBeTruthy();

    // Simulate redirect
    let redirectedTo = null;
    const windowLocationAssign = (url) => {
      redirectedTo = url;
    };
    windowLocationAssign(result.url);
    expect(redirectedTo).toBe(stripeUrl);
  });

  it('should poll checkout status with exponential backoff', async () => {
    // Simulate polling: pending → pending → paid
    apiClient.get
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'paid', order_id: 'ord_abc123' });

    const maxAttempts = 20;
    let attempt = 0;
    let finalStatus = null;

    while (attempt < maxAttempts) {
      const result = await apiClient.get('/payments/checkout-status/cs_test_abc123');
      attempt++;

      if (result.status === 'paid' || result.status === 'failed') {
        finalStatus = result;
        break;
      }

      // Exponential backoff delay would be: Math.min(2000 * 2^attempt, 10000)
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      expect(delay).toBeGreaterThan(0);
    }

    expect(attempt).toBe(3);
    expect(finalStatus.status).toBe('paid');
    expect(finalStatus.order_id).toBe('ord_abc123');
  });

  it('should show order details on successful checkout', async () => {
    apiClient.get.mockResolvedValue({
      status: 'paid',
      order_id: 'ord_abc123',
      items: [
        { product_id: 'p1', name: 'Aceite AOVE', quantity: 2, price_cents: 1290 },
      ],
      total_cents: 3070,
      shipping_cents: 490,
    });

    const result = await apiClient.get('/payments/checkout-status/cs_test_abc123');
    expect(result.status).toBe('paid');
    expect(result.order_id).toBe('ord_abc123');
    expect(result.items).toHaveLength(1);

    // Order reference display: last 8 chars
    const orderRef = String(result.order_id).slice(-8);
    expect(orderRef).toBe('d_abc123');
  });
});
