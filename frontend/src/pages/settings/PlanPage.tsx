// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Crown, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

const PLANS = [
  {
    id: 'free',
    name: 'FREE',
    price: '0€/mes',
    features: [
      'Hasta 10 productos',
      'Perfil de tienda básico',
      'Soporte por email',
      'Analíticas básicas',
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
      'Analíticas avanzadas',
      'Envío optimizado',
      'Certificados digitales',
    ],
  },
  {
    id: 'elite',
    name: 'ELITE',
    price: '149€/mes',
    features: [
      'Todo lo de PRO',
      'Tienda destacada',
      'Account manager dedicado',
      'API avanzada',
      'B2B marketplace',
      'Firma digital ilimitada',
      'Consultoría estratégica',
    ],
  },
];

export default function PlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const currentPlan = (user?.subscription_plan || user?.plan || 'free').toLowerCase();
  const trialDays = user?.trial_days_remaining;
  const nextBilling = user?.next_billing_date;

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/billing/portal-url');
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Error al abrir facturación');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (planId) => {
    const PLAN_ORDER = { free: 0, pro: 1, elite: 2 };
    const isDowngrade = (PLAN_ORDER[planId] || 0) < (PLAN_ORDER[currentPlan] || 0);
    if (isDowngrade) {
      const confirmed = window.confirm('¿Seguro que quieres bajar de plan? Perderás las funcionalidades premium al final del periodo de facturación.');
      if (!confirmed) return;
    }
    try {
      const data = await apiClient.post('/billing/change-plan', { plan: planId });
      if (data.url) window.location.href = data.url;
    } catch {
      toast.error('Error al cambiar de plan');
    }
  };

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
        <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-6">
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
