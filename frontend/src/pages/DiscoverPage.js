import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Users, MapPin, ChevronRight, Package, Store, UtensilsCrossed, ClipboardList } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useStores } from '../hooks/useStores';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import { CATEGORY_GROUPS } from '../constants/categories';

const FILTER_PILLS = [
  { id: 'all', label: 'Todo', emoji: '' },
  { id: 'ecologico', label: 'Ecológico', emoji: '🌿' },
  { id: 'aceites', label: 'Aceites', emoji: '🫒' },
  { id: 'lacteos', label: 'Lácteos', emoji: '🧀' },
  { id: 'chocolates', label: 'Dulces', emoji: '🍫' },
  { id: 'halal', label: 'Halal', emoji: '☪️' },
  { id: 'vegano', label: 'Vegano', emoji: '🌱' },
  { id: 'sin-gluten', label: 'Sin gluten', emoji: '🌾' },
];

const SECTION_PILLS = [
  { id: 'products', emoji: '📦', label: 'Productos', to: '/products' },
  { id: 'stores', emoji: '🏪', label: 'Tiendas', to: '/stores' },
  { id: 'recipes', emoji: '🍳', label: 'Recetas', to: '/recipes' },
  { id: 'communities', emoji: '👥', label: 'Comunidad', to: '/communities' },
];

export default function DiscoverPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [communities, setCommunities] = useState([]);

  const productParams = { limit: '8' };
  if (activeFilter !== 'all') productParams.category = activeFilter;
  const { products, isLoading: loadingProducts } = useProducts(productParams);
  const { stores, isLoading: loadingStores } = useStores({});

  const isB2BUser = user?.role === 'producer' || user?.role === 'importer';

  useEffect(() => {
    apiClient.get('/communities?limit=4').then((data) => {
      setCommunities(data?.communities || data || []);
    }).catch(() => setCommunities([]));
  }, []);

  const handleSearch = (query) => {
    if (query.trim()) navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const isActivePath = (path) => {
    if (path === '/explore') return location.pathname === '/explore' || location.pathname === '/discover';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-cream)' }}>
      <SEO title="Descubrir — Hispaloshop" description="Descubre productos artesanales locales, tiendas de productores verificados y comunidades de alimentación saludable." />

      <div style={{ padding: '12px 16px 0' }}>

        {/* Search bar with AI pill */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-stone)' }} />
          <input
            type="text"
            placeholder="Busca o pregunta a Hispal AI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            style={{
              width: '100%', height: 44,
              borderRadius: 'var(--radius-md)',
              border: '0.5px solid var(--color-border)',
              background: 'var(--color-white)',
              paddingLeft: 42, paddingRight: 60,
              fontSize: 14, fontFamily: 'var(--font-sans)',
              color: 'var(--color-black)',
              outline: 'none',
            }}
          />
          <div style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--color-black)', borderRadius: 'var(--radius-full)',
            padding: '3px 10px', cursor: 'pointer',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a8a29e' }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: '#fff', fontFamily: 'var(--font-sans)' }}>IA</span>
          </div>
        </div>

        {/* ── Section Pills ── */}
        <div className="scrollbar-hide" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 2 }}>
          {SECTION_PILLS.map((pill) => {
            const active = isActivePath(pill.to);
            return (
              <button
                key={pill.id}
                onClick={() => navigate(pill.to)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-sm, 13px)', fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                  border: active ? 'none' : '1px solid var(--color-border)',
                  background: active ? 'var(--color-black)' : 'var(--color-white)',
                  color: active ? '#fff' : 'var(--color-black)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                {pill.emoji} {pill.label}
              </button>
            );
          })}
          {/* B2B pill — only for producer/importer */}
          {isB2BUser && (
            <button
              onClick={() => navigate('/b2b/catalog')}
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: 'var(--text-sm, 13px)', fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
                border: isActivePath('/b2b/catalog') ? 'none' : '1px solid var(--color-border)',
                background: isActivePath('/b2b/catalog') ? 'var(--color-black)' : 'var(--color-white)',
                color: isActivePath('/b2b/catalog') ? '#fff' : 'var(--color-black)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              📋 Catálogo B2B
            </button>
          )}
        </div>

        {/* ── Filter pills ── */}
        <div className="scrollbar-hide" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.id}
              onClick={() => setActiveFilter(pill.id)}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: 13, fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                border: activeFilter === pill.id ? 'none' : '0.5px solid var(--color-border)',
                background: activeFilter === pill.id ? 'var(--color-black)' : 'var(--color-white)',
                color: activeFilter === pill.id ? '#fff' : 'var(--color-black)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              {pill.emoji && `${pill.emoji} `}{pill.label}
            </button>
          ))}
        </div>

        {/* Season banner */}
        <div style={{
          height: 130,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-black)',
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24,
          overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)' }}>
              Temporada
            </span>
            <p style={{ fontSize: 16, fontWeight: 500, color: '#fff', marginTop: 4, fontFamily: 'var(--font-sans)' }}>
              Aceites de nueva cosecha
            </p>
            <button
              onClick={() => navigate('/products?category=aceites')}
              style={{
                marginTop: 12, padding: '6px 16px',
                borderRadius: 'var(--radius-md)',
                background: '#fff', color: 'var(--color-black)',
                fontSize: 12, fontWeight: 500, border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Descubrir
            </button>
          </div>
          <span style={{ fontSize: 48, position: 'absolute', right: 20, bottom: 10, opacity: 0.3 }}>🫒</span>
        </div>

        {/* ── Categories — full horizontal scroll ── */}
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
            Categorías
          </span>
          <div className="scrollbar-hide" style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {CATEGORY_GROUPS.map((grp) => (
              <button
                key={grp.slug}
                onClick={() => navigate(`/explore/category/${grp.slug}`)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-sm, 13px)', fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'nowrap',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-white)',
                  color: 'var(--color-black)',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                }}
              >
                {grp.emoji} {grp.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Products "Para ti" ── */}
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 12 }}>
            Para ti
          </span>

          <style>{`
            .product-grid {
              display: grid;
              gap: 12px;
              grid-template-columns: repeat(2, 1fr);
            }
            @media (min-width: 600px) {
              .product-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
            }
            @media (min-width: 1024px) {
              .product-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
            }
            @media (min-width: 1440px) {
              .product-grid { grid-template-columns: repeat(5, 1fr); }
            }
          `}</style>
          {loadingProducts ? (
            <div className="product-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  borderRadius: 'var(--radius-lg)', background: 'var(--color-white)',
                  border: '0.5px solid var(--color-border)', overflow: 'hidden',
                }}>
                  <div className="hs-skeleton" style={{ aspectRatio: '1/1' }} />
                  <div style={{ padding: 12 }}>
                    <div className="hs-skeleton" style={{ height: 12, width: '80%', marginBottom: 6 }} />
                    <div className="hs-skeleton" style={{ height: 10, width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard key={product.product_id || product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* ── Stores section ── */}
        {!loadingStores && stores.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                Tiendas
              </span>
              <button
                onClick={() => navigate('/stores')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  fontSize: 11, fontWeight: 500, color: 'var(--color-stone)',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }} className="scrollbar-hide">
              {stores.slice(0, 6).map((store) => {
                const slug = store.slug || store.store_slug;
                return (
                  <button
                    key={store.id || store.store_id || slug}
                    onClick={() => slug && navigate(`/store/${slug}`)}
                    style={{
                      flexShrink: 0, width: 140, textAlign: 'center',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-white)',
                      border: '0.5px solid var(--color-border)',
                      cursor: 'pointer', padding: 16,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    }}
                  >
                    <img
                      src={store.logo || store.hero_image || '/placeholder-store.png'}
                      alt={store.name}
                      loading="lazy"
                      style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                      {store.name}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', margin: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MapPin size={10} />
                      {store.location || 'España'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Communities section ── */}
        {communities.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                Comunidades
              </span>
              <button
                onClick={() => navigate('/communities')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  fontSize: 11, fontWeight: 500, color: 'var(--color-stone)',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Ver más <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }} className="scrollbar-hide">
              {communities.slice(0, 4).map((community) => (
                <button
                  key={community._id || community.slug}
                  onClick={() => navigate(`/communities/${community.slug}`)}
                  style={{
                    flexShrink: 0, width: 200, textAlign: 'left',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-white)',
                    border: '0.5px solid var(--color-border)',
                    overflow: 'hidden', cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div style={{
                    height: 72,
                    background: community.cover_image
                      ? `url(${community.cover_image}) center/cover`
                      : 'linear-gradient(135deg, var(--color-surface), var(--color-border))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                  }}>
                    {!community.cover_image && (community.emoji || '🌍')}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    {community.category && (
                      <span style={{
                        fontSize: 9, fontWeight: 500, color: 'var(--color-stone)',
                        background: 'var(--color-surface, #f5f5f4)', padding: '1px 6px',
                        borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-sans)',
                      }}>
                        {community.category}
                      </span>
                    )}
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-black)', marginTop: 4, fontFamily: 'var(--font-sans)' }}>
                      {community.name}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--color-stone)', marginTop: 2, fontFamily: 'var(--font-sans)' }}>
                      <Users size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                      {community.member_count || 0} miembros
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
