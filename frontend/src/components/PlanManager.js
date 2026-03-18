import React, { useState, useEffect } from 'react';
import { Zap, Crown, Star, ArrowRight, Loader2, Calendar, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/api/client';

export default function PlanManager() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  useEffect(() => { fetchPlan(); }, []);

  const fetchPlan = async () => {
    try {
      const data = await apiClient.get(`/sellers/me/plan`);
      setPlan(data);
    } catch (err) {
      toast.error('Error cargando plan');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (newPlan) => {
    setChanging(true);
    try {
      if (!plan?.stripe_subscription_id && newPlan !== 'FREE') {
        const data = await apiClient.post(`/sellers/me/plan/subscribe`, { plan: newPlan });
        if (data.checkout_url) { window.location.href = data.checkout_url; return; }
      } else {
        await apiClient.post(`/sellers/me/plan/change`, { plan: newPlan });
        toast.success(`Plan cambiado a ${newPlan}`);
        fetchPlan();
      }
    } catch (err) {
      toast.error(err.message || 'Error al cambiar plan');
    } finally {
      setChanging(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-stone-500" /></div>;
  if (!plan) return null;

  const icons = { FREE: Star, PRO: Zap, ELITE: Crown };
  const colors = { FREE: 'text-stone-500', PRO: 'text-stone-950', ELITE: 'text-stone-950' };
  const Icon = icons[plan.plan] || Star;
  const isTrialing = plan.plan_status === 'trialing';
  const isPastDue = plan.plan_status === 'past_due';

  return (
    <div className="space-y-4" data-testid="plan-manager">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-950">Mi Plan</h2>
        <a href="/pricing" className="text-xs text-stone-600 hover:underline flex items-center gap-1">
          Ver detalle de comisiones <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      {/* Current plan card */}
      <div className={`bg-white rounded-xl border p-5 ${isPastDue ? 'border-stone-400 bg-stone-50' : 'border-stone-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-xl bg-stone-50 ${colors[plan.plan]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-950 text-lg">{plan.plan}</span>
              {isTrialing && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">Trial</span>}
              {isPastDue && <span className="text-xs bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full">Pago pendiente</span>}
            </div>
            <p className="text-sm text-stone-500">Comisión: {(plan.commission_rate * 100).toFixed(0)}%</p>
          </div>
        </div>

        {isTrialing && plan.trial_ends_at && (
          <div className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded-xl p-3 mb-3">
            <Calendar className="w-4 h-4 shrink-0" />
            Trial termina el {new Date(plan.trial_ends_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}

        {isPastDue && plan.grace_period_ends_at && (
          <div className="flex items-center gap-2 text-sm text-stone-700 bg-stone-100 border border-stone-200 rounded-xl p-3 mb-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Tu pago fallo. Tienes hasta el {new Date(plan.grace_period_ends_at).toLocaleDateString('es-ES')} para regularizarlo o seras degradado a FREE.
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Shield className="w-3.5 h-3.5" />
          {plan.plan === 'FREE'
            ? 'Plan básico. Upgrade para reducir comisión y acceder a herramientas.'
            : `Proximo cobro: ${plan.current_period_end ? new Date(plan.current_period_end).toLocaleDateString('es-ES') : 'N/A'}`
          }
        </div>
      </div>

      {/* Quick upgrade buttons */}
      {plan.plan !== 'ELITE' && (
        <div className="flex gap-2">
          {plan.plan === 'FREE' && (
            <button
              onClick={() => handleUpgrade('PRO')}
              disabled={changing}
              className="flex-1 px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl h-10 text-sm transition-colors flex items-center justify-center"
              data-testid="upgrade-pro"
            >
              {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-1" /> Upgrade a PRO (18%)</>}
            </button>
          )}
          {plan.plan !== 'ELITE' && (
            <button
              onClick={() => handleUpgrade('ELITE')}
              disabled={changing}
              className="flex-1 px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl h-10 text-sm transition-colors flex items-center justify-center"
              data-testid="upgrade-elite"
            >
              {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Crown className="w-4 h-4 mr-1" /> Upgrade a ELITE (15%)</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
