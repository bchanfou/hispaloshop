import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, MapPin, Star, Package, ChevronRight } from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useStores } from '../hooks/useStores';
import apiClient from '../services/api/client';
import ProductCard from '../components/ProductCard';

const FILTER_PILLS = [
  { id: 'all', label: 'Todo', emoji: '' },
  { id: 'eco', label: 'Ecológico', emoji: '🌿' },
  { id: 'aceites', label: 'Aceites', emoji: '🫒' },
  { id: 'lacteos', label: 'Lácteos', emoji: '🧀' },
  { id: 'dulces', label: 'Dulces', emoji: '🍯' },
  { id: 'halal', label: 'Halal', emoji: '☪️' },
  { id: 'vegano', label: 'Vegano', emoji: '🌱' },
  { id: 'singluten', label: 'Sin gluten', emoji: '' },
];

const QUICK_CATEGORIES = [
  { id: 'snacks', emoji: '🥜', label: 'Snacks' },
  { id: 'bebidas', emoji: '🧃', label: 'Bebidas' },
  { id: 'eco', emoji: '🌿', label: 'Eco' },
  { id: 'gourmet', emoji: '✨', label: 'Gourmet' },
  { id: 'fitness', emoji: '💪', label: 'Fitness' },
];

const formatPrice = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(amount);
};

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [communities, setCommunities] = useState([]);

  const { products, isLoading: loadingProducts } = useProducts({ limit: '8' });
  const { stores, isLoading: loadingStores } = useStores({});

  useEffect(() => {
    apiClient.get('/communities?limit=4').then((data) => {
      setCommunities(data?.communities || data || []);
    }).catch(() => setCommunities([]));
  }, []);

  const handleSearch = (query) => {
    if (query.trim()) navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/products?category=${encodeURIComponent(categoryId)}`);
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-cream)' }}>

      {/* TopBar */}
      <header className="sticky top-0 z-40" style={{ background: 'var(--color-cream)', height: 52, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
        <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
          Explorar
        </span>
      </header>

      <div style={{ padding: '0 16px' }}>

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
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green)' }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: '#fff', fontFamily: 'var(--font-sans)' }}>IA</span>
          </div>
        </div>

        {/* Filter pills */}
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
          background: 'linear-gradient(135deg, #1c1917 0%, #0A0A0A 100%)',
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          overflow: 'hidden',
          position: 'relative',
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

        {/* Quick categories */}
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
            Categorías
          </span>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto' }} className="scrollbar-hide">
            {QUICK_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                style={{
                  flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '10px 8px', minWidth: 60,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-white)',
                  border: '0.5px solid var(--color-border)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                <span style={{ fontSize: 9, color: 'var(--color-black)', fontWeight: 500 }}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Products masonry grid */}
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

        {/* Communities section */}
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
                  fontSize: 11, fontWeight: 500, color: 'var(--color-green)',
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
                        fontSize: 9, fontWeight: 500, color: 'var(--color-green)',
                        background: 'var(--color-green-light)', padding: '1px 6px',
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

        {/* Stores section */}
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
                  fontSize: 11, fontWeight: 500, color: 'var(--color-green)',
                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stores.slice(0, 3).map((store) => {
                const slug = store.slug || store.store_slug;
                return (
                  <button
                    key={store.id || store.store_id || slug}
                    onClick={() => slug && navigate(`/store/${slug}`)}
                    style={{
                      display: 'flex', gap: 12, padding: 12, textAlign: 'left',
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-white)',
                      border: '0.5px solid var(--color-border)',
                      cursor: 'pointer', width: '100%',
                    }}
                  >
                    <img
                      src={store.logo || store.hero_image || '/placeholder-store.png'}
                      alt={store.name}
                      loading="lazy"
                      style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
                        {store.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-stone)', marginTop: 2, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MapPin size={10} />
                        {store.location || 'España'}
                      </p>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 10, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                        {store.rating && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Star size={10} fill="var(--color-amber)" stroke="var(--color-amber)" />
                            {store.rating}
                          </span>
                        )}
                        <span>{store.product_count || 0} productos</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
