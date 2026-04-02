// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const SELLER_PLANS = [
  { id: 'producer_free', name: 'Productor FREE', price: 0, commission_pct: 20 },
  { id: 'producer_pro', name: 'Productor PRO', price: 79, commission_pct: 18 },
  { id: 'producer_elite', name: 'Productor ELITE', price: 249, commission_pct: 15 },
  { id: 'importer_free', name: 'Importador FREE', price: 0, commission_pct: 20 },
  { id: 'importer_pro', name: 'Importador PRO', price: 79, commission_pct: 18 },
  { id: 'importer_elite', name: 'Importador ELITE', price: 249, commission_pct: 15 },
];

const INFLUENCER_TIERS = [
  { tier: 'hercules', label: 'Hercules', rate: 3, threshold: 0 },
  { tier: 'atenea', label: 'Atenea', rate: 5, threshold: 1000 },
  { tier: 'zeus', label: 'Zeus', rate: 7, threshold: 5000 },
];

function SACard({ children, className = '' }) {
  return (
    <div className={`bg-stone-900 rounded-[14px] border border-stone-800 p-5 hover:border-stone-700 transition-colors ${className}`}>
      {children}
    </div>
  );
}

function ConfirmModal({ onClose, onConfirm, isSaving }) {
  const [password, setPassword] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 w-full max-w-[400px] mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-stone-100 mb-2">Confirmar cambio de plan</h3>
        <p className="text-sm text-stone-400 mb-4">
          Introduce tu contraseña de superadmin para aplicar este cambio en producción.
        </p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm(password)}
          placeholder={t('plans_config.contrasenaSuperadmin', 'Contraseña superadmin')}
          autoFocus
          className="w-full px-3.5 py-2.5 bg-stone-800 border border-stone-700 rounded-2xl text-stone-100 text-sm outline-none focus:border-stone-500 mb-3"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-stone-800 rounded-2xl text-stone-100 text-sm">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(password)}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-stone-950 rounded-2xl text-white text-sm font-bold disabled:opacity-50"
          >
            {isSaving ? '...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlansConfigPage() {
  const [plans, setPlans] = useState(SELLER_PLANS);
  const [tiers, setTiers] = useState(INFLUENCER_TIERS);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [overview, config] = await Promise.all([
          apiClient.get('/superadmin/overview').catch(() => null),
          apiClient.get('/superadmin/plans').catch(() => null),
        ]);
        if (overview?.users?.by_role) setSubs(overview.users.by_role);
        if (overview?.plan_distribution) setSubs(prev => ({ ...prev, plan_distribution: overview.plan_distribution }));
        // Hydrate plans from DB config
        if (config?.seller_plans) {
          const dbPlans = config.seller_plans;
          setPlans(prev => prev.map(p => {
            const key = p.id.includes('free') ? 'FREE' : p.id.includes('pro') ? 'PRO' : 'ELITE';
            const db = dbPlans[key];
            return db ? { ...p, price: db.price_monthly, commission_pct: Math.round(db.commission_rate * 100) } : p;
          }));
        }
        if (config?.influencer_tiers) {
          const dbTiers = config.influencer_tiers;
          setTiers(prev => prev.map(t => {
            const db = dbTiers[t.tier];
            return db ? { ...t, rate: Math.round(db.rate * 100), threshold: db.min_gmv || t.threshold } : t;
          }));
        }
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    })();
  }, []);

  const handleConfirm = async (password) => {
    if (!password) {
      toast.error(t('plans_config.introduceTuContrasena', 'Introduce tu contraseña'));
      return;
    }
    setIsSaving(true);
    try {
      // Build config from current state
      const seller_plans = {};
      plans.forEach(p => {
        const key = p.id.includes('free') ? 'FREE' : p.id.includes('pro') ? 'PRO' : 'ELITE';
        if (!seller_plans[key]) {
          seller_plans[key] = {
            price_monthly: p.price,
            commission_rate: p.commission_pct / 100,
            label: key.charAt(0) + key.slice(1).toLowerCase(),
          };
        }
      });
      const influencer_tiers = {};
      tiers.forEach(t => {
        influencer_tiers[t.tier] = {
          rate: t.rate / 100,
          min_gmv: t.threshold,
          min_followers: 0,
          label: t.label,
        };
      });
      await apiClient.put('/superadmin/plans', { seller_plans, influencer_tiers, password });
      toast.success(t('plans_config.configuracionActualizadaYGuardada', 'Configuración actualizada y guardada'));
      setShowConfirm(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('superAdmin.insights.failedToSaveConfig', 'Error al guardar configuración'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[700px] mx-auto pb-16">
      <div className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-100 mb-1">
          Configuración de planes
        </h1>
        <p className="text-sm text-stone-400">
          Los cambios se aplican automáticamente en Stripe. Se requiere contraseña del superadmin para confirmar.
        </p>
      </div>

      {/* Influencer tiers */}
      <SACard className="mb-4">
        <h3 className="text-[15px] font-bold text-stone-100 mb-4">Comisiones Influencer</h3>
        {tiers.map((t, i) => (
          <div
            key={t.tier}
            className={`flex items-center gap-3 py-2.5 ${i < tiers.length - 1 ? 'border-b border-stone-800' : ''}`}
          >
            <span className="text-sm font-semibold text-stone-100 w-28">{t.label}</span>
            <input
              type="number"
              value={t.rate}
              onChange={e => setTiers(prev => prev.map(x => x.tier === t.tier ? { ...x, rate: Number(e.target.value) } : x))}
              className="w-16 text-2xl font-extrabold text-stone-100 bg-transparent border-b border-stone-700 focus:border-stone-400 outline-none text-center"
              min={1} max={15}
            />
            <span className="text-xl text-stone-500">%</span>
            <span className="text-xs text-stone-500 flex-1">
              {t.threshold > 0 ? `desde ${t.threshold.toLocaleString()}€ GMV/mes` : 'nivel base'}
            </span>
          </div>
        ))}
        <p className="text-[11px] text-stone-500 mt-3">
          Comisión sobre el total de venta (después de envío e IVA). Sale del margen de la plataforma.
        </p>
      </SACard>

      {/* Seller plans */}
      <SACard>
        <h3 className="text-[15px] font-bold text-stone-100 mb-4">Comisiones Productor</h3>
        {plans.map((plan, i) => (
          <div
            key={plan.id}
            className={`flex items-center gap-3.5 py-2.5 ${i < plans.length - 1 ? 'border-b border-stone-800' : ''}`}
          >
            <span className="text-[13px] font-semibold text-stone-100 w-40 shrink-0">{plan.name}</span>
            <div className="flex gap-3 flex-1">
              <div>
                <p className="text-[10px] text-stone-500 mb-0.5">Precio/mes</p>
                {plan.price === 0 ? (
                  <p className="text-base font-extrabold text-stone-100">Gratis</p>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={plan.price}
                      onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, price: Number(e.target.value) } : p))}
                      className="w-16 text-base font-extrabold text-stone-100 bg-transparent border-b border-stone-700 focus:border-stone-400 outline-none text-center"
                      min={1}
                    />
                    <span className="text-stone-500 text-sm">€</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] text-stone-500 mb-0.5">{t('influencer.commissionRate', 'Comisión')}</p>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={plan.commission_pct}
                    onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, commission_pct: Number(e.target.value) } : p))}
                    className="w-12 text-base font-extrabold text-stone-400 bg-transparent border-b border-stone-700 focus:border-stone-400 outline-none text-center"
                    min={1} max={50}
                  />
                  <span className="text-stone-500 text-sm">%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </SACard>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setShowConfirm(true)}
          className="px-6 py-2.5 bg-stone-100 text-stone-950 rounded-2xl text-sm font-bold hover:bg-white transition-colors"
        >
          Guardar cambios
        </button>
      </div>

      {showConfirm && (
        <ConfirmModal
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
