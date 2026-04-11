// Section 3.6.3b — TierBadge
// Reusable pill for influencer tier display. Used inside
// InfluencerLayoutResponsive (sidebar header + mobile header) and available
// for any other surface that needs to show the tier at a glance.
// Canonical tiers: hercules / atenea / zeus. Unknown tiers render nothing.

import React from 'react';
import { Star, Trophy, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TIER_CONFIG = {
  hercules: {
    icon: Star,
    classes: 'bg-stone-100 text-stone-700',
    fallbackLabel: 'Hercules',
  },
  atenea: {
    icon: Trophy,
    classes: 'bg-stone-700 text-white',
    fallbackLabel: 'Atenea',
  },
  zeus: {
    icon: Crown,
    classes: 'bg-stone-950 text-white',
    fallbackLabel: 'Zeus',
  },
};

const SIZE_CONFIG = {
  sm: {
    wrapper: 'text-[10px] px-2 py-0.5 h-5 gap-1',
    icon: 'w-3 h-3',
  },
  md: {
    wrapper: 'text-xs px-2.5 py-1 h-6 gap-1',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    wrapper: 'text-sm px-3 py-1.5 h-8 gap-1.5',
    icon: 'w-4 h-4',
  },
};

export default function TierBadge({ tier, size = 'md', className = '' }) {
  const { t } = useTranslation();
  const key = String(tier || '').toLowerCase();
  const config = TIER_CONFIG[key];
  if (!config) return null;

  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const Icon = config.icon;
  const label = t(
    `influencer.layout.header.tierBadge.${key}`,
    config.fallbackLabel,
  );

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${config.classes} ${sizeConfig.wrapper} ${className}`}
      data-testid={`influencer-tier-badge-${key}`}
    >
      <Icon className={sizeConfig.icon} strokeWidth={1.8} />
      <span>{label}</span>
    </span>
  );
}
