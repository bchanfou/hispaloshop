import React from 'react';
import { Award, Gem, Crown } from 'lucide-react';

const TIER_ICONS = {
  Hercules: Gem,
  Atenea: Award,
  Zeus: Crown,
};

export default function InfluencerTierLadder({ tiers }) {
  return (
    <div className="overflow-x-auto pb-2" data-testid="tier-ladder">
      <div className="flex min-w-[520px] items-stretch gap-4">
        {tiers.map((tier, index) => {
          const Icon = TIER_ICONS[tier.name] || Award;

          return (
            <React.Fragment key={tier.name}>
              <article className="relative flex-1 rounded-[28px] border border-stone-200 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(28,28,28,0.45)]">
                <div
                  className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                  style={{ background: tier.accent }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-stone-950">{tier.name}</h3>
                  <span className="rounded-full bg-stone-900 px-3 py-1 text-sm font-semibold text-white">
                    {tier.rate}
                  </span>
                </div>
                <p className="text-sm text-stone-600">{tier.salesLabel}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  Para subir
                </p>
                <p className="mt-1 text-sm text-stone-700">{tier.requirement}</p>
              </article>
              {index < tiers.length - 1 && (
                <div className="flex items-center justify-center text-stone-300">
                  <div className="h-px w-8 bg-stone-300" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
