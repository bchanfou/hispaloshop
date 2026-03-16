/**
 * Feature flags — controla acceso a funcionalidades por rol y plan.
 */

const FEATURES = {
  // Disponible para todos
  view_feed: ['free', 'pro', 'elite'],
  view_explore: ['free', 'pro', 'elite'],
  create_post: ['free', 'pro', 'elite'],
  chat_b2c: ['free', 'pro', 'elite'],

  // Solo productores/importadores
  publish_product: {
    roles: ['producer', 'importer'],
    plans: ['free', 'pro', 'elite'],
    requires_verified: true,
  },
  b2b_access: {
    roles: ['producer', 'importer'],
    plans: ['pro', 'elite'],
  },
  b2b_contracts: {
    roles: ['producer', 'importer'],
    plans: ['pro', 'elite'],
  },

  // Solo influencers
  affiliate_links: {
    roles: ['influencer'],
    plans: ['free', 'pro', 'elite'],
    requires_fiscal: true,
  },

  // Por plan
  analytics_advanced: {
    roles: ['producer', 'importer', 'influencer'],
    plans: ['pro', 'elite'],
  },
  hispal_ai_agent: {
    roles: ['producer', 'importer'],
    plans: ['elite'],
  },
  free_shipping_threshold_30: {
    roles: ['producer', 'importer'],
    plans: ['pro', 'elite'],
  },
  free_shipping_threshold_20: {
    roles: ['producer', 'importer'],
    plans: ['elite'],
  },
};

export function hasFeature(feature, user) {
  const rule = FEATURES[feature];
  if (!rule) return false;

  // Simple array = plan-only check
  if (Array.isArray(rule)) {
    return rule.includes(user?.plan || 'free');
  }

  const roleOk = !rule.roles || rule.roles.includes(user?.role);
  const planOk = !rule.plans || rule.plans.includes(user?.plan || 'free');
  const verifiedOk = !rule.requires_verified || user?.is_verified;
  const fiscalOk = !rule.requires_fiscal || !user?.affiliate_blocked;

  return roleOk && planOk && verifiedOk && fiscalOk;
}

export default FEATURES;
