// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Trash2, Loader2, BarChart3, Globe, Zap, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

const COUNTRY_OPTIONS = [
  { code: 'ES', label: 'Espana' },
  { code: 'KR', label: 'Corea del Sur' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'FR', label: 'Francia' },
  { code: 'DE', label: 'Alemania' },
  { code: 'IT', label: 'Italia' },
  { code: 'PT', label: 'Portugal' },
];

export default function PromotionPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [products, setProducts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetCountries, setTargetCountries] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [promoData, statsData] = await Promise.all([
        apiClient.get('/producer/promoted'),
        apiClient.get('/producer/promoted/stats'),
      ]);
      setData(promoData);
      setStats(statsData);
      setTargetCountries(promoData?.promoted?.[0]?.target_countries || [promoData?.country || 'ES']);
    } catch {
      toast.error('Error al cargar promociones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    trackEvent('promotion_page_viewed');
  }, [fetchData]);

  const handleToggleAuto = async () => {
    if (!data) return;
    const newAuto = !data.is_auto;
    try {
      await apiClient.put('/producer/promoted/auto', { auto: newAuto });
      setData((prev) => ({ ...prev, is_auto: newAuto }));
      toast.success(newAuto ? 'Auto-seleccion activada' : 'Auto-seleccion desactivada');
    } catch {
      toast.error('Error');
    }
  };

  const handleAdd = async (productId) => {
    setAdding(true);
    try {
      await apiClient.post(`/producer/promoted/${productId}`, { target_countries: targetCountries });
      trackEvent('promotion_slot_added', { product_id: productId, is_auto: false });
      toast.success('Producto promocionado');
      setShowAddModal(false);
      await fetchData();
    } catch (err) {
      toast.error(err?.data?.detail || err?.message || 'Error');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await apiClient.delete(`/producer/promoted/${productId}`);
      toast.success('Producto quitado de promocion');
      await fetchData();
    } catch {
      toast.error('Error');
    }
  };

  const handleSaveTargeting = async () => {
    trackEvent('promotion_targeting_changed', { countries: targetCountries });
    toast.success('Targeting guardado');
  };

  // Load products for add modal
  const loadProducts = async () => {
    try {
      const prods = await apiClient.get('/producer/products');
      setProducts(Array.isArray(prods) ? prods : prods?.products || []);
    } catch {}
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-stone-500" />
      </div>
    );
  }

  // FREE plan — upgrade banner
  if (data?.slots_total === 0) {
    return (
      <div className="max-w-[600px] mx-auto text-center py-20 px-4">
        <Lock className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-stone-950 mb-2">{t('promotion.upgradeTitle', 'Promocion de productos')}</h1>
        <p className="text-sm text-stone-500 mb-6">
          {t('promotion.upgradeDesc', 'Actualiza a PRO para promocionar hasta 5 productos en el feed de tus clientes potenciales. Incluido en tu plan, sin coste adicional.')}
        </p>
        <button onClick={() => navigate('/producer/plan')} className="px-6 py-3 bg-stone-950 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors">
          {t('promotion.upgradeCta', 'Ver planes')}
        </button>
      </div>
    );
  }

  const promoted = data?.promoted || [];
  const slotsUsed = data?.slots_used || 0;
  const slotsTotal = data?.slots_total || 0;
  const pct = slotsTotal > 0 ? Math.round((slotsUsed / slotsTotal) * 100) : 0;

  return (
    <div className="max-w-[975px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-950 flex items-center gap-2">
          <Megaphone className="w-6 h-6" /> {t('promotion.title', 'Promocion de productos')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('promotion.subtitle', 'Incluido en tu plan')} {data?.plan} -- {slotsTotal} {t('promotion.slots', 'slots')} {data?.scope === 'national_international' ? t('promotion.nationalInternational', 'nacionales + internacionales') : t('promotion.nationalOnly', 'nacionales')}
        </p>
      </div>

      {/* Slots progress */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-stone-950">{slotsUsed}/{slotsTotal} slots usados</p>
          <p className="text-xs text-stone-500">{pct}%</p>
        </div>
        <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
          <div className="h-full bg-stone-950 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500">{t('promotion.autoSelect', 'Auto-seleccion')}:</span>
            <button onClick={handleToggleAuto} className={`relative w-10 h-5 rounded-full transition-colors ${data?.is_auto ? 'bg-stone-950' : 'bg-stone-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${data?.is_auto ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {slotsUsed < slotsTotal && (
            <button onClick={loadProducts} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-stone-950 text-white rounded-full hover:bg-stone-800 transition-colors">
              <Plus className="w-4 h-4" /> {t('promotion.addProduct', 'Anadir producto')}
            </button>
          )}
        </div>
      </div>

      {/* Promoted products list */}
      {promoted.length > 0 ? (
        <div className="space-y-3">
          {promoted.map((p) => {
            const ctr = p.impressions > 0 ? ((p.clicks / p.impressions) * 100).toFixed(1) : '0.0';
            return (
              <div key={p.promo_id || p.product_id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
                {p.product_image && <img src={p.product_image} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-950 truncate">{p.product_name}</p>
                  <p className="text-xs text-stone-500">
                    {p.impressions || 0} impresiones -- {p.clicks || 0} clicks -- CTR {ctr}%
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.is_auto_selected ? 'bg-stone-100 text-stone-500' : 'bg-stone-950 text-white'}`}>
                      {p.is_auto_selected ? 'Auto' : 'Manual'}
                    </span>
                    {p.scope !== 'national' && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 flex items-center gap-0.5"><Globe className="w-3 h-3" /> Internacional</span>}
                  </div>
                </div>
                <button onClick={() => handleRemove(p.product_id)} className="p-2 rounded-full hover:bg-stone-100 transition-colors text-stone-400 hover:text-stone-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <Megaphone className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm text-stone-500">{data?.is_auto ? t('promotion.autoWillSelect', 'La auto-seleccion elegira tus mejores productos automaticamente.') : t('promotion.noPromoted', 'No tienes productos promocionados. Anade uno.')}</p>
        </div>
      )}

      {/* International targeting (ELITE producer only) */}
      {data?.scope === 'national_international' && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-950 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" /> {t('promotion.internationalTargeting', 'Targeting internacional')}
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {COUNTRY_OPTIONS.map((c) => {
              const sel = targetCountries.includes(c.code);
              return (
                <button key={c.code} onClick={() => setTargetCountries((prev) => sel ? prev.filter((x) => x !== c.code) : [...prev, c.code])} className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${sel ? 'bg-stone-950 border-stone-950 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}>
                  {c.label}
                </button>
              );
            })}
          </div>
          <button onClick={handleSaveTargeting} className="text-xs font-semibold text-stone-950 hover:underline">
            {t('promotion.saveTargeting', 'Guardar targeting')}
          </button>
        </div>
      )}

      {/* Weekly stats */}
      {stats && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-stone-950 mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> {t('promotion.weeklySummary', 'Resumen')}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-stone-950">{stats.total_impressions}</p>
              <p className="text-[10px] text-stone-500 uppercase">Impresiones</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-stone-950">{stats.total_clicks}</p>
              <p className="text-[10px] text-stone-500 uppercase">Clicks</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-stone-950">{stats.ctr}%</p>
              <p className="text-[10px] text-stone-500 uppercase">CTR</p>
            </div>
          </div>
          <p className="text-xs text-stone-500 text-center mt-3">
            Tus productos se promocionaron {stats.total_impressions} veces, gratis con tu plan {data?.plan}.
          </p>
        </div>
      )}

      {/* Add product modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-stone-950 mb-4">{t('promotion.selectProduct', 'Seleccionar producto')}</h2>
            {products.filter((p) => p.approved && !promoted.some((pr) => pr.product_id === p.product_id)).length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-4">No hay productos disponibles para promocionar.</p>
            ) : (
              <div className="space-y-2">
                {products.filter((p) => p.approved && !promoted.some((pr) => pr.product_id === p.product_id)).map((p) => (
                  <button key={p.product_id} onClick={() => handleAdd(p.product_id)} disabled={adding} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-stone-50 transition-colors text-left">
                    {p.images?.[0] && <img src={p.images[0]} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-950 truncate">{p.name}</p>
                      <p className="text-xs text-stone-500">{p.stock || 0} en stock</p>
                    </div>
                    <Plus className="w-4 h-4 text-stone-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
