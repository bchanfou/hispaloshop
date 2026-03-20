import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Star, Clock, Package, Leaf, Cookie, CupSoda, Baby, PawPrint, Crown, Users, ShoppingBag, Store, ChefHat } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useStores } from '../hooks/useStores';
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
const SECTION_SHORTCUTS = [
  { label: 'Productos', to: '/products', icon: Package },
  { label: 'Tiendas', to: '/stores', icon: Store },
  { label: 'Comunidad', to: '/community', icon: Users },
  { label: 'Recetas', to: '/recipes', icon: ChefHat },
];

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

  const { products, isLoading: loadingProducts } = useProducts({
    limit: '24',
    ...(activeCategory ? { category: activeCategory } : {}),
  });
  const { stores, isLoading: loadingStores } = useStores({ limit: 8 });

  /* ── elite carousel state ── */
  const [eliteIdx, setEliteIdx] = useState(0);
  const [eliteFading, setEliteFading] = useState(false);
  const eliteFadeTimer = useRef(null);

  /* ── fetch data ── */
  useEffect(() => {
    let active = true;

    apiClient.get('/discovery/trending', { params: { type: 'products', limit: 6 } })
      .then(data => { if (active) setTrending(Array.isArray(data) ? data.slice(0, 6) : (data?.items || data?.products || []).slice(0, 6)); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingTrending(false); });

    apiClient.get('/stores', { params: { plan: 'elite', country: userCountry, limit: 10 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.stores || [];
        if (active) setEliteStores(list);
      })
      .catch(() => {});

    apiClient.get('/recipes', { params: { sort: 'popular', limit: 6 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.recipes || [];
        if (active) setRecipes(list.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingRecipes(false); });

    return () => { active = false; };
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
    if (item._type === 'recipe') {
      navigate(`/recipes/${item.recipe_id || item.id}`);
    } else {
      navigate(`/products/${item.product_id || item.id}`);
    }
  }, [navigate]);

  /* ── category navigate ── */
  const handleCategoryClick = useCallback((slug) => {
    if (activeCategory === slug) {
      setActiveCategory(null);
    } else {
      setActiveCategory(slug);
    }
  }, [activeCategory]);

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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-square bg-stone-100 animate-pulse" />
      ))}
    </div>
  );

  /* ── render ── */
  return (
    <div className="min-h-screen bg-white pb-20">
      <SEO title="Explorar — Hispaloshop" description="Descubre productos artesanales, tiendas verificadas y recetas de la comunidad." />

      {/* ─── SEARCH BAR (sticky) ─── */}
      <div className="sticky top-0 z-20 bg-white px-3 py-2">
        <button
          onClick={() => navigate('/search')}
          aria-label="Buscar productos, tiendas, recetas"
          role="search"
          className="relative block w-full text-left"
        >
          <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <div className="flex h-9 w-full items-center rounded-full bg-stone-100 pl-10 pr-4 text-[13px] text-stone-400">
            Buscar
          </div>
        </button>
      </div>

      {/* ─── FILTER PILLS ─── */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-3 py-2 scrollbar-hide">
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

      {/* ─── SECTION SHORTCUTS ─── */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide">
        {SECTION_SHORTCUTS.map(({ label, to, icon: Icon }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-2xl bg-stone-50 py-3 transition-colors hover:bg-stone-100"
          >
            <Icon size={22} className="text-stone-500" strokeWidth={1.6} />
            <span className="text-[11px] font-medium text-stone-700">{label}</span>
          </button>
        ))}
      </div>

      {/* ─── ELITE CAROUSEL ─── */}
      <EliteCarousel />

      {/* ─── EXPLORE GRID (Instagram-style 3-col) ─── */}
      {(loadingProducts && loadingTrending) ? (
        <SkeletonGrid />
      ) : exploreItems.length > 0 ? (
        <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0.5">
          {exploreItems.map((item, idx) => (
            <ExploreGridItem
              key={item.product_id || item.recipe_id || item.id || idx}
              item={item}
              index={idx}
              onClick={handleItemTap}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-16 text-center">
          <ShoppingBag size={32} className="mb-3 text-stone-300" />
          <p className="text-sm text-stone-400">No hay contenido disponible</p>
        </div>
      )}

      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}
