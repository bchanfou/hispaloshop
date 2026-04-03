// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Package, Leaf, Cookie, CupSoda, Baby, PawPrint, Crown, ShoppingBag, AlertTriangle, ArrowRight, Bookmark, Store, ChefHat, Sun, Flame, X } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import apiClient from '../services/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { CATEGORY_GROUPS } from '../constants/categories';
import { useTranslation } from 'react-i18next';

/* ── constants ── */
const ELITE_FADE_MS = 400;

/* ── icon map for category groups ── */
const CATEGORY_ICON_MAP = {
  Leaf,
  Package,
  Cookie,
  CupSoda,
  Baby,
  PawPrint,
  Crown
};
const getCategoryIcon = iconName => CATEGORY_ICON_MAP[iconName] || Package;

/* ── Seasonal map: month (1–12) → season metadata ── */
const SEASONAL_MAP = {
  1: {
    label: 'Invierno',
    emoji: '❄️',
    tag: 'naranja'
  },
  2: {
    label: 'Carnaval',
    emoji: '🎭',
    tag: 'chocolate'
  },
  3: {
    label: 'Primavera',
    emoji: '🌸',
    tag: 'fresa'
  },
  4: {
    label: 'Semana Santa',
    emoji: '🌿',
    tag: 'bacalao'
  },
  5: {
    label: 'Mayo',
    emoji: '🌷',
    tag: 'cereza'
  },
  6: {
    label: 'Verano',
    emoji: '☀️',
    tag: 'gazpacho'
  },
  7: {
    label: 'Pleno verano',
    emoji: '🌞',
    tag: 'melocotón'
  },
  8: {
    label: 'Final de verano',
    emoji: '🍅',
    tag: 'tomate'
  },
  9: {
    label: 'Otoño',
    emoji: '🍂',
    tag: 'seta'
  },
  10: {
    label: 'Octubre',
    emoji: '🎃',
    tag: 'calabaza'
  },
  11: {
    label: 'Noviembre',
    emoji: '🌰',
    tag: 'castaña'
  },
  12: {
    label: 'Navidad',
    emoji: '🎄',
    tag: 'turrón'
  }
};

/* ── Dietary filter pills (P-05) ── */
const DIETARY_FILTERS = [{
  key: 'organic',
  label: "Ecológico"
}, {
  key: 'km0',
  label: 'KM0'
}, {
  key: 'gluten_free',
  label: 'Sin gluten'
}, {
  key: 'vegan',
  label: 'Vegano'
}, {
  key: 'artisan',
  label: 'Artesanal'
}];

/* ── loading skeleton grid ── */
function SkeletonGrid() {
  return <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
      {Array.from({
      length: 12
    }).map((_, i) => <div key={i} className="aspect-square bg-stone-100 animate-pulse" />)}
    </div>;
}

/* ── P-01: Selección del día hero card ── */
function SelectionDelDia({
  product,
  navigate
}) {
  if (!product) return null;
  const id = product.product_id || product.id;
  const img = product.images?.[0] || product.image_url;
  return <div className="px-4 pb-4">
      <button type="button" onClick={() => id && navigate(`/products/${id}`)} className="relative w-full overflow-hidden rounded-2xl bg-stone-950 cursor-pointer text-left flex h-[112px]">
        <div className="flex flex-col justify-center px-5 py-4 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sun size={11} className="text-stone-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{t('discover.seleccionDelDia', 'Selección del día')}</span>
          </div>
          <p className="text-[15px] font-bold text-white leading-snug line-clamp-2">{product.name}</p>
          {product.price != null && <p className="mt-1.5 text-[13px] font-semibold text-stone-300">
              {typeof product.display_price === 'string' ? product.display_price : `${Number(product.price).toFixed(2)} €`}
            </p>}
        </div>
        {img && <div className="w-[112px] h-[112px] shrink-0 overflow-hidden">
            <img src={img} alt={product.name || ''} className="w-full h-full object-cover" loading="lazy" />
          </div>}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent to-black/10" />
      </button>
    </div>;
}

/* ── P-07: Limited stock horizontal strip ── */
function LimitedStockStrip({
  products,
  navigate
}) {
  if (!products || products.length === 0) return null;
  return <div className="px-4 pb-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Flame size={14} className="text-stone-950" />
        <p className="text-[13px] font-bold text-stone-950">Últimas unidades</p>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide">
        {products.map(p => {
        const id = p.product_id || p.id;
        const img = p.images?.[0] || p.image_url;
        if (!id) return null;
        return <button key={id} type="button" onClick={() => navigate(`/products/${id}`)} className="w-[100px] shrink-0 text-left">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
                {img ? <img src={img} alt={p.name || ''} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag size={18} className="text-stone-300" />
                  </div>}
                {p.stock != null && p.stock <= 5 && <span className="absolute bottom-1 left-1 right-1 text-center text-[9px] font-bold bg-stone-950 text-white rounded-full py-0.5 leading-none px-1">
                    {p.stock} {p.stock === 1 ? 'unidad' : 'unidades'}
                  </span>}
              </div>
              <p className="mt-1 truncate text-[12px] font-semibold text-stone-950 leading-tight">{p.name}</p>
              {p.price != null && <p className="text-[12px] font-bold text-stone-950">
                  {typeof p.display_price === 'string' ? p.display_price : `${Number(p.price).toFixed(2)} €`}
                </p>}
            </button>;
      })}
      </div>
    </div>;
}

/* ── Elite carousel ── */
function EliteCarousel({
  eliteStores,
  eliteIdx,
  eliteFading,
  goToElite,
  navigate
}) {
  if (eliteStores.length === 0) return null;
  const store = eliteStores[eliteIdx];
  const heroImg = store.hero_image || store.cover_image || store.logo;
  const fadeStyle = {
    opacity: eliteFading ? 0 : 1,
    transition: `opacity ${ELITE_FADE_MS}ms ease`
  };
  const storeUrl = store.slug || store.store_slug || store.store_id || store.id;
  return <div className="mx-4 mb-4">
      <div role="link" tabIndex={0} aria-label={`Tienda destacada: ${store.name}`} onClick={() => storeUrl && navigate(`/store/${storeUrl}`)} onKeyDown={e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        storeUrl && navigate(`/store/${storeUrl}`);
      }
    }} className="relative aspect-video cursor-pointer overflow-hidden rounded-2xl bg-stone-950 outline-none">
        {heroImg && <img src={heroImg} alt={store.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" style={fadeStyle} />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-5 py-4" style={fadeStyle}>
          <div className="mb-1.5 flex items-center gap-2.5">
            {store.logo && <img src={store.logo} alt="" className="h-9 w-9 rounded-full border-2 border-white/30 object-cover" />}
            <div>
              <p className="text-base font-semibold text-white">{store.name}</p>
              {store.location && <p className="flex items-center gap-1 text-[11px] text-white/70">
                  <MapPin size={10} /> {store.location}
                </p>}
            </div>
          </div>
          {store.tagline && <p className="text-xs leading-relaxed text-white/80">{store.tagline}</p>}
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/80 backdrop-blur-md">
          Destacado
        </span>
        {storeUrl && <button type="button" onClick={e => {
        e.stopPropagation();
        navigate(`/store/${storeUrl}`);
      }} className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-stone-950 backdrop-blur-sm transition-colors hover:bg-white" style={fadeStyle}>
            Ver tienda <ArrowRight size={14} />
          </button>}
      </div>

      {eliteStores.length > 1 && <div role="tablist" aria-label="Tiendas destacadas" className="mt-2 flex justify-center gap-1.5">
          {eliteStores.map((s, i) => <button key={s.store_id || s.id || i} role="tab" aria-selected={i === eliteIdx} aria-label={`Tienda ${i + 1}: ${s.name || ''}`} onClick={e => {
        e.stopPropagation();
        goToElite(i);
      }} className="flex h-8 w-8 items-center justify-center">
              <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === eliteIdx ? 'w-4 bg-stone-950' : 'w-1.5 bg-stone-300'}`} />
            </button>)}
        </div>}
    </div>;
}

/* ── Explore grid item ── */
function ExploreGridItem({
  item,
  index,
  onClick
}) {
  const img = item.images?.[0] || item.image_url || item.cover_image || null;
  const isLarge = index % 5 === 0;
  return <motion.button type="button" onClick={() => onClick(item)} initial={{
    opacity: 0,
    y: 20
  }} whileInView={{
    opacity: 1,
    y: 0
  }} viewport={{
    once: true
  }} transition={{
    duration: 0.35,
    delay: index < 12 ? index * 0.05 : 0
  }} className={`relative overflow-hidden bg-stone-100 ${isLarge ? 'row-span-2' : ''}`} style={{
    aspectRatio: isLarge ? undefined : '1/1'
  }}>
      {img ? <img src={img} alt={item.name || item.title || ''} loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center">
          <ShoppingBag size={24} className="text-stone-300" />
        </div>}
    </motion.button>;
}

/* ══════════════════════════════════════════
   DiscoverPage
   ══════════════════════════════════════════ */

export default function DiscoverPage() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    country
  } = useLocale?.() || {};
  const userCountry = user?.country || country || 'ES';

  /* ── ui states ── */
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeDietary, setActiveDietary] = useState(null); // P-05
  const [showProductsOnly, setShowProductsOnly] = useState(false); // P-14

  /* ── search states (P-04) ── */
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchTimerRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  /* ── data states ── */
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [eliteStores, setEliteStores] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [fetchError, setFetchError] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [recommendedStores, setRecommendedStores] = useState([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState([]);
  const [recommendedCommunities, setRecommendedCommunities] = useState([]);
  const [limitedStockProducts, setLimitedStockProducts] = useState([]); // P-07
  const [seasonalProducts, setSeasonalProducts] = useState([]); // P-03

  /* ── seasonal metadata ── */
  const currentMonth = new Date().getMonth() + 1;
  const seasonal = SEASONAL_MAP[currentMonth];

  /* ── products from hook (category + dietary filter) ── */
  const {
    products,
    isLoading: loadingProducts
  } = useProducts({
    limit: '24',
    ...(activeCategory ? {
      category: activeCategory
    } : {}),
    ...(activeDietary ? {
      certifications: activeDietary
    } : {})
  });

  /* ── elite carousel state ── */
  const [eliteIdx, setEliteIdx] = useState(0);
  const [eliteFading, setEliteFading] = useState(false);
  const eliteFadeTimer = useRef(null);

  /* ── fetch all data ── */
  const fetchAllData = useCallback(() => {
    setLoadingTrending(true);
    setFetchError(false);
    apiClient.get('/discovery/explore').then(data => {
      if (data?.trending_products?.length) setRecommendedProducts(prev => prev.length ? prev : data.trending_products.slice(0, 6));
      if (data?.growing_recipes?.length) setRecipes(prev => prev.length ? prev : data.growing_recipes.slice(0, 6));
    }).catch(() => {
      setFetchError(true);
    }).finally(() => {
      setLoadingTrending(false);
    });
    apiClient.get('/stores', {
      params: {
        plan: 'elite',
        country: userCountry,
        limit: 10
      }
    }).then(data => {
      setEliteStores(Array.isArray(data) ? data : data?.stores || []);
    }).catch(() => {});
    apiClient.get('/discovery/recommended', {
      params: {
        limit: 6
      }
    }).then(data => {
      const list = Array.isArray(data) ? data : data?.products || data?.items || [];
      setRecommendedProducts(list.slice(0, 6));
    }).catch(() => {
      apiClient.get('/products', {
        params: {
          recommended: true,
          limit: 6
        }
      }).then(data => {
        setRecommendedProducts((Array.isArray(data) ? data : data?.products || []).slice(0, 6));
      }).catch(() => {});
    });
    apiClient.get('/recipes', {
      params: {
        sort: 'popular',
        limit: 6
      }
    }).then(data => {
      setRecipes((Array.isArray(data) ? data : data?.recipes || []).slice(0, 6));
    }).catch(() => {});
    apiClient.get('/stores', {
      params: {
        sort: 'popular',
        limit: 6
      }
    }).then(data => {
      setRecommendedStores((Array.isArray(data) ? data : data?.stores || []).slice(0, 6));
    }).catch(() => {});
    apiClient.get('/recipes', {
      params: {
        sort: 'newest',
        limit: 6
      }
    }).then(data => {
      setRecommendedRecipes((Array.isArray(data) ? data : data?.recipes || []).slice(0, 6));
    }).catch(() => {});
    apiClient.get('/communities', {
      params: {
        sort: 'popular',
        limit: 6
      }
    }).then(data => {
      setRecommendedCommunities((Array.isArray(data) ? data : data?.communities || []).slice(0, 6));
    }).catch(() => {});

    /* P-07 — limited stock */
    apiClient.get('/products', {
      params: {
        low_stock: true,
        limit: 8
      }
    }).then(data => {
      setLimitedStockProducts((Array.isArray(data) ? data : data?.products || []).slice(0, 8));
    }).catch(() => {});

    /* P-03 — seasonal */
    if (seasonal?.tag) {
      apiClient.get('/products', {
        params: {
          search: seasonal.tag,
          limit: 8
        }
      }).then(data => {
        setSeasonalProducts((Array.isArray(data) ? data : data?.products || []).slice(0, 8));
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCountry]);
  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCountry, user?.user_id]);

  /* ── P-04: debounced inline search ── */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.get('/discovery/search', {
          params: {
            q: searchQuery,
            limit: 5
          }
        });
        // /discovery/search returns { products: [], recipes: [], stores: [], creators: [] }
        const items = [...(res?.products || []).map(p => ({
          ...p,
          _type: 'product'
        })), ...(res?.recipes || []).map(r => ({
          ...r,
          _type: 'recipe'
        })), ...(res?.stores || []).map(s => ({
          ...s,
          _type: 'store'
        })), ...(res?.creators || []).map(c => ({
          ...c,
          _type: 'creator'
        }))];
        setSearchResults(items.slice(0, 8));
      } catch {
        // Fallback to /products?search=
        try {
          const res2 = await apiClient.get('/products', {
            params: {
              search: searchQuery,
              limit: 5
            }
          });
          const items = Array.isArray(res2) ? res2 : res2?.products || [];
          setSearchResults(items.slice(0, 5));
        } catch {
          setSearchResults([]);
        }
      }
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]);

  /* click outside search container → close dropdown */
  useEffect(() => {
    const handlePointerDown = e => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  /* ── elite index guard ── */
  useEffect(() => {
    if (eliteStores.length > 0 && eliteIdx >= eliteStores.length) setEliteIdx(0);
  }, [eliteStores.length, eliteIdx]);

  /* ── elite manual advance ── */
  const goToElite = useCallback(idx => {
    if (idx === eliteIdx) return;
    setEliteFading(true);
    eliteFadeTimer.current = setTimeout(() => {
      setEliteIdx(idx);
      setEliteFading(false);
    }, ELITE_FADE_MS);
  }, [eliteIdx]);
  useEffect(() => {
    return () => {
      clearTimeout(eliteFadeTimer.current);
    };
  }, []);

  /* ── elite auto-rotation ── */
  useEffect(() => {
    if (eliteStores.length <= 1) return;
    const interval = setInterval(() => {
      setEliteFading(true);
      eliteFadeTimer.current = setTimeout(() => {
        setEliteIdx(prev => (prev + 1) % eliteStores.length);
        setEliteFading(false);
      }, ELITE_FADE_MS);
    }, 3000);
    return () => {
      clearInterval(interval);
      clearTimeout(eliteFadeTimer.current);
    };
  }, [eliteStores.length]);

  /* ── P-01: selección del día (deterministic, rotates daily) ── */
  const selectionDelDia = useMemo(() => {
    if (!recommendedProducts.length) return null;
    const start = new Date(new Date().getFullYear(), 0, 0).getTime();
    const dayOfYear = Math.floor((Date.now() - start) / 86_400_000);
    return recommendedProducts[dayOfYear % recommendedProducts.length];
  }, [recommendedProducts]);

  /* ── build explore grid items ── */
  const exploreItems = useMemo(() => {
    const items = [];
    const allProducts = products || [];
    const allRecipes = recipes || [];
    let pIdx = 0,
      rIdx = 0;
    while (pIdx < allProducts.length || rIdx < allRecipes.length) {
      for (let i = 0; i < 4 && pIdx < allProducts.length; i++) {
        items.push({
          ...allProducts[pIdx],
          _type: 'product'
        });
        pIdx++;
      }
      if (rIdx < allRecipes.length) {
        items.push({
          ...allRecipes[rIdx],
          _type: 'recipe'
        });
        rIdx++;
      }
    }
    return items;
  }, [products, recipes]);

  /* ── P-14: filtered explore items ── */
  const filteredExploreItems = useMemo(() => {
    if (showProductsOnly) return exploreItems.filter(i => i._type !== 'recipe');
    return exploreItems;
  }, [exploreItems, showProductsOnly]);

  /* ── handle explore item tap ── */
  const handleItemTap = useCallback(item => {
    if (!item) return;
    const recipeId = item.recipe_id;
    const productId = item.product_id || item.id;
    if (!recipeId && !productId && !item?.post_id) return;
    if (item._type === 'recipe' && recipeId) {
      navigate(`/recipes/${recipeId}`);
    } else if (productId) {
      navigate(`/products/${productId}`);
    }
  }, [navigate]);

  /* ── category filter toggle ── */
  const handleCategoryClick = useCallback(slug => {
    setActiveCategory(prev => prev === slug ? null : slug);
  }, []);

  /* ── dietary filter toggle (P-05) ── */
  const handleDietaryClick = useCallback(key => {
    setActiveDietary(prev => prev === key ? null : key);
  }, []);

  /* ── render ── */
  return <div className="min-h-screen bg-white pb-20">
      <SEO title="Explorar — Hispaloshop" description={t('discover.descubreProductosArtesanalesTiendas', 'Descubre productos artesanales, tiendas verificadas y recetas de la comunidad.')} />
      <div className="mx-auto max-w-[1100px]">

      {/* ─── SEARCH BAR (sticky, P-04: inline with autocomplete) ─── */}
      <div className="sticky top-0 z-20 bg-white px-3 py-2 flex items-center gap-2">
        <div ref={searchContainerRef} className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 z-10 pointer-events-none" />
          <input ref={searchInputRef} type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => setSearchFocused(true)} placeholder="Buscar productos, tiendas, recetas..." className="h-9 w-full rounded-full bg-stone-100 pl-10 pr-8 text-[13px] text-stone-950 placeholder:text-stone-400 outline-none border-none" />
          {searchQuery && <button type="button" onClick={() => {
            setSearchQuery('');
            setSearchResults([]);
            searchInputRef.current?.focus();
          }} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 flex items-center justify-center">
              <X size={14} />
            </button>}

          {/* ── Autocomplete dropdown ── */}
          <AnimatePresence>
            {searchFocused && searchQuery.trim().length > 0 && <motion.div initial={{
              opacity: 0,
              y: -4
            }} animate={{
              opacity: 1,
              y: 0
            }} exit={{
              opacity: 0,
              y: -4
            }} transition={{
              duration: 0.15
            }} className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-50">
                {searchResults.length === 0 ? <div className="px-4 py-3.5 text-[13px] text-stone-400">Buscando…</div> : <>
                    {searchResults.map((r, idx) => {
                  const type = r._type || 'product';
                  const id = type === 'recipe' ? r.recipe_id || r.id : type === 'store' ? r.slug || r.store_id || r.id : type === 'creator' ? r.username || r.user_id || r.id : r.product_id || r.id;
                  const img = r.images?.[0] || r.image_url || r.logo || r.profile_image;
                  const label = type === 'recipe' ? 'Receta' : type === 'store' ? 'Tienda' : type === 'creator' ? r.role || 'Creador' : null;
                  const route = type === 'recipe' ? `/recipes/${r.recipe_id || r.id}` : type === 'store' ? `/store/${r.slug || r.store_id}` : type === 'creator' ? `/${r.username || r.user_id}` : `/products/${r.product_id || r.id}`;
                  return <button key={`${type}-${id || idx}`} type="button" onPointerDown={() => {
                    navigate(route);
                    setSearchFocused(false);
                    setSearchQuery('');
                  }} className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-stone-50 transition-colors">
                          {img ? <img src={img} alt="" className={`w-8 h-8 object-cover shrink-0 ${type === 'creator' ? 'rounded-full' : 'rounded-lg'}`} /> : <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                              <ShoppingBag size={14} className="text-stone-300" />
                            </div>}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-stone-950 truncate">{r.name || r.title}</p>
                            <p className="text-[11px] text-stone-400">
                              {r.price != null ? `${Number(r.price).toFixed(2)} €` : label || ''}
                            </p>
                          </div>
                        </button>;
                })}
                    <button type="button" onPointerDown={() => {
                  navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                  setSearchFocused(false);
                }} className="flex items-center gap-2 px-4 py-3 w-full text-left border-t border-stone-100 hover:bg-stone-50 transition-colors">
                      <Search size={14} className="text-stone-400 shrink-0" />
                      <span className="text-[13px] font-medium text-stone-700 truncate">
                        Ver todos los resultados de &ldquo;{searchQuery}&rdquo;
                      </span>
                    </button>
                  </>}
              </motion.div>}
          </AnimatePresence>
        </div>

        <button onClick={() => navigate('/saved')} aria-label="Guardados" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200">
          <Bookmark size={18} />
        </button>
      </div>

      {/* ─── CATEGORY FILTER PILLS ─── */}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-3 py-2 scrollbar-hide lg:flex-wrap lg:overflow-x-visible">
        {CATEGORY_GROUPS.map(grp => {
          const Icon = getCategoryIcon(grp.icon);
          const isActive = activeCategory === grp.slug;
          return <button key={grp.slug} onClick={() => handleCategoryClick(grp.slug)} className={`relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap snap-center ${isActive ? '' : 'bg-stone-100'}`}>
              {isActive && <motion.div layoutId="discover-pill" className="absolute inset-0 rounded-full bg-stone-950" transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300
            }} />}
              <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${isActive ? 'text-white' : 'text-stone-700'}`}>
                <Icon size={14} /> {grp.label}
              </span>
            </button>;
        })}
      </div>

      {/* ─── P-05: DIETARY FILTER PILLS ─── */}
      <div className="flex gap-2 overflow-x-auto px-3 pb-2 scrollbar-hide">
        {DIETARY_FILTERS.map(f => {
          const isActive = activeDietary === f.key;
          return <button key={f.key} onClick={() => handleDietaryClick(f.key)} className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-medium whitespace-nowrap transition-colors ${isActive ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>
              {f.label}
            </button>;
        })}
      </div>

      {/* ─── P-01: SELECCIÓN DEL DÍA ─── */}
      {selectionDelDia && <SelectionDelDia product={selectionDelDia} navigate={navigate} />}

      {/* ─── PARA TI — Personalized row ─── */}
      {recommendedProducts.length > 0 && <div className="px-4 pb-4">
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
            return <Link key={id} to={`/products/${id}`} className="w-[140px] shrink-0 no-underline">
                  <div className="aspect-square overflow-hidden rounded-xl bg-stone-100">
                    {img ? <img src={img} alt={p.name || ''} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag size={20} className="text-stone-300" />
                      </div>}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium text-stone-950">{p.name}</p>
                  {p.price != null && <p className="text-[13px] font-bold text-stone-950">{typeof p.display_price === 'string' ? p.display_price : `${(p.price || 0).toFixed(2)} €`}</p>}
                </Link>;
          })}
          </div>
        </div>}

      {/* ─── P-03: DE TEMPORADA ─── */}
      {seasonal && seasonalProducts.length > 0 && <div className="px-4 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-stone-950">
              De temporada — {seasonal.label} {seasonal.emoji}
            </p>
            <Link to={`/products?search=${encodeURIComponent(seasonal.tag)}`} className="text-[13px] font-medium text-stone-500 no-underline transition-colors hover:text-stone-700 hover:underline">
              Ver todo
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {seasonalProducts.map(p => {
            const img = p.images?.[0] || p.image_url;
            const id = p.product_id || p.id;
            if (!id) return null;
            return <Link key={id} to={`/products/${id}`} className="w-[140px] shrink-0 no-underline">
                  <div className="aspect-square overflow-hidden rounded-xl bg-stone-100">
                    {img ? <img src={img} alt={p.name || ''} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag size={20} className="text-stone-300" />
                      </div>}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-medium text-stone-950">{p.name}</p>
                  {p.price != null && <p className="text-[13px] font-bold text-stone-950">{typeof p.display_price === 'string' ? p.display_price : `${Number(p.price).toFixed(2)} €`}</p>}
                </Link>;
          })}
          </div>
        </div>}

      {/* ─── P-07: STOCK LIMITADO ─── */}
      <LimitedStockStrip products={limitedStockProducts} navigate={navigate} />

      {/* ─── TIENDAS PARA TI ─── */}
      {recommendedStores.length > 0 && <div className="px-4 pb-4">
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
            if (!id) return null;
            return <Link key={id} to={`/store/${id}`} className="w-[140px] shrink-0 no-underline">
                  <div className="aspect-square overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                    {img ? <img src={img} alt={s.name || ''} loading="lazy" className="h-full w-full object-cover" /> : <Store size={24} className="text-stone-300" />}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-semibold text-stone-950">{s.name || s.store_name}</p>
                  <p className="text-[11px] text-stone-500">{s.product_count || 0} productos</p>
                </Link>;
          })}
          </div>
        </div>}

      {/* ─── RECETAS PARA TI ─── */}
      {recommendedRecipes.length > 0 && <div className="px-4 pb-4">
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
            return <Link key={id} to={`/recipes/${id}`} className="w-[140px] shrink-0 no-underline">
                  <div className="aspect-[3/4] overflow-hidden rounded-xl bg-stone-100">
                    {img ? <img src={img} alt={r.title || r.name || ''} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center">
                        <ChefHat size={24} className="text-stone-300" />
                      </div>}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-semibold text-stone-950">{r.title || r.name}</p>
                  {r.prep_time && <p className="text-[11px] text-stone-500">{r.prep_time} min</p>}
                </Link>;
          })}
          </div>
        </div>}

      {/* ─── COMUNIDADES PARA TI ─── */}
      {recommendedCommunities.length > 0 && <div className="px-4 pb-4">
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
            if (!id) return null;
            return <Link key={id} to={`/communities/${id}`} className="w-[140px] shrink-0 no-underline">
                  <div className="aspect-square overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                    {img ? <img src={img} alt={c.name || ''} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl">{c.emoji || '🍽️'}</div>}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] font-semibold text-stone-950">{c.name}</p>
                  <p className="text-[11px] text-stone-500">{c.member_count || 0} miembros</p>
                </Link>;
          })}
          </div>
        </div>}

      {/* ─── P-02: EDITORIAL COLLECTIONS LINK ─── */}
      <div className="px-4 pb-4">
        <Link to="/collections" className="flex items-center justify-between rounded-2xl bg-stone-950 px-5 py-4 no-underline group">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Editorial</p>
            <p className="text-[15px] font-bold text-white">Colecciones curadas</p>
            <p className="text-[12px] text-stone-400 mt-0.5">{t('discover.seleccionesDeProductosConHistoria', 'Selecciones de productos con historia')}</p>
          </div>
          <ArrowRight size={18} className="text-stone-400 group-hover:text-white transition-colors shrink-0" />
        </Link>
      </div>

      {/* ─── ELITE CAROUSEL ─── */}
      <EliteCarousel eliteStores={eliteStores} eliteIdx={eliteIdx} eliteFading={eliteFading} goToElite={goToElite} navigate={navigate} />

      {/* ─── EXPLORE GRID ─── */}
      {fetchError && !loadingProducts && filteredExploreItems.length === 0 ? <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="w-10 h-10 text-stone-300" />
          <p className="text-base font-semibold text-stone-950">Error al cargar</p>
          <p className="text-sm text-stone-500">{t('products.compruebaTuConexionEIntentaloDeNue', 'Comprueba tu conexión e inténtalo de nuevo')}</p>
          <button onClick={fetchAllData} className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors border-none cursor-pointer">
            Reintentar
          </button>
        </div> : loadingProducts && loadingTrending ? <SkeletonGrid /> : filteredExploreItems.length > 0 ? <>
          {/* P-14: products-only toggle */}
          <div className="flex items-center justify-between px-4 pb-2">
            <p className="text-[13px] font-bold text-stone-950">Explorar</p>
            <button onClick={() => setShowProductsOnly(prev => !prev)} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${showProductsOnly ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'}`}>
              <Package size={12} />
              Solo productos
            </button>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
            {filteredExploreItems.map((item, idx) => <ExploreGridItem key={item.product_id || item.recipe_id || item.id || idx} item={item} index={idx} onClick={handleItemTap} />)}
          </div>
          {filteredExploreItems.length >= 20 && <button onClick={() => navigate('/products')} className="w-full py-3 mt-4 text-sm font-semibold text-stone-950 bg-stone-50 rounded-full hover:bg-stone-100 transition-colors border-none cursor-pointer">
              Ver más productos
            </button>}
        </> : <div className="flex flex-col items-center py-16 text-center">
          <ShoppingBag size={32} className="mb-3 text-stone-300" />
          <p className="text-sm text-stone-400">No hay contenido disponible</p>
        </div>}

      </div>{/* end max-w container */}
    </div>;
}