import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Star, ChevronRight, MapPin, Package, Truck, Loader2, Store, ShieldCheck, X } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';

const FILTER_PILLS = [
  { id: 'all', label: 'Todas' },
  { id: 'verified', label: 'Verificadas' },
  { id: 'ES', label: 'España' },
  { id: 'FR', label: 'Francia' },
  { id: 'elite', label: 'ELITE' },
  { id: 'pro', label: 'PRO' },
  { id: 'free_shipping', label: 'Envío gratis' },
];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function PlanBadge({ plan }) {
  if (!plan || plan === 'free') return null;
  const upper = plan.toUpperCase();
  const isElite = upper === 'ELITE';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
      padding: '2px 8px', borderRadius: 'var(--radius-full, 999px)',
      background: isElite ? 'var(--color-black)' : 'var(--color-surface)',
      color: isElite ? 'var(--color-white)' : 'var(--color-black)',
      whiteSpace: 'nowrap',
    }}>
      {upper}
    </span>
  );
}

function RatingStars({ rating }) {
  if (!rating) return null;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-stone)' }}>
      <Star size={13} fill="var(--color-black)" color="var(--color-black)" />
      {Number(rating).toFixed(1)}
    </span>
  );
}

/* ── Destacada Card (horizontal scroll) ── */
function FeaturedStoreCard({ store }) {
  const slug = store.slug || store.store_slug;
  const banner = store.hero_image || store.banner_image || null;
  const logo = store.logo || null;
  const rating = store.average_rating || store.rating;
  const plan = store.plan || store.subscription_plan;

  return (
    <Link
      to={slug ? `/store/${slug}` : '/stores'}
      style={{
        display: 'block', width: 200, flexShrink: 0,
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden', textDecoration: 'none',
        transition: 'var(--transition-fast)',
      }}
    >
      {/* Banner */}
      <div style={{ height: 100, background: 'var(--color-surface)', position: 'relative', overflow: 'hidden' }}>
        {banner ? (
          <img src={banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={28} color="var(--color-stone)" />
          </div>
        )}
        {/* Avatar overlap */}
        <div style={{
          position: 'absolute', bottom: -18, left: 12,
          width: 40, height: 40, borderRadius: 'var(--radius-full, 999px)',
          border: '2px solid var(--color-white)',
          background: 'var(--color-surface)', overflow: 'hidden',
        }}>
          {logo ? (
            <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store size={16} color="var(--color-stone)" />
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '22px 12px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{
            fontSize: 14, fontWeight: 600, color: 'var(--color-black)',
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {store.name}
          </p>
          <PlanBadge plan={plan} />
        </div>
        {store.location && (
          <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MapPin size={11} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{store.location}</span>
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <RatingStars rating={rating} />
          {store.product_count > 0 && (
            <span style={{ fontSize: 11, color: 'var(--color-stone)' }}>{store.product_count} prod.</span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ── StoreRow (vertical list) ── */
function StoreRow({ store }) {
  const navigate = useNavigate();
  const slug = store.slug || store.store_slug;
  const logo = store.logo || null;
  const rating = store.average_rating || store.rating;
  const plan = store.plan || store.subscription_plan;
  const verified = store.verified || store.is_verified;

  return (
    <div
      onClick={() => navigate(slug ? `/store/${slug}` : '/stores')}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        cursor: 'pointer',
        transition: 'var(--transition-fast)',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 52, height: 52, borderRadius: 'var(--radius-full, 999px)',
        background: 'var(--color-surface)', overflow: 'hidden', flexShrink: 0,
      }}>
        {logo ? (
          <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Store size={22} color="var(--color-stone)" />
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{
            fontSize: 15, fontWeight: 600, color: 'var(--color-black)',
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {store.name}
          </p>
          {verified && <ShieldCheck size={14} color="var(--color-black)" />}
          <PlanBadge plan={plan} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          {store.location && (
            <span style={{ fontSize: 12, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={11} /> {store.location}
            </span>
          )}
          <RatingStars rating={rating} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          {store.product_count > 0 && (
            <span style={{ fontSize: 11, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Package size={11} /> {store.product_count} productos
            </span>
          )}
          {store.free_shipping && (
            <span style={{ fontSize: 11, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Truck size={11} /> Envío gratis
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <span style={{
        fontSize: 13, fontWeight: 600, color: 'var(--color-stone)',
        display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
      }}>
        Ver <ChevronRight size={16} />
      </span>
    </div>
  );
}

/* ── Skeleton ── */
function SkeletonCard() {
  return (
    <div style={{
      width: 200, height: 200, flexShrink: 0,
      background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function SkeletonRow() {
  return (
    <div style={{
      height: 80, background: 'var(--color-surface)',
      borderRadius: 'var(--radius-xl)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

/* ══════════════════════════════════════════════ */
/*  MAIN COMPONENT                               */
/* ══════════════════════════════════════════════ */
export default function StoresListPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(15);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const debouncedSearch = useDebounce(searchInput, 400);

  /* Fetch stores */
  const fetchStores = useCallback(async (search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const url = `/stores${params.toString() ? `?${params}` : ''}`;
      const data = await apiClient.get(url);
      setStores(Array.isArray(data) ? data : []);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores(debouncedSearch);
  }, [debouncedSearch, fetchStores]);

  /* Infinite scroll via IntersectionObserver */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(p => p + 15); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  /* Filter logic */
  const filtered = useMemo(() => {
    return stores.filter(s => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'verified') return s.verified || s.is_verified;
      if (activeFilter === 'ES') return (s.country || '').toUpperCase() === 'ES';
      if (activeFilter === 'FR') return (s.country || '').toUpperCase() === 'FR';
      if (activeFilter === 'elite') return (s.plan || s.subscription_plan || '').toLowerCase() === 'elite';
      if (activeFilter === 'pro') return (s.plan || s.subscription_plan || '').toLowerCase() === 'pro';
      if (activeFilter === 'free_shipping') return s.free_shipping;
      return true;
    });
  }, [stores, activeFilter]);

  /* Featured = verified or elite/pro, max 10 */
  const featured = useMemo(() => {
    return stores
      .filter(s => s.verified || s.is_verified || ['elite', 'pro'].includes((s.plan || s.subscription_plan || '').toLowerCase()))
      .slice(0, 10);
  }, [stores]);

  const font = { fontFamily: 'var(--font-sans)' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      {/* ── Topbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
          aria-label="Volver"
        >
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-black)' }}>Tiendas</span>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: '12px 16px 0', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            color="var(--color-stone)"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar tienda o ubicación..."
            style={{
              width: '100%', height: 44,
              paddingLeft: 42, paddingRight: searchInput ? 36 : 14,
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full, 999px)',
              background: 'var(--color-white)',
              fontSize: 14, color: 'var(--color-black)',
              outline: 'none', boxSizing: 'border-box',
              fontFamily: 'var(--font-sans)',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--color-black)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
                borderRadius: '50%', width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="Limpiar búsqueda"
            >
              <X size={13} color="var(--color-stone)" />
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 16px',
        overflowX: 'auto', maxWidth: 600, margin: '0 auto',
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {FILTER_PILLS.map(pill => {
          const active = activeFilter === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => { setActiveFilter(pill.id); setVisibleCount(15); }}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: 'var(--radius-full, 999px)',
                border: active ? '1px solid var(--color-black)' : '1px solid var(--color-border)',
                background: active ? 'var(--color-black)' : 'var(--color-white)',
                color: active ? 'var(--color-white)' : 'var(--color-black)',
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
              }}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px 100px' }}>
        {/* ── TIENDAS DESTACADAS ── */}
        {!loading && featured.length > 0 && !searchInput && activeFilter === 'all' && (
          <section style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', margin: 0, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                Tiendas destacadas
              </h2>
            </div>
            <div
              ref={scrollRef}
              style={{
                display: 'flex', gap: 12,
                overflowX: 'auto', paddingBottom: 4,
                WebkitOverflowScrolling: 'touch',
                msOverflowStyle: 'none', scrollbarWidth: 'none',
              }}
            >
              {featured.map(store => (
                <motion.div
                  key={store.store_id || store.slug}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <FeaturedStoreCard store={store} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── TODAS LAS TIENDAS ── */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', margin: 0, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
              {activeFilter === 'all' ? 'Todas las tiendas' : FILTER_PILLS.find(p => p.id === activeFilter)?.label || 'Tiendas'}
            </h2>
            {!loading && (
              <span style={{ fontSize: 12, color: 'var(--color-stone)' }}>{filtered.length} tiendas</span>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 12, padding: '60px 0',
            }}>
              <Store size={56} color="var(--color-stone)" strokeWidth={1} />
              <p style={{ fontSize: 15, color: 'var(--color-stone)', textAlign: 'center', margin: 0 }}>
                No se encontraron tiendas
              </p>
              {(searchInput || activeFilter !== 'all') && (
                <button
                  onClick={() => { setSearchInput(''); setActiveFilter('all'); }}
                  style={{
                    padding: '10px 24px', background: 'var(--color-black)',
                    color: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
                    fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                  }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.slice(0, visibleCount).map((store, i) => (
                <motion.div
                  key={store.store_id || store.slug || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <StoreRow store={store} />
                </motion.div>
              ))}

              {/* Infinite scroll sentinel */}
              {visibleCount < filtered.length && (
                <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <Loader2 size={24} color="var(--color-stone)" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Pulse + spin keyframes (injected once) */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
