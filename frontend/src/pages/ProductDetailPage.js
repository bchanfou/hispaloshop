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
    <div className="border-b border-stone-200">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-stone-950">
          {icon}
          {title}
        </span>
        <ChevronDown
          size={18}
          className={`text-stone-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
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
    currentAllergens, stock, isOutOfStock, isLowStock,
    maxQuantity, handleVariantChange, calculateSavings,
  } = useProductPurchaseOptions(productId);

  const {
    reviews, averageRating, totalReviews, canReview, reviewOrderId,
    isSubmitting: submittingReview, submitReview,
  } = useProductReviewsHook(productId);

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
  const rafRef = useRef(null);

  // Reset transient UI state when navigating between products
  useEffect(() => {
    setActiveImageIndex(0);
    setDescExpanded(false);
    setQuantity(1);
    setShowReviewForm(false);
    setReviewComment('');
    setReviewRating(5);
    window.scrollTo(0, 0);
  }, [productId, setQuantity]);

  useEffect(() => {
    if (hasProductError) toast.error(t('errors.notFound'));
  }, [hasProductError, t]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(addedTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Fetch related products
  useEffect(() => {
    if (!product?.category_id) return;
    let cancelled = false;
    apiClient.get(`/products?category=${product.category_id}&limit=8`)
      .then((res) => {
        if (cancelled) return;
        const items = res?.products || res?.items || res || [];
        setRelatedProducts(items.filter((p) => (p.product_id || p.id) !== productId).slice(0, 6));
      })
      .catch(() => { if (!cancelled) setRelatedProducts([]); });
    return () => { cancelled = true; };
  }, [product?.category_id, productId]);

  // Gallery scroll handler — throttled with rAF to avoid setState on every pixel
  const handleGalleryScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = galleryRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollLeft / el.offsetWidth);
      setActiveImageIndex((prev) => (prev !== idx ? idx : prev));
    });
  }, []);

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
    try {
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
    } catch {
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
  const images = product?.images || [];
  const primaryImage = images[0] || product?.image_url || null;

  // ── Loading state ──
  if (loading) {
    return (
      <div role="status" aria-label="Cargando producto" className="flex min-h-screen items-center justify-center bg-[var(--color-cream)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
      </div>
    );
  }

  // ── Not found ──
  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-cream)] p-8 text-center">
        <p className="mb-4 text-base text-stone-500">
          {t('productDetail.notFound')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="rounded-xl bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white"
        >
          {t('productDetail.backToProducts')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] pb-[100px]">
      <SEO
        title={product.name || 'Producto'}
        description={product.description?.slice(0, 160) || ''}
        image={primaryImage}
        type="product"
        product={product}
      />

      {/* ── TopBar ── */}
      <header className="sticky top-0 z-50 bg-[var(--color-cream)]">
        <div className="flex h-[52px] items-center justify-between px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"
            aria-label="Volver"
          >
            <ChevronLeft size={20} strokeWidth={2} className="text-stone-950" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"
              aria-label="Compartir"
            >
              <Share2 size={18} strokeWidth={1.8} className="text-stone-950" />
            </button>
            <button
              type="button"
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"
              aria-label={inWishlist ? 'En tu lista' : 'Guardar'}
            >
              <Heart
                size={18}
                strokeWidth={inWishlist ? 0 : 1.8}
                fill={inWishlist ? 'currentColor' : 'none'}
                className="text-stone-950"
              />
            </button>
          </div>
        </div>
      </header>

      {/* ── Image Gallery — 1:1 scroll-snap ── */}
      <section aria-label="Galería de imágenes del producto" className="relative w-full bg-stone-100">
        <div
          ref={galleryRef}
          onScroll={handleGalleryScroll}
          className="flex overflow-x-auto scrollbar-hide [scroll-snap-type:x_mandatory] [-webkit-overflow-scrolling:touch]"
        >
          {(images.length > 0 ? images : [primaryImage]).map((img, i) => (
            <div
              key={img || i}
              className="relative aspect-square w-full flex-[0_0_100%] [scroll-snap-align:start]"
            >
              <div className="absolute inset-0">
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
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/30">
            <span className="rounded-full bg-stone-950 px-4 py-1.5 text-[13px] font-semibold text-white">
              Agotado
            </span>
          </div>
        )}

        {/* Scroll dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.slice(0, 8).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const el = galleryRef.current;
                  if (el) el.scrollTo({ left: el.offsetWidth * i, behavior: 'smooth' });
                }}
                aria-label={`Ir a imagen ${i + 1}`}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-transparent"
              >
                <span className={`block h-2 w-2 rounded-full transition-colors duration-200 ${
                  i === activeImageIndex ? 'bg-stone-950' : 'bg-black/25'
                }`} />
              </button>
            ))}
          </div>
        )}

        {/* Counter badge */}
        {images.length > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            {activeImageIndex + 1}/{images.length}
          </div>
        )}
      </section>

      {/* ── Product Header ── */}
      <div className="px-4 pt-4">
        {/* Name */}
        <h1 className="text-xl font-semibold leading-tight text-stone-950">
          {product.name}
        </h1>

        {/* Certification badges */}
        {(product.certifications?.length > 0 || product.is_organic || product.is_gluten_free || product.is_vegan || product.is_halal || product.is_km0) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {product.is_organic && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-950">
                <Leaf size={12} /> Ecológico
              </span>
            )}
            {product.is_gluten_free && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-950">
                <Shield size={12} /> Sin gluten
              </span>
            )}
            {product.is_vegan && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-950">
                <Leaf size={12} /> Vegano
              </span>
            )}
            {product.is_halal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-950">
                <CheckCircle size={12} /> Halal
              </span>
            )}
            {product.is_km0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-950">
                <MapPin size={12} /> Km 0
              </span>
            )}
            {product.certifications?.map((cert, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-950">
                <FileCheck size={12} /> {cert.name || cert}
              </span>
            ))}
          </div>
        )}

        {/* Social proof — orders this month */}
        {product.stats?.orders_count > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-stone-500">
            <Users size={12} /> {product.stats.orders_count} personas compraron este mes
          </p>
        )}

        {/* Rating */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star size={16} className="fill-stone-950 text-stone-950" />
            <span className="text-sm font-semibold text-stone-950">
              {Number.isFinite(normalizedAverageRating) ? normalizedAverageRating.toFixed(1) : '0.0'}
            </span>
          </div>
          <span className="text-[13px] text-stone-500">
            ({totalReviews} {t('productDetail.reviews', 'reseñas')})
          </span>
          {product.units_sold > 0 && (
            <span className="text-[13px] text-stone-500">
              · {product.units_sold} vendidos
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mt-3">
          <span className="text-2xl font-bold text-stone-950">
            {displayPrice}
          </span>
          <span className="ml-1.5 text-[11px] text-stone-500">
            {t('productDetail.taxNote', 'IVA no incluido')}
          </span>
        </div>

        {/* Stock warnings */}
        {isOutOfStock && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2.5">
            <AlertTriangle size={16} className="text-stone-500" />
            <span className="text-[13px] font-medium text-stone-500">
              {t('productDetail.outOfStock')}
            </span>
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2.5">
            <AlertTriangle size={16} className="text-stone-500" />
            <span className="text-[13px] font-medium text-stone-500">
              {t('productDetail.lowStockWarning', { count: stock })}
            </span>
          </div>
        )}

        {/* Shipping */}
        <div className="mt-3 flex items-center gap-2 py-2.5">
          <Truck size={16} className={isFreeShipping ? 'text-stone-950' : 'text-stone-500'} />
          <span className="text-[13px] font-medium text-stone-950">
            {isFreeShipping
              ? t('products.freeShipping', 'Envío gratis')
              : `${t('products.shippingCost', 'Envío')}: ${convertAndFormatPrice(product.shipping_cost, 'EUR')}`
            }
          </span>
        </div>
      </div>

      {/* ── Variant Selector ── */}
      {hasVariants && product.variants?.length > 1 && (
        <div className="border-t border-stone-200 px-4 py-3">
          <p className="mb-2.5 text-[13px] font-semibold text-stone-950">
            {t('productDetail.selectVariant', 'Variante')}
          </p>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => {
              const isSelected = selectedVariant?.variant_id === variant.variant_id;
              return (
                <button
                  key={variant.variant_id}
                  type="button"
                  onClick={() => handleVariantChange(variant)}
                  aria-pressed={isSelected}
                  className={`min-h-[44px] rounded-full px-4 py-2.5 text-[13px] font-medium transition-all duration-150 ${
                    isSelected
                      ? 'border-[1.5px] border-stone-950 bg-stone-950 text-white'
                      : 'border border-stone-200 bg-white text-stone-950'
                  }`}
                >
                  {variant.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Packs Selector ── */}
      {((selectedVariant?.packs?.length > 0) || (product.packs?.length > 0)) && (
        <div className="border-t border-stone-200 px-4 py-3">
          <p className="mb-2.5 text-[13px] font-semibold text-stone-950">
            {t('productDetail.selectPack', 'Pack')}
          </p>
          <div className="flex flex-col gap-2">
            {(selectedVariant?.packs || product.packs || []).map((pack, idx) => {
              const isSelected = selectedPack?.pack_id === pack.pack_id;
              return (
                <button
                  key={pack.pack_id || idx}
                  type="button"
                  onClick={() => setSelectedPack(isSelected ? null : pack)}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-3 transition-all duration-150 ${
                    isSelected
                      ? 'border-[1.5px] border-stone-950 bg-stone-100'
                      : 'border border-stone-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                      isSelected ? 'border-stone-950 bg-stone-950' : 'border-stone-200 bg-transparent'
                    }`}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-stone-950">
                      {pack.label || `${pack.units || pack.quantity || 1} unidades`}
                    </span>
                    {calculateSavings(pack, selectedVariant) && (
                      <span className="rounded-full bg-stone-950 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Ahorra {convertAndFormatPrice(calculateSavings(pack, selectedVariant), 'EUR')}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-stone-950">
                    {convertAndFormatPrice(pack.price, 'EUR')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quantity Selector ── */}
      <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3.5">
        <span className="text-sm font-semibold text-stone-950">
          {t('productDetail.quantity', 'Cantidad')}
        </span>
        <div className="flex items-center rounded-xl border border-stone-200">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={isOutOfStock}
            aria-label="Reducir cantidad"
            className="flex h-11 w-11 items-center justify-center text-stone-500 disabled:cursor-not-allowed"
          >
            <Minus size={16} />
          </button>
          <span
            aria-live="polite"
            aria-label={`Cantidad: ${quantity}`}
            className="min-w-[36px] text-center text-sm font-semibold text-stone-950"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={isOutOfStock}
            aria-label="Aumentar cantidad"
            className="flex h-11 w-11 items-center justify-center text-stone-500 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* ── Producer Card ── */}
      {storeInfo && (
        <Link
          to={storeSlug ? `/store/${storeSlug}` : '/stores'}
          className="flex items-center gap-3 border-t border-stone-200 px-4 py-3.5 no-underline"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100">
            {storeInfo.logo ? (
              <img src={storeInfo.logo} alt={storeInfo.name} className="h-full w-full object-cover" />
            ) : (
              <Store size={20} className="text-stone-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-950">
              {storeInfo.name}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              {storeInfo.location && (
                <span className="flex items-center gap-1 text-xs text-stone-500">
                  <MapPin size={11} /> {storeInfo.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-stone-500">
                <Star size={11} className="fill-stone-500 text-stone-500" />
                {Number.isFinite(normalizedStoreRating) ? normalizedStoreRating.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-stone-500">
                {storeInfo.product_count || 0} productos
              </span>
            </div>
          </div>
          <ChevronRight size={18} className="text-stone-500" />
        </Link>
      )}

      {/* Ask producer */}
      {product.producer_id && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={handleAskProducer}
            className="inline-flex items-center gap-1.5 py-2 text-[13px] font-medium text-stone-950 hover:underline"
          >
            <MessageCircle size={14} /> Preguntar al productor
          </button>
        </div>
      )}

      {/* ── Collapsible Sections ── */}
      <div className="border-t border-stone-200 bg-white">
        {/* Description */}
        <CollapsibleSection title={t('productDetail.description', 'Descripción')} defaultOpen>
          <p className={`text-[13px] leading-relaxed text-stone-500 ${
            !descExpanded && product.description?.length > 200 ? 'line-clamp-4' : ''
          }`}>
            {product.description}
          </p>
          {product.description?.length > 200 && (
            <button
              type="button"
              onClick={() => setDescExpanded((v) => !v)}
              className="mt-1 py-2 text-[13px] font-semibold text-stone-950"
            >
              {descExpanded ? t('common.showLess', 'Ver menos') : t('common.showMore', 'Ver más')}
            </button>
          )}
          {/* Details */}
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            {product.country_origin && (
              <div>
                <span className="text-[11px] text-stone-500">{t('productDetail.origin', 'Origen')}</span>
                <p className="mt-0.5 text-[13px] font-medium text-stone-950">{product.country_origin}</p>
              </div>
            )}
            {product.category_id && (
              <div>
                <span className="text-[11px] text-stone-500">{t('productDetail.category', 'Categoría')}</span>
                <p className="mt-0.5 text-[13px] font-medium capitalize text-stone-950">
                  {product.category_id.replace('cat_', '').replace(/-/g, ' ')}
                </p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Ingredients */}
        {currentIngredients?.length > 0 && (
          <CollapsibleSection title={t('productDetail.ingredients', 'Ingredientes')} icon={<Leaf size={16} className="text-stone-500" />}>
            <div className="flex flex-wrap gap-1.5">
              {currentIngredients.map((ingredient, idx) => (
                <span key={idx} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-950">
                  {typeof ingredient === 'object' ? stripEmoji(ingredient.name) : stripEmoji(ingredient)}
                </span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Nutritional Info */}
        {currentNutritionalInfo && Object.keys(currentNutritionalInfo).length > 0 && (
          <CollapsibleSection title={t('productDetail.nutritionalInfo', 'Info Nutricional')}>
            <p className="mb-2.5 text-[11px] text-stone-500">
              {t('productDetail.per100g', 'Por 100g')}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                <div key={key} className="rounded-xl bg-stone-100 p-2 text-center">
                  <p className="text-base font-semibold text-stone-950">
                    {currentNutritionalInfo[key]}{unit}
                  </p>
                  <p className="mt-0.5 text-[10px] text-stone-500">{label}</p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Allergens */}
        {currentAllergens?.length > 0 && (
          <CollapsibleSection title={t('productDetail.allergens', 'Alérgenos')} icon={<AlertTriangle size={16} className="text-stone-500" />}>
            <div className="flex flex-wrap gap-1.5">
              {currentAllergens.map((allergen, idx) => (
                <span key={idx} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-950">
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
            className="flex items-center justify-between border-b border-stone-200 px-4 py-3.5 no-underline"
          >
            <div className="flex items-center gap-2.5">
              <FileCheck size={18} className="text-stone-950" />
              <div>
                <p className="text-sm font-semibold text-stone-950">
                  {t('productDetail.viewCertificate', 'Ver certificado')}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {t('productDetail.verifiedProduct', 'Producto verificado')}
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-stone-500" />
          </Link>
        )}
      </div>

      {/* ── Reviews Preview ── */}
      <div className="px-4 py-5">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-950">
            {t('productDetail.customerReviews', 'Reseñas')} ({totalReviews})
          </h2>
          {canReview && !showReviewForm && (
            <button
              type="button"
              onClick={() => setShowReviewForm(true)}
              className="min-h-[44px] rounded-full border border-stone-200 px-3.5 py-2.5 text-[13px] font-medium text-stone-950"
            >
              {t('productDetail.writeReview', 'Escribir reseña')}
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div className="mb-4 rounded-xl border border-stone-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-stone-950">
              {t('productDetail.yourReview', 'Tu reseña')}
            </p>
            <div role="radiogroup" aria-label="Puntuación" className="mb-3 flex gap-1">
              {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setReviewRating(num)}
                  role="radio"
                  aria-checked={num === reviewRating}
                  aria-label={`${num} de 10`}
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-xs font-semibold ${
                    num <= reviewRating
                      ? 'bg-stone-950 text-white'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={t('productDetail.reviewPlaceholder', 'Comparte tu experiencia...')}
              aria-label="Comentario de la reseña"
              rows={3}
              className="w-full resize-none rounded-xl border border-stone-200 bg-stone-100 px-3 py-2.5 text-[13px] text-stone-950 outline-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="min-h-[44px] rounded-xl bg-stone-950 px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {submittingReview ? 'Enviando...' : t('productDetail.submitReview', 'Enviar')}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="min-h-[44px] rounded-xl border border-stone-200 px-5 py-2 text-[13px] font-medium text-stone-500"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
            </div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {reviews.slice(0, 3).map((review) => (
              <div key={review.review_id || `${review.user_id}-${review.created_at}`} className="rounded-xl border border-stone-200 bg-white p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100">
                      <User size={16} className="text-stone-500" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-stone-950">
                        {review.user_name || 'Cliente'}
                      </p>
                      {review.verified_purchase && (
                        <p className="flex items-center gap-1 text-[11px] text-stone-500">
                          <CheckCircle size={10} /> Compra verificada
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5">
                    <Star size={12} className="fill-stone-950 text-stone-950" />
                    <span className="text-xs font-semibold text-stone-950">
                      {review.rating}
                    </span>
                  </div>
                </div>
                <p className="text-[13px] leading-relaxed text-stone-500">
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-8 text-center">
            <Star size={32} className="mx-auto mb-3 text-stone-200" />
            <p className="text-sm text-stone-500">
              {t('productDetail.noReviews', 'Aún no hay reseñas')}
            </p>
          </div>
        )}
      </div>

      {/* ── B2B Wholesale Card — only for product owner (producer/importer) ── */}
      {user && (user.role === 'producer' || user.role === 'importer') &&
        (user.user_id === product.seller_id || user.id === product.seller_id) && (
        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-stone-200 bg-stone-100 p-4">
            <p className="mb-1 text-[15px] font-semibold text-stone-950">
              Oferta mayorista
            </p>
            {product.b2b_enabled ? (
              <>
                <div className="mt-2 flex flex-wrap gap-4">
                  {product.b2b_settings?.wholesale_price && (
                    <div>
                      <span className="text-[11px] text-stone-500">Precio mayorista</span>
                      <p className="mt-0.5 text-sm font-semibold text-stone-950">
                        {convertAndFormatPrice(product.b2b_settings.wholesale_price, product.currency || 'EUR')} / ud
                      </p>
                    </div>
                  )}
                  {product.b2b_settings?.moq && (
                    <div>
                      <span className="text-[11px] text-stone-500">MOQ</span>
                      <p className="mt-0.5 text-sm font-semibold text-stone-950">
                        {product.b2b_settings.moq} unidades
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowB2BModal(true)}
                  className="mt-3 rounded-full bg-stone-950 px-5 py-2 text-[13px] font-semibold text-white"
                >
                  Editar condiciones
                </button>
              </>
            ) : (
              <>
                <p className="my-1 mb-3 text-[13px] text-stone-500">
                  Añade este producto al catálogo B2B para recibir pedidos mayoristas.
                </p>
                <button
                  type="button"
                  onClick={() => setShowB2BModal(true)}
                  className="rounded-full bg-stone-950 px-5 py-2 text-[13px] font-semibold text-white"
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
        <div className="py-5">
          <h2 className="mb-3.5 ml-4 text-base font-semibold text-stone-950">
            {t('productDetail.relatedProducts', 'Productos relacionados')}
          </h2>
          <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide [scroll-snap-type:x_mandatory]">
            {relatedProducts.map((rp) => {
              const rpId = rp.product_id || rp.id;
              const rpImage = rp.images?.[0] || rp.image_url || null;
              return (
                <Link
                  key={rpId}
                  to={`/products/${rpId}`}
                  className="w-[140px] shrink-0 [scroll-snap-align:start] no-underline"
                >
                  <div className="h-[140px] w-[140px] overflow-hidden rounded-xl bg-stone-100">
                    {rpImage ? (
                      <ProductImage src={rpImage} productName={rp.name} className="h-full w-full" imageClassName="" sizes="140px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={24} className="text-stone-200" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-xs font-medium text-stone-950">
                    {rp.name}
                  </p>
                  <p className="text-[13px] font-bold text-stone-950">
                    {convertAndFormatPrice(rp.price, rp.currency || 'EUR')}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-[calc(50px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 border-t border-stone-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Price */}
          <div className="min-w-0 flex-1">
            <span className="text-lg font-bold text-stone-950">
              {totalPrice}
            </span>
            {quantity > 1 && (
              <span className="ml-1 text-xs text-stone-500">
                × {quantity}
              </span>
            )}
          </div>

          {/* Add to Cart */}
          <motion.button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            animate={{
              background: addedToCart
                ? '#0c0a09'
                : isOutOfStock
                  ? '#f5f5f4'
                  : '#0c0a09',
            }}
            transition={{ duration: 0.3 }}
            className={`flex h-11 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold ${
              isOutOfStock ? 'cursor-not-allowed text-stone-500' : 'text-white'
            }`}
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
