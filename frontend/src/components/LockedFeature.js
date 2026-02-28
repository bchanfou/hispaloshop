import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Zap, Crown } from 'lucide-react';
import { useProducerPlan } from '../context/ProducerPlanContext';
import { useTranslation } from 'react-i18next';

const PLAN_ICONS = { PRO: Zap, ELITE: Crown };
const PLAN_COLORS = {
  PRO: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', btn: 'bg-[#2D5A27] hover:bg-[#1F4A1A]' },
  ELITE: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', btn: 'bg-amber-600 hover:bg-amber-700' },
};

export default function LockedFeature({ requiredPlan, featureName, children }) {
  const { hasAccess } = useProducerPlan();
  const { t } = useTranslation();

  if (hasAccess(requiredPlan)) return children;

  const colors = PLAN_COLORS[requiredPlan] || PLAN_COLORS.PRO;
  const Icon = PLAN_ICONS[requiredPlan] || Lock;

  return (
    <div className="relative" data-testid={`locked-${featureName}`}>
      <div className="pointer-events-none opacity-30 blur-[2px] select-none" aria-hidden="true">
        {children}
      </div>
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${colors.bg}/80 backdrop-blur-[1px] rounded-xl border ${colors.border}`}>
        <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center mb-3`}>
          <Lock className={`w-5 h-5 ${colors.text}`} />
        </div>
        <p className={`text-sm font-semibold ${colors.text} mb-1`}>
          {t('plans.requiredPlan', 'Requiere plan')} {requiredPlan}
        </p>
        <p className="text-xs text-stone-500 mb-3 text-center px-4 max-w-[240px]">
          {t('plans.upgradeToUnlock', 'Mejora tu plan para desbloquear esta función')}
        </p>
        <Link
          to="/pricing"
          className={`inline-flex items-center gap-1.5 px-4 py-2 ${colors.btn} text-white text-xs font-semibold rounded-full transition-colors`}
          data-testid={`upgrade-cta-${featureName}`}
        >
          <Icon className="w-3.5 h-3.5" />
          {t('plans.upgrade', 'Mejorar plan')}
        </Link>
      </div>
    </div>
  );
}
