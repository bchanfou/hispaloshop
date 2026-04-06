// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Star, Users, ArrowLeft, ChevronDown, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../utils/analytics';
import i18n from '../locales/i18n';

const COUNTRIES = [
  { value: '', label: 'Todos' },
  { value: 'ES', label: 'Espana' },
  { value: 'KR', label: 'Corea' },
  { value: 'US', label: 'EE.UU.' },
];
const TIERS = ['Todos', 'Hercules', 'Atenea', 'Zeus'];
const SORTS = [
  { value: 'sales', label: 'Ventas' },
  { value: 'followers', label: 'Seguidores' },
  { value: 'newest', label: 'Nuevos' },
];
const FLAG: Record<string, string> = { ES: '\u{1F1EA}\u{1F1F8}', KR: '\u{1F1F0}\u{1F1F7}', US: '\u{1F1FA}\u{1F1F8}' };
const LIMIT = 20;

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-5 animate-pulse flex flex-col items-center gap-3">
      <div className="w-20 h-20 rounded-full bg-stone-200" />
      <div className="h-4 w-28 bg-stone-200 rounded" />
      <div className="h-3 w-20 bg-stone-100 rounded" />
      <div className="h-3 w-24 bg-stone-100 rounded" />
      <div className="flex gap-4 mt-2">
        <div className="h-3 w-16 bg-stone-100 rounded" />
        <div className="h-3 w-16 bg-stone-100 rounded" />
      </div>
      <div className="h-8 w-full bg-stone-100 rounded-full mt-2" />
    </div>
  );
}

export default function AmbassadorsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [ambassadors, setAmbassadors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [country, setCountry] = useState('');
  const [tier, setTier] = useState('Todos');
  const [sort, setSort] = useState('sales');

  const fetchAmbassadors = useCallback(async (p: number, reset = false) => {
    try {
      if (reset) setLoading(true); else setLoadingMore(true);
      const params: any = { page: p, limit: LIMIT, sort };
      if (country) params.country = country;
      if (tier !== 'Todos') params.tier = tier.toLowerCase();
      const { data } = await apiClient.get('/ambassadors', { params });
      const list = data?.ambassadors ?? data?.items ?? data ?? [];
      if (reset) setAmbassadors(list); else setAmbassadors(prev => [...prev, ...list]);
      setHasMore(list.length >= LIMIT);
      setPage(p);
    } catch {
      toast.error('Error al cargar embajadores');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [country, tier, sort]);

  useEffect(() => { trackEvent('ambassadors_viewed'); }, []);
  useEffect(() => { fetchAmbassadors(1, true); }, [fetchAmbassadors]);

  const loadMore = () => { if (!loadingMore && hasMore) fetchAmbassadors(page + 1); };

  const handleFollow = (amb: any) => {
    trackEvent('ambassador_followed', { ambassador_id: amb._id ?? amb.id });
    toast.success(`Siguiendo a ${amb.full_name ?? amb.username}`);
  };
  const handleUseCode = (amb: any) => {
    const code = amb.discount_code;
    if (!code) return;
    trackEvent('ambassador_code_used', { code, ambassador_id: amb._id ?? amb.id });
    navigate(`/cart?code=${encodeURIComponent(code)}`);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-stone-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-stone-100 transition-colors">
            <ArrowLeft size={20} className="text-stone-700" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-stone-950">Embajadores HispaloShop</h1>
            <p className="text-xs text-stone-500">Personas que te ayudan a descubrir productos reales</p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="appearance-none bg-white border border-stone-200 rounded-full pl-3 pr-8 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400">
              {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
          <div className="flex gap-1.5">
            {TIERS.map(t => (
              <button key={t} onClick={() => setTier(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${tier === t ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="appearance-none bg-white border border-stone-200 rounded-full pl-3 pr-8 py-1.5 text-sm text-stone-700 focus:outline-none focus:ring-1 focus:ring-stone-400">
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : ambassadors.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500 text-sm">No hay embajadores aun</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {ambassadors.map((amb, idx) => {
                const id = amb._id ?? amb.id;
                const tierName = amb.tier ?? 'hercules';
                return (
                  <motion.div key={id ?? idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-2xl bg-white border border-stone-200 p-5 flex flex-col items-center text-center gap-2">
                    <Link to={`/@${amb.username}`} onClick={() => trackEvent('ambassador_profile_clicked', { user_id: id, tier: tierName })}>
                      <img src={amb.avatar_url ?? `https://ui-avatars.com/api/?name=${amb.full_name}&background=e7e5e4&color=1c1917`}
                        alt={amb.full_name} className="w-20 h-20 rounded-full object-cover border-2 border-stone-200" />
                    </Link>
                    <Link to={`/@${amb.username}`} className="hover:underline"
                      onClick={() => trackEvent('ambassador_profile_clicked', { user_id: id, tier: tierName })}>
                      <p className="text-sm font-semibold text-stone-950 leading-tight">{amb.full_name}</p>
                      <p className="text-xs text-stone-400">@{amb.username}</p>
                    </Link>
                    {amb.country && (
                      <p className="text-xs text-stone-500 flex items-center gap-1">
                        <MapPin size={12} /> {FLAG[amb.country] ?? ''} {amb.country}
                      </p>
                    )}
                    <span className="bg-stone-100 text-stone-700 rounded-full px-2.5 py-1 text-xs inline-flex items-center gap-1">
                      <Star size={12} /> {tierName.charAt(0).toUpperCase() + tierName.slice(1)}
                    </span>
                    <div className="flex gap-3 text-xs text-stone-500">
                      <span>{formatCount(amb.sales_count ?? 0)} ventas</span>
                      <span>{formatCount(amb.followers_count ?? 0)} seguidores</span>
                    </div>
                    {amb.discount_code && (
                      <p className="text-xs text-stone-600 font-mono bg-stone-50 rounded-lg px-2 py-1 w-full truncate">
                        Codigo: {amb.discount_code}
                      </p>
                    )}
                    <div className="flex gap-2 w-full mt-1">
                      <button onClick={() => handleFollow(amb)}
                        className="flex-1 py-1.5 text-xs font-medium rounded-full border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors">
                        Seguir
                      </button>
                      {amb.discount_code && (
                        <button onClick={() => handleUseCode(amb)}
                          className="flex-1 py-1.5 text-xs font-medium rounded-full bg-stone-950 text-white hover:bg-stone-800 transition-colors">
                          Usar codigo
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2 pb-4">
                <button onClick={loadMore} disabled={loadingMore}
                  className="px-6 py-2 rounded-full border border-stone-200 text-sm text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-50">
                  {loadingMore ? 'Cargando...' : 'Cargar mas'}
                </button>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <section className="rounded-2xl bg-white border border-stone-200 p-8 text-center space-y-3 mb-8">
          <h2 className="text-lg font-semibold text-stone-950">Quieres ser embajador?</h2>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            Comparte productos que te gustan, gana comisiones y ayuda a tu comunidad a descubrir lo mejor de cada region.
          </p>
          <Link to="/register?role=influencer"
            className="inline-block px-6 py-2.5 rounded-full bg-stone-950 text-white text-sm font-medium hover:bg-stone-800 transition-colors">
            Hazte embajador
          </Link>
        </section>
      </div>
    </div>
  );
}
