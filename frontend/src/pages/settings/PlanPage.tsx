// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

const PLANS = [
  {
    id: 'free',
    name: 'FREE',
    price: '0€/mes',
    features: [
      'Hasta 10 productos',
      t('plan.perfilDeTiendaBasico', 'Perfil de tienda básico'),
      'Soporte por email',
      t('plan.analiticasBasicas', 'Analíticas básicas'),
      'Comisión 20%',
    ],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '79€/mes',
    features: [
      'Productos ilimitados',
      'Perfil de tienda completo',
      'Soporte prioritario',
      t('plan.analiticasAvanzadas', 'Analíticas avanzadas'),
      'Envío gratis desde 30€',
      'Certificados digitales',
      'Comisión 18%',
    ],
  },
  {
    id: 'elite',
    name: 'ELITE',
    price: '249€/mes',
    features: [
      'Todo lo de PRO',
      'Tienda destacada',
      'IA comercial avanzada',
      t('plan.generacionDeContratos', 'Generación de contratos'),
      'B2B marketplace',
      'Firma digital ilimitada',
      'Comisión 15%',
    ],
  },
];

export default function PlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [downgradeTarget, setDowngradeTarget] = useState(null);

  const currentPlan = (user?.subscription_plan || user?.subscription?.plan || user?.plan || 'free').toLowerCase();
  const trialEndsAt = user?.subscription?.trial_ends_at || user?.trial_ends_at;
  const trialDays = trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt) - Date.now()) / 86400000)) : 0;
  const nextBilling = user?.subscription?.next_billing_date || user?.next_billing_date;

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/billing/portal-url');
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error(t('plan.errorAlAbrirFacturacion', 'Error al abrir facturación'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = useCallback(async (planId) => {
    const PLAN_ORDER = { free: 0, pro: 1, elite: 2 };
    const isDowngrade = (PLAN_ORDER[planId] || 0) < (PLAN_ORDER[currentPlan] || 0);
    if (isDowngrade) {
      setDowngradeTarget(planId);
      return;
    }
    try {
      const data = await apiClient.post('/billing/change-plan', { plan: planId });
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error(t('plan.errorAlCambiarDePlan', 'Error al cambiar de plan'));
    }
  }, [currentPlan]);

  const confirmDowngrade = useCallback(async () => {
    if (!downgradeTarget) return;
    const planId = downgradeTarget;
    setDowngradeTarget(null);
    try {
      const data = await apiClient.post('/billing/change-plan', { plan: planId });
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error(t('plan.errorAlCambiarDePlan', 'Error al cambiar de plan'));
    }
  }, [downgradeTarget]);

  const currentPlanData = PLANS.find(p => p.id === currentPlan) || PLANS[0];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Topbar */}
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate('/settings')}
          className="bg-transparent border-none cursor-pointer p-1 flex">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950">Mi plan</span>
      </div>

      <div className="max-w-[600px] mx-auto px-4 pt-6 pb-[100px]">
        {/* ── Current Plan Card ── */}
        <div className="bg-white shadow-sm rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PlanBadge plan={currentPlan} />
              <span className="text-xs text-stone-500">Plan actual</span>
            </div>
            {currentPlan === 'elite' && <Crown size={20} className="text-stone-950" />}
            {currentPlan === 'pro' && <Zap size={20} className="text-stone-950" />}
          </div>

          <p className="text-xl font-bold text-stone-950 mb-1">
            Plan {currentPlanData.name}
          </p>
          <p className="text-[15px] text-stone-500 mb-3">
            {currentPlanData.price}
          </p>

          {trialDays > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-500 text-xs font-semibold mb-3">
              Trial activo · {trialDays} días restantes
            </div>
          )}

          {nextBilling && (
            <p className="text-[13px] text-stone-500 mb-4">
              Próxima factura: {new Date(nextBilling).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          {currentPlan !== 'free' && (
            <button
              onClick={handleManageBilling}
              disabled={loading}
              className="w-full p-3 bg-white border border-stone-200 rounded-[14px] text-sm font-semibold text-stone-950 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Gestionar facturación'}
            </button>
          )}
        </div>

        {/* ── Plan Comparison ── */}
        <p className="text-[11px] font-bold text-stone-500 tracking-[0.08em] uppercase mb-3">
          Comparar planes
        </p>

        <div className="flex flex-col gap-3">
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan;
            const isUpgrade = PLANS.indexOf(plan) > PLANS.findIndex(p => p.id === currentPlan);

            return (
              <div key={plan.id} className={`bg-white rounded-2xl p-4 relative ${
                isCurrent ? 'border-2 border-stone-950' : 'border border-stone-200'
              }`}>
                {isCurrent && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-bold px-2.5 py-[3px] rounded-full bg-stone-950 text-white">
                    Actual
                  </span>
                )}

                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p className="text-base font-bold text-stone-950 m-0">
                      {plan.name}
                    </p>
                    <p className="text-sm text-stone-500 mt-0.5 m-0">
                      {plan.price}
                    </p>
                  </div>
                  <PlanBadge plan={plan.id} />
                </div>

                <div className="mb-3">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <Check size={14} className="text-stone-950" />
                      <span className="text-[13px] text-stone-950">{f}</span>
                    </div>
                  ))}
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => handleChangePlan(plan.id)}
                    className={`w-full py-2.5 rounded-full text-[13px] font-semibold cursor-pointer ${
                      isUpgrade
                        ? 'bg-stone-950 text-white border-none'
                        : 'bg-white text-stone-950 border border-stone-200'
                    }`}
                  >
                    {isUpgrade ? `Mejorar a ${plan.name}` : `Bajar a ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Downgrade Confirm Modal ── */}
      {downgradeTarget && (
        <div
          className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDowngradeTarget(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl p-5 max-w-[360px] w-full" onClick={e => e.stopPropagation()}>
            <p className="text-stone-950 font-semibold text-base mb-1">¿Bajar de plan?</p>
            <p className="text-stone-500 text-sm mb-4 leading-relaxed">
              Perderás las funcionalidades premium al final del periodo de facturación.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDowngradeTarget(null)}
                className="flex-1 py-2.5 rounded-full border border-stone-200 text-[13px] font-semibold text-stone-950"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDowngrade}
                className="flex-1 py-2.5 rounded-full bg-stone-950 text-[13px] font-semibold text-white"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanBadge({ plan }) {
  const upper = (plan || 'free').toUpperCase();
  const isElite = upper === 'ELITE';
  return (
    <span className={`text-[10px] font-bold tracking-[0.05em] px-2.5 py-[3px] rounded-full ${
      isElite ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-950'
    }`}>
      {upper}
    </span>
  );
}
