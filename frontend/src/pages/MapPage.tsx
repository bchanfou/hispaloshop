// @ts-nocheck
/**
 * MapPage — Full-screen producer map (section 2.2 completion).
 * 
 * MVP: List view with country/region filters + visual map preview.
 * V2: Interactive map with pins using Mapbox/Leaflet.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store, ArrowLeft, Search, Filter, Users, Package, ChevronDown, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/client';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';

interface Store {
  store_id: string;
  producer_id: string;
  name: string;
  slug: string;
  location?: string;
  country?: string;
  region?: string;
  logo?: string;
  cover_image?: string;
  tagline?: string;
  product_count?: number;
  follower_count?: number;
  verified?: boolean;
}

const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'KR', name: '대한민국' },
  { code: 'US', name: 'United States' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italia' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'JP', name: '日本' },
  { code: 'BR', name: 'Brasil' },
];

export default function MapPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(user?.country || '');
  const [showCountryFilter, setShowCountryFilter] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCountry) params.set('country', selectedCountry);
      params.set('limit', '500');
      const data = await apiClient.get(`/stores?${params}`);
      setStores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch stores:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const filteredStores = useMemo(() => {
    if (!search.trim()) return stores;
    const q = search.toLowerCase();
    return stores.filter(s => 
      (s.name || '').toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q) ||
      (s.tagline || '').toLowerCase().includes(q)
    );
  }, [stores, search]);

  // Group by country for stats
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    stores.forEach(s => {
      const c = s.country || 'Unknown';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [stores]);

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title={t('map.seoTitle', 'Mapa de Productores — HispaloShop')}
        description={t('map.seoDesc', 'Explora productores locales verificados en tu región y descubre productos frescos cerca de ti.')}
      />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-stone-50/95 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-stone-200 transition-colors"
            aria-label={t('common.back', 'Volver')}
          >
            <ArrowLeft size={20} className="text-stone-900" />
          </button>
          <h1 className="text-lg font-semibold text-stone-950 flex-1">
            {t('map.title', 'Mapa de Productores')}
          </h1>
        </div>

        {/* Search + Filter */}
        <div className="px-4 pb-3 space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('map.searchPlaceholder', 'Buscar tiendas o ubicaciones...')}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-white border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
            />
          </div>

          {/* Country Filter */}
          <div className="relative">
            <button
              onClick={() => setShowCountryFilter(!showCountryFilter)}
              className="flex items-center gap-2 w-full h-10 px-3 rounded-xl bg-white border border-stone-200 text-sm"
            >
              <Globe size={16} className="text-stone-400" />
              <span className="flex-1 text-left">
                {selectedCountry 
                  ? COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry
                  : t('map.allCountries', 'Todos los países')
                }
              </span>
              <ChevronDown size={16} className={`text-stone-400 transition-transform ${showCountryFilter ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showCountryFilter && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-stone-200 shadow-lg max-h-60 overflow-y-auto z-50"
                >
                  <button
                    onClick={() => { setSelectedCountry(''); setShowCountryFilter(false); }}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 ${!selectedCountry ? 'bg-stone-100 font-medium' : ''}`}
                  >
                    {t('map.allCountries', 'Todos los países')}
                  </button>
                  {COUNTRIES.map(c => (
                    <button
                      key={c.code}
                      onClick={() => { setSelectedCountry(c.code); setShowCountryFilter(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 ${selectedCountry === c.code ? 'bg-stone-100 font-medium' : ''}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 pb-2 flex items-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <Store size={14} /> {filteredStores.length} {t('map.stores', 'tiendas')}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {Object.keys(countryCounts).length} {t('map.countries', 'países')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 space-y-3 animate-pulse">
                <div className="h-4 w-32 bg-stone-100 rounded" />
                <div className="h-3 w-48 bg-stone-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <MapPin size={48} className="mx-auto text-stone-300 mb-4" />
            <p className="text-stone-500 font-medium">
              {search ? t('map.noSearchResults', 'No se encontraron resultados') : t('map.noStores', 'No hay tiendas en esta región')}
            </p>
            <p className="text-sm text-stone-400 mt-1">
              {search ? t('map.tryDifferentSearch', 'Intenta con otros términos') : t('map.tryAnotherCountry', 'Prueba con otro país')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStores.map(store => (
              <StoreCard key={store.store_id} store={store} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StoreCard({ store }: { store: Store }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-stone-200 overflow-hidden cursor-pointer hover:border-stone-300 transition-colors"
      onClick={() => navigate(`/store/${store.slug || store.store_id}`)}
    >
      {/* Cover */}
      <div className="h-24 bg-stone-100 relative">
        {store.cover_image ? (
          <img src={store.cover_image} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <Store size={32} />
          </div>
        )}
        {store.verified && (
          <div className="absolute top-2 right-2 bg-stone-950 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            ✓ Verified
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 overflow-hidden shrink-0 -mt-6 border-2 border-white shadow-sm">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold text-lg">
                {(store.name || '?')[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="font-semibold text-stone-950 text-sm truncate">{store.name}</h3>
            {store.location && (
              <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {store.location}
              </p>
            )}
          </div>
        </div>

        {store.tagline && (
          <p className="text-xs text-stone-600 mt-2 line-clamp-2">{store.tagline}</p>
        )}

        <div className="flex items-center gap-3 mt-3 text-[11px] text-stone-400">
          {store.product_count !== undefined && (
            <span className="flex items-center gap-1">
              <Package size={12} /> {store.product_count}
            </span>
          )}
          {store.follower_count !== undefined && (
            <span className="flex items-center gap-1">
              <Users size={12} /> {store.follower_count}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
