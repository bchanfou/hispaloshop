// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Package, Leaf, Cookie, CupSoda, Baby, PawPrint, Crown, ShoppingBag, AlertTriangle, ArrowRight, Bookmark, Store, Users, ChefHat } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import apiClient from '../services/api/client';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import PostDetailModal from '../components/feed/PostDetailModal';
import SEO from '../components/SEO';
import { CATEGORY_GROUPS } from '../constants/categories';
import { toast } from 'sonner';

/* ── constants ── */

const DIFFICULTY_MAP = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };

const ELITE_FADE_MS = 400;

/* ── pill classes ── */
const pillCls = (active) =>
  `flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
    active
      ? 'bg-stone-950 text-white'
      : 'bg-stone-100 text-stone-700'
  }`;

/* ── icon map for category groups ── */
const CATEGORY_ICON_MAP = { Leaf, Package, Cookie, CupSoda, Baby, PawPrint, Crown };
const getCategoryIcon = (iconName) => CATEGORY_ICON_MAP[iconName] || Package;

/* ── Explore grid item: square thumbnail, some span 2 rows ── */
function ExploreGridItem({ item, index, onClick }) {
  const img = item.images?.[0] || item.image_url || item.cover_image || null;
  // Every 5th item (index 0, 5, 10...) spans 2 rows for visual variety
  const isLarge = index % 5 === 0;

  return (
    <motion.button
      type="button"
      onClick={() => onClick(item)}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: index < 12 ? index * 0.05 : 0 }}
      className={`relative overflow-hidden bg-stone-100 ${isLarge ? 'row-span-2' : ''}`}
      style={{ aspectRatio: isLarge ? undefined : '1/1' }}
    >
      {img ? (
        <img
          src={img}
          alt={item.name || item.title || ''}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ShoppingBag size={24} className="text-stone-300" />
        </div>
      )}
    </motion.button>
  );
}

/* ══════════════════════════════════════════
   DiscoverPage
   ══════════════════════════════════════════ */

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country } = useLocale?.() || {};
  const userCountry = user?.country || country || 'ES';

  /* ── ui states ── */
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);

  /* ── data states ── */
  const [trending, setTrending] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [eliteStores, setEliteStores] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [recommendedStores, setRecommendedStores] = useState([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState([]);
  const [recommendedCommunities, setRecommendedCommunities] = useState([]);

  const { products, isLoading: loadingProducts } = useProducts({
    limit: '24',
    ...(activeCategory ? { category: activeCategory } : {}),
  });
  /* ── elite carousel state ── */
  const [eliteIdx, setEliteIdx] = useState(0);
  const [eliteFading, setEliteFading] = useState(false);
  const eliteFadeTimer = useRef(null);

  /* ── fetch data ── */
  const fetchAllData = useCallback(() => {
    setLoadingTrending(true);
    setLoadingRecipes(true);
    setFetchError(false);

    let trendingFailed = false;
    let productsFailed = false;

    apiClient.get('/discovery/trending', { params: { type: 'products', limit: 6 } })
      .then(data => { setTrending(Array.isArray(data) ? data.slice(0, 6) : (data?.items || data?.products || []).slice(0, 6)); })
      .catch(() => { trendingFailed = true; })
      .finally(() => { setLoadingTrending(false); if (trendingFailed && productsFailed) setFetchError(true); });

    apiClient.get('/stores', { params: { plan: 'elite', country: userCountry, limit: 10 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.stores || [];
        setEliteStores(list);
      })
      .catch(() => {});

    apiClient.get('/discovery/trending', { params: { type: 'hashtags', limit: 12 } })
      .then(data => {
        const items = (data?.items || data || []).filter(
          (item) => item.tag || item.name || item.hashtag
        );
        setTrendingHashtags(items.slice(0, 12));
      })
      .catch(() => {});

    apiClient.get('/discovery/recommended', { params: { limit: 6 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.products || data?.items || [];
        setRecommendedProducts(list.slice(0, 6));
      })
      .catch(() => {
        // Fallback to products?recommended=true
        apiClient.get('/products', { params: { recommended: true, limit: 6 } })
          .then(data => {
            const list = Array.isArray(data) ? data : data?.products || [];
            setRecommendedProducts(list.slice(0, 6));
          })
          .catch(() => {});
      });

    apiClient.get('/recipes', { params: { sort: 'popular', limit: 6 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.recipes || [];
        setRecipes(list.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => { setLoadingRecipes(false); });

    // Recommended stores
    apiClient.get('/stores', { params: { sort: 'popular', limit: 6 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.stores || [];
        setRecommendedStores(list.slice(0, 6));
      })
      .catch(() => {});

    // Recommended recipes
    apiClient.get('/recipes', { params: { sort: 'newest', limit: 6 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.recipes || [];
        setRecommendedRecipes(list.slice(0, 6));
      })
      .catch(() => {});

    // Recommended communities
    apiClient.get('/communities', { params: { sort: 'popular', limit: 6 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.communities || [];
        setRecommendedCommunities(list.slice(0, 6));
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCountry]);

  useEffect(() => {
    fetchAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCountry, user?.user_id]);

  /* ── elite index guard ── */
  useEffect(() => {
    if (eliteStores.length > 0 && eliteIdx >= eliteStores.length) {
      setEliteIdx(0);
    }
  }, [eliteStores.length, eliteIdx]);

  /* ── elite manual advance (dots) ── */
  const goToElite = useCallback((idx) => {
    if (idx === eliteIdx) return;
    setEliteFading(true);
    eliteFadeTimer.current = setTimeout(() => {
      setEliteIdx(idx);
      setEliteFading(false);
    }, ELITE_FADE_MS);
  }, [eliteIdx]);

  /* cleanup fade timer on unmount */
  useEffect(() => {
    return () => { clearTimeout(eliteFadeTimer.current); };
  }, []);

  /* ── elite auto-rotation (max 3s) ── */
  useEffect(() => {
    if (eliteStores.length <= 1) return;
    const interval = setInterval(() => {
      setEliteFading(true);
      eliteFadeTimer.current = setTimeout(() => {
        setEliteIdx((prev) => (prev + 1) % eliteStores.length);
        setEliteFading(false);
      }, ELITE_FADE_MS);
    }, 3000);
    return () => { clearInterval(interval); clearTimeout(eliteFadeTimer.current); };
  }, [eliteStores.length]);

  /* ── build explore grid items (products + recipes mixed) ── */
  const exploreItems = useMemo(() => {
    const items = [];
    const allProducts = products || [];
    const allRecipes = recipes || [];

    // Interleave products and recipes for variety
    let pIdx = 0;
    let rIdx = 0;
    while (pIdx < allProducts.length || rIdx < allRecipes.length) {
      // Add 4 products then 1 recipe
      for (let i = 0; i < 4 && pIdx < allProducts.length; i++) {
        items.push({ ...allProducts[pIdx], _type: 'product' });
        pIdx++;
      }
      if (rIdx < allRecipes.length) {
        items.push({ ...allRecipes[rIdx], _type: 'recipe' });
        rIdx++;
      }
    }
    return items;
  }, [products, recipes]);

  /* ── handle explore item tap ── */
  const handleItemTap = useCallback((item) => {
    if (!item) return;
    if (!item?.recipe_id && !item?.product_id && !item?.post_id) return;
    if (item._type === 'recipe' && item.recipe_id) {
      navigate(`/recipes/${item.recipe_id}`);
    } else if (item.product_id) {
      navigate(`/products/${item.product_id}`);
    }
    // else: silently ignore (no navigate to /undefined)
  }, [navigate]);

  /* ── category filter — toggles local explore grid filter ── */
  const handleCategoryClick = useCallback((slug) => {
    setActiveCategory(prev => prev === slug ? null : slug);
  }, []);

  /* ── elite carousel card ── */
  const EliteCarousel = () => {
    if (eliteStores.length === 0) return null;
    const store = eliteStores[eliteIdx];
    const heroImg = store.hero_image || store.cover_image || store.logo;
    const fadeStyle = { opacity: eliteFading ? 0 : 1, transition: `opacity ${ELITE_FADE_MS}ms ease` };
    return (
      <div className="mx-4 mb-4">
        <div
          role="link"
          tabIndex={0}
          aria-label={`Tienda destacada: ${store.name}`}
          onClick={() => navigate(`/store/${store.slug || store.store_slug}`)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/store/${store.slug || store.store_slug}`); } }}
          className="relative aspect-video cursor-pointer overflow-hidden rounded-2xl bg-stone-950 outline-none"
        >
          {heroImg && (
            <img src={heroImg} alt={store.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={fadeStyle} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 py-4" style={fadeStyle}>
            <div className="mb-1.5 flex items-center gap-2.5">
              {store.logo && (
                <img src={store.logo} alt="" className="h-9 w-9 rounded-full border-2 border-white/30 object-cover" />
              )}
              <div>
                <p className="text-base font-semibold text-white">{store.name}</p>
                {store.location && (
                  <p className="flex items-center gap-1 text-[11px] text-white/70">
                    <MapPin size={10} /> {store.location}
                  </p>
                )}
              </div>
            </div>
            {store.tagline && (
              <p className="text-xs leading-relaxed text-white/80">{store.tagline}</p>
            )}
          </div>
          <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur-md">
            Destacado
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(`/store/${store.slug || store.store_slug}`); }}
            className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-stone-950 backdrop-blur-sm transition-colors hover:bg-white"
            style={fadeStyle}
          >
            Ver tienda <ArrowRight size={14} />
          </button>
        </div>

        {eliteStores.length > 1 && (
          <div role="tablist" aria-label="Tiendas destacadas" className="mt-2 flex justify-center gap-1.5">
            {eliteStores.map((s, i) => (
              <button
                key={s.store_id || s.id || i}
                role="tab"
                aria-selected={i === eliteIdx}
                aria-label={`Tienda ${i + 1}: ${s.name || ''}`}
                onClick={(e) => { e.stopPropagation(); goToElite(i); }}
                className="flex h-8 w-8 items-center justify-center"
              >
                <span className={`block h-1.5 rounded-full transition-all duration-300 ${
                  i === eliteIdx ? 'w-4 bg-stone-950' : 'w-1.5 bg-stone-300'
                }`} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ── loading skeleton grid ── */
  const SkeletonGrid = () => (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-square bg-stone-100 animate-pulse" />
      ))}
    </div>
  );

  /* ── render ── */
  return (
    <div className="min-h-screen bg-white pb-20">
      <SEO title="Explorar — Hispaloshop" description="Descubre productos artesanales, tiendas verificadas y recetas de la comunidad." />
      <div className="mx-auto max-w-[1100px]">

      {/* ─── SEARCH BAR (sticky) ─── */}
      <div className="sticky top-0 z-20 bg-white px-3 py-2 flex items-center gap-2">
        <button
          onClick={() => navigate('/search')}
          aria-label="Buscar productos, tiendas, recetas"
          role="search"
          className="relative block flex-1 text-left"
        >
          <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <div className="flex h-9 w-full items-center rounded-full bg-stone-100 pl-10 pr-4 text-[13px] text-stone-400">
            Buscar
          </div>
        </button>
        <button
          onClick={() => navigate('/saved')}
          aria-label="Guardados"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200"
        >
          <Bookmark size={18} />
        </button>
      </div>

      {/* ─── FILTER PILLS ─── */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-3 py-2 scrollbar-hide lg:flex-wrap lg:overflow-x-visible">
        {CATEGORY_GROUPS.map(grp => {
          const Icon = getCategoryIcon(grp.icon);
          const isActive = activeCategory === grp.slug;
          return (
            <button
              key={grp.slug}
              onClick={() => handleCategoryClick(grp.slug)}
              className={`relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap snap-center ${isActive ? '' : 'bg-stone-100'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="discover-pill"
                  className="absolute inset-0 rounded-full bg-stone-950"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${isActive ? 'text-white' : 'text-stone-700'}`}>
                <Icon size={14} /> {grp.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── TRENDING HASHTAGS ─── */}
      {trendingHashtags.length > 0 && (
        <div className="px-4 pb-3">
          <p className="text-[13px] font-bold text-stone-950 mb-2">Tendencias</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {trendingHashtags.map((item, i) => {
              const tagName = item.tag || item.hashtag || item.name || '';
              return (
                <button
                  key={tagName + i}
                  onClick={() => navigate(`/hashtag/${encodeURIComponent(tagName)}`)}
                  className="shrink-0 rounded-full bg-stone-100 text-stone-950 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors hover:bg-stone-200"
                >
                  #{tagName}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── PARA TI — Personalized row ─── */}
      {recommendedProducts.length > 0 && (
        <div className="px-4 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-stone-950">Para ti</p>
            <Link to="/products?recommended=true" className="text-[13px] font-medium text-stone-500 no-underline transition-colors hover:text-stone-700 hover:underline">
              Ver todo
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {recommendedProducts.map(p => {
              const img = p.images?.[0] || p.image_url;
              const id = p.product_id || p.id;
              return (
                <Link key={id} to={`/products/${id}`} className="w-[140px] shrink-0 no-underline">
                  <div className="aspect-square overflow-hidden rounded-xl bg-stone-100">
                    {img ? (
                      <img src={img} alt={p.name || ''} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag size={20} className="text-stone-300" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium text-stone-950">{p.name}</p>
                  {p.price != null && (
                    <p className="text-[13px] font-bold text-stone-950">{typeof p.display_price === 'string' ? p.display_price : `${(p.price || 0).toFixed(2)} €`}</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TIENDAS PARA TI ─── */}
      {recommendedStores.length > 0 && (
        <div className="px-4 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-stone-950">Tiendas para ti</p>
            <Link to="/stores" className="text-[13px] font-medium text-stone-500 no-underline transition-colors hover:text-stone-700 hover:underline">
              Ver todo
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {recommendedStores.map(s => {
              const id = s.store_slug || s.slug || s.store_id || s.id;
              const img = s.logo_url || s.avatar_url || s.image_url;
              return (
                <Link key={id} to={`/store/${id}`} className="w-[140px] shrink-0 no-underline">
                  <div className="aspect-square overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                    {img ? (
                      <img src={img} alt={s.name || ''} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Store size={24} className="text-stone-300" />
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-semibold text-stone-950">{s.name || s.store_name}</p>
                  <p className="text-[11px] text-stone-500">{s.product_count || 0} productos</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── RECETAS PARA TI ─── */}
      {recommendedRecipes.length > 0 && (
        <div className="px-4 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-stone-950">Recetas para ti</p>
            <Link to="/recipes" className="text-[13px] font-medium text-stone-500 no-underline transition-colors hover:text-stone-700 hover:underline">
              Ver todo
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {recommendedRecipes.map(r => {
              const id = r.recipe_id || r.id;
              const img = r.image_url || r.cover_image || r.images?.[0];
              return (
                <Link key={id} to={`/recipes/${id}`} className="w-[140px] shrink-0 no-underline">
                  <div className="aspect-[3/4] overflow-hidden rounded-xl bg-stone-100">
                    {img ? (
                      <img src={img} alt={r.title || r.name || ''} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ChefHat size={24} className="text-stone-300" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-semibold text-stone-950">{r.title || r.name}</p>
                  {r.prep_time && <p className="text-[11px] text-stone-500">{r.prep_time} min</p>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── COMUNIDADES PARA TI ─── */}
      {recommendedCommunities.length > 0 && (
        <div className="px-4 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-stone-950">Comunidades para ti</p>
            <Link to="/communities" className="text-[13px] font-medium text-stone-500 no-underline transition-colors hover:text-stone-700 hover:underline">
              Ver todo
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {recommendedCommunities.map(c => {
              const id = c.community_id || c.id || c.slug;
              const img = c.cover_url || c.image_url || c.avatar_url;
              return (
                <Link key={id} to={`/communities/${id}`} className="w-[140px] shrink-0 no-underline">
                  <div className="aspect-square overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                    {img ? (
                      <img src={img} alt={c.name || ''} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">{c.emoji || '🍽️'}</div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-semibold text-stone-950">{c.name}</p>
                  <p className="text-[11px] text-stone-500">{c.member_count || 0} miembros</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ELITE CAROUSEL ─── */}
      <EliteCarousel />

      {/* ─── EXPLORE GRID (Instagram-style 3-col) ─── */}
      {fetchError && !loadingProducts && exploreItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-stone-300" />
          <p className="text-base font-semibold text-stone-950">Error al cargar</p>
          <p className="text-sm text-stone-500">Comprueba tu conexión e inténtalo de nuevo</p>
          <button onClick={fetchAllData} className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors">
            Reintentar
          </button>
        </div>
      ) : (loadingProducts && loadingTrending) ? (
        <SkeletonGrid />
      ) : exploreItems.length > 0 ? (
        <>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
          {exploreItems.map((item, idx) => (
            <ExploreGridItem
              key={item.product_id || item.recipe_id || item.id || idx}
              item={item}
              index={idx}
              onClick={handleItemTap}
            />
          ))}
        </div>
        {exploreItems.length >= 20 && (
          <button
            onClick={() => navigate('/products')}
            className="w-full py-3 mt-4 text-sm font-semibold text-stone-950 bg-stone-50 rounded-full hover:bg-stone-100 transition-colors"
          >
            Ver más productos
          </button>
        )}
        </>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <ShoppingBag size={32} className="mb-3 text-stone-300" />
          <p className="text-sm text-stone-400">No hay contenido disponible</p>
        </div>
      )}

      </div>{/* end max-w container */}

      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}
