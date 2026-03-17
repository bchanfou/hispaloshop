import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Users, MapPin, ChevronRight, Star, Clock } from 'lucide-react';
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
const DIFFICULTY_COLOR = { easy: '#44403c', medium: '#44403c', hard: '#44403c' };

const ELITE_ROTATE_MS = 6000;
const ELITE_FADE_MS = 400;

/* ── shared styles ── */

const sectionLabel = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--color-stone)',
  fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 12,
};

const seeAll = {
  display: 'flex', alignItems: 'center', gap: 2,
  fontSize: 11, fontWeight: 500, color: 'var(--color-stone)',
  background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-sans)', textDecoration: 'none',
};

const pillStyle = (active) => ({
  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 'var(--radius-full)',
  fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
  whiteSpace: 'nowrap', cursor: 'pointer', transition: 'var(--transition-fast)',
  border: active ? 'none' : '1px solid var(--color-border)',
  background: active ? 'var(--color-black)' : 'var(--color-white)',
  color: active ? '#fff' : 'var(--color-black)',
});

const hScroll = { display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' };

/* ── skeleton helper ── */

function Skeleton({ width, height, radius = 8, style }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'var(--color-surface)',
      animation: 'discoverPulse 1.5s ease-in-out infinite',
      ...style,
    }} />
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

    // trending products
    apiClient.get('/discovery/trending?type=products&limit=4')
      .then(data => { if (active) setTrending(Array.isArray(data) ? data.slice(0, 4) : data?.products?.slice(0, 4) || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingTrending(false); });

    // elite stores (same country)
    apiClient.get(`/stores?plan=elite&country=${userCountry}&limit=10`)
      .then(data => {
        const list = Array.isArray(data) ? data : data?.stores || [];
        if (active) setEliteStores(list);
      })
      .catch(() => {});

    // popular recipes
    apiClient.get('/recipes?sort=popular&limit=6')
      .then(data => {
        const list = Array.isArray(data) ? data : data?.recipes || [];
        if (active) setRecipes(list.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingRecipes(false); });

    // suggested users
    if (user) {
      apiClient.get('/discovery/suggested-users?limit=3')
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
    const tick = () => {
      if (!elitePaused.current) advanceElite();
    };
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

    for (let i = 0; i < 4 && regIdx < regular.length; i++) {
      grid.push({ ...regular[regIdx++], _sponsored: false });
    }
    if (sponIdx < sponsored.length) {
      grid.push({ ...sponsored[sponIdx++], _sponsored: true });
    }
    while (regIdx < regular.length) {
      grid.push({ ...regular[regIdx++], _sponsored: false });
      if ((grid.length % 13 === 0) && sponIdx < sponsored.length) {
        grid.push({ ...sponsored[sponIdx++], _sponsored: true });
      }
    }
    return grid;
  }, [loadingProducts, products, eliteStores]);

  /* ── render ── */
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80, background: 'var(--color-cream)', fontFamily: 'var(--font-sans)' }}>
      <SEO title="Explorar — Hispaloshop" description="Descubre productos artesanales, tiendas verificadas y recetas de la comunidad." />

      {/* pulse animation */}
      <style>{`
        @keyframes discoverPulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .discover-grid { display:grid; gap:12px; grid-template-columns:repeat(2,1fr); }
        @media(min-width:600px){ .discover-grid{grid-template-columns:repeat(3,1fr);gap:14px} }
        @media(min-width:1024px){ .discover-grid{grid-template-columns:repeat(4,1fr);gap:16px} }
      `}</style>

      <div style={{ padding: '12px 16px 0' }}>

        {/* ─── SEARCH BAR ─── */}
        <button
          onClick={() => navigate('/search')}
          aria-label="Buscar productos, tiendas, recetas"
          role="search"
          style={{
            position: 'relative', marginBottom: 16, cursor: 'pointer',
            width: '100%', display: 'block', background: 'none', border: 'none', padding: 0,
            textAlign: 'left',
          }}
        >
          <Search size={18} aria-hidden="true" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-stone)' }} />
          <div style={{
            width: '100%', height: 44,
            borderRadius: 'var(--radius-full)',
            border: '0.5px solid var(--color-border)',
            background: 'var(--color-white)',
            paddingLeft: 42, paddingRight: 16,
            fontSize: 14, color: 'var(--color-stone)',
            display: 'flex', alignItems: 'center',
            fontFamily: 'var(--font-sans)',
          }}>
            Buscar productos, tiendas, recetas…
          </div>
        </button>

        {/* ─── SECTION PILLS ─── */}
        <div className="scrollbar-hide" style={{ ...hScroll, gap: 8, marginBottom: 20, paddingBottom: 2 }}>
          {SECTION_PILLS.map(pill => (
            <button key={pill.id} onClick={() => navigate(pill.to)} style={pillStyle(false)}>
              {pill.emoji} {pill.label}
            </button>
          ))}
          {isB2BUser && (
            <button onClick={() => navigate('/b2b/catalog')} style={pillStyle(false)}>
              📋 Catálogo B2B
            </button>
          )}
        </div>

        {/* ─── ① TENDENCIAS HOY ─── */}
        <div style={{ marginBottom: 24 }}>
          <span style={sectionLabel}>Tendencias hoy</span>
          {loadingTrending ? (
            <div className="discover-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-white)', border: '0.5px solid var(--color-border)' }}>
                  <Skeleton width="100%" height={0} style={{ paddingBottom: '100%' }} radius={0} />
                  <div style={{ padding: 12 }}>
                    <Skeleton width="70%" height={12} />
                    <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : trending.length > 0 ? (
            <div className="discover-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              {trending.map(p => (
                <ProductCard key={p.product_id || p.id} product={p} />
              ))}
            </div>
          ) : (
            /* fallback: show first 4 products */
            !loadingProducts && products.length > 0 && (
              <div className="discover-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
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
          return (
            <div style={{ marginBottom: 24 }}>
              <div
                onMouseEnter={() => { elitePaused.current = true; }}
                onMouseLeave={() => { elitePaused.current = false; }}
                onTouchStart={() => { elitePaused.current = true; }}
                onTouchEnd={() => { elitePaused.current = false; }}
                onClick={() => navigate(`/store/${store.slug || store.store_slug}`)}
                style={{
                  position: 'relative', borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden', cursor: 'pointer',
                  aspectRatio: '16/9', background: 'var(--color-black)',
                }}
              >
                {/* hero image */}
                {heroImg && (
                  <img
                    src={heroImg} alt={store.name} loading="lazy"
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover',
                      opacity: eliteFading ? 0 : 1,
                      transition: `opacity ${ELITE_FADE_MS}ms ease`,
                    }}
                  />
                )}
                {/* gradient overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)',
                }} />
                {/* content */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  padding: '16px 20px',
                  opacity: eliteFading ? 0 : 1,
                  transition: `opacity ${ELITE_FADE_MS}ms ease`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {store.logo && (
                      <img src={store.logo} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
                    )}
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>{store.name}</p>
                      {store.location && (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={10} /> {store.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {store.tagline && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.4 }}>
                      {store.tagline}
                    </p>
                  )}
                </div>
                {/* "Destacado" pill */}
                <span style={{
                  position: 'absolute', top: 12, left: 12,
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
                  color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                  padding: '3px 10px', borderRadius: 'var(--radius-full)',
                  textTransform: 'uppercase',
                }}>
                  Destacado ✦
                </span>
              </div>

              {/* dots indicator */}
              {eliteStores.length > 1 && (
                <div role="tablist" aria-label="Tiendas destacadas" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                  {eliteStores.map((s, i) => (
                    <button
                      key={s.store_id || s.id || i}
                      role="tab"
                      aria-selected={i === eliteIdx}
                      aria-label={`Tienda ${i + 1}: ${s.name || ''}`}
                      onClick={(e) => { e.stopPropagation(); setEliteIdx(i); }}
                      style={{
                        width: i === eliteIdx ? 16 : 6, height: 6,
                        borderRadius: 'var(--radius-full)',
                        background: i === eliteIdx ? 'var(--color-black)' : 'var(--color-border)',
                        border: 'none', cursor: 'pointer', padding: 0,
                        transition: 'all 300ms ease',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── ③ CATEGORÍAS ─── */}
        <div style={{ marginBottom: 24 }}>
          <span style={sectionLabel}>Categorías</span>
          <div className="scrollbar-hide" style={{ ...hScroll, gap: 8, paddingBottom: 4 }}>
            {CATEGORY_GROUPS.map(grp => (
              <button key={grp.slug} onClick={() => navigate(`/explore/category/${grp.slug}`)} style={pillStyle(false)}>
                {grp.emoji} {grp.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── ④ TIENDAS QUE TE GUSTARÁN ─── */}
        {!loadingStores && stores.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={sectionLabel}>Tiendas que te gustarán</span>
              <Link to="/stores" style={seeAll}>Ver todas <ChevronRight size={14} /></Link>
            </div>
            <div className="scrollbar-hide" style={{ ...hScroll, gap: 12 }}>
              {stores.slice(0, 8).map(store => {
                const slug = store.slug || store.store_slug;
                const hero = store.hero_image || store.logo;
                return (
                  <Link
                    key={store.id || store.store_id || slug}
                    to={`/store/${slug}`}
                    style={{
                      flexShrink: 0, width: 180, textDecoration: 'none',
                      borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                      background: 'var(--color-white)',
                      border: '0.5px solid var(--color-border)',
                    }}
                  >
                    {/* hero image */}
                    <div style={{ height: 90, background: 'var(--color-surface)', position: 'relative' }}>
                      {hero && <img src={hero} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      {/* logo overlap */}
                      {store.logo && (
                        <img src={store.logo} alt="" style={{
                          position: 'absolute', bottom: -16, left: 12,
                          width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
                          border: '2px solid var(--color-white)',
                        }} />
                      )}
                    </div>
                    <div style={{ padding: '20px 12px 12px' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>
                        {store.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={10} /> {store.location || 'España'}
                      </p>
                      {store.rating > 0 && (
                        <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Star size={10} style={{ fill: 'var(--color-black)', color: 'var(--color-black)' }} />
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
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={sectionLabel}>Recetas populares</span>
              <Link to="/recipes" style={seeAll}>Ver todas <ChevronRight size={14} /></Link>
            </div>
            <div className="scrollbar-hide" style={{ ...hScroll, gap: 12 }}>
              {recipes.map(recipe => {
                const img = recipe.image_url || recipe.cover_image || (recipe.images && recipe.images[0]);
                const diff = recipe.difficulty || 'easy';
                return (
                  <Link
                    key={recipe.recipe_id || recipe.id || recipe._id}
                    to={`/recipes/${recipe.recipe_id || recipe.id || recipe._id}`}
                    style={{
                      flexShrink: 0, width: 160, textDecoration: 'none',
                      borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                      background: 'var(--color-white)',
                      border: '0.5px solid var(--color-border)',
                    }}
                  >
                    <div style={{ aspectRatio: '3/4', background: 'var(--color-surface)', position: 'relative' }}>
                      {img && <img src={img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      {/* difficulty badge */}
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        fontSize: 9, fontWeight: 600,
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        background: 'rgba(255,255,255,0.9)', color: DIFFICULTY_COLOR[diff] || '#44403c',
                        backdropFilter: 'blur(4px)',
                      }}>
                        {DIFFICULTY_MAP[diff] || diff}
                      </span>
                    </div>
                    <div style={{ padding: '10px 12px' }}>
                      <p style={{
                        fontSize: 13, fontWeight: 500, color: 'var(--color-black)', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {recipe.title || recipe.name}
                      </p>
                      {recipe.prep_time_minutes != null && (
                        <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
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
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={sectionLabel}>Productos para ti</span>
            <Link to="/products" style={seeAll}>Ver todos <ChevronRight size={14} /></Link>
          </div>
          {loadingProducts ? (
            <div className="discover-grid">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--color-white)', border: '0.5px solid var(--color-border)' }}>
                  <Skeleton width="100%" height={0} style={{ paddingBottom: '100%' }} radius={0} />
                  <div style={{ padding: 12 }}><Skeleton width="70%" height={12} /><Skeleton width="40%" height={10} style={{ marginTop: 6 }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="discover-grid">
              {productGrid.map((product, idx) => (
                <div key={product.product_id || product.id || idx} style={{ position: 'relative' }}>
                  <ProductCard product={product} />
                  {product._sponsored && (
                    <span style={{
                      position: 'absolute', top: 8, right: 8, zIndex: 2,
                      fontSize: 9, fontWeight: 500, letterSpacing: '0.04em',
                      color: 'var(--color-stone)', background: 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(4px)', padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                    }}>
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
          <div style={{ marginBottom: 32 }}>
            <span style={sectionLabel}>Creadores a seguir</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {suggestedUsers.map(u => {
                const uid = u.user_id || u.id;
                const isFollowing = followingIds.has(uid);
                return (
                  <div
                    key={uid}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 'var(--radius-xl)',
                      background: 'var(--color-white)',
                      border: '0.5px solid var(--color-border)',
                    }}
                  >
                    <Link to={`/user/${uid}`} style={{ flexShrink: 0 }}>
                      <img
                        src={u.profile_image || '/default-avatar.png'}
                        alt={u.name} loading="lazy"
                        style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    </Link>
                    <Link to={`/user/${uid}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>{u.name}</p>
                      <p style={{
                        fontSize: 12, color: 'var(--color-stone)', margin: '1px 0 0',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {u.bio || `@${u.username}`}
                      </p>
                    </Link>
                    <button
                      onClick={() => toggleFollow(uid)}
                      style={{
                        flexShrink: 0, padding: '7px 18px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        transition: 'var(--transition-fast)',
                        ...(isFollowing
                          ? { background: 'var(--color-white)', color: 'var(--color-black)', border: '1px solid var(--color-border)' }
                          : { background: 'var(--color-black)', color: '#fff', border: 'none' }),
                      }}
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
