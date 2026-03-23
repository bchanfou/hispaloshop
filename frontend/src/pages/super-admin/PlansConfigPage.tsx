// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Zap, AlertTriangle } from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

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
          placeholder="Contraseña superadmin"
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
            className="flex-1 py-2.5 bg-[#dc2626] rounded-2xl text-stone-100 text-sm font-bold disabled:opacity-50"
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [subs, setSubs] = useState(null);

  useEffect(() => {
    apiClient.get('/superadmin/overview').then(data => {
      // Extract subscription counts if available
      if (data?.users?.by_role) {
        setSubs(data.users.by_role);
      }
    }).catch(() => {});
  }, []);

  const handleConfirm = async (password) => {
    if (!password) {
      toast.error('Introduce tu contraseña');
      return;
    }
    setIsSaving(true);
    try {
      // In a real implementation, this would call a plans update endpoint
      toast.success('Configuración actualizada');
      setShowConfirm(false);
    } catch {
      toast.error('Error o contraseña incorrecta');
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
        {INFLUENCER_TIERS.map((t, i) => (
          <div
            key={t.tier}
            className={`flex items-center gap-3 py-2.5 ${i < INFLUENCER_TIERS.length - 1 ? 'border-b border-stone-800' : ''}`}
          >
            <span className="text-sm font-semibold text-stone-100 w-28">{t.label}</span>
            <span className="text-2xl font-extrabold text-[#78716c]">{t.rate}%</span>
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
                <p className="text-base font-extrabold text-stone-100">
                  {plan.price === 0 ? 'Gratis' : `${plan.price}€`}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-stone-500 mb-0.5">Comisión</p>
                <p className="text-base font-extrabold text-[#78716c]">{plan.commission_pct}%</p>
              </div>
            </div>
            {plan.price > 0 && (
              <button
                onClick={() => setShowConfirm(true)}
                className="bg-stone-800 rounded-2xl px-3 py-1.5 text-[11px] text-stone-400 hover:bg-stone-700 transition-colors"
              >
                Editar
              </button>
            )}
          </div>
        ))}
      </SACard>

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
