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
  const font = { fontFamily: 'inherit' };

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
    <div style={{ minHeight: '100vh', background: '#fafaf9', ...font }}>
      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: '#ffffff',
        borderBottom: '1px solid #e7e5e4',
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      }}>
        <button onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={22} color="#0c0a09" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#0c0a09' }}>Mi plan</span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 100px' }}>
        {/* ── Current Plan Card ── */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e7e5e4',
          borderRadius: '16px',
          padding: 20, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlanBadge plan={currentPlan} />
              <span style={{ fontSize: 12, color: '#78716c' }}>Plan actual</span>
            </div>
            {currentPlan === 'elite' && <Crown size={20} color="#0c0a09" />}
            {currentPlan === 'pro' && <Zap size={20} color="#0c0a09" />}
          </div>

          <p style={{ fontSize: 20, fontWeight: 700, color: '#0c0a09', margin: '0 0 4px' }}>
            Plan {currentPlanData.name}
          </p>
          <p style={{ fontSize: 15, color: '#78716c', margin: '0 0 12px' }}>
            {currentPlanData.price}
          </p>

          {trialDays > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: '9999px',
              background: '#f5f5f4', color: '#78716c',
              fontSize: 12, fontWeight: 600, marginBottom: 12,
            }}>
              Trial activo · {trialDays} días restantes
            </div>
          )}

          {nextBilling && (
            <p style={{ fontSize: 13, color: '#78716c', margin: '0 0 16px' }}>
              Próxima factura: {new Date(nextBilling).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}

          {currentPlan !== 'free' && (
            <button
              onClick={handleManageBilling}
              disabled={loading}
              style={{
                width: '100%', padding: 12,
                background: '#ffffff',
                border: '1px solid #e7e5e4',
                borderRadius: '14px',
                fontSize: 14, fontWeight: 600, color: '#0c0a09',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                ...font,
              }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Gestionar facturación'}
            </button>
          )}
        </div>

        {/* ── Plan Comparison ── */}
        <p style={{
          fontSize: 11, fontWeight: 700, color: '#78716c',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          margin: '0 0 12px', ...font,
        }}>
          Comparar planes
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan;
            const isUpgrade = PLANS.indexOf(plan) > PLANS.findIndex(p => p.id === currentPlan);

            return (
              <div key={plan.id} style={{
                background: '#ffffff',
                border: isCurrent ? '2px solid #0c0a09' : '1px solid #e7e5e4',
                borderRadius: '16px',
                padding: 16, position: 'relative',
              }}>
                {isCurrent && (
                  <span style={{
                    position: 'absolute', top: -10, right: 16,
                    fontSize: 10, fontWeight: 700, padding: '3px 10px',
                    borderRadius: '9999px',
                    background: '#0c0a09', color: '#ffffff',
                  }}>
                    Actual
                  </span>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#0c0a09', margin: 0 }}>
                      {plan.name}
                    </p>
                    <p style={{ fontSize: 14, color: '#78716c', margin: '2px 0 0' }}>
                      {plan.price}
                    </p>
                  </div>
                  <PlanBadge plan={plan.id} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <Check size={14} color="#0c0a09" />
                      <span style={{ fontSize: 13, color: '#0c0a09' }}>{f}</span>
                    </div>
                  ))}
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => handleChangePlan(plan.id)}
                    style={{
                      width: '100%', padding: 10,
                      background: isUpgrade ? '#0c0a09' : '#ffffff',
                      color: isUpgrade ? '#ffffff' : '#0c0a09',
                      border: isUpgrade ? 'none' : '1px solid #e7e5e4',
                      borderRadius: '14px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', ...font,
                    }}
                  >
                    {isUpgrade ? `Mejorar a ${plan.name}` : `Bajar a ${plan.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

function PlanBadge({ plan }) {
  const upper = (plan || 'free').toUpperCase();
  const isElite = upper === 'ELITE';
  const isPro = upper === 'PRO';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      padding: '3px 10px', borderRadius: '9999px',
      background: isElite ? '#0c0a09' : isPro ? '#f5f5f4' : '#f5f5f4',
      color: isElite ? '#ffffff' : '#0c0a09',
    }}>
      {upper}
    </span>
  );
}
