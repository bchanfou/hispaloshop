import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, ChevronRight, Star, Clock, Package } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useStores } from '../hooks/useStores';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import apiClient from '../services/api/client';
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

  /* ── ui states ── */
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeTab, setActiveTab] = useState('trending');

  /* ── data states ── */
  const [trending, setTrending] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [eliteStores, setEliteStores] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followedUsers, setFollowedUsers] = useState(new Set());

  const { products, isLoading: loadingProducts } = useProducts({ limit: '12' });
  const { stores, isLoading: loadingStores } = useStores({ limit: 8 });

  /* ── elite carousel state ── */
  const [eliteIdx, setEliteIdx] = useState(0);
  const [eliteFading, setEliteFading] = useState(false);
  const eliteFadeTimer = useRef(null);

  /* ── fetch data ── */
  useEffect(() => {
    let active = true;

    apiClient.get('/discovery/trending', { params: { type: 'products', limit: 4 } })
      .then(data => { if (active) setTrending(Array.isArray(data) ? data.slice(0, 4) : (data?.items || data?.products || []).slice(0, 4)); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingTrending(false); });

    apiClient.get('/stores', { params: { plan: 'elite', country: userCountry, limit: 10 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.stores || [];
        if (active) setEliteStores(list);
      })
      .catch(() => { /* elite stores are non-critical */ });

    apiClient.get('/recipes', { params: { sort: 'popular', limit: 6 } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.recipes || [];
        if (active) setRecipes(list.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingRecipes(false); });

    apiClient.get('/discovery/suggested-users', { params: { limit: 5, context: 'discover' } })
      .then(data => {
        const list = Array.isArray(data) ? data : data?.users || [];
        if (active) setSuggestedUsers(list.slice(0, 5));
      })
      .catch(() => { /* suggested users are non-critical */ });

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

  /* ── follow toggle ── */
  const handleFollow = useCallback(async (userId) => {
    if (!user) { navigate('/login'); return; }
    const isFollowing = followedUsers.has(userId);
    try {
      if (isFollowing) {
        await apiClient.delete(`/users/${userId}/follow`);
        setFollowedUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });
      } else {
        await apiClient.post(`/users/${userId}/follow`);
        setFollowedUsers(prev => new Set(prev).add(userId));
      }
    } catch {
      toast.error('Error al actualizar');
    }
  }, [user, followedUsers, navigate]);

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

  /* ── category navigate with scroll ── */
  const handleCategoryClick = useCallback((slug) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(`/explore/category/${slug}`);
  }, [navigate]);

  /* ── elite carousel card ── */
  const EliteCarousel = () => {
    if (eliteStores.length === 0) return null;
    const store = eliteStores[eliteIdx];
    const heroImg = store.hero_image || store.cover_image || store.logo;
    const fadeStyle = { opacity: eliteFading ? 0 : 1, transition: `opacity ${ELITE_FADE_MS}ms ease` };
    return (
      <div className="mb-6">
        <div
          role="link"
          tabIndex={0}
          aria-label={`Tienda destacada: ${store.name}`}
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
                onClick={(e) => { e.stopPropagation(); goToElite(i); }}
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
  };

  /* ── tab content sections ── */

  const TrendingTab = () => (
    <>
      {/* Suggested users — compact horizontal scroll */}
      {suggestedUsers.length > 0 && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Personas que te gustarán</span>
            <Link to="/discover/people" className="text-[11px] font-medium text-stone-500 no-underline hover:text-stone-700">Ver todos →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide py-2">
            {suggestedUsers.map(u => {
              const uid = u.user_id || u.id;
              const avatar = u.profile_image || u.avatar;
              return (
                <div key={uid} className="flex flex-col items-center gap-1 flex-shrink-0 w-16">
                  {avatar ? (
                    <img src={avatar} className="w-12 h-12 rounded-full object-cover" alt={u.username || u.name} />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-sm font-bold text-stone-500">
                      {(u.name || u.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs text-stone-700 text-center truncate w-full">{u.username || u.name}</span>
                  <button
                    onClick={() => handleFollow(uid)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-stone-950 text-white"
                  >
                    {followedUsers.has(uid) ? '✓' : 'Seguir'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tendencias hoy */}
      <div className="mb-6">
        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-stone-500">Tendencias hoy</span>
        {loadingTrending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
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
        ) : loadingProducts ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                <div className="aspect-square animate-pulse bg-stone-100" />
                <div className="p-3">
                  <div className="mb-1.5 h-3 w-[70%] animate-pulse rounded bg-stone-100" />
                  <div className="h-2.5 w-[40%] animate-pulse rounded bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {products.slice(0, 4).map(p => (
              <ProductCard key={p.product_id || p.id} product={p} />
            ))}
          </div>
        ) : null}
      </div>

      {/* Elite carousel */}
      <EliteCarousel />

      {/* Categorías */}
      <div className="mb-6">
        <span className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-stone-500">Categorías</span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORY_GROUPS.map(grp => (
            <button key={grp.slug} onClick={() => handleCategoryClick(grp.slug)} className={pillCls(false)}>
              {grp.emoji} {grp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Productos para ti */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Productos para ti</span>
          <Link to="/products" className="flex items-center gap-0.5 text-[11px] font-medium text-stone-500 no-underline">Ver todos <ChevronRight size={14} /></Link>
        </div>
        {loadingProducts ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
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
    </>
  );

  const PostsTab = () => (
    <div className="mb-6">
      <span className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-stone-500">Posts de la comunidad</span>
      <p className="text-sm text-stone-500 text-center py-8">Cargando posts…</p>
    </div>
  );

  const TiendasTab = () => (
    <>
      {loadingStores && (
        <div className="mb-6">
          <span className="mb-3 block text-[10px] font-semibold uppercase tracking-wider text-stone-500">Tiendas que te gustarán</span>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-[180px] shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
                <div className="h-[90px] animate-pulse bg-stone-100" />
                <div className="px-3 pb-3 pt-5">
                  <div className="mb-1.5 h-3 w-[70%] animate-pulse rounded bg-stone-100" />
                  <div className="h-2.5 w-[40%] animate-pulse rounded bg-stone-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!loadingStores && stores.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">Tiendas que te gustarán</span>
            <Link to="/stores" className="flex items-center gap-0.5 text-[11px] font-medium text-stone-500 no-underline">Ver todas <ChevronRight size={14} /></Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {stores.slice(0, 8).map(store => {
              const slug = store.slug || store.store_slug || store.id || store.store_id;
              if (!slug) return null;
              const hero = store.hero_image || store.logo;
              return (
                <Link
                  key={slug}
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
      {!loadingStores && stores.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-8">No hay tiendas disponibles.</p>
      )}
    </>
  );

  const RecetasTab = () => (
    <>
      {loadingRecipes && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide mb-6">
          {[1,2,3].map(i => (
            <div key={i} className="w-40 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
              <div className="aspect-[3/4] animate-pulse bg-stone-100" />
              <div className="p-3">
                <div className="mb-1.5 h-3 w-[70%] animate-pulse rounded bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      )}
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
                  key={recipe.recipe_id || recipe.id}
                  to={`/recipes/${recipe.recipe_id || recipe.id}`}
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
      {!loadingRecipes && recipes.length === 0 && (
        <p className="text-sm text-stone-500 text-center py-8">No hay recetas disponibles.</p>
      )}
    </>
  );

  /* ── render ── */
  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <SEO title="Explorar — Hispaloshop" description="Descubre productos artesanales, tiendas verificadas y recetas de la comunidad." />

      {/* ─── SEARCH BAR (sticky) ─── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-4 py-2 border-b border-stone-100/80">
        <button
          onClick={() => navigate('/search')}
          aria-label="Buscar productos, tiendas, recetas"
          role="search"
          className="relative block w-full text-left"
        >
          <Search size={18} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
          <div className="flex h-11 w-full items-center rounded-full border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-500">
            Buscar productos, tiendas, recetas…
          </div>
        </button>
      </div>

      {/* ─── UNIFIED TAB BAR ─── */}
      <div className="flex gap-0 border-b border-stone-100 overflow-x-auto scrollbar-hide bg-white">
        {['Trending', 'Posts', 'Reels', 'Tiendas', 'Recetas'].map(tab => (
          <button
            key={tab}
            onClick={() => {
              if (tab.toLowerCase() === 'reels') { navigate('/reels'); return; }
              setActiveTab(tab.toLowerCase());
            }}
            className={`flex-shrink-0 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.toLowerCase()
                ? 'border-stone-950 text-stone-950'
                : 'border-transparent text-stone-400 hover:text-stone-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── TAB CONTENT ─── */}
      <div className="px-4 pt-4">
        {activeTab === 'trending' && <TrendingTab />}
        {activeTab === 'posts' && <PostsTab />}
        {activeTab === 'tiendas' && <TiendasTab />}
        {activeTab === 'recetas' && <RecetasTab />}
      </div>

      {selectedPost && (
        <PostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}
