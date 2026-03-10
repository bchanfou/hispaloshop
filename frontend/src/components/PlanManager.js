import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Crown, Star, ArrowRight, Loader2, Calendar, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { API } from '../utils/api';

export default function PlanManager() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);

  useEffect(() => { fetchPlan(); }, []);

  const fetchPlan = async () => {
    try {
      const res = await axios.get(`${API}/sellers/me/plan`, { withCredentials: true });
      setPlan(res.data);
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
        const res = await axios.post(`${API}/sellers/me/plan/subscribe`, { plan: newPlan }, { withCredentials: true });
        if (res.data.checkout_url) { window.location.href = res.data.checkout_url; return; }
      } else {
        await axios.post(`${API}/sellers/me/plan/change`, { plan: newPlan }, { withCredentials: true });
        toast.success(`Plan cambiado a ${newPlan}`);
        fetchPlan();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al cambiar plan');
    } finally {
      setChanging(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-text-muted" /></div>;
  if (!plan) return null;

  const icons = { FREE: Star, PRO: Zap, ELITE: Crown };
  const colors = { FREE: 'text-stone-500', PRO: 'text-accent', ELITE: 'text-amber-600' };
  const Icon = icons[plan.plan] || Star;
  const isTrialing = plan.plan_status === 'trialing';
  const isPastDue = plan.plan_status === 'past_due';

  return (
    <div className="space-y-4" data-testid="plan-manager">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-text-primary">Mi Plan</h2>
        <a href="/pricing" className="text-xs text-accent hover:underline flex items-center gap-1">
          Ver detalle de comisiones <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      {/* Current plan card */}
      <div className={`bg-white rounded-xl border p-5 ${isPastDue ? 'border-red-300 bg-red-50/30' : 'border-stone-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg bg-stone-50 ${colors[plan.plan]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary text-lg">{plan.plan}</span>
              {isTrialing && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Trial</span>}
              {isPastDue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Pago pendiente</span>}
            </div>
            <p className="text-sm text-text-muted">Comision: {(plan.commission_rate * 100).toFixed(0)}%</p>
          </div>
        </div>

        {isTrialing && plan.trial_ends_at && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-3 mb-3">
            <Calendar className="w-4 h-4 shrink-0" />
            Trial termina el {new Date(plan.trial_ends_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        )}

        {isPastDue && plan.grace_period_ends_at && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3 mb-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Tu pago fallo. Tienes hasta el {new Date(plan.grace_period_ends_at).toLocaleDateString('es-ES')} para regularizarlo o seras degradado a FREE.
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Shield className="w-3.5 h-3.5" />
          {plan.plan === 'FREE'
            ? 'Plan basico. Upgrade para reducir comision y acceder a herramientas.'
            : `Proximo cobro: ${plan.current_period_end ? new Date(plan.current_period_end).toLocaleDateString('es-ES') : 'N/A'}`
          }
        </div>
      </div>

      {/* Quick upgrade buttons */}
      {plan.plan !== 'ELITE' && (
        <div className="flex gap-2">
          {plan.plan === 'FREE' && (
            <Button onClick={() => handleUpgrade('PRO')} disabled={changing} className="flex-1 bg-primary hover:bg-primary-hover text-white rounded-xl h-10 text-sm" data-testid="upgrade-pro">
              {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-1" /> Upgrade a PRO (18%)</>}
            </Button>
          )}
          {plan.plan !== 'ELITE' && (
            <Button onClick={() => handleUpgrade('ELITE')} disabled={changing} variant={plan.plan === 'FREE' ? 'outline' : 'default'} className={`flex-1 rounded-xl h-10 text-sm ${plan.plan === 'PRO' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`} data-testid="upgrade-elite">
              {changing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Crown className="w-4 h-4 mr-1" /> Upgrade a ELITE (17%)</>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

