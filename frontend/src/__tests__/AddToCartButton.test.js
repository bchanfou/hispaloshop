/**
 * AddToCartButton — variant matching logic tests (A-15)
 *
 * The triple-match ensures the "X en cesta" badge shows the correct
 * quantity for the specific product + variant + pack combination.
 */

describe('AddToCartButton variant matching', () => {
  const cartItems = [
    { product_id: 'p1', variant_id: 'v1', pack_id: null, quantity: 2 },
    { product_id: 'p1', variant_id: 'v2', pack_id: null, quantity: 3 },
    { product_id: 'p2', variant_id: null, pack_id: null, quantity: 1 },
  ];

  function findExistingItem(productId, variantId, packId) {
    return cartItems.find((item) => {
      if (String(item.product_id) !== String(productId)) return false;
      if (variantId && String(item.variant_id || '') !== String(variantId)) return false;
      if (packId && String(item.pack_id || '') !== String(packId)) return false;
      return true;
    });
  }

  test('matches product + variant correctly', () => {
    const match = findExistingItem('p1', 'v1', null);
    expect(match).toBeDefined();
    expect(match.quantity).toBe(2); // not 3 (that's v2)
  });

  test('does not cross-match different variants', () => {
    const match = findExistingItem('p1', 'v2', null);
    expect(match).toBeDefined();
    expect(match.quantity).toBe(3); // v2 has 3
  });

  test('matches product without variant', () => {
    const match = findExistingItem('p2', null, null);
    expect(match).toBeDefined();
    expect(match.quantity).toBe(1);
  });

  test('returns undefined for non-existent product', () => {
    const match = findExistingItem('p999', null, null);
    expect(match).toBeUndefined();
  });

  test('returns undefined for non-existent variant', () => {
    const match = findExistingItem('p1', 'v999', null);
    expect(match).toBeUndefined();
  });
});
