import { useCartPricing as useCartPricingQuery } from '../queries';
import { useAuth } from '../../../context/AuthContext';

const DEFAULT_SUMMARY = {
  subtotal_cents: 0,
  shipping_cents: 0,
  tax_cents: 0,
  tax_rate_bp: 2100,
  total_cents: 0,
};

export function useCartPricing(cartItems, appliedDiscount) {
  const { user } = useAuth();
  const pricingQuery = useCartPricingQuery({ enabled: Boolean(user) });
  const pricing = pricingQuery.data;

  // Client-side subtotal — ALWAYS computed from live cartItems for instant UI updates
  const clientSubtotal = cartItems.reduce(
    (sum, item) => sum + (item.unit_price_cents || 0) * (item.quantity || 1), 0
  );

  // Use server pricing for shipping/tax/breakdown, but client subtotal for instant feedback
  const serverSubtotal = pricing?.subtotalCents;
  const subtotalCents = user && !pricingQuery.isFetching && serverSubtotal != null
    ? serverSubtotal
    : clientSubtotal;
  const shippingCents = pricing?.shippingCents ?? 0;
  const taxCents = pricing?.taxCents ?? 0;
  const taxRateBp = pricing?.taxRateBp ?? 2100;
  const discountAmountCents = appliedDiscount?.discount_cents || 0;
  const shippingBreakdown = pricing?.shippingBreakdown || [];

  // Spain B2C: IVA is INCLUDED in prices, so total = subtotal + shipping - discount
  // tax_cents is informational only (how much of the subtotal is IVA)
  return {
    cartSummary: {
      ...DEFAULT_SUMMARY,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      tax_cents: taxCents,
      tax_rate_bp: taxRateBp,
      total_cents: Math.max(0, subtotalCents - discountAmountCents + shippingCents),
      shipping_breakdown: shippingBreakdown,
    },
    stockIssues: pricing?.stockIssues || [],
    isLoading: pricingQuery.isLoading,
    isFetching: pricingQuery.isFetching,
    refetch: pricingQuery.refetch,
  };
}

export default useCartPricing;
