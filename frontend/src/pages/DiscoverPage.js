import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Star, Clock } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useStores } from '../hooks/useStores';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import apiClient from '../services/api/client';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import { CATEGORY_GROUPS } from '../constants/categories';
import { toast } from 'sonner';

/* ── constants ── */

const SECTION_PILLS = [
  { id: 'products', emoji: '📦', label: 'Productos', to: '/products' },
  { id: 'stores', emoji: '🏪', label: 'Tiendas', to: '/stores' },
  { id: 'recipes', emoji: '🍳', label: 'Recetas', to: '/recipes' },
  { id: 'communities', emoji: '👥', label: 'Comunidad', to: '/communities' },
];

const DIFFICULTY_MAP = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };

const ELITE_ROTATE_MS = 6000;
const ELITE_FADE_MS = 400;

/* ── pill classes ── */
const pillCls = (active) =>
  `flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
    active
      ? 'border-stone-950 bg-stone-950 text-white'
      : 'border-stone-200 bg-white text-stone-950'
  }`;

/* ══════════════════════════════════════════
   DiscoverPage
   ══════════════════════════════════════════ */

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country } = useLocale?.() || {};
  const userCountry = user?.country || country || 'ES';

  /* ── data states ── */
  const [trending, setTrending] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [eliteStores, setEliteStores] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());

  const { products, isLoading: loadingProducts } = useProducts({ limit: '12' });
  const { stores, isLoading: loadingStores } = useStores({});

  const isB2BUser = user?.role === 'producer' || user?.role === 'importer';

  /* ── elite carousel state ── */
  const [eliteIdx, setEliteIdx] = useState(0);
  const [eliteFading, setEliteFading] = useState(false);
  const eliteTimer = useRef(null);
  const eliteFadeTimer = useRef(null);
  const elitePaused = useRef(false);

  /* ── fetch data ── */
  useEffect(() => {
    let active = true;

    apiClient.get('/discovery/trending', { params: { type: 'products', limit: 4 } })
      .then(data => { if (active) setTrending(Array.isArray(data) ? data.slice(0, 4) : data?.products?.slice(0, 4) || []); })
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

    if (user) {
      apiClient.get('/discovery/suggested-users', { params: { limit: 3 } })
        .then(data => {
          const list = Array.isArray(data) ? data : data?.users || [];
          if (active) setSuggestedUsers(list.slice(0, 3));
        })
        .catch(() => {});
    }

    return () => { active = false; };
  }, [userCountry, user]);

  /* ── elite auto-rotate ── */
  const advanceElite = useCallback(() => {
    if (eliteStores.length <= 1) return;
    setEliteFading(true);
    eliteFadeTimer.current = setTimeout(() => {
      setEliteIdx(prev => (prev + 1) % eliteStores.length);
      setEliteFading(false);
    }, ELITE_FADE_MS);
  }, [eliteStores.length]);

  useEffect(() => {
    if (eliteStores.length <= 1) return;
    const tick = () => { if (!elitePaused.current) advanceElite(); };
    eliteTimer.current = setInterval(tick, ELITE_ROTATE_MS);
    return () => {
      clearInterval(eliteTimer.current);
      clearTimeout(eliteFadeTimer.current);
    };
  }, [eliteStores.length, advanceElite]);

  /* ── follow toggle ── */
  const toggleFollow = useCallback(async (userId) => {
    if (!user) { navigate('/login'); return; }
    const isFollowing = followingIds.has(userId);
    try {
      if (isFollowing) {
        await apiClient.delete(`/users/${userId}/follow`);
        setFollowingIds(prev => { const s = new Set(prev); s.delete(userId); return s; });
      } else {
        await apiClient.post(`/users/${userId}/follow`);
        setFollowingIds(prev => new Set(prev).add(userId));
      }
    } catch {
      toast.error('Error al actualizar');
    }
  }, [user, followingIds, navigate]);

  /* ── sponsored product injection (memoized) ── */
  const productGrid = useMemo(() => {
    if (loadingProducts || !products || !products.length) return [];
    const eliteIds = new Set(eliteStores.map(s => s.producer_id || s.user_id));
    const sponsored = products.filter(p => eliteIds.has(p.producer_id));
    const regular = products.filter(p => !eliteIds.has(p.producer_id));
    const grid = [];
    let regIdx = 0;
    let sponIdx = 0;
    for (let i = 0; i < 4 && regIdx < regular.length; i++) grid.push({ ...regular[regIdx++], _sponsored: false });
    if (sponIdx < sponsored.length) grid.push({ ...sponsored[sponIdx++], _sponsored: true });
    while (regIdx < regular.length) {
      grid.push({ ...regular[regIdx++], _sponsored: false });
      if ((grid.length % 13 === 0) && sponIdx < sponsored.length) grid.push({ ...sponsored[sponIdx++], _sponsored: true });
    }
    return grid;
  }, [loadingProducts, products, eliteStores]);

  /* ── render ── */
  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <SEO title="Explorar — Hispaloshop" description="Descubre productos artesanales, tiendas verificadas y recetas de la comunidad." />

      <div className="px-4 pt-3">

        {/* ─── SEARCH BAR ─── */}
        <button
          onClick={() => navigate('/search')}
          aria-label="Buscar productos, tiendas, recetas"
          role="search"
          className="relative mb-4 block w-full text-left"
        >
          <Search size={18} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <div className="flex h-11 w-full items-center rounded-full border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-500">
            Buscar productos, tiendas, recetas…
          </div>
        </button>

        {/* ─── SECTION PILLS ─── */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {SECTION_PILLS.map(pill => (
            <button key={pill.id} onClick={() => navigate(pill.to)} className={pillCls(false)}>
              {pill.emoji} {pill.label}
            </button>
          ))}
          {isB2BUser && (
            <button onClick={() => navigate('/b2b/catalog')} className={pillCls(false)}>
              📋 Catálogo B2B
            </button>
          )}
        </div>

        {/* ─── ① TENDENCIAS HOY ─── */}
        <div className="mb-6">
          <span className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-stone-500">Tendencias hoy</span>
          {loadingTrending ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                  <div className="aspect-square animate-pulse bg-stone-100" />
                  <div className="p-3">
                    <div className="mb-1.5 h-3 w-[70%] animate-pulse rounded bg-stone-100" />
                    <div className="h-2.5 w-[40%] animate-pulse rounded bg-stone-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : trending.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {trending.map(p => (
                <ProductCard key={p.product_id || p.id} product={p} />
              ))}
            </div>
          ) : (
            !loadingProducts && products.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
                {products.slice(0, 4).map(p => (
                  <ProductCard key={p.product_id || p.id} product={p} />
                ))}
              </div>
            )
          )}
        </div>

        {/* ─── ② DESTACADO ELITE (auto-rotate) ─── */}
        {eliteStores.length > 0 && (() => {
          const store = eliteStores[eliteIdx];
          const heroImg = store.hero_image || store.cover_image || store.logo;
          const fadeStyle = { opacity: eliteFading ? 0 : 1, transition: `opacity ${ELITE_FADE_MS}ms ease` };
          return (
            <div className="mb-6">
              <div
                role="link"
                tabIndex={0}
                aria-label={`Tienda destacada: ${store.name}`}
                onMouseEnter={() => { elitePaused.current = true; }}
                onMouseLeave={() => { elitePaused.current = false; }}
                onTouchStart={() => { elitePaused.current = true; }}
                onTouchEnd={() => { elitePaused.current = false; }}
                onClick={() => navigate(`/store/${store.slug || store.store_slug}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/store/${store.slug || store.store_slug}`); } }}
                className="relative aspect-video cursor-pointer overflow-hidden rounded-xl bg-stone-950 outline-none"
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
                  Destacado ✦
                </span>
              </div>

              {eliteStores.length > 1 && (
                <div role="tablist" aria-label="Tiendas destacadas" className="mt-2.5 flex justify-center gap-1.5">
                  {eliteStores.map((s, i) => (
                    <button
                      key={s.store_id || s.id || i}
                      role="tab"
                      aria-selected={i === eliteIdx}
                      aria-label={`Tienda ${i + 1}: ${s.name || ''}`}
                      onClick={(e) => { e.stopPropagation(); setEliteIdx(i); }}
                      className="flex h-11 w-11 items-center justify-center"
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
        })()}

        {/* ─── ③ CATEGORÍAS ─── */}
        <div className="mb-6">
          <span className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-stone-500">Categorías</span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORY_GROUPS.map(grp => (
              <button key={grp.slug} onClick={() => navigate(`/explore/category/${grp.slug}`)} className={pillCls(false)}>
                {grp.emoji} {grp.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── ④ TIENDAS QUE TE GUSTARÁN ─── */}
        {!loadingStores && stores.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Tiendas que te gustarán</span>
              <Link to="/stores" className="flex items-center gap-0.5 text-[11px] font-medium text-stone-500 no-underline">Ver todas <ChevronRight size={14} /></Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {stores.slice(0, 8).map(store => {
                const slug = store.slug || store.store_slug;
                const hero = store.hero_image || store.logo;
                return (
                  <Link
                    key={store.id || store.store_id || slug}
                    to={`/store/${slug}`}
                    className="w-[180px] shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white no-underline"
                  >
                    <div className="relative h-[90px] bg-stone-100">
                      {hero && <img src={hero} alt={store.name || ''} loading="lazy" className="h-full w-full object-cover" />}
                      {store.logo && (
                        <img src={store.logo} alt={`Logo de ${store.name || 'tienda'}`} className="absolute -bottom-4 left-3 h-9 w-9 rounded-full border-2 border-white object-cover" />
                      )}
                    </div>
                    <div className="px-3 pb-3 pt-5">
                      <p className="text-[13px] font-semibold text-stone-950">{store.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500">
                        <MapPin size={10} /> {store.location || 'España'}
                      </p>
                      {store.rating > 0 && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500">
                          <Star size={10} className="fill-stone-950 text-stone-950" />
                          {store.rating?.toFixed?.(1) || store.rating}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ⑤ RECETAS POPULARES ─── */}
        {!loadingRecipes && recipes.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Recetas populares</span>
              <Link to="/recipes" className="flex items-center gap-0.5 text-[11px] font-medium text-stone-500 no-underline">Ver todas <ChevronRight size={14} /></Link>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {recipes.map(recipe => {
                const img = recipe.image_url || recipe.cover_image || (recipe.images && recipe.images[0]);
                const diff = recipe.difficulty || 'easy';
                return (
                  <Link
                    key={recipe.recipe_id || recipe.id || recipe._id}
                    to={`/recipes/${recipe.recipe_id || recipe.id || recipe._id}`}
                    className="w-40 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white no-underline"
                  >
                    <div className="relative aspect-[3/4] bg-stone-100">
                      {img && <img src={img} alt={recipe.title || recipe.name || ''} loading="lazy" className="h-full w-full object-cover" />}
                      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-stone-500 backdrop-blur-sm">
                        {DIFFICULTY_MAP[diff] || diff}
                      </span>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="truncate text-[13px] font-medium text-stone-950">{recipe.title || recipe.name}</p>
                      {recipe.prep_time_minutes != null && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-stone-500">
                          <Clock size={10} /> {recipe.prep_time_minutes || recipe.prep_time} min
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── ⑥ PRODUCTOS PARA TI (grid with sponsored) ─── */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Productos para ti</span>
            <Link to="/products" className="flex items-center gap-0.5 text-[11px] font-medium text-stone-500 no-underline">Ver todos <ChevronRight size={14} /></Link>
          </div>
          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                  <div className="aspect-square animate-pulse bg-stone-100" />
                  <div className="p-3">
                    <div className="mb-1.5 h-3 w-[70%] animate-pulse rounded bg-stone-100" />
                    <div className="h-2.5 w-[40%] animate-pulse rounded bg-stone-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
              {productGrid.map((product, idx) => (
                <div key={product.product_id || product.id || idx} className="relative">
                  <ProductCard product={product} />
                  {product._sponsored && (
                    <span className="absolute right-2 top-2 z-[2] rounded-full bg-white/85 px-2 py-0.5 text-[9px] font-medium tracking-wide text-stone-500 backdrop-blur-sm">
                      Patrocinado
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── ⑦ CREADORES A SEGUIR ─── */}
        {suggestedUsers.length > 0 && (
          <div className="mb-8">
            <span className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-stone-500">Creadores a seguir</span>
            <div className="flex flex-col gap-3">
              {suggestedUsers.map(u => {
                const uid = u.user_id || u.id;
                const isFollowing = followingIds.has(uid);
                return (
                  <div key={uid} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <Link to={`/user/${uid}`} className="shrink-0">
                      <img
                        src={u.profile_image || '/default-avatar.png'}
                        alt={u.name} loading="lazy"
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    </Link>
                    <Link to={`/user/${uid}`} className="min-w-0 flex-1 no-underline">
                      <p className="text-sm font-semibold text-stone-950">{u.name}</p>
                      <p className="mt-px truncate text-xs text-stone-500">{u.bio || `@${u.username}`}</p>
                    </Link>
                    <button
                      onClick={() => toggleFollow(uid)}
                      className={`shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                        isFollowing
                          ? 'border border-stone-200 bg-white text-stone-950'
                          : 'border border-stone-950 bg-stone-950 text-white'
                      }`}
                    >
                      {isFollowing ? 'Siguiendo' : 'Seguir'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
