import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api/client';

/**
 * Single source of truth for plan pricing and commission rates.
 * Fetches from GET /config/plans (public, no auth required).
 * Stale time: 1 hour — plans rarely change.
 */
export function usePlanConfig() {
  return useQuery({
    queryKey: ['planConfig'],
    queryFn: () => apiClient.get('/config/plans'),
    staleTime: 60 * 60 * 1000,
    cacheTime: 2 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Helper to extract seller plan info from the config.
 * Returns { commission, price, label } for a given plan name.
 */
export function useSellerPlanInfo(planName = 'FREE') {
  const { data } = usePlanConfig();
  if (!data?.seller_plans) return null;
  const plan = data.seller_plans[planName.toUpperCase()];
  if (!plan) return null;
  return {
    commissionRate: plan.commission_rate,
    commissionPct: Math.round(plan.commission_rate * 100),
    priceMonthly: plan.price_monthly_eur,
    label: plan.label,
    shippingBaseCents: plan.shipping_base_cents,
    shippingFreeThresholdCents: plan.shipping_free_threshold_cents,
  };
}

/**
 * Get influencer tier info.
 */
export function useInfluencerTierInfo(tierName) {
  const { data } = usePlanConfig();
  if (!data?.influencer_tiers || !tierName) return null;
  const tier = data.influencer_tiers[tierName.toLowerCase()];
  if (!tier) return null;
  return {
    commissionRate: tier.commission_rate,
    commissionPct: Math.round(tier.commission_rate * 100),
    label: tier.label,
  };
}
