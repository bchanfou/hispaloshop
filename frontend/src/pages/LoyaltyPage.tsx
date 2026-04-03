// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, Check, Gift, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';
export default function LoyaltyPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [redeeming, setRedeeming] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const copyTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(copyTimerRef.current), []);
  const {
    data: gamif
  } = useQuery({
    queryKey: ['gamification', 'profile'],
    queryFn: () => apiClient.get('/gamification/profile'),
    staleTime: 30_000
  });
  const {
    data: catalog
  } = useQuery({
    queryKey: ['loyalty', 'catalog'],
    queryFn: () => apiClient.get('/loyalty/catalog'),
    staleTime: 300_000
  });
  const {
    data: loyalty
  } = useQuery({
    queryKey: ['loyalty', 'me'],
    queryFn: () => apiClient.get('/loyalty/me'),
    staleTime: 30_000
  });
  const points = gamif?.healthy_points ?? gamif?.xp ?? 0;
  const activeCodes = (loyalty?.redemptions || []).filter(r => !r.is_used && r.expires_at && !isNaN(new Date(r.expires_at).getTime()) && new Date(r.expires_at) > new Date());
  const handleRedeem = async rewardId => {
    setRedeeming(rewardId);
    try {
      const result = await apiClient.post('/loyalty/redeem', {
        reward_id: rewardId
      });
      if (navigator.vibrate) navigator.vibrate([10, 50, 100]);
      toast.success(`Código ${result.discount_code} generado`);
      queryClient.invalidateQueries({
        queryKey: ['loyalty']
      });
      queryClient.invalidateQueries({
        queryKey: ['gamification']
      });
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Error al canjear');
    } finally {
      setRedeeming(null);
    }
  };
  const handleCopy = code => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    toast.success(t('influencer_dashboard.codigoCopiado', 'Código copiado'));
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedCode(null), 2000);
  };
  return <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-white/80 backdrop-blur-xl border-b border-stone-100 px-4 h-[52px]">
        <button type="button" onClick={() => navigate(-1)} aria-label="Volver" className="p-1 -ml-1 rounded-full bg-transparent border-none cursor-pointer">
          <ArrowLeft size={20} className="text-stone-950" />
        </button>
        <span className="text-base font-semibold text-stone-950">Mis puntos</span>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-5">
        {/* Points card */}
        <div className="rounded-2xl p-6 text-white text-center mb-6" style={{
        background: 'linear-gradient(135deg, #0c0a09, #292524)'
      }}>
          <div className="text-5xl font-bold leading-none">{points}</div>
          <div className="text-sm opacity-80 mt-1">Healthy Points disponibles</div>
          {gamif?.level_emoji && <div className="text-sm opacity-65 mt-3">
              {gamif?.level_emoji} {gamif?.level_name} · {gamif?.hp_to_next_level || 0} HP para subir nivel
            </div>}
        </div>

        {/* Catalog */}
        <h2 className="text-base font-semibold text-stone-950 mb-3 flex items-center gap-1.5">
          <Gift size={18} /> Canjear puntos
        </h2>

        <div className="flex flex-col gap-3 mb-8">
          {(Array.isArray(catalog) ? catalog : []).map(reward => {
          const canAfford = points >= reward.cost_points;
          const isRedeeming = redeeming === reward.id;
          return <div key={reward.id} className={`flex items-center gap-4 rounded-2xl border p-4 transition-opacity ${canAfford ? 'border-stone-200' : 'border-stone-100 opacity-50'}`}>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-stone-950">{reward.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{reward.description}</div>
                </div>
                <button type="button" onClick={() => handleRedeem(reward.id)} disabled={!canAfford || !!redeeming} className="btn btn-primary btn-sm shrink-0">
                  {isRedeeming ? '...' : `${reward.cost_points} HP`}
                </button>
              </div>;
        })}
        </div>

        {/* Active codes */}
        <AnimatePresence>
          {activeCodes.length > 0 && <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }}>
              <h2 className="text-base font-semibold text-stone-950 mb-3 flex items-center gap-1.5">
                <Sparkles size={18} /> Mis códigos activos
              </h2>
              <div className="flex flex-col gap-3">
                {activeCodes.map(r => <div key={r.discount_code} className="flex items-center justify-between rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 p-4">
                    <div>
                      <div className="text-xl font-bold tracking-widest text-stone-950">
                        {r.discount_code}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-1">
                        {r.reward_name} · Caduca {r.expires_at && !isNaN(new Date(r.expires_at).getTime()) ? new Date(r.expires_at).toLocaleDateString('es-ES') : '—'}
                      </div>
                    </div>
                    <button type="button" onClick={() => handleCopy(r.discount_code)} className="btn btn-ghost btn-sm">
                      {copiedCode === r.discount_code ? <Check size={14} /> : <Copy size={14} />}
                      {copiedCode === r.discount_code ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>)}
              </div>
            </motion.div>}
        </AnimatePresence>

        {/* History */}
        {(loyalty?.redemptions || []).filter(r => r.is_used).length > 0 && <div className="mt-8">
            <h2 className="text-sm font-semibold text-stone-500 mb-2">Historial de canjes</h2>
            {(loyalty?.redemptions || []).filter(r => r.is_used).map(r => <div key={r.discount_code} className="flex items-center justify-between py-2 border-b border-stone-100">
                  <div>
                    <span className="text-sm text-stone-700">{r.reward_name || r.discount_code}</span>
                    <span className="text-xs text-stone-400 ml-2">
                      {(() => { const d = new Date(r.used_at || r.redeemed_at); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES'); })()}
                    </span>
                  </div>
                  <span className="text-xs text-stone-400">Usado</span>
                </div>)}
          </div>}
      </div>
    </div>;
}