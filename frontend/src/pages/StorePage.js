import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award, Bell, CheckCircle, ChevronLeft, ExternalLink, Globe,
  Heart, Mail, MapPin, MessageCircle, Phone, Share2, Shield,
  ShoppingBag, Star, Store, Truck, User, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import PostViewer from '../components/PostViewer';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';
import { useStoreFollow } from '../features/products/hooks';
import { useChatContext } from '../context/chat/ChatProvider';

const normalizeEntityId = (value) => (value == null ? '' : String(value));

export default function StorePage() {
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { convertAndFormatPrice } = useLocale();
  const [activeTab, setActiveTab] = useState('products');
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const requestedProductId = searchParams.get('product');

  const storeQuery = useQuery({
    queryKey: ['store', storeSlug],
    queryFn: () => apiClient.get(`/store/${storeSlug}`),
    enabled: Boolean(storeSlug),
  });
  const store = storeQuery.data ?? null;

  const postsQuery = useQuery({
    queryKey: ['store', storeSlug, 'posts', store?.producer_id],
    queryFn: () => apiClient.get(`/users/${store.producer_id}/posts`),
    enabled: Boolean(store?.producer_id),
  });

  const productsQuery = useQuery({
    queryKey: ['store', storeSlug, 'products'],
    queryFn: () => apiClient.get(`/store/${storeSlug}/products`, { params: { sort: 'featured', limit: 100 } }),
    enabled: Boolean(storeSlug),
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

  const posts = Array.isArray(postsQuery.data) ? postsQuery.data : [];
  const products = Array.isArray(productsQuery.data?.products) ? productsQuery.data.products : [];
  const reviews = Array.isArray(reviewsQuery.data?.reviews) ? reviewsQuery.data.reviews : [];
  const certificates = Array.isArray(certificatesQuery.data) ? certificatesQuery.data : [];
  const productTotal = productsQuery.data?.total || products.length || store?.product_count || 0;
  const reviewsTotal = reviewsQuery.data?.total || reviews.length || store?.review_count || 0;
  const avgRating = reviewsQuery.data?.average_rating || store?.rating || 0;
  const isVerified = Boolean(store?.verified || store?.producer_verified);
  const { isFollowing, followLoading, handleFollowStore } = useStoreFollow(store?.slug || store?.store_slug);
  const { openConversation } = useChatContext();

  const handleToggleFollow = async () => {
    if (!user) { toast.error(t('store.loginToFollow', 'Inicia sesión para seguir tiendas')); return; }
    try {
      await handleFollowStore();
      toast.success(isFollowing ? t('store.unfollowed', 'Dejaste de seguir') : t('store.followed', 'Ahora sigues esta tienda'));
    } catch { toast.error(t('store.followError', 'Error')); }
  };

  const handleChat = async () => {
    try {
      const storeUserId = store.user_id || store.producer_id;
      const conv = await openConversation(storeUserId, 'b2c');
      if (conv?.id) navigate(`/messages/${conv.id}`);
    } catch {
      toast.error('No se pudo abrir el chat');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: store?.name, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t('social.linkCopied', 'Enlace copiado'));
    }
  };

  useEffect(() => {
    if (!requestedProductId || products.length === 0) return;
    const matched = products.find(p => normalizeEntityId(p.product_id || p.id) === normalizeEntityId(requestedProductId));
    if (matched) { setActiveTab('products'); setSelectedProduct(prev => normalizeEntityId(prev?.product_id || prev?.id) === normalizeEntityId(matched.product_id || matched.id) ? prev : matched); }
  }, [products, requestedProductId]);

  const tabs = [
    { id: 'products', label: 'Productos', count: productTotal },
    { id: 'posts', label: 'Publicaciones', count: posts.length },
    { id: 'reviews', label: 'Reseñas', count: reviewsTotal },
    { id: 'about', label: 'Historia', count: null },
  ];

  // ── Loading ──
  if (storeQuery.isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-black)' }} />
      </div>
    );
  }

  // ── Not found ──
  if (!store) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-cream)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center',
      }}>
        <p style={{ fontSize: 16, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', marginBottom: 16 }}>
          {t('store.notFound', 'Tienda no encontrada')}
        </p>
        <button
          onClick={() => navigate('/stores')}
          style={{
            background: 'var(--color-black)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '10px 24px',
            fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer',
          }}
        >
          {t('store.viewAll', 'Ver tiendas')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)' }}>
      {/* ── TopBar (over hero) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 52,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}>
        <button
          type="button" onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Volver"
        >
          <ChevronLeft size={20} strokeWidth={2} color="#fff" />
        </button>
        <button
          type="button" onClick={handleShare}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Compartir"
        >
          <Share2 size={18} strokeWidth={1.8} color="#fff" />
        </button>
      </div>

      {/* ── Hero Banner ── */}
      <div style={{ position: 'relative', width: '100%', height: 200, background: 'var(--color-surface)' }}>
        {store.hero_image ? (
          <img src={store.hero_image} alt={`Banner de ${store.name}`} loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--color-surface)' }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
        }} />
      </div>

      {/* ── Store Info ── */}
      <div style={{ position: 'relative', padding: '0 16px', marginTop: -40 }}>
        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
          border: '3px solid var(--color-cream)', background: 'var(--color-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {store.logo ? (
            <img src={store.logo} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Store size={28} color="var(--color-stone)" />
          )}
        </div>

        {/* Name + verified */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
            {store.name}
          </h1>
          {isVerified && <CheckCircle size={18} color="var(--color-black)" />}
        </div>

        {/* Location */}
        {store.location && (
          <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', marginTop: 4 }}>
            <MapPin size={13} /> {store.location}
          </p>
        )}

        {/* Tagline */}
        {store.tagline && (
          <p style={{ fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', lineHeight: 1.5, marginTop: 8 }}>
            {store.tagline}
          </p>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
              {productTotal}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', margin: 0 }}>productos</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
              {store.follower_count || 0}
            </p>
            <p style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', margin: 0 }}>seguidores</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Star size={14} fill="var(--color-black)" stroke="var(--color-black)" />
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
              {Number(avgRating || 0).toFixed(1)}
            </span>
          </div>
        </div>

        {/* Follow + Contact buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            type="button" onClick={handleToggleFollow} disabled={followLoading}
            style={{
              flex: 1, height: 40, borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
              border: isFollowing ? '1px solid var(--color-border)' : 'none',
              background: isFollowing ? 'var(--color-white, #fff)' : 'var(--color-black)',
              color: isFollowing ? 'var(--color-black)' : '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'var(--transition-fast)',
            }}
          >
            {isFollowing ? <Bell size={16} /> : <Heart size={16} />}
            {followLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
          </button>
          {store.contact_email && (
            <a
              href={`mailto:${store.contact_email}`}
              style={{
                height: 40, borderRadius: 'var(--radius-md)',
                padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-white, #fff)', color: 'var(--color-black)',
                textDecoration: 'none',
              }}
            >
              <Mail size={16} /> Contactar
            </a>
          )}
          <button
            type="button" onClick={handleChat}
            style={{
              height: 40, borderRadius: 'var(--radius-md)',
              padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)', color: 'var(--color-black)',
              cursor: 'pointer',
            }}
          >
            <MessageCircle size={16} /> Chat
          </button>
        </div>

        {/* Certification row */}
        {certificates.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {certificates.map((cert, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, fontWeight: 500, padding: '3px 10px',
                borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-sans)',
                background: 'var(--color-surface)', color: 'var(--color-black)',
              }}>
                <Award size={12} />
                {cert.certificate_type || cert.product_name || 'Certificado'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Sticky Tab Bar ── */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: 'var(--color-cream)',
          borderBottom: '1px solid var(--color-border)',
          marginTop: 16,
        }}
      >
        <div style={{
          display: 'flex', gap: 0, overflowX: 'auto',
          padding: '0 16px',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px', whiteSpace: 'nowrap',
                fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
                fontFamily: 'var(--font-sans)',
                color: activeTab === tab.id ? 'var(--color-black)' : 'var(--color-stone)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid var(--color-black)' : '2px solid transparent',
                transition: 'var(--transition-fast)',
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  marginLeft: 6, fontSize: 11, fontWeight: 500,
                  color: activeTab === tab.id ? 'var(--color-black)' : 'var(--color-stone)',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div style={{ padding: '16px 16px 32px' }}>

        {/* Products — 3-column grid */}
        {activeTab === 'products' && (
          productsQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-black)' }} />
            </div>
          ) : products.length > 0 ? (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
            }}>
              {products.map((product) => (
                <ProductCard
                  key={product.product_id || product.id}
                  product={product}
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <EmptyState text="No hay productos disponibles" />
          )
        )}

        {/* Posts — 3-column grid */}
        {activeTab === 'posts' && (
          postsQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-black)' }} />
            </div>
          ) : posts.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {posts.map((post) => (
                <button
                  key={post.post_id}
                  type="button"
                  onClick={() => setSelectedPost(post)}
                  style={{
                    display: 'block', width: '100%', aspectRatio: '1', overflow: 'hidden',
                    background: 'var(--color-surface)', border: 'none', cursor: 'pointer', padding: 0,
                    borderRadius: 2,
                  }}
                >
                  {post.image_url ? (
                    <img src={post.image_url} alt={post.caption || ''} loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', background: 'var(--color-black)',
                      display: 'flex', alignItems: 'flex-end', padding: 8,
                    }}>
                      <p style={{
                        fontSize: 10, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-sans)',
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {post.caption || 'Publicación'}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <EmptyState text="No hay publicaciones todavía" />
          )
        )}

        {/* Reviews */}
        {activeTab === 'reviews' && (
          reviewsQuery.isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-black)' }} />
            </div>
          ) : reviews.length > 0 ? (
            <div>
              {/* Rating summary */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                padding: 16, marginBottom: 16,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 36, fontWeight: 700, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1 }}>
                    {Number(avgRating || 0).toFixed(1)}
                  </p>
                  <div style={{ display: 'flex', gap: 2, marginTop: 6, justifyContent: 'center' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14}
                        fill={i < Math.round(avgRating || 0) ? 'var(--color-black)' : 'var(--color-border)'}
                        stroke={i < Math.round(avgRating || 0) ? 'var(--color-black)' : 'var(--color-border)'}
                      />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', marginTop: 4 }}>
                    {reviewsTotal} reseñas
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = reviews.filter(r => r.rating === star).length;
                    const pct = reviewsTotal > 0 ? (count / reviewsTotal) * 100 : 0;
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', width: 12, textAlign: 'right' }}>{star}</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: 'var(--color-black)', width: `${pct}%`, transition: 'width 0.5s' }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', width: 16, textAlign: 'right' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Review list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map((review, idx) => (
                  <div key={review.review_id || idx} style={{
                    background: 'var(--color-white, #fff)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', padding: 14,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--color-surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <User size={16} color="var(--color-stone)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                          {review.user_name || review.username || 'Anónimo'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={11}
                              fill={i < (review.rating || 0) ? 'var(--color-black)' : 'var(--color-border)'}
                              stroke={i < (review.rating || 0) ? 'var(--color-black)' : 'var(--color-border)'}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    {(review.comment || review.text) && (
                      <p style={{ fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', lineHeight: 1.5, marginTop: 8 }}>
                        {review.comment || review.text}
                      </p>
                    )}
                    {review.seller_reply && (
                      <div style={{
                        marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface)', borderLeft: '2px solid var(--color-border)',
                      }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
                          Respuesta del vendedor
                        </p>
                        <p style={{ fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                          {review.seller_reply}
                        </p>
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

        {/* About / Historia */}
        {activeTab === 'about' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(store.long_description || store.story) && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
                  {t('store.ourStory', 'Nuestra historia')}
                </h3>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', whiteSpace: 'pre-line' }}>
                  {store.long_description || store.story}
                </p>
              </div>
            )}

            {store.founder_quote && (
              <blockquote style={{
                background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                padding: 16, fontSize: 13, lineHeight: 1.6,
                color: 'var(--color-black)', fontStyle: 'italic',
                fontFamily: 'var(--font-sans)',
              }}>
                &ldquo;{store.founder_quote}&rdquo;
              </blockquote>
            )}

            {store.process_photos?.length > 0 && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
                  {t('store.process', 'Nuestro proceso')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {store.process_photos.map((photo, i) => (
                    <img key={i} src={photo} alt={`Proceso ${i + 1}`} loading="lazy"
                      style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                  ))}
                </div>
              </div>
            )}

            {/* Contact info */}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
                {t('store.contact', 'Contacto')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {store.contact_email && (
                  <a href={`mailto:${store.contact_email}`} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)',
                    textDecoration: 'none',
                  }}>
                    <Mail size={16} color="var(--color-stone)" /> {store.contact_email}
                  </a>
                )}
                {store.contact_phone && (
                  <a href={`tel:${store.contact_phone}`} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)',
                    textDecoration: 'none',
                  }}>
                    <Phone size={16} color="var(--color-stone)" /> {store.contact_phone}
                  </a>
                )}
                {store.website && (
                  <a href={store.website.startsWith('http') ? store.website : `https://${store.website}`}
                    target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)',
                      textDecoration: 'none',
                    }}>
                    <Globe size={16} color="var(--color-stone)" /> {store.website}
                    <ExternalLink size={12} color="var(--color-stone)" />
                  </a>
                )}
                {store.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                    <MapPin size={16} color="var(--color-stone)" /> {store.location}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {selectedPost && (
        <PostViewer
          post={selectedPost}
          posts={posts}
          profile={{ name: store.name, profile_image: store.logo }}
          currentUser={user}
          onClose={() => setSelectedPost(null)}
          onNavigate={setSelectedPost}
        />
      )}

      {selectedProduct && (
        <ProductDetailOverlay
          product={selectedProduct}
          store={store}
          reviews={reviews}
          certificates={certificates}
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

function EmptyState({ text }) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 16px',
      background: 'var(--color-white, #fff)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
    }}>
      <p style={{ fontSize: 14, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>{text}</p>
    </div>
  );
}
