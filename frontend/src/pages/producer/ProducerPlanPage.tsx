// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Star, Zap, Crown, Check, Loader2, AlertTriangle, Calendar, Shield, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProducerPlan } from '../../context/ProducerPlanContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import { usePlanConfig } from '../../hooks/api/usePlanConfig';
import { trackEvent } from '../../utils/analytics';

/* ── Plan hierarchy for downgrade check ── */
const PLAN_ORDER = { FREE: 0, PRO: 1, ELITE: 2 };

/* ── Features per plan (matches spec table exactly) ── */
function getPlanFeatures(isImporter) {
  return {
    FREE: {
      icon: Star,
      features: [
        'Productos ilimitados',
        'Panel de control basico',
        'Soporte por email',
      ],
      missing: [
        'Analytics avanzados',
        'Rebeca AI (asesora comercial)',
        'Promocion nacional',
        'Badge PRO en tienda',
        isImporter ? 'Pedro AI (agente de sourcing)' : 'Pedro AI (agente internacional)',
        isImporter ? 'Sourcing prioritario' : 'Promocion internacional',
        'B2B marketplace',
        'Manager dedicado',
      ],
    },
    PRO: {
      icon: Zap,
      popular: true,
      features: [
        'Todo en Free',
        'Analytics avanzados',
        'Rebeca AI (asesora comercial)',
        'Promocion nacional',
        'Badge PRO en tienda',
      ],
      missing: [
        isImporter ? 'Pedro AI (agente de sourcing)' : 'Pedro AI (agente internacional)',
        isImporter ? 'Sourcing prioritario' : 'Promocion internacional',
        'B2B marketplace',
        'Manager dedicado',
      ],
    },
    ELITE: {
      icon: Crown,
      features: [
        'Todo en Pro',
        isImporter ? 'Pedro AI (agente de sourcing)' : 'Pedro AI (agente internacional)',
        isImporter ? 'Sourcing prioritario' : 'Promocion internacional',
        'B2B marketplace',
        'Manager dedicado',
        'Comision mas baja',
      ],
      missing: [],
    },
  };
}

/* ── Build plans array from /config/plans ── */
function usePlans(isImporter) {
  const { data: config } = usePlanConfig();
  const sellerPlans = config?.seller_plans || {};
  const features = getPlanFeatures(isImporter);
  return ['FREE', 'PRO', 'ELITE'].map((key) => {
    const api = sellerPlans[key] || {};
    const meta = features[key];
    return {
      key,
      name: api.label || key,
      price: api.price_monthly_eur ?? (key === 'FREE' ? 0 : key === 'PRO' ? 79 : 249),
      commissionRate: api.commission_rate ?? (key === 'FREE' ? 0.20 : key === 'PRO' ? 0.18 : 0.17),
      commission: `${Math.round((api.commission_rate ?? 0.20) * 100)}%`,
      icon: meta.icon,
      popular: meta.popular || false,
      features: meta.features,
      missing: meta.missing,
    };
  });
}

/* ── Plan Card ── */
function PlanCard({ plan, plans, currentPlan, isCancelling, onUpgrade, changing }) {
  const isCurrent = currentPlan === plan.key;
  const isDowngrade = (PLAN_ORDER[currentPlan] || 0) > (PLAN_ORDER[plan.key] || 0);
  const Icon = plan.icon;
  return (
    <div className={`bg-white rounded-2xl border-2 p-5 relative transition-all flex flex-col ${isCurrent ? 'border-stone-950' : 'border-stone-200'}`}>
      {plan.popular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-stone-950 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
            Popular
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-2xl bg-stone-50">
          <Icon className="w-5 h-5 text-stone-950" />
        </div>
        <h3 className="text-lg font-bold text-stone-950">{plan.name}</h3>
        {isCurrent && (
          <span className="ml-auto text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full font-medium">
            Actual
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-stone-950 tracking-tight">
            {plan.price === 0 ? 'Gratis' : `${plan.price}\u20ac`}
          </span>
          {plan.price > 0 && <span className="text-sm text-stone-500">/mes</span>}
        </div>
        <p className="text-sm text-stone-500 mt-1">
          Comision por venta: <strong className="text-stone-950">{plan.commission}</strong>
        </p>
      </div>

      <ul className="space-y-2 mb-5 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
            <Check className="w-4 h-4 text-stone-950 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
        {plan.missing.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-stone-400">
            <div className="w-4 h-4 shrink-0 mt-0.5 flex items-center justify-center">
              <div className="w-1.5 h-0.5 bg-stone-300 rounded" />
            </div>
            {f}
          </li>
        ))}
      </ul>

      {!isCurrent && !isDowngrade && (
        <button
          onClick={() => onUpgrade(plan.key)}
          disabled={changing}
          className="w-full py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-50 bg-stone-950 hover:bg-stone-800 text-white flex items-center justify-center gap-2"
        >
          {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <>Upgrade a {plan.name} <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      )}

      {isCurrent && plan.key !== 'FREE' && !isCancelling && (
        <p className="text-center text-xs text-stone-400 mt-1">Plan activo</p>
      )}
    </div>
  );
}

/* ── Commission Example Visual ── */
function CommissionExample({ plans }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <h3 className="text-sm font-semibold text-stone-950 mb-4">Por cada 100\u20ac que vendes:</h3>
      <div className="space-y-3">
        {plans.map((p) => {
          const sellerPct = Math.round((1 - p.commissionRate) * 100);
          const platformPct = Math.round(p.commissionRate * 100);
          return (
            <div key={p.key} className="flex items-center gap-3">
              <span className="text-xs font-bold text-stone-950 w-12">{p.key}</span>
              <div className="flex-1 flex h-6 rounded-full overflow-hidden bg-stone-100">
                <div
                  className="bg-stone-950 flex items-center justify-center text-[10px] font-bold text-white transition-all"
                  style={{ width: `${sellerPct}%` }}
                >
                  Tu {sellerPct}\u20ac
                </div>
                <div
                  className="bg-stone-300 flex items-center justify-center text-[10px] font-bold text-stone-700 transition-all"
                  style={{ width: `${platformPct}%` }}
                >
                  {platformPct}\u20ac
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Billing History ── */
function BillingHistory({ planData }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!planData?.stripe_subscription_id) {
      setLoading(false);
      return;
    }
    apiClient.get('/subscriptions/invoices')
      .then((data) => setInvoices(Array.isArray(data) ? data : data?.invoices || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [planData?.stripe_subscription_id]);

  if (loading) return null;
  if (invoices.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <h3 className="text-sm font-semibold text-stone-950 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Historial de facturacion
      </h3>
      <div className="divide-y divide-stone-100">
        {invoices.slice(0, 12).map((inv, i) => (
          <div key={inv.id || i} className="flex items-center justify-between py-2.5 text-sm">
            <div>
              <p className="font-medium text-stone-950">
                {inv.date ? new Date(inv.date).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : `Factura ${i + 1}`}
              </p>
              <p className="text-xs text-stone-500">{inv.amount ? `${inv.amount}\u20ac` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-stone-100 text-stone-700' : 'bg-stone-100 text-stone-500'}`}>
                {inv.status === 'paid' ? 'Pagado' : inv.status || 'Pendiente'}
              </span>
              {inv.invoice_pdf && (
                <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-stone-950 hover:underline">
                  PDF
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Cancel Reason Modal ── */
const CANCEL_REASONS = [
  'Demasiado caro',
  'No uso las features PRO/ELITE',
  'Cambio de plataforma',
  'Mi negocio ha cambiado',
  'Otro',
];

function CancelModal({ onConfirm, onClose, loading }) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-950">Cancelar suscripcion</h2>
          <button onClick={onClose} className="p-1 text-stone-500 hover:text-stone-950">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-stone-600 mb-4">
          Tu plan se cancelara al final del periodo actual. Hasta entonces, mantendras todas las features.
        </p>
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Motivo (opcional)</p>
          {CANCEL_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cancel-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-stone-950 w-4 h-4"
              />
              <span className="text-sm text-stone-700">{r}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 text-sm font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-colors">
            Volver
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-full transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar cancelacion'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════ */
/* ── MAIN COMPONENT ── */
/* ══════════════════════════════════════════════════ */
export default function ProducerPlanPage() {
  const { user } = useAuth();
  const isImporter = user?.role === 'importer';
  const plans = usePlans(isImporter);
  const { planData, currentPlan, refetch } = useProducerPlan();
  const [changing, setChanging] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const isTrialing = planData?.plan_status === 'trialing';
  const isPastDue = planData?.plan_status === 'past_due';
  const isCancelledPending = planData?.cancel_at_period_end === true;

  useEffect(() => {
    trackEvent('plans_viewed', { current_plan: currentPlan });
  }, []);

  const handleUpgrade = async (newPlan) => {
    setChanging(true);
    trackEvent('plan_upgrade_started', { from_plan: currentPlan, to_plan: newPlan });
    try {
      if (!planData?.stripe_subscription_id && newPlan !== 'FREE') {
        const data = await apiClient.post('/sellers/me/plan/subscribe', { plan: newPlan });
        if (data.checkout_url) {
          window.location.href = data.checkout_url;
          return;
        }
      } else {
        await apiClient.post('/sellers/me/plan/change', { plan: newPlan });
        trackEvent('plan_upgrade_completed', { plan: newPlan });
        toast.success(`Plan cambiado a ${newPlan}`);
        refetch();
      }
    } catch (err) {
      toast.error(err.message || 'Error al cambiar plan');
    } finally {
      setChanging(false);
    }
  };

  const handleCancel = async (reason) => {
    setCancelling(true);
    trackEvent('plan_cancel_started', { plan: currentPlan, reason });
    try {
      await apiClient.post('/subscriptions/cancel', { reason });
      toast.success('Suscripcion marcada para cancelar');
      setShowCancelModal(false);
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
      toast.success('Suscripcion reactivada');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Error al reactivar');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-[975px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-950">Mi Plan</h1>
        <p className="text-sm text-stone-500 mt-1">
          Elige el plan que mejor se adapte a tu negocio
        </p>
      </div>

      {/* Alerts */}
      {isTrialing && planData?.trial_ends_at && (
        <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-2xl p-4">
          <Calendar className="w-5 h-5 text-stone-700 shrink-0" />
          <div>
            <p className="text-sm font-medium text-stone-950">Periodo de prueba activo</p>
            <p className="text-xs text-stone-500">
              Tu trial termina el {new Date(planData.trial_ends_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      {isPastDue && (
        <div className="flex items-center gap-3 bg-stone-100 border border-stone-200 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-stone-700 shrink-0" />
          <div>
            <p className="text-sm font-medium text-stone-950">Pago pendiente</p>
            <p className="text-xs text-stone-500">
              Actualiza tu metodo de pago para mantener tu plan.
              {planData?.grace_period_ends_at && <> Tienes hasta el {new Date(planData.grace_period_ends_at).toLocaleDateString('es-ES')}.</>}
            </p>
          </div>
        </div>
      )}

      {isCancelledPending && (
        <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-stone-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-950">Cancelacion programada</p>
            <p className="text-xs text-stone-500">
              Tu plan se cancelara al final del periodo actual
              {planData?.current_period_end && <> ({new Date(planData.current_period_end).toLocaleDateString('es-ES')})</>}.
            </p>
          </div>
          <button onClick={handleReactivate} disabled={cancelling} className="text-sm font-medium text-stone-950 hover:underline disabled:opacity-50 shrink-0">
            Reactivar
          </button>
        </div>
      )}

      {/* Plan cards — 3-col grid on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.key}
            plan={plan}
            plans={plans}
            currentPlan={currentPlan}
            isCancelling={isCancelledPending}
            onUpgrade={handleUpgrade}
            changing={changing}
          />
        ))}
      </div>

      {/* Commission example visual */}
      <CommissionExample plans={plans} />

      {/* Current plan details */}
      {currentPlan !== 'FREE' && !isCancelledPending && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-950 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Detalles de suscripcion
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Plan actual</span>
              <span className="font-medium text-stone-950">{currentPlan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Comision</span>
              <span className="font-medium text-stone-950">
                {planData?.commission_rate ? `${(planData.commission_rate * 100).toFixed(0)}%` : '\u2014'}
              </span>
            </div>
            {planData?.current_period_end && (
              <div className="flex justify-between">
                <span className="text-stone-500">Proximo cobro</span>
                <span className="font-medium text-stone-950">
                  {new Date(planData.current_period_end).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowCancelModal(true)}
            disabled={cancelling}
            className="mt-4 w-full py-2 text-sm text-stone-500 hover:text-stone-950 transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelando...' : 'Cancelar suscripcion'}
          </button>
        </div>
      )}

      {/* Billing history */}
      <BillingHistory planData={planData} />

      {/* FAQ */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-sm text-stone-600 space-y-3">
        <p>
          <strong className="text-stone-950">Puedo cambiar de plan?</strong><br />
          Si, en cualquier momento. El upgrade es inmediato. El downgrade se aplica al final del periodo.
        </p>
        <p>
          <strong className="text-stone-950">Que pasa si cancelo?</strong><br />
          Tu plan baja a FREE al final del periodo actual. Mantienes acceso a las features hasta entonces.
        </p>
        <p>
          <strong className="text-stone-950">Que pasa si falla el pago?</strong><br />
          Tienes 3 dias de gracia para actualizar tu metodo de pago antes de que tu plan baje a FREE.
        </p>
        <p className="text-xs text-stone-400 pt-2 border-t border-stone-200">
          Todos los precios son en EUR e incluyen IVA. Facturacion mensual.
        </p>
      </div>

      {/* Cancel modal */}
      {showCancelModal && (
        <CancelModal
          onConfirm={handleCancel}
          onClose={() => setShowCancelModal(false)}
          loading={cancelling}
        />
      )}
    </div>
  );
}
