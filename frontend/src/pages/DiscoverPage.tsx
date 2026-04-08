// @ts-nocheck
/**
 * DiscoverPage — curated discovery (section 1.2 rebuild).
 *
 * NOT the social feed. This is Pinterest + Airbnb for HispaloShop.
 * Data comes from a single GET /api/discover/bundle call.
 * Chips filter shows/hides sections client-side (no re-fetch).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Loader2, Flower2, Sun, Leaf, Snowflake, MapPin, Lightbulb, Users, UserPlus, ChefHat, Star, Map, Hash } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { trackEvent } from '../utils/analytics';
import SEO from '../components/SEO';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullIndicator from 'components/ui/PullIndicator';

// Seasonal icon mapping (Lucide icons instead of emojis — per DESIGN_SYSTEM.md §10)
const SEASONAL_ICONS = {
  'Primavera': Flower2, 'Spring': Flower2, '봄': Flower2,
  'Verano': Sun, 'Summer': Sun, '여름': Sun,
  'Otoño': Leaf, 'Autumn': Leaf, '가을': Leaf,
  'Invierno': Snowflake, 'Winter': Snowflake, '겨울': Snowflake,
};

import DiscoverSearchBar from '../components/discover/DiscoverSearchBar';
import DiscoverChips from '../components/discover/DiscoverChips';
import DiscoverSection from '../components/discover/DiscoverSection';
import HorizontalStrip from '../components/discover/HorizontalStrip';
import { ProductCard, ProducerCard, CommunityCard, RecipeCard, AvatarCard } from '../components/discover/cards';

const CHIP_VISIBILITY = {
  all:          ['seasonal', 'near_you', 'for_you', 'communities', 'new_producers', 'recipes', 'creators', 'map'],
  products:     ['seasonal', 'for_you'],
  stores:       ['near_you', 'new_producers', 'map'],
  communities:  ['communities'],
  recipes:      ['recipes'],
  creators:     ['creators'],
};

export default function DiscoverPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChip, setActiveChip] = useState('all');
  const [forYouPage, setForYouPage] = useState(1);
  const [forYouExtra, setForYouExtra] = useState([]);
  const [forYouLoading, setForYouLoading] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState([]);

  const fetchBundle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const country = user?.country || null;
      const params = new URLSearchParams();
      if (country) params.set('country', country);
      params.set('limit', '10');
      const data = await apiClient.get(`/discover/bundle?${params}`);
      setBundle(data);
      setForYouPage(1);
      setForYouExtra([]);
      trackEvent('discover_viewed', { country, chip_filter: activeChip });
      apiClient.get('/hashtags/trending?limit=8').then(d => setTrendingHashtags(d?.hashtags || [])).catch(() => {});
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, activeChip]);

  // Pull to refresh for mobile
  const { refreshing, progress, handlers } = usePullToRefresh(
    async () => { await fetchBundle(); }
  );

  useEffect(() => { fetchBundle(); }, [fetchBundle]);

  const loadMoreForYou = useCallback(async () => {
    if (forYouLoading) return;
    setForYouLoading(true);
    try {
      const country = user?.country || '';
      const data = await apiClient.get(`/discovery/trending?type=products&limit=10&country=${country}`);
      const products = data?.items || data?.products || [];
      setForYouExtra(prev => [...prev, ...products]);
      setForYouPage(p => p + 1);
    } catch { /* ignore */ }
    finally { setForYouLoading(false); }
  }, [user, forYouLoading]);

  const visibleSections = useMemo(() => new Set(CHIP_VISIBILITY[activeChip] || CHIP_VISIBILITY.all), [activeChip]);
  const show = (id) => visibleSections.has(id);

  const seasonal = bundle?.seasonal;
  const nearYou = bundle?.near_you?.producers || [];
  const forYouBase = bundle?.for_you?.products || [];
  const forYouAll = useMemo(() => [...forYouBase, ...forYouExtra], [forYouBase, forYouExtra]);
  const communities = bundle?.communities_trending?.communities || [];
  const newProducers = bundle?.new_producers?.producers || [];
  const recipes = bundle?.recipes_week?.recipes || [];
  const creators = bundle?.trending_creators?.creators || [];
  const mapPreview = bundle?.map_preview;

  return (
    <div className="min-h-screen bg-stone-50 pb-20 lg:pb-4" {...handlers}>
      <SEO
        title={t('discover.seoTitle', 'Descubre — HispaloShop')}
        description={t('discover.seoDesc', 'Descubre productores locales, productos de temporada y recetas.')}
      />

      <PullIndicator progress={progress} isRefreshing={refreshing} />

      <div className="sticky top-0 z-30 bg-stone-50/95 backdrop-blur-md pt-[max(8px,env(safe-area-inset-top))] pb-1">
        <DiscoverSearchBar />
        <DiscoverChips active={activeChip} onChange={setActiveChip} />
      </div>

      {error && !bundle && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-base text-stone-950 font-semibold mb-2">{t('discover.errorTitle', 'No pudimos cargar el contenido')}</p>
          <p className="text-sm text-stone-500 mb-6">{t('discover.errorSubtitle', 'Revisa tu conexión e inténtalo de nuevo.')}</p>
          <button type="button" onClick={fetchBundle} className="flex items-center gap-2 px-5 py-2.5 bg-stone-950 text-white rounded-full text-sm font-semibold border-none cursor-pointer hover:bg-stone-800 transition-colors">
            <RefreshCw size={16} /> {t('discover.retry', 'Reintentar')}
          </button>
        </div>
      )}

      {!loading && bundle && (
        <div className="flex justify-center py-2">
          <button type="button" onClick={fetchBundle} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 bg-transparent border-none cursor-pointer py-1 px-3 transition-colors" aria-label={t('discover.refresh', 'Actualizar')}>
            <RefreshCw size={12} /> {t('discover.refresh', 'Actualizar')}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={activeChip} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

          {show('seasonal') && (
            <DiscoverSection id="seasonal" icon={SEASONAL_ICONS[seasonal?.label] || Flower2} titleKey="seasonal" titleFallback={`${seasonal?.label || t('discover.seasonNow', 'Temporada')} ahora`} loading={loading} isEmpty={!loading && (seasonal?.products?.length || 0) === 0} emptyMessage={t('discover.seasonalEmpty', 'Aún no hay productos de temporada en tu zona.')} emptyCta={t('discover.seasonalEmptyCta', 'Descubre de otros países')} emptyCtaHref="/search">
              <HorizontalStrip items={seasonal?.products || []} renderItem={(p) => <ProductCard product={p} />} />
            </DiscoverSection>
          )}

          {show('near_you') && (
            <DiscoverSection id="near_you" icon={MapPin} titleKey="nearYou" titleFallback={t('discover.nearYou', 'Cerca de ti')} seeAllHref="/stores" loading={loading} isEmpty={!loading && nearYou.length === 0} emptyMessage={t('discover.nearYouEmpty', 'Aún no hay productores en tu zona. ¡Sé el primero!')} emptyCta={t('discover.nearYouEmptyCta', 'Registrarme como productor')} emptyCtaHref="/register?role=producer">
              <HorizontalStrip items={nearYou} renderItem={(p) => <ProducerCard producer={p} />} />
            </DiscoverSection>
          )}

          {show('for_you') && (
            <DiscoverSection id="for_you" icon={Lightbulb} titleKey="forYou" titleFallback={t('discover.forYou', 'Para ti')} loading={loading} isEmpty={!loading && forYouAll.length === 0} emptyMessage={t('discover.forYouEmpty', 'Completa tu onboarding para personalizar esta sección.')} emptyCta={t('discover.forYouEmptyCta', 'Ir al onboarding')} emptyCtaHref="/onboarding" dismissable={false}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
                {forYouAll.map((product, i) => <ProductCard key={product.product_id || product.id || i} product={product} />)}
              </div>
              {forYouAll.length >= 10 && forYouPage < 4 && (
                <div className="flex justify-center mt-4 px-4">
                  <button type="button" onClick={loadMoreForYou} disabled={forYouLoading} className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-stone-200 bg-white text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50 cursor-pointer" data-testid="discover-load-more">
                    {forYouLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {t('discover.loadMore', 'Cargar más')}
                  </button>
                </div>
              )}
            </DiscoverSection>
          )}

          {show('communities') && (
            <DiscoverSection id="communities" icon={Users} titleKey="communitiesTrending" titleFallback={t('discover.communitiesTrending', 'Comunidades trending')} seeAllHref="/communities" loading={loading} isEmpty={!loading && communities.length === 0} emptyMessage={t('discover.communitiesEmpty', 'Aún no hay comunidades en tu zona.')} emptyCta={t('discover.communitiesEmptyCta', 'Crea la primera')} emptyCtaHref="/communities/create">
              {activeChip === 'communities' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
                  {communities.map((c, i) => <CommunityCard key={c.slug || i} community={c} />)}
                </div>
              ) : (
                <HorizontalStrip items={communities} renderItem={(c) => <CommunityCard community={c} />} />
              )}
            </DiscoverSection>
          )}

          {show('new_producers') && (
            <DiscoverSection id="new_producers" icon={UserPlus} titleKey="newProducers" titleFallback={t('discover.newProducers', 'Nuevos productores')} seeAllHref="/stores" loading={loading} isEmpty={!loading && newProducers.length === 0} emptyMessage={t('discover.newProducersEmpty', 'Nadie nuevo esta semana.')}>
              <HorizontalStrip items={newProducers} renderItem={(p) => <AvatarCard user={p} />} gap="gap-4" />
            </DiscoverSection>
          )}

          {show('recipes') && recipes.length > 0 && (
            <DiscoverSection id="recipes" icon={ChefHat} titleKey="recipesWeek" titleFallback={t('discover.recipesWeek', 'Recetas de la semana')} seeAllHref="/recipes" loading={loading} isEmpty={false}>
              {activeChip === 'recipes' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 px-4">
                  {recipes.map((r, i) => <RecipeCard key={r.recipe_id || r.id || i} recipe={r} />)}
                </div>
              ) : (
                <HorizontalStrip items={recipes} renderItem={(r) => <RecipeCard recipe={r} />} />
              )}
            </DiscoverSection>
          )}

          {show('creators') && (
            <DiscoverSection id="creators" icon={Star} titleKey="trendingCreators" titleFallback={t('discover.trendingCreators', 'Trending creators')} seeAllHref="/ambassadors" loading={loading} isEmpty={!loading && creators.length === 0} emptyMessage={t('discover.creatorsEmpty', 'Pronto tendremos creators aquí.')}>
              <HorizontalStrip items={creators} renderItem={(c) => <AvatarCard user={c} />} gap="gap-4" />
            </DiscoverSection>
          )}

          {/* Trending Hashtags */}
          {trendingHashtags.length > 0 && (
            <div className="px-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Hash size={16} className="text-stone-400" />
                <h2 className="text-base font-semibold text-stone-950">{t('discover.trendingHashtags', 'Trending ahora')}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingHashtags.map(h => (
                  <button key={h.tag} type="button" onClick={() => navigate(`/hashtag/${encodeURIComponent(h.tag)}`)} className="rounded-full bg-stone-100 px-3.5 py-2 text-[13px] font-medium text-stone-700 border-none cursor-pointer hover:bg-stone-200 transition-colors">
                    #{h.tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {show('map') && !loading && (
            <DiscoverSection id="map" icon={Map} titleKey="mapPreview" titleFallback={t('discover.mapPreview', 'Mapa de productores')} loading={false} isEmpty={(mapPreview?.producers_count || 0) === 0} emptyMessage={t('discover.mapEmpty', 'Pronto tendremos productores en tu zona.')}>
              <div className="mx-4 p-6 rounded-2xl bg-stone-950 text-white text-center">
                <p className="text-3xl font-bold mb-1">{mapPreview?.producers_count || 0}</p>
                <p className="text-sm text-stone-300 mb-4">{t('discover.mapCount', 'productores verificados')}</p>
                <button type="button" onClick={() => navigate('/map')} className="px-5 py-2 bg-white text-stone-950 rounded-full text-sm font-semibold border-none cursor-pointer hover:bg-stone-100 transition-colors">
                  {t('discover.viewFullMap', 'Ver mapa completo')}
                </button>
              </div>
            </DiscoverSection>
          )}
        </motion.div>
      </AnimatePresence>

      {loading && !bundle && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-stone-950 mb-4" />
          <p className="text-sm text-stone-500">{t('discover.loading', 'Cargando descubrimientos...')}</p>
        </div>
      )}
    </div>
  );
}
