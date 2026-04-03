// @ts-nocheck
import React, { useState } from 'react';
import { Star, Zap, Crown, Check, Loader2, AlertTriangle, Calendar, Shield, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useProducerPlan } from '../../context/ProducerPlanContext';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
const PLANS = [{
  key: 'FREE',
  name: 'Free',
  price: 0,
  commission: '20%',
  icon: Star,
  features: ['Listado de productos ilimitados', "Panel de control básico", 'Soporte por email'],
  missing: ['Analytics avanzados', "Optimización de precios con IA", 'Matching con influencers', 'Agente comercial IA', 'B2B internacional', 'Manager dedicado']
}, {
  key: 'PRO',
  name: 'Pro',
  price: 79,
  commission: '18%',
  icon: Zap,
  popular: true,
  features: ['Todo en Free', 'Analytics avanzados', "Optimización de precios con IA", 'Badge PRO en tienda', 'Matching con influencers'],
  missing: ['Agente comercial IA', 'B2B internacional', 'Manager dedicado']
}, {
  key: 'ELITE',
  name: 'Elite',
  price: 249,
  commission: '15%',
  icon: Crown,
  features: ['Todo en Pro', 'Agente comercial IA', 'B2B internacional', 'Manager dedicado', "Comisión más baja"],
  missing: []
}];
function PlanCard({
  plan,
  currentPlan,
  isCancelling,
  onUpgrade,
  changing
}) {
  const isCurrent = currentPlan === plan.key;
  const isDowngrade = PLANS.findIndex(p => p.key === currentPlan) > PLANS.findIndex(p => p.key === plan.key);
  const Icon = plan.icon;
  return <div className={`bg-white rounded-2xl border-2 p-5 relative transition-all ${isCurrent ? 'border-stone-950' : plan.popular ? 'border-stone-200' : 'border-stone-200'}`}>
      {plan.popular && !isCurrent && <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-stone-950 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Popular
          </span>
        </div>}

      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-2xl bg-stone-50">
          <Icon className="w-5 h-5 text-stone-950" />
        </div>
        <h3 className="text-lg font-bold text-stone-950">{plan.name}</h3>
        {isCurrent && <span className="ml-auto text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-medium">
            Actual
          </span>}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-stone-950 tracking-tight">
            {plan.price === 0 ? 'Gratis' : `${plan.price}€`}
          </span>
          {plan.price > 0 && <span className="text-sm text-stone-500">/mes</span>}
        </div>
        <p className="text-sm text-stone-500 mt-1">
          Comisión por venta: <strong className="text-stone-950">{plan.commission}</strong>
        </p>
      </div>

      <ul className="space-y-2 mb-5">
        {plan.features.map(f => <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
            <Check className="w-4 h-4 text-stone-950 shrink-0 mt-0.5" />
            {f}
          </li>)}
        {plan.missing.map(f => <li key={f} className="flex items-start gap-2 text-sm text-stone-400">
            <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-stone-300 rounded" />
            </div>
            {f}
          </li>)}
      </ul>

      {!isCurrent && !isDowngrade && <button onClick={() => onUpgrade(plan.key)} disabled={changing} className="w-full py-2.5 rounded-2xl text-sm font-medium transition-colors disabled:opacity-50 bg-stone-950 hover:bg-stone-800 text-white flex items-center justify-center gap-2">
          {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
              Upgrade a {plan.name} <ArrowRight className="w-4 h-4" />
            </>}
        </button>}

      {isCurrent && plan.key !== 'FREE' && !isCancelling && <p className="text-center text-xs text-stone-400 mt-1">
          Plan activo
        </p>}
    </div>;
}
export default function ProducerPlanPage() {
  const {
    planData,
    currentPlan,
    refetch
  } = useProducerPlan();
  const [changing, setChanging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const isTrialing = planData?.plan_status === 'trialing';
  const isPastDue = planData?.plan_status === 'past_due';
  const isCancelledPending = planData?.cancel_at_period_end === true;
  const handleUpgrade = async newPlan => {
    setChanging(true);
    try {
      if (!planData?.stripe_subscription_id && newPlan !== 'FREE') {
        const data = await apiClient.post('/sellers/me/plan/subscribe', {
          plan: newPlan
        });
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
          return;
        }
      } else {
        await apiClient.post('/sellers/me/plan/change', {
          plan: newPlan
        });
        toast.success(`Plan cambiado a ${newPlan}`);
        refetch();
      }
    } catch (err) {
      toast.error(err.message || 'Error al cambiar plan');
    } finally {
      setChanging(false);
    }
  };
  const handleCancel = async () => {
    if (!window.confirm('¿Estás seguro? Tu plan se cancelará al final del período de facturación actual.')) return;
    setCancelling(true);
    try {
      await apiClient.post('/subscriptions/cancel', {});
      toast.success(t('producer_plan.suscripcionMarcadaParaCancelar', 'Suscripción marcada para cancelar'));
      refetch();
    } catch (err) {
      toast.error(err.message || 'Error al cancelar');
    } finally {
      setCancelling(false);
    }
  };
  const handleReactivate = async () => {
    setCancelling(true);
    try {
      await apiClient.post('/subscriptions/reactivate', {});
      toast.success(t('producer_plan.suscripcionReactivada', 'Suscripción reactivada'));
      refetch();
    } catch (err) {
      toast.error(err.message || 'Error al reactivar');
    } finally {
      setCancelling(false);
    }
  };
  return <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-950">Mi Plan</h1>
        <p className="text-sm text-stone-500 mt-1">
          Elige el plan que mejor se adapte a tu negocio
        </p>
      </div>

      {/* Alerts */}
      {isTrialing && planData?.trial_ends_at && <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-4">
          <Calendar className="w-5 h-5 text-stone-700 shrink-0" />
          <div>
            <p className="text-sm font-medium text-stone-950">{t('producer_plan.periodoDePruebaActivo', 'Período de prueba activo')}</p>
            <p className="text-xs text-stone-500">
              Tu trial termina el {new Date(planData.trial_ends_at).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
            </p>
          </div>
        </div>}

      {isPastDue && <div className="flex items-center gap-3 bg-stone-100 border border-stone-200 rounded-2xl p-4 mb-4">
          <AlertTriangle className="w-5 h-5 text-stone-700 shrink-0" />
          <div>
            <p className="text-sm font-medium text-stone-950">Pago pendiente</p>
            <p className="text-xs text-stone-500">
              Actualiza tu método de pago para mantener tu plan.
              {planData?.grace_period_ends_at && <> Tienes hasta el {new Date(planData.grace_period_ends_at).toLocaleDateString('es-ES')}.</>}
            </p>
          </div>
        </div>}

      {isCancelledPending && <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-4">
          <AlertTriangle className="w-5 h-5 text-stone-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-950">{t('producer_plan.cancelacionProgramada', 'Cancelación programada')}</p>
            <p className="text-xs text-stone-500">
              Tu plan se cancelará al final del período actual
              {planData?.current_period_end && <> ({new Date(planData.current_period_end).toLocaleDateString('es-ES')})</>}.
            </p>
          </div>
          <button onClick={handleReactivate} disabled={cancelling} className="text-sm font-medium text-stone-950 hover:underline disabled:opacity-50 shrink-0">
            Reactivar
          </button>
        </div>}

      {/* Plan cards */}
      <div className="space-y-4">
        {PLANS.map(plan => <PlanCard key={plan.key} plan={plan} currentPlan={currentPlan} isCancelling={isCancelledPending} onUpgrade={handleUpgrade} changing={changing} />)}
      </div>

      {/* Current plan details */}
      {currentPlan !== 'FREE' && !isCancelledPending && <div className="mt-6 bg-white rounded-2xl border border-stone-200 p-4">
          <h3 className="text-sm font-semibold text-stone-950 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Detalles de suscripción
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Plan actual</span>
              <span className="font-medium text-stone-950">{currentPlan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">{t('influencer.commissionRate', 'Comisión')}</span>
              <span className="font-medium text-stone-950">
                {planData?.commission_rate ? `${(planData.commission_rate * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
            {planData?.current_period_end && <div className="flex justify-between">
                <span className="text-stone-500">{t('sellerDashboard.nextBilling', 'Próximo cobro')}</span>
                <span className="font-medium text-stone-950">
                  {new Date(planData.current_period_end).toLocaleDateString('es-ES')}
                </span>
              </div>}
          </div>

          <button onClick={handleCancel} disabled={cancelling} className="mt-4 w-full py-2 text-sm text-stone-500 hover:text-stone-950 transition-colors disabled:opacity-50">
            {cancelling ? 'Cancelando...' : t('producer_plan.cancelarSuscripcion', 'Cancelar suscripción')}
          </button>
        </div>}

      <div className="mt-4 bg-stone-50 border border-stone-200 rounded-2xl p-4 text-center">
        <p className="text-xs text-stone-500">
          Todos los precios son en EUR e incluyen IVA. Los cambios de plan se aplican inmediatamente.
          <br />
          Al cancelar, mantienes el acceso hasta el final del período facturado.
        </p>
      </div>
    </div>;
}