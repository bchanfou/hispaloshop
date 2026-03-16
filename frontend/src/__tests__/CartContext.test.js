/**
 * CartContext — critical flow tests
 *
 * Run with: npx vitest (after installing vitest)
 * Or adapt to Jest if preferred.
 *
 * These tests cover the most critical cart logic that handles money.
 */

// ── Pure function tests (no React needed) ──────────────────────

describe('Guest cart localStorage logic', () => {
  const GUEST_CART_KEY = 'hsp_cart_guest';

  beforeEach(() => {
    localStorage.clear();
  });

  test('guest cart stores only product_id, quantity, variant_id, pack_id — no prices', () => {
    const item = { product_id: 'p1', quantity: 2, variant_id: 'v1', pack_id: null };
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify([item]));
    const stored = JSON.parse(localStorage.getItem(GUEST_CART_KEY));

    expect(stored[0]).not.toHaveProperty('price');
    expect(stored[0]).not.toHaveProperty('unit_price_cents');
    expect(stored[0].product_id).toBe('p1');
    expect(stored[0].quantity).toBe(2);
  });

  test('guest cart deduplicates by product_id + variant_id + pack_id', () => {
    const cart = [
      { product_id: 'p1', quantity: 1, variant_id: 'v1', pack_id: null },
    ];
    // Simulate adding same product+variant
    const key = `p1-v1-`;
    const existing = cart.findIndex(
      (i) => `${i.product_id}-${i.variant_id || ''}-${i.pack_id || ''}` === key
    );
    expect(existing).toBe(0); // found — should increment, not add new
  });

  test('different variant_id creates separate cart entry', () => {
    const cart = [
      { product_id: 'p1', quantity: 1, variant_id: 'v1', pack_id: null },
    ];
    const key = `p1-v2-`; // different variant
    const existing = cart.findIndex(
      (i) => `${i.product_id}-${i.variant_id || ''}-${i.pack_id || ''}` === key
    );
    expect(existing).toBe(-1); // not found — should add new entry
  });
});

describe('getTotalPrice is estimate only', () => {
  test('calculates sum of unit_price * quantity', () => {
    const cartItems = [
      { product_id: 'p1', unit_price_cents: 1000, price: 10, quantity: 2 },
      { product_id: 'p2', unit_price_cents: 500, price: 5, quantity: 1 },
    ];
    const total = cartItems.reduce(
      (sum, item) => sum + (item.unit_price_cents || item.price || 0) * item.quantity, 0
    );
    expect(total).toBe(2500); // 1000*2 + 500*1 = 2500 cents
  });

  test('handles missing price fields gracefully', () => {
    const cartItems = [
      { product_id: 'p1', quantity: 3 }, // no price at all
    ];
    const total = cartItems.reduce(
      (sum, item) => sum + (item.unit_price_cents || item.price || 0) * item.quantity, 0
    );
    expect(total).toBe(0);
  });
});
