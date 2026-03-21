import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Zap, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type PlanName = 'FREE' | 'PRO' | 'ELITE';

interface FeatureGateProps {
  requiredPlan: PlanName;
  currentPlan: PlanName;
  featureName: string;
  children: ReactNode;
}

/**
 * Wraps a feature section and shows a lock overlay if the seller's plan
 * doesn't include the feature. Used in seller dashboard.
 */
export default function FeatureGate({ requiredPlan, currentPlan, featureName, children }: FeatureGateProps) {
  const { t } = useTranslation();
  const planLevel: Record<string, number> = { FREE: 0, PRO: 1, ELITE: 2 };
  const hasAccess = (planLevel[currentPlan] || 0) >= (planLevel[requiredPlan] || 0);

  if (hasAccess) return <>{children}</>;

  return (
    <div className="relative" data-testid={`feature-gate-${requiredPlan}`}>
      <div className="pointer-events-none select-none opacity-30 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-2xl">
        <div className="text-center p-6 max-w-xs">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-stone-600" />
          </div>
          <p className="text-sm font-semibold text-stone-950 mb-1">
            {featureName}
          </p>
          <p className="text-xs text-stone-500 mb-3">
            {t('plans.upgradeRequired', 'Requiere el plan {{plan}} o superior', { plan: requiredPlan })}
          </p>
          <Link to="/pricing">
            <button className="inline-flex items-center gap-1.5 bg-stone-950 hover:bg-stone-800 text-white rounded-2xl text-xs h-8 px-4 transition-colors">
              <Zap className="w-3 h-3" /> {t('plans.upgrade', 'Mejorar plan')} <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
