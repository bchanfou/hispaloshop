import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award, CheckCircle, ChefHat, ChevronLeft, ExternalLink, Globe,
  Heart, Info, Mail, MapPin, MessageCircle, Package, Phone, Search, Share2,
  Star, Store, Truck, User,
} from 'lucide-react';
import { toast } from 'sonner';
import PostViewer from '../components/PostViewer';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import apiClient from '../services/api/client';
import { useStoreFollow } from '../features/products/hooks';
import { useChatContext } from '../context/chat/ChatProvider';
import SEO from '../components/SEO';

const F = 'inherit';
const normalizeEntityId = (v) => (v == null ? '' : String(v));

export default function StorePage() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { convertAndFormatPrice } = useLocale();
  const [activeTab, setActiveTab] = useState('products');
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const requestedProductId = searchParams.get('product');

  /* ── Data fetching ── */
  const storeQuery = useQuery({
    queryKey: ['store', storeSlug],
    queryFn: () => apiClient.get(`/store/${storeSlug}`),
    enabled: Boolean(storeSlug),
  });
  const store = storeQuery.data ?? null;

  const productsQuery = useQuery({
    queryKey: ['store', storeSlug, 'products'],
    queryFn: () => apiClient.get(`/store/${storeSlug}/products`, { params: { sort: 'featured', limit: 100 } }),
    enabled: Boolean(storeSlug),
  });

  const recipesQuery = useQuery({
    queryKey: ['store', storeSlug, 'recipes', store?.producer_id],
    queryFn: () => apiClient.get(`/users/${store.producer_id}/recipes`),
    enabled: Boolean(store?.producer_id),
  });

  const reviewsQuery = useQuery({
    queryKey: ['store', storeSlug, 'reviews'],
    queryFn: () => apiClient.get(`/store/${storeSlug}/reviews`, { params: { limit: 50 } }),
    enabled: Boolean(storeSlug),
  });

  const certificatesQuery = useQuery({
    queryKey: ['store', storeSlug, 'certificates'],
    queryFn: () => apiClient.get(`/store/${storeSlug}/certificates`),
    enabled: Boolean(storeSlug),
  });

  const allProducts = Array.isArray(productsQuery.data?.products) ? productsQuery.data.products : (Array.isArray(productsQuery.data) ? productsQuery.data : []);
  const recipes = Array.isArray(recipesQuery.data) ? recipesQuery.data : (Array.isArray(recipesQuery.data?.recipes) ? recipesQuery.data.recipes : []);
  const reviews = Array.isArray(reviewsQuery.data?.reviews) ? reviewsQuery.data.reviews : [];
  const certificates = Array.isArray(certificatesQuery.data) ? certificatesQuery.data : [];
  const productTotal = productsQuery.data?.total || allProducts.length || store?.product_count || 0;
  const reviewsTotal = reviewsQuery.data?.total || reviews.length || store?.review_count || 0;
  const avgRating = reviewsQuery.data?.average_rating || store?.rating || 0;
  const isVerified = Boolean(store?.verified || store?.producer_verified);
  const storePlan = store?.plan || null;
  const { isFollowing, followLoading, handleFollowStore } = useStoreFollow(store?.slug || store?.store_slug);
  const { openConversation } = useChatContext();

  /* ── Product category pills ── */
  const productCategories = useMemo(() => {
    const cats = new Set();
    allProducts.forEach(p => {
      const cat = p.category_name || p.category || p.category_id;
      if (cat) cats.add(cat);
    });
    return ['all', ...Array.from(cats)];
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (categoryFilter !== 'all') {
      list = list.filter(p => (p.category_name || p.category || p.category_id) === categoryFilter);
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(p => (p.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, categoryFilter, productSearch]);

  /* ── Handlers ── */
  const handleToggleFollow = async () => {
    if (!user) { toast.error('Inicia sesión para seguir tiendas'); return; }
    try {
      await handleFollowStore();
      toast.success(isFollowing ? 'Dejaste de seguir' : 'Ahora sigues esta tienda');
    } catch { toast.error('Error'); }
  };

  const handleChat = async () => {
    if (!user) { toast.error('Inicia sesión para enviar un mensaje'); return; }
    try {
      const storeUserId = store.user_id || store.producer_id;
      const conv = await openConversation(storeUserId, 'b2c');
      if (conv?.id) navigate(`/messages/${conv.id}`);
    } catch { toast.error('No se pudo abrir el chat'); }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: store?.name, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Enlace copiado');
    }
  };

  useEffect(() => {
    if (!requestedProductId || allProducts.length === 0) return;
    const matched = allProducts.find(p => normalizeEntityId(p.product_id || p.id) === normalizeEntityId(requestedProductId));
    if (matched) { setActiveTab('products'); setSelectedProduct(prev => normalizeEntityId(prev?.product_id || prev?.id) === normalizeEntityId(matched.product_id || matched.id) ? prev : matched); }
  }, [allProducts, requestedProductId]);

  const tabs = [
    { id: 'products', icon: <Package size={14} />, label: 'Productos', count: productTotal },
    { id: 'recipes', icon: <ChefHat size={14} />, label: 'Recetas', count: recipes.length },
    { id: 'reviews', icon: <Star size={14} />, label: 'Reseñas', count: reviewsTotal },
    { id: 'about', icon: <Info size={14} />, label: 'Sobre nosotros', count: null },
  ];

  const tagline = store?.tagline || store?.long_description || store?.story || '';
  const showVerMas = tagline.length > 120;

  /* ── Loading ── */
  if (storeQuery.isLoading) {
    return (
      <div aria-busy="true" aria-label="Cargando tienda" style={{ minHeight: '100vh', background: '#fafaf9',  }}>
        <div style={{ width: '100%', aspectRatio: '3/1', background: '#f5f5f4' }} />
        <div style={{ padding: '0 16px', marginTop: -40 }}>
          <div className="animate-pulse" style={{ width: 80, height: 80, borderRadius: '14px', background: '#f5f5f4', border: '3px solid #ffffff' }} />
          <div className="animate-pulse" style={{ marginTop: 12, height: 18, width: '50%', background: '#f5f5f4', borderRadius: 4 }} />
          <div className="animate-pulse" style={{ marginTop: 8, height: 14, width: '30%', background: '#f5f5f4', borderRadius: 4 }} />
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            {[1,2,3].map(i => <div key={i} className="animate-pulse" style={{ flex: 1, height: 40, background: '#f5f5f4', borderRadius: '12px' }} />)}
          </div>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!store) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafaf9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center',  }}>
        <Store size={64} color="#78716c" strokeWidth={1.2} />
        <p style={{ fontSize: 18, fontWeight: 600, color: '#0c0a09', marginTop: 16 }}>Tienda no encontrada</p>
        <p style={{ fontSize: 14, color: '#78716c', marginTop: 4 }}>Esta tienda no existe o ha sido eliminada.</p>
        <button onClick={() => navigate('/stores')} style={{ marginTop: 16, background: '#0c0a09', color: '#fff', border: 'none', borderRadius: '9999px', padding: '12px 24px', minHeight: 44, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Explorar tiendas
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', paddingBottom: 80 }}>
      <SEO
        title={`${store?.name || 'Tienda'} — Hispaloshop`}
        description={store?.tagline || store?.story?.slice(0, 160) || `Tienda de productos artesanales en Hispaloshop`}
        image={store?.hero_image || store?.logo}
      />

      {/* ── TopBar (over hero) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 52,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <button type="button" onClick={() => navigate(-1)} style={pillBtnStyle} aria-label="Volver">
          <ChevronLeft size={20} strokeWidth={2} color="#fff" />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
          {store.name}
        </span>
        <button type="button" onClick={handleShare} style={pillBtnStyle} aria-label="Compartir">
          <Share2 size={18} strokeWidth={1.8} color="#fff" />
        </button>
      </div>

      {/* ── Hero Banner 3:1 ── */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '3/1', background: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)' }}>
        {store.hero_image && (
          <img src={store.hero_image} alt={`Banner de ${store.name}`} loading="eager" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
      </div>

      {/* ── Store Info ── */}
      <div style={{ position: 'relative', padding: '0 16px', marginTop: -40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          {/* Avatar — square rounded */}
          <div style={{
            width: 80, height: 80, borderRadius: '14px', overflow: 'hidden',
            border: '3px solid #ffffff', background: '#f5f5f4',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          }}>
            {store.logo ? (
              <img src={store.logo} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Store size={28} color="#78716c" />
            )}
          </div>

          {/* Name + username */}
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0c0a09', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {store.name}
            </h1>
            {store.username && (
              <p style={{ fontSize: 13, color: '#78716c', margin: '2px 0 0' }}>@{store.username}</p>
            )}
          </div>
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {isVerified && (
            <span style={badgeStyle('#0c0a09', '#fff')}><CheckCircle size={11} /> Verificado</span>
          )}
          {storePlan && storePlan !== 'free' && (
            <span style={badgeStyle('#f5f5f4', '#0c0a09')}>{storePlan.toUpperCase()}</span>
          )}
          {store.country && (
            <span style={badgeStyle('#f5f5f4', '#0c0a09')}>
              {store.country === 'ES' ? '🇪🇸' : store.country === 'FR' ? '🇫🇷' : '🌍'} {store.location || store.country}
            </span>
          )}
        </div>

        {/* Description with Ver más */}
        {tagline && (
          <p style={{ fontSize: 14, color: '#78716c', lineHeight: 1.5, marginTop: 10, ...(!descExpanded && showVerMas ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}) }}>
            {tagline}
          </p>
        )}
        {showVerMas && (
          <button onClick={() => setDescExpanded(!descExpanded)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#0c0a09', padding: '4px 0', minHeight: 44, marginTop: 2,  }}>
            {descExpanded ? 'Ver menos' : 'Ver más'}
          </button>
        )}

        {/* Stats inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 14, fontWeight: 500, color: '#0c0a09' }}>
          <span>{productTotal} productos</span>
          <span style={{ color: '#78716c' }}>·</span>
          <span>{store.follower_count || 0} seguidores</span>
          <span style={{ color: '#78716c' }}>·</span>
          <Star size={13} fill="#0c0a09" stroke="#0c0a09" />
          <span>{Number(avgRating || 0).toFixed(1)}</span>
        </div>

        {/* 3 Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button type="button" onClick={handleToggleFollow} disabled={followLoading} style={{
            flex: 1, height: 44, borderRadius: '9999px',
            fontSize: 13, fontWeight: 600,
            border: isFollowing ? '1px solid #e7e5e4' : 'none',
            background: isFollowing ? '#ffffff' : '#0c0a09',
            color: isFollowing ? '#0c0a09' : '#fff',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Heart size={15} fill={isFollowing ? '#0c0a09' : 'none'} />
            {followLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>
          <button type="button" onClick={handleChat} style={{
            flex: 1, height: 44, borderRadius: '9999px',
            fontSize: 13, fontWeight: 600,
            border: '1px solid #e7e5e4', background: '#ffffff', color: '#0c0a09',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <MessageCircle size={15} /> Mensaje
          </button>
          <button type="button" onClick={handleShare} style={{
            flex: 1, height: 44, borderRadius: '9999px',
            fontSize: 13, fontWeight: 600,
            border: '1px solid #e7e5e4', background: '#ffffff', color: '#0c0a09',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Share2 size={15} /> Compartir
          </button>
        </div>

        {/* Free shipping bar */}
        {(storePlan === 'pro' || storePlan === 'elite') && store.free_shipping_min && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: '12px',
            background: '#f5f5f4', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Truck size={16} color="#0c0a09" />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0c0a09' }}>
              Envío gratis desde {convertAndFormatPrice(store.free_shipping_min, 'EUR')} en esta tienda
            </span>
          </div>
        )}
      </div>

      {/* ── Sticky Tab Bar ── */}
      <div className="sticky top-0 z-40" style={{ background: '#fafaf9', borderBottom: '1px solid #e7e5e4', marginTop: 16 }}>
        <div role="tablist" aria-label="Secciones de la tienda" style={{ display: 'flex', overflowX: 'auto', padding: '0 16px', scrollbarWidth: 'none' }}>
          {tabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '12px 16px', whiteSpace: 'nowrap', minHeight: 44,
              fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              color: activeTab === tab.id ? '#0c0a09' : '#78716c',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #0c0a09' : '2px solid transparent',
            }}>
              {tab.icon} {tab.label}
              {tab.count !== null && <span style={{ marginLeft: 4, fontSize: 11 }}>{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: '12px 16px 32px' }}>

        {/* ════ TAB: PRODUCTOS ════ */}
        {activeTab === 'products' && (
          <>
            {/* Category filter pills */}
            {productCategories.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 12, paddingBottom: 4, scrollbarWidth: 'none' }}>
                {productCategories.map(cat => (
                  <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                    flexShrink: 0, padding: '10px 14px', minHeight: 44, borderRadius: '9999px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: categoryFilter === cat ? 'none' : '1px solid #e7e5e4',
                    background: categoryFilter === cat ? '#0c0a09' : '#ffffff',
                    color: categoryFilter === cat ? '#fff' : '#0c0a09',
                  }}>
                    {cat === 'all' ? 'Todo' : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Inline search (if > 12 products) */}
            {allProducts.length > 12 && (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#78716c' }} />
                <input
                  value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="Buscar en esta tienda..."
                  aria-label="Buscar productos en esta tienda"
                  style={{
                    width: '100%', height: 44, paddingLeft: 36, paddingRight: 12,
                    fontSize: 13, color: '#0c0a09',
                    background: '#f5f5f4', border: 'none',
                    borderRadius: '9999px', outline: 'none',
                  }}
                />
              </div>
            )}

            {productsQuery.isLoading ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="animate-pulse rounded-xl bg-stone-100" style={{ aspectRatio: '4/5' }} />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map(product => (
                  <ProductCard key={product.product_id || product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyState text="Esta tienda no tiene productos aún" />
            )}
          </>
        )}

        {/* ════ TAB: RECETAS ════ */}
        {activeTab === 'recipes' && (
          recipesQuery.isLoading ? (
            <LoadingSpinner />
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {recipes.map((recipe) => (
                <button key={recipe.post_id || recipe.id || recipe.recipe_id} type="button"
                  onClick={() => navigate(`/recipes/${recipe.recipe_id || recipe.post_id || recipe.id}`)}
                  style={{
                    display: 'block', width: '100%', overflow: 'hidden',
                    background: '#ffffff', border: '1px solid #e7e5e4',
                    borderRadius: '14px', cursor: 'pointer', padding: 0, textAlign: 'left',
                  }}
                >
                  {recipe.image_url && (
                    <img src={recipe.image_url} alt="" loading="lazy" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
                  )}
                  <div style={{ padding: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0c0a09', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {recipe.title || recipe.caption || 'Receta'}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, color: '#78716c',  }}>
                      {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
                      {recipe.difficulty && <span>📊 {recipe.difficulty}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState text="Esta tienda no ha compartido recetas aún" />
          )
        )}

        {/* ════ TAB: RESEÑAS ════ */}
        {activeTab === 'reviews' && (
          reviewsQuery.isLoading ? (
            <LoadingSpinner />
          ) : reviews.length > 0 ? (
            <div>
              {/* Rating summary card */}
              <div style={{
                background: '#f5f5f4', borderRadius: '14px',
                padding: 20, marginBottom: 16, textAlign: 'center',
              }}>
                <p style={{ fontSize: 48, fontWeight: 700, color: '#0c0a09', margin: 0, lineHeight: 1 }}>
                  {Number(avgRating || 0).toFixed(1)}
                </p>
                <div role="img" aria-label={`Valoración: ${Number(avgRating || 0).toFixed(1)} de 5 estrellas`} style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 8 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={18} aria-hidden="true"
                      fill={i < Math.round(avgRating || 0) ? '#0c0a09' : '#e7e5e4'}
                      stroke={i < Math.round(avgRating || 0) ? '#0c0a09' : '#e7e5e4'}
                    />
                  ))}
                </div>
                <p style={{ fontSize: 13, color: '#78716c', marginTop: 6 }}>
                  {reviewsTotal} reseñas verificadas
                </p>

                {/* Distribution bars */}
                <div style={{ marginTop: 16, maxWidth: 280, margin: '16px auto 0' }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const pct = reviewsTotal > 0 ? (count / reviewsTotal) * 100 : 0;
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#78716c', width: 16, textAlign: 'right' }}>{star}★</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#e7e5e4', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 4, background: '#0c0a09', width: `${pct}%`, transition: 'width 0.5s' }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#78716c', width: 30, textAlign: 'right' }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map((review, idx) => (
                  <div key={review.review_id || idx} style={{
                    background: '#ffffff', borderRadius: '12px',
                    border: '1px solid #e7e5e4', padding: 14,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={16} color="#78716c" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#0c0a09', margin: 0 }}>
                          {review.user_name || review.username || 'Anónimo'}
                        </p>
                        <div role="img" aria-label={`${review.rating || 0} de 5 estrellas`} style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={11} aria-hidden="true"
                              fill={i < (review.rating || 0) ? '#0c0a09' : '#e7e5e4'}
                              stroke={i < (review.rating || 0) ? '#0c0a09' : '#e7e5e4'}
                            />
                          ))}
                        </div>
                      </div>
                      {review.created_at && (
                        <span style={{ fontSize: 11, color: '#78716c',  }}>
                          {new Date(review.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                    {(review.comment || review.text) && (
                      <p style={{ fontSize: 13, color: '#78716c', lineHeight: 1.5, marginTop: 10 }}>
                        {review.comment || review.text}
                      </p>
                    )}
                    {review.product_name && (
                      <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: '9999px', background: '#f5f5f4', color: '#78716c',  }}>
                        {review.product_name}
                      </span>
                    )}
                    {review.seller_reply && (
                      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: '12px', background: '#f5f5f4', borderLeft: '2px solid #e7e5e4' }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#78716c', marginBottom: 4 }}>Respuesta del vendedor</p>
                        <p style={{ fontSize: 13, color: '#78716c',  }}>{review.seller_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState text="Sin reseñas todavía" />
          )
        )}

        {/* ════ TAB: SOBRE NOSOTROS ════ */}
        {activeTab === 'about' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Story */}
            {(store.long_description || store.story || store.tagline) && (
              <div>
                <SectionTitle>NUESTRA HISTORIA</SectionTitle>
                <p style={{ fontSize: 15, lineHeight: 1.7, color: '#78716c', whiteSpace: 'pre-line' }}>
                  {store.long_description || store.story || store.tagline}
                </p>
              </div>
            )}

            {store.founder_quote && (
              <blockquote style={{
                background: '#f5f5f4', borderRadius: '12px',
                padding: 16, fontSize: 14, lineHeight: 1.6,
                color: '#0c0a09', fontStyle: 'italic',
              }}>
                &ldquo;{store.founder_quote}&rdquo;
              </blockquote>
            )}

            {/* Contact info */}
            <div>
              <SectionTitle>CONTACTO</SectionTitle>
              <div style={{ background: '#f5f5f4', borderRadius: '12px', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {store.location && (
                  <InfoRow icon={<MapPin size={16} />} text={store.location} />
                )}
                {store.contact_email && (
                  <a href={`mailto:${store.contact_email}`} style={{ textDecoration: 'none' }}>
                    <InfoRow icon={<Mail size={16} />} text={store.contact_email} />
                  </a>
                )}
                {store.website && (
                  <a href={store.website.startsWith('http') ? store.website : `https://${store.website}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <InfoRow icon={<Globe size={16} />} text={store.website} extra={<ExternalLink size={12} color="#78716c" />} />
                  </a>
                )}
                {store.contact_phone && (
                  <a href={`tel:${store.contact_phone}`} style={{ textDecoration: 'none' }}>
                    <InfoRow icon={<Phone size={16} />} text={store.contact_phone} />
                  </a>
                )}
              </div>
            </div>

            {/* Certifications */}
            {certificates.length > 0 && (
              <div>
                <SectionTitle>CERTIFICACIONES</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {certificates.map((cert, i) => (
                    <span key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 500, padding: '4px 12px',
                      borderRadius: '9999px',
                      background: '#f5f5f4', color: '#0c0a09',
                    }}>
                      <Award size={13} /> {cert.certificate_type || cert.product_name || 'Certificado'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Member since */}
            {store.created_at && (
              <p style={{ fontSize: 13, color: '#78716c',  }}>
                Miembro desde {new Date(store.created_at).getFullYear()}
              </p>
            )}

            {/* Process photos */}
            {store.process_photos?.length > 0 && (
              <div>
                <SectionTitle>NUESTRO PROCESO</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {store.process_photos.map((photo, i) => (
                    <img key={i} src={photo} alt={`Proceso ${i + 1}`} loading="lazy"
                      style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '12px' }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {selectedPost && (
        <PostViewer
          post={selectedPost} posts={recipes}
          profile={{ name: store.name, profile_image: store.logo }}
          currentUser={user}
          onClose={() => setSelectedPost(null)}
          onNavigate={setSelectedPost}
        />
      )}

      {selectedProduct && (
        <ProductDetailOverlay
          product={selectedProduct} store={store} reviews={reviews} certificates={certificates}
          onClose={() => {
            setSelectedProduct(null);
            if (requestedProductId) {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('product');
              setSearchParams(nextParams, { replace: true });
            }
          }}
        />
      )}
    </div>
  );
}

/* ── Helpers ── */

const pillBtnStyle = {
  width: 44, height: 44, borderRadius: '50%',
  background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function badgeStyle(bg, color) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 600, padding: '3px 10px',
    borderRadius: '9999px', fontFamily: 'inherit',
    background: bg, color,
  };
}

function SectionTitle({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: '#78716c', fontFamily: 'inherit', margin: '0 0 10px',
    }}>
      {children}
    </p>
  );
}

function InfoRow({ icon, text, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#78716c', fontFamily: 'inherit' }}>
      <span style={{ color: '#78716c', display: 'flex' }}>{icon}</span>
      <span>{text}</span>
      {extra}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e7e5e4' }}>
      <p style={{ fontSize: 14, color: '#78716c', fontFamily: 'inherit' }}>{text}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: '#e7e5e4', borderTopColor: '#0c0a09' }} />
    </div>
  );
}
