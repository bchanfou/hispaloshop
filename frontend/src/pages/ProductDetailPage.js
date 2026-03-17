import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Share2, Heart, Star, Shield, Truck, ChevronDown,
  Minus, Plus, AlertTriangle, Store, MapPin, Package, Users,
  CheckCircle, User, FileCheck, ChevronRight, Leaf, MessageCircle, Check,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import ProductImage from '../components/ui/ProductImage.tsx';
import {
  useProductDetail,
  useProductPurchaseOptions,
  useProductReviews as useProductReviewsHook,
  useStoreFollow,
} from '../features/products/hooks';
import { useChatContext } from '../context/chat/ChatProvider';
import apiClient from '../services/api/client';
import B2BProductModal from '../components/b2b/B2BProductModal';

const stripEmoji = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
};

// ── Collapsible section ──────────────────────────────────────────────────────
function CollapsibleSection({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, fontWeight: 600, color: 'var(--color-black)',
          fontFamily: 'var(--font-sans)',
        }}>
          {icon}
          {title}
        </span>
        <ChevronDown
          size={18} color="var(--color-stone)"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 16px 16px' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProductDetailPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice } = useLocale();
  const { t } = useTranslation();
  const { openConversation } = useChatContext();

  const {
    product, certificate, storeInfo, inWishlist,
    isLoading: loading, isError: hasProductError,
    wishlistLoading, toggleWishlist: toggleWishlistMutation,
  } = useProductDetail(productId);

  const {
    quantity, setQuantity, selectedVariant, selectedPack, setSelectedPack,
    hasVariants, currentPrice, currentIngredients, currentNutritionalInfo,
    currentAllergens, trackStock, stock, isOutOfStock, isLowStock,
    maxQuantity, handleVariantChange, calculateSavings,
  } = useProductPurchaseOptions(productId);

  const {
    reviews, averageRating, totalReviews, canReview, reviewOrderId,
    isSubmitting: submittingReview, submitReview,
  } = useProductReviewsHook(productId);

  const {
    isFollowing, followLoading, handleFollowStore: toggleStoreFollow,
  } = useStoreFollow(storeInfo?.slug || storeInfo?.store_slug);

  const storeSlug = storeInfo?.slug || storeInfo?.store_slug || null;
  const normalizedAverageRating = Number(averageRating || 0);
  const normalizedStoreRating = Number(storeInfo?.rating || 0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [showB2BModal, setShowB2BModal] = useState(false);
  const galleryRef = useRef(null);
  const addedTimerRef = useRef(null);

  useEffect(() => {
    if (hasProductError) toast.error(t('errors.notFound'));
  }, [hasProductError, t]);

  // Fetch related products
  useEffect(() => {
    if (!product?.category_id) return;
    apiClient.get(`/products?category=${product.category_id}&limit=8`)
      .then((res) => {
        const items = res?.products || res?.items || res || [];
        setRelatedProducts(items.filter((p) => (p.product_id || p.id) !== productId).slice(0, 6));
      })
      .catch(() => {});
  }, [product?.category_id, productId]);

  // Gallery scroll handler
  const handleGalleryScroll = useCallback(() => {
    const el = galleryRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveImageIndex(idx);
  }, []);

  const handleFollowStore = async () => {
    if (!user) { toast.error(t('errors.unauthorized', 'Inicia sesión para seguir tiendas')); return; }
    try {
      await toggleStoreFollow();
      toast.success(isFollowing ? t('store.unfollowed', 'Has dejado de seguir la tienda') : t('store.followed', 'Ahora sigues esta tienda'));
    } catch { toast.error(t('errors.generic', 'Error')); }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) { toast.error('Escribe un comentario'); return; }
    try {
      await submitReview({ orderId: reviewOrderId, rating: reviewRating, comment: reviewComment });
      toast.success('Reseña enviada');
      setShowReviewForm(false); setReviewComment(''); setReviewRating(5);
    } catch (error) { toast.error(error.message || 'No hemos podido enviar la reseña'); }
  };

  const toggleWishlist = async () => {
    if (!user) { toast.info(t('auth.loginRequired', 'Inicia sesión para guardar')); return; }
    try {
      await toggleWishlistMutation();
      toast.success(inWishlist ? t('wishlist.removed', 'Eliminado de lista') : t('wishlist.added', 'Guardado'));
    } catch { toast.error(t('errors.generic', 'Error')); }
  };

  const handleAddToCart = async () => {
    if (isOutOfStock) { toast.error(t('productDetail.outOfStock')); return; }
    toast.loading(t('cart.adding', 'Añadiendo...'), { id: 'add-to-cart' });
    const variantId = selectedVariant?.variant_id || null;
    const packId = selectedPack?.pack_id || null;
    const success = await addToCart(productId, quantity, variantId, packId);
    if (success && success !== 'redirect') {
      toast.success(t('success.added', '¡Añadido!'), { id: 'add-to-cart' });
      setAddedToCart(true);
      clearTimeout(addedTimerRef.current);
      addedTimerRef.current = setTimeout(() => setAddedToCart(false), 1800);
    } else if (success !== 'redirect') {
      toast.error(t('errors.generic', 'Error'), { id: 'add-to-cart' });
    }
  };

  const handleShare = async () => {
    const shareData = { title: product?.name, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(shareData.url); toast.success('Enlace copiado'); }
      catch { toast.error('No se pudo copiar'); }
    }
  };

  const handleAskProducer = async () => {
    try {
      const conv = await openConversation(product.producer_id, 'b2c');
      if (conv?.id) navigate(`/messages/${conv.id}?prefill=${encodeURIComponent(`Hola, tengo una pregunta sobre ${product.name}`)}`);
    } catch {
      toast.error('No se pudo abrir el chat');
    }
  };

  const displayPrice = convertAndFormatPrice(
    (selectedPack?.price || currentPrice || product?.price || 0),
    product?.currency || 'EUR'
  );
  const totalPrice = convertAndFormatPrice(
    (selectedPack?.price || currentPrice || product?.price || 0) * quantity,
    product?.currency || 'EUR'
  );
  const isFreeShipping = !product?.shipping_cost || product?.shipping_cost === 0;
  const certs = product?.certifications || [];
  const images = product?.images || [];
  const primaryImage = images[0] || product?.image_url || null;

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-black)' }} />
      </div>
    );
  }

  // ── Not found ──
  if (!product) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-cream)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, textAlign: 'center',
      }}>
        <p style={{ fontSize: 16, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', marginBottom: 16 }}>
          {t('productDetail.notFound')}
        </p>
        <button
          onClick={() => navigate('/products')}
          style={{
            background: 'var(--color-black)', color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)', padding: '10px 24px',
            fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer',
          }}
        >
          {t('productDetail.backToProducts')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', paddingBottom: 100 }}>
      <SEO
        title={product.name || 'Producto'}
        description={product.description?.slice(0, 160) || ''}
        image={primaryImage}
        type="product"
        product={product}
      />

      {/* ── TopBar ── */}
      <header
        className="sticky top-0 z-50"
        style={{ background: 'var(--color-cream)' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52, padding: '0 16px',
        }}>
          <button
            type="button" onClick={() => navigate(-1)}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
            }}
            aria-label="Volver"
          >
            <ChevronLeft size={20} strokeWidth={2} color="var(--color-black)" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button" onClick={handleShare}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
              }}
              aria-label="Compartir"
            >
              <Share2 size={18} strokeWidth={1.8} color="var(--color-black)" />
            </button>
            <button
              type="button" onClick={toggleWishlist} disabled={wishlistLoading}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-surface)', border: 'none', cursor: 'pointer',
              }}
              aria-label={inWishlist ? 'En tu lista' : 'Guardar'}
            >
              <Heart
                size={18} strokeWidth={inWishlist ? 0 : 1.8}
                fill={inWishlist ? 'var(--color-black)' : 'none'}
                color="var(--color-black)"
              />
            </button>
          </div>
        </div>
      </header>

      {/* ── Image Gallery — 1:1 scroll-snap ── */}
      <div style={{ position: 'relative', width: '100%', background: 'var(--color-surface)' }}>
        <div
          ref={galleryRef}
          onScroll={handleGalleryScroll}
          style={{
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {(images.length > 0 ? images : [primaryImage]).map((img, i) => (
            <div
              key={i}
              style={{
                flex: '0 0 100%',
                scrollSnapAlign: 'start',
                position: 'relative',
                width: '100%',
                paddingTop: '100%',
              }}
            >
              <div style={{ position: 'absolute', inset: 0 }}>
                <ProductImage
                  src={img}
                  productName={product.name}
                  className="h-full w-full"
                  imageClassName=""
                  sizes="100vw"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: 'var(--color-black)', color: '#fff',
              padding: '6px 16px', borderRadius: 'var(--radius-full)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
            }}>
              Agotado
            </span>
          </div>
        )}

        {/* Scroll dots */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 6,
          }}>
            {images.slice(0, 8).map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === activeImageIndex ? 'var(--color-black)' : 'rgba(0,0,0,0.25)',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>
        )}

        {/* Counter badge */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            borderRadius: 'var(--radius-full)',
            padding: '3px 10px', fontSize: 11, fontWeight: 600,
            fontFamily: 'var(--font-sans)',
          }}>
            {activeImageIndex + 1}/{images.length}
          </div>
        )}
      </div>

      {/* ── Product Header ── */}
      <div style={{ padding: '16px 16px 0' }}>
        {/* Certifications */}
        {certs.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {certs.map((cert, idx) => (
              <span key={idx} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--color-surface)',
                color: 'var(--color-black)',
                fontSize: 10, fontWeight: 500, padding: '3px 8px',
                borderRadius: 'var(--radius-full)', fontFamily: 'var(--font-sans)',
              }}>
                <Shield size={10} />
                {cert}
              </span>
            ))}
          </div>
        )}

        {/* Name */}
        <h1 style={{
          fontSize: 20, fontWeight: 600, color: 'var(--color-black)',
          fontFamily: 'var(--font-sans)', lineHeight: 1.3, margin: 0,
        }}>
          {product.name}
        </h1>

        {/* Certification badges */}
        {(product.certifications?.length > 0 || product.is_organic || product.is_gluten_free || product.is_vegan || product.is_halal || product.is_km0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {product.is_organic && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--color-black)', background: 'var(--color-surface, #f5f5f4)', borderRadius: 'var(--radius-full, 999px)', padding: '4px 10px', fontFamily: 'var(--font-sans)' }}>
                <Leaf size={12} /> Ecológico
              </span>
            )}
            {product.is_gluten_free && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--color-black)', background: 'var(--color-surface, #f5f5f4)', borderRadius: 'var(--radius-full, 999px)', padding: '4px 10px', fontFamily: 'var(--font-sans)' }}>
                <Shield size={12} /> Sin gluten
              </span>
            )}
            {product.is_vegan && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--color-black)', background: 'var(--color-surface, #f5f5f4)', borderRadius: 'var(--radius-full, 999px)', padding: '4px 10px', fontFamily: 'var(--font-sans)' }}>
                <Leaf size={12} /> Vegano
              </span>
            )}
            {product.is_halal && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--color-black)', background: 'var(--color-surface, #f5f5f4)', borderRadius: 'var(--radius-full, 999px)', padding: '4px 10px', fontFamily: 'var(--font-sans)' }}>
                <CheckCircle size={12} /> Halal
              </span>
            )}
            {product.is_km0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--color-black)', background: 'var(--color-surface, #f5f5f4)', borderRadius: 'var(--radius-full, 999px)', padding: '4px 10px', fontFamily: 'var(--font-sans)' }}>
                <MapPin size={12} /> Km 0
              </span>
            )}
            {product.certifications?.map((cert, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: 'var(--color-black)', background: 'var(--color-surface, #f5f5f4)', borderRadius: 'var(--radius-full, 999px)', padding: '4px 10px', fontFamily: 'var(--font-sans)' }}>
                <FileCheck size={12} /> {cert.name || cert}
              </span>
            ))}
          </div>
        )}

        {/* Social proof — orders this month */}
        {product.stats?.orders_count > 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-stone)', marginTop: 6, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users size={12} /> {product.stats.orders_count} personas compraron este mes
          </p>
        )}

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Star size={16} fill="var(--color-black)" stroke="var(--color-black)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
              {Number.isFinite(normalizedAverageRating) ? normalizedAverageRating.toFixed(1) : '0.0'}
            </span>
          </div>
          <span style={{ fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
            ({totalReviews} {t('productDetail.reviews', 'reseñas')})
          </span>
          {product.units_sold > 0 && (
            <span style={{ fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
              · {product.units_sold} vendidos
            </span>
          )}
        </div>

        {/* Price */}
        <div style={{ marginTop: 12 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
            {displayPrice}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-stone)', marginLeft: 6, fontFamily: 'var(--font-sans)' }}>
            {t('productDetail.taxNote', 'IVA no incluido')}
          </span>
        </div>

        {/* Stock warnings */}
        {isOutOfStock && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
            padding: '10px 12px', marginTop: 12,
          }}>
            <AlertTriangle size={16} color="var(--color-stone)" />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
              {t('productDetail.outOfStock')}
            </span>
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
            padding: '10px 12px', marginTop: 12,
          }}>
            <AlertTriangle size={16} color="var(--color-stone)" />
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
              {t('productDetail.lowStockWarning', { count: stock })}
            </span>
          </div>
        )}

        {/* Shipping */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 12, padding: '10px 0',
        }}>
          <Truck size={16} color={isFreeShipping ? 'var(--color-black)' : 'var(--color-stone)'} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
            {isFreeShipping
              ? t('products.freeShipping', 'Envío gratis')
              : `${t('products.shippingCost', 'Envío')}: ${convertAndFormatPrice(product.shipping_cost, 'EUR')}`
            }
          </span>
        </div>
      </div>

      {/* ── Variant Selector ── */}
      {hasVariants && product.variants?.length > 1 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
            {t('productDetail.selectVariant', 'Variante')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {product.variants.map((variant) => {
              const isSelected = selectedVariant?.variant_id === variant.variant_id;
              return (
                <button
                  key={variant.variant_id}
                  onClick={() => handleVariantChange(variant)}
                  style={{
                    padding: '6px 16px', borderRadius: 'var(--radius-full)',
                    fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
                    border: isSelected ? '1.5px solid var(--color-black)' : '1px solid var(--color-border)',
                    background: isSelected ? 'var(--color-black)' : 'var(--color-white, #fff)',
                    color: isSelected ? '#fff' : 'var(--color-black)',
                    cursor: 'pointer', transition: 'var(--transition-fast)',
                  }}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Packs Selector ── */}
      {((selectedVariant?.packs?.length > 1) || (product.packs?.length > 0)) && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
            {t('productDetail.selectPack', 'Pack')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(selectedVariant?.packs || product.packs || []).map((pack, idx) => {
              const isSelected = selectedPack?.pack_id === pack.pack_id;
              return (
                <button
                  key={pack.pack_id || idx}
                  onClick={() => setSelectedPack(isSelected ? null : pack)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1.5px solid var(--color-black)' : '1px solid var(--color-border)',
                    background: isSelected ? 'var(--color-surface)' : 'var(--color-white, #fff)',
                    cursor: 'pointer', transition: 'var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6,
                      border: isSelected ? '2px solid var(--color-black)' : '2px solid var(--color-border)',
                      background: isSelected ? 'var(--color-black)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
                      {pack.label || `${pack.units || pack.quantity || 1} unidades`}
                    </span>
                    {calculateSavings(pack, selectedVariant) && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: '#fff',
                        background: 'var(--color-black)', borderRadius: 'var(--radius-full)',
                        padding: '2px 8px', fontFamily: 'var(--font-sans)',
                      }}>
                        Ahorra {convertAndFormatPrice(calculateSavings(pack, selectedVariant), 'EUR')}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
                    {convertAndFormatPrice(pack.price, 'EUR')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quantity Selector ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderTop: '1px solid var(--color-border)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
          {t('productDetail.quantity', 'Cantidad')}
        </span>
        <div style={{
          display: 'flex', alignItems: 'center',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
        }}>
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={isOutOfStock}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer',
              color: 'var(--color-stone)',
            }}
          >
            <Minus size={16} />
          </button>
          <span style={{
            minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: 600,
            color: 'var(--color-black)', fontFamily: 'var(--font-sans)',
          }}>
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={isOutOfStock}
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer',
              color: 'var(--color-stone)',
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* ── Producer Card ── */}
      {storeInfo && (
        <Link
          to={storeSlug ? `/store/${storeSlug}` : '/stores'}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', textDecoration: 'none',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {storeInfo.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Store size={20} color="var(--color-stone)" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 14, fontWeight: 600, color: 'var(--color-black)',
              fontFamily: 'var(--font-sans)', margin: 0,
            }}>
              {storeInfo.name}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              {storeInfo.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                  <MapPin size={11} /> {storeInfo.location}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                <Star size={11} fill="var(--color-stone)" stroke="var(--color-stone)" />
                {Number.isFinite(normalizedStoreRating) ? normalizedStoreRating.toFixed(1) : '—'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
                {storeInfo.product_count || 0} productos
              </span>
            </div>
          </div>
          <ChevronRight size={18} color="var(--color-stone)" />
        </Link>
      )}

      {/* Ask producer */}
      {product.producer_id && (
        <div style={{ padding: '0 16px 12px' }}>
          <button
            type="button"
            onClick={handleAskProducer}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 500, color: 'var(--color-black)',
              fontFamily: 'var(--font-sans)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            <MessageCircle size={14} /> Preguntar al productor
          </button>
        </div>
      )}

      {/* ── Collapsible Sections ── */}
      <div style={{ background: 'var(--color-white, #fff)', borderTop: '1px solid var(--color-border)' }}>
        {/* Description */}
        <CollapsibleSection title={t('productDetail.description', 'Descripción')} defaultOpen>
          <p style={{
            fontSize: 13, lineHeight: 1.6, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', margin: 0,
            ...(!descExpanded && product.description?.length > 200 ? {
              display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            } : {}),
          }}>
            {product.description}
          </p>
          {product.description?.length > 200 && (
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              style={{
                background: 'none', border: 'none', padding: 0, marginTop: 6,
                fontSize: 13, fontWeight: 600, color: 'var(--color-black)',
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
              }}
            >
              {descExpanded ? t('common.showLess', 'Ver menos') : t('common.showMore', 'Ver más')}
            </button>
          )}
          {/* Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            {product.country_origin && (
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>{t('productDetail.origin', 'Origen')}</span>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{product.country_origin}</p>
              </div>
            )}
            {product.category_id && (
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>{t('productDetail.category', 'Categoría')}</span>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: '2px 0 0', textTransform: 'capitalize' }}>
                  {product.category_id.replace('cat_', '').replace(/-/g, ' ')}
                </p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Ingredients */}
        {currentIngredients?.length > 0 && (
          <CollapsibleSection title={t('productDetail.ingredients', 'Ingredientes')} icon={<Leaf size={16} color="var(--color-stone)" />}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {currentIngredients.map((ingredient, idx) => (
                <span key={idx} style={{
                  fontSize: 12, padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-surface)', color: 'var(--color-black)',
                  fontFamily: 'var(--font-sans)',
                }}>
                  {typeof ingredient === 'object' ? stripEmoji(ingredient.name) : stripEmoji(ingredient)}
                </span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Nutritional Info */}
        {currentNutritionalInfo && Object.keys(currentNutritionalInfo).length > 0 && (
          <CollapsibleSection title={t('productDetail.nutritionalInfo', 'Info Nutricional')}>
            <p style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
              {t('productDetail.per100g', 'Por 100g')}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                ['calories', t('certificate.calories', 'Calorías'), ''],
                ['protein', t('certificate.protein', 'Proteínas'), 'g'],
                ['carbohydrates', t('certificate.carbohydrates', 'Carbohidratos'), 'g'],
                ['sugars', t('certificate.sugars', 'Azúcares'), 'g'],
                ['fat', t('certificate.fat', 'Grasas'), 'g'],
                ['saturated_fat', t('certificate.saturatedFat', 'Grasas Sat.'), 'g'],
                ['fiber', t('certificate.fiber', 'Fibra'), 'g'],
                ['sodium', t('certificate.sodium', 'Sodio'), 'mg'],
                ['salt', t('certificate.salt', 'Sal'), 'g'],
              ].filter(([key]) => currentNutritionalInfo[key] !== undefined).map(([key, label, unit]) => (
                <div key={key} style={{
                  background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                  padding: '8px', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                    {currentNutritionalInfo[key]}{unit}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{label}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Allergens */}
        {currentAllergens?.length > 0 && (
          <CollapsibleSection title={t('productDetail.allergens', 'Alérgenos')} icon={<AlertTriangle size={16} color="var(--color-stone)" />}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {currentAllergens.map((allergen, idx) => (
                <span key={idx} style={{
                  fontSize: 12, fontWeight: 500, padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-surface)', color: 'var(--color-black)',
                  fontFamily: 'var(--font-sans)',
                }}>
                  {allergen}
                </span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Certificate */}
        {certificate && (
          <Link
            to={`/certificate/${productId}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', textDecoration: 'none',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileCheck size={18} color="var(--color-black)" />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                  {t('productDetail.viewCertificate', 'Ver certificado')}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                  {t('productDetail.verifiedProduct', 'Producto verificado')}
                </p>
              </div>
            </div>
            <ChevronRight size={18} color="var(--color-stone)" />
          </Link>
        )}
      </div>

      {/* ── Reviews Preview ── */}
      <div style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
            {t('productDetail.customerReviews', 'Reseñas')} ({totalReviews})
          </h2>
          {canReview && !showReviewForm && (
            <button
              type="button" onClick={() => setShowReviewForm(true)}
              style={{
                fontSize: 13, fontWeight: 500, color: 'var(--color-black)',
                background: 'none', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-full)', padding: '6px 14px',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              {t('productDetail.writeReview', 'Escribir reseña')}
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div style={{
            background: 'var(--color-white, #fff)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)', padding: 16, marginBottom: 16,
          }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
              {t('productDetail.yourReview', 'Tu reseña')}
            </p>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                <button
                  key={num} onClick={() => setReviewRating(num)}
                  style={{
                    width: 30, height: 30, borderRadius: '50%',
                    fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
                    background: num <= reviewRating ? 'var(--color-black)' : 'var(--color-surface)',
                    color: num <= reviewRating ? '#fff' : 'var(--color-stone)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={t('productDetail.reviewPlaceholder', 'Comparte tu experiencia...')}
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', fontSize: 13, fontFamily: 'var(--font-sans)',
                color: 'var(--color-black)', resize: 'none', outline: 'none',
                background: 'var(--color-surface)',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={handleSubmitReview} disabled={submittingReview}
                style={{
                  background: 'var(--color-black)', color: '#fff', border: 'none',
                  borderRadius: 'var(--radius-md)', padding: '8px 20px',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                  cursor: 'pointer', opacity: submittingReview ? 0.5 : 1,
                }}
              >
                {submittingReview ? 'Enviando...' : t('productDetail.submitReview', 'Enviar')}
              </button>
              <button
                onClick={() => setShowReviewForm(false)}
                style={{
                  background: 'none', color: 'var(--color-stone)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: '8px 20px',
                  fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: 'pointer',
                }}
              >
                {t('common.cancel', 'Cancelar')}
              </button>
            </div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reviews.slice(0, 3).map((review, idx) => (
              <div key={idx} style={{
                background: 'var(--color-white, #fff)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', padding: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--color-surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <User size={16} color="var(--color-stone)" />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                        {review.user_name || 'Cliente'}
                      </p>
                      {review.verified_purchase && (
                        <p style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                          <CheckCircle size={10} /> Compra verificada
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'var(--color-surface)', borderRadius: 'var(--radius-full)',
                    padding: '3px 8px',
                  }}>
                    <Star size={12} fill="var(--color-black)" stroke="var(--color-black)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
                      {review.rating}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', lineHeight: 1.5, margin: 0 }}>
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '32px 16px',
            background: 'var(--color-white, #fff)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}>
            <Star size={32} color="var(--color-border)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>
              {t('productDetail.noReviews', 'Aún no hay reseñas')}
            </p>
          </div>
        )}
      </div>

      {/* ── B2B Wholesale Card — only for product owner (producer/importer) ── */}
      {user && (user.role === 'producer' || user.role === 'importer') &&
        (user.user_id === product.seller_id || user.id === product.seller_id) && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 16,
          }}>
            <p style={{
              fontSize: 15, fontWeight: 600, color: 'var(--color-black)',
              fontFamily: 'var(--font-sans)', margin: '0 0 4px',
            }}>
              📋 Oferta mayorista
            </p>
            {product.b2b_enabled ? (
              <>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                  {product.b2b_settings?.wholesale_price && (
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>Precio mayorista</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                        {product.b2b_settings.wholesale_price}€ / ud
                      </p>
                    </div>
                  )}
                  {product.b2b_settings?.moq && (
                    <div>
                      <span style={{ fontSize: 11, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)' }}>MOQ</span>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                        {product.b2b_settings.moq} unidades
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowB2BModal(true)}
                  style={{
                    marginTop: 12, padding: '8px 20px',
                    background: 'var(--color-black)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-full)',
                    fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                  }}
                >
                  Editar condiciones
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', margin: '4px 0 12px' }}>
                  Añade este producto al catálogo B2B para recibir pedidos mayoristas.
                </p>
                <button
                  type="button"
                  onClick={() => setShowB2BModal(true)}
                  style={{
                    padding: '8px 20px',
                    background: 'var(--color-black)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-full)',
                    fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                  }}
                >
                  Añadir al catálogo B2B
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* B2B Modal */}
      <B2BProductModal
        isOpen={showB2BModal}
        onClose={() => setShowB2BModal(false)}
        product={product}
        onSaved={() => { /* product will refetch via hook */ }}
      />

      {/* ── Related Products ── */}
      {relatedProducts.length > 0 && (
        <div style={{ padding: '20px 0' }}>
          <h2 style={{
            fontSize: 16, fontWeight: 600, color: 'var(--color-black)',
            fontFamily: 'var(--font-sans)', margin: '0 0 14px 16px',
          }}>
            {t('productDetail.relatedProducts', 'Productos relacionados')}
          </h2>
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto',
            scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
            padding: '0 16px',
          }}>
            {relatedProducts.map((rp) => {
              const rpId = rp.product_id || rp.id;
              const rpImage = rp.images?.[0] || rp.image_url || null;
              return (
                <Link
                  key={rpId}
                  to={`/producto/${rpId}`}
                  style={{
                    flex: '0 0 140px', scrollSnapAlign: 'start',
                    textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{
                    width: 140, height: 140, borderRadius: 'var(--radius-md)',
                    overflow: 'hidden', background: 'var(--color-surface)',
                  }}>
                    {rpImage ? (
                      <ProductImage src={rpImage} productName={rp.name} className="h-full w-full" imageClassName="" sizes="140px" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={24} color="var(--color-border)" />
                      </div>
                    )}
                  </div>
                  <p style={{
                    fontSize: 12, fontWeight: 500, color: 'var(--color-black)',
                    fontFamily: 'var(--font-sans)', margin: '6px 0 2px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {rp.name}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-black)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                    {convertAndFormatPrice(rp.price, rp.currency || 'EUR')}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sticky Bottom Bar — add-to-cart with green animation ── */}
      <div
        style={{
          position: 'fixed', bottom: 'calc(50px + env(safe-area-inset-bottom, 0px))', left: 0, right: 0, zIndex: 40,
          background: 'var(--color-white, #fff)',
          borderTop: '1px solid var(--color-border)',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Price */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-black)', fontFamily: 'var(--font-sans)' }}>
              {totalPrice}
            </span>
            {quantity > 1 && (
              <span style={{ fontSize: 12, color: 'var(--color-stone)', fontFamily: 'var(--font-sans)', marginLeft: 4 }}>
                × {quantity}
              </span>
            )}
          </div>

          {/* Add to Cart — green flash on success */}
          <motion.button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            animate={{
              background: addedToCart
                ? 'var(--color-black, #0c0a09)'
                : isOutOfStock
                  ? 'var(--color-surface, #f5f5f4)'
                  : 'var(--color-black, #0c0a09)',
            }}
            transition={{ duration: 0.3 }}
            style={{
              height: 44,
              borderRadius: 'var(--radius-full)',
              padding: '0 28px',
              fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
              border: 'none', cursor: isOutOfStock ? 'not-allowed' : 'pointer',
              color: isOutOfStock ? 'var(--color-stone)' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            data-testid="mobile-buy-button"
          >
            {addedToCart ? (
              <>
                <Check size={18} strokeWidth={2.5} />
                {t('success.added', '¡Añadido!')}
              </>
            ) : isOutOfStock ? (
              t('products.soldOut', 'Agotado')
            ) : (
              t('products.addToCart', 'Añadir al carrito')
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
