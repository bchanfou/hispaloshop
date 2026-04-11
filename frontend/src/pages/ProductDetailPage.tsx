// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
  ChevronLeft, Send, Heart, Star, Shield, Truck, ChevronDown,
  Minus, Plus, AlertTriangle, Store, MapPin, Package, Users,
  CheckCircle, User, FileCheck, ChevronRight, Leaf, MessageCircle, Check,
  ShoppingBag, Lock, Clock3, ChefHat, Wheat, ThumbsUp, Globe,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
// @ts-ignore — JS module
import ReportButton from '../components/moderation/ReportButton';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AddToWishlistModal from '../components/wishlist/AddToWishlistModal';
import SEO from '../components/SEO';
import SocialProofBar from '../components/product/SocialProofBar';
import ProductImage from '../components/ui/ProductImage';
import {
  useProductDetail,
  useProductPurchaseOptions,
  useProductReviews as useProductReviewsHook,
} from '../features/products/hooks';
import { useChatContext } from '../context/chat/ChatProvider';
import apiClient from '../services/api/client';
import B2BProductModal from '../components/b2b/B2BProductModal';
import { trackEvent } from '../utils/analytics';

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
  const { addToCart, cartItems } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice, country: localeCountry } = useLocale();
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

  const [reviewSort, setReviewSort] = useState('recent');
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const {
    reviews, averageRating, totalReviews, distribution,
    canReview, canReviewReason, reviewOrderId,
    isSubmitting: submittingReview, submitReview, toggleHelpful,
  } = useProductReviewsHook(productId, reviewSort);

  const storeSlug = storeInfo?.slug || storeInfo?.store_slug || null;
  const normalizedAverageRating = Number(averageRating || 0);
  const normalizedStoreRating = Number(storeInfo?.rating || 0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [showB2BModal, setShowB2BModal] = useState(false);
  const [returnPolicyOpen, setReturnPolicyOpen] = useState(false);
  const [productRecipes, setProductRecipes] = useState([]);
  const galleryRef = useRef(null);
  const addedTimerRef = useRef(null);

  // Market request ("Traelo a mi pais")
  const [marketCount, setMarketCount] = useState(0);
  const [userHasRequested, setUserHasRequested] = useState(false);
  const [requestingMarket, setRequestingMarket] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [marketNotes, setMarketNotes] = useState('');
  const normalizeCountryCode = (value) => String(value || '').trim().toUpperCase();
  const userCountry = normalizeCountryCode(localeCountry || user?.country || 'ES');
  const productCountries = Array.isArray(product?.target_markets || product?.available_countries)
    ? (product?.target_markets || product?.available_countries).map(normalizeCountryCode).filter(Boolean)
    : [];
  const isUnavailableInCountry = Boolean(
    product && (
      product?.is_available_in_country === false ||
      product?.available_in_country === false ||
      (productCountries.length > 0 && !productCountries.includes(userCountry))
    )
  );

  useEffect(() => {
    if (!product?.product_id || !isUnavailableInCountry) return;
    apiClient.get(`/market-requests/product/${product.product_id}/count?country=${userCountry}`)
      .then(d => { setMarketCount(d?.count || 0); setUserHasRequested(d?.user_has_requested || false); })
      .catch(() => {});
  }, [product?.product_id, isUnavailableInCountry, userCountry]);
  const rafRef = useRef(null);

  // Parallax for hero image
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 300], [0, -30]);

  // Track product view (once per product load)
  useEffect(() => {
    if (product?.product_id) {
      trackEvent('product_viewed', {
        product_id: product.product_id,
        category: product.category,
        producer_id: product.producer_id,
        price: product.price,
      });
    }
  }, [product?.product_id]);

  // Reset transient UI state when navigating between products
  useEffect(() => {
    setActiveImageIndex(0);
    setDescExpanded(false);
    setQuantity(1);
    setShowReviewForm(false);
    setReviewComment('');
    setReviewTitle('');
    setReviewRating(0);
    setReviewSort('recent');
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

  // Fetch related products — use dedicated discovery endpoint
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    apiClient.get(`/discovery/related-products/${productId}`, { params: { limit: 6 } })
      .then((res) => {
        if (cancelled) return;
        const items = res?.products || res?.items || res || [];
        setRelatedProducts(Array.isArray(items) ? items.slice(0, 6) : []);
      })
      .catch(() => { if (!cancelled) setRelatedProducts([]); });
    return () => { cancelled = true; };
  }, [productId]);

  // Fetch recipes that use this product
  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    apiClient.get(`/recipes?product_id=${productId}&limit=3`)
      .then((res) => {
        if (cancelled) return;
        const items = res?.recipes || res?.items || res || [];
        setProductRecipes(Array.isArray(items) ? items.slice(0, 3) : []);
      })
      .catch(() => { if (!cancelled) setProductRecipes([]); });
    return () => { cancelled = true; };
  }, [productId]);

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
    if (reviewRating === 0) { toast.error(t('reviews.select_rating', 'Selecciona una puntuacion')); return; }
    if (reviewComment.trim().length < 10) { toast.error(t('reviews.min_chars', 'Cuentanos un poco mas sobre tu experiencia (min. 10 caracteres)')); return; }
    try {
      trackEvent('review_submitted', { product_id: productId, rating: reviewRating });
      const result = await submitReview({ orderId: reviewOrderId, rating: reviewRating, title: reviewTitle, comment: reviewComment });
      if (result?.moderation_message) {
        toast(result.moderation_message);
      } else {
        toast.success(t('reviews.submitted', 'Resena publicada'));
      }
      setShowReviewForm(false); setReviewComment(''); setReviewTitle(''); setReviewRating(0);
    } catch (error) { toast.error(error?.detail || error?.message || t('reviews.submit_error', 'No hemos podido enviar la resena')); }
  };

  const toggleWishlist = async () => {
    if (!user) { toast.info(t('auth.loginRequired', 'Inicia sesión para guardar')); return; }
    try {
      await toggleWishlistMutation();
      toast.success(inWishlist ? t('wishlist.removed', 'Eliminado de lista') : t('wishlist.added', 'Guardado'));
      if (!inWishlist) trackEvent('product_saved', { product_id: product?.product_id });
    } catch { toast.error(t('errors.generic', 'Error')); }
  };

  const addingRef = React.useRef(false);
  const handleAddToCart = async () => {
    if (addingRef.current || isOutOfStock || isUnavailableInCountry) {
      if (isOutOfStock) toast.error(t('productDetail.outOfStock'));
      if (isUnavailableInCountry) toast.error(t('marketRequest.unavailable', 'Este producto aun no esta disponible en tu pais.'));
      return;
    }
    addingRef.current = true;
    toast.loading(t('cart.adding', 'Añadiendo...'), { id: 'add-to-cart' });
    try {
      const variantId = selectedVariant?.variant_id || null;
      const packId = selectedPack?.pack_id || null;
      const success = await addToCart(productId, quantity, variantId, packId);
      if (success && success !== 'redirect') {
        toast.success(t('success.added', '¡Añadido!'), { id: 'add-to-cart' });
        trackEvent('product_added_to_cart', { product_id: productId, variant_id: variantId, pack_id: packId, price: currentPrice, quantity });
        setAddedToCart(true);
        clearTimeout(addedTimerRef.current);
        addedTimerRef.current = setTimeout(() => setAddedToCart(false), 1800);
      } else if (success !== 'redirect') {
        toast.error(t('errors.generic', 'Error'), { id: 'add-to-cart' });
      }
    } catch {
      toast.error(t('errors.generic', 'Error'), { id: 'add-to-cart' });
    } finally {
      addingRef.current = false;
    }
  };

  const handleShare = async () => {
    const shareData = { title: product?.name, url: window.location.href };
    if (navigator.share) {
      try { await navigator.share(shareData); trackEvent('product_shared', { product_id: product?.product_id, method: 'native' }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(shareData.url); toast.success('Enlace copiado'); trackEvent('product_shared', { product_id: product?.product_id, method: 'clipboard' }); }
      catch { toast.error('No se pudo copiar'); }
    }
  };

  const [askingProducer, setAskingProducer] = React.useState(false);
  const handleAskProducer = async () => {
    const producerId = product?.producer_id;
    if (!producerId) { toast.error(t('product_detail.chatNoDisponibleParaEsteProducto', 'Chat no disponible para este producto')); return; }
    if (askingProducer) return;
    setAskingProducer(true);
    try {
      const conv = await openConversation(producerId, 'b2c');
      const conversationId = conv?.id || conv?.conversation_id;
      if (conversationId) {
        navigate(`/messages/${conversationId}?prefill=${encodeURIComponent(`Hola, tengo una pregunta sobre ${product.name}`)}`);
      }
    } catch {
      toast.error(t('product_detail.noSePudoAbrirElChat', 'No se pudo abrir el chat'));
    } finally {
      setAskingProducer(false);
    }
  };

  const displayPrice = convertAndFormatPrice(
    (selectedPack?.price || currentPrice || product?.display_price || product?.price || 0),
    product?.display_currency || product?.currency || 'EUR'
  );
  const totalPrice = convertAndFormatPrice(
    (selectedPack?.price || currentPrice || product?.display_price || product?.price || 0) * quantity,
    product?.display_currency || product?.currency || 'EUR'
  );
  const isFreeShipping = !product?.shipping_cost || product?.shipping_cost === 0;

  // Check if this product+variant is already in cart
  const cartVariantId = selectedVariant?.variant_id || null;
  const cartPackId = selectedPack?.pack_id || null;
  const normalizeCartOptionId = (value) => {
    if (value == null || value === '' || value === '0') return '';
    return String(value);
  };
  const desiredVariantId = normalizeCartOptionId(cartVariantId);
  const desiredPackId = normalizeCartOptionId(cartPackId);
  const existingCartItem = cartItems.find((item) => {
    if (String(item.product_id) !== String(productId)) return false;
    return (
      normalizeCartOptionId(item.variant_id) === desiredVariantId &&
      normalizeCartOptionId(item.pack_id) === desiredPackId
    );
  });
  const inCartQty = existingCartItem?.quantity || 0;

  const hasCertifications = product?.certifications?.length > 0 || product?.is_organic || product?.is_gluten_free || product?.is_vegan || product?.is_halal || product?.is_km0 || !!certificate;

  const images = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  const primaryImage = images[0] || product?.image_url || null;

  // ── Loading state ──
  if (loading) {
    return (
      <div role="status" aria-label="Cargando producto" className="min-h-screen bg-stone-50">
        <div className="aspect-square w-full animate-pulse bg-stone-100" />
        <div className="px-4 pt-4">
          <div className="mb-2 h-6 w-3/4 animate-pulse rounded-xl bg-stone-100" />
          <div className="mb-3 h-4 w-1/3 animate-pulse rounded-xl bg-stone-100" />
          <div className="mb-3 h-8 w-1/4 animate-pulse rounded-xl bg-stone-100" />
          <div className="mt-4 flex items-center gap-3">
            <div className="h-12 w-12 animate-pulse rounded-full bg-stone-100" />
            <div className="flex-1">
              <div className="mb-1 h-4 w-1/2 animate-pulse rounded-xl bg-stone-100" />
              <div className="h-3 w-1/3 animate-pulse rounded-xl bg-stone-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 p-8 text-center">
        <p className="mb-4 text-base text-stone-500">
          {t('productDetail.notFound')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="rounded-2xl bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white"
        >
          {t('productDetail.backToProducts')}
        </button>
      </div>
    );
  }

  return (
    <><div className="min-h-screen bg-stone-50 pb-[100px]">
      <SEO
        title={product.name || 'Producto'}
        description={product.description?.slice(0, 160) || ''}
        image={primaryImage}
        type="product"
        product={product}
      />

      {/* ── TopBar ── */}
      <header className="sticky top-0 z-50 bg-stone-50">
        <div className="mx-auto flex h-[52px] max-w-[1200px] items-center justify-between px-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"
            aria-label="Volver"
          >
            <ChevronLeft size={20} strokeWidth={2} className="text-stone-950" />
          </button>

          <div className="flex items-center gap-2">
            {product && (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100">
                <ReportButton contentType="product" contentId={product.product_id} contentOwnerId={product.producer_id} />
              </div>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"
              aria-label="Compartir producto"
            >
              <Send size={18} strokeWidth={1.8} className="text-stone-950" />
            </button>
            <button
              type="button"
              onClick={() => user ? setShowWishlistModal(true) : toggleWishlist()}
              disabled={wishlistLoading}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100"
              aria-label={inWishlist ? t('product_detail.quitarDeFavoritos', 'Quitar de favoritos') : t('product_detail.anadirAFavoritos', 'Añadir a favoritos')}
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

      {/* ── Desktop 2-col wrapper ── */}
      <div className="mx-auto max-w-[1200px] lg:flex lg:items-start lg:gap-0">

      {/* ── Left: Image Gallery ── */}
      <div className="lg:w-[55%] lg:sticky lg:top-[52px] lg:self-start">
      {/* ── Image Gallery — 1:1 scroll-snap ── */}
      <motion.section aria-label={`Galería de imágenes de ${product.name || 'producto'}`} className="relative w-full bg-stone-100 overflow-hidden" style={{ y: imageY }}>
        <div
          ref={galleryRef}
          onScroll={handleGalleryScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide [-webkit-overflow-scrolling:touch]"
        >
          {(images.length > 0 ? images : primaryImage ? [primaryImage] : [null]).map((img, i) => (
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
                className="flex h-11 w-11 items-center justify-center rounded-full bg-transparent"
              >
                <motion.span
                  animate={{
                    scale: i === activeImageIndex ? 1.3 : 1,
                    backgroundColor: i === activeImageIndex ? '#0c0a09' : '#d6d3d1',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="block h-1.5 w-1.5 rounded-full"
                />
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
      </motion.section>
      </div>

      {/* ── Right: Product Info ── */}
      <div className="lg:w-[45%] lg:min-h-0 lg:overflow-y-auto">

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
                <Leaf size={12} /> {t('certifications.organic', 'Ecológico')}
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
        {(product.seller_type === 'importer' || product.origin_country) && product.origin_country && (
          <div className="mt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700">
              <Globe size={12} className="text-stone-400" /> Importado desde {product.origin_country}
            </span>
          </div>
        )}

        {/* Social proof — real-time signals */}
        <SocialProofBar productId={product.product_id || product.id} />

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
        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-bold text-stone-950">
            {displayPrice}
          </span>
          {(() => {
            const rawPrice = selectedPack?.price || currentPrice || product?.display_price || product?.price || 0;
            const origPrice = product?.original_price;
            if (origPrice && origPrice > rawPrice) {
              const discountPct = Math.round((1 - rawPrice / origPrice) * 100);
              const formattedOrig = convertAndFormatPrice(origPrice, product?.display_currency || product?.currency || 'EUR');
              return (
                <>
                  <span className="text-sm line-through text-stone-400">{formattedOrig}</span>
                  <span className="text-xs font-semibold bg-stone-950 text-white px-1.5 py-0.5 rounded">-{discountPct}%</span>
                </>
              );
            }
            return null;
          })()}
          <span className="text-[11px] text-stone-500">
            {t('productDetail.taxNote', 'IVA no incluido')}
          </span>
        </div>

        {/* Stock warnings */}
        {isOutOfStock && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-stone-100 px-3 py-2.5">
            <AlertTriangle size={16} className="text-stone-500" />
            <span className="text-[13px] font-medium text-stone-500">
              {t('productDetail.outOfStock')}
            </span>
          </div>
        )}
        {isLowStock && !isOutOfStock && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-stone-100 px-3 py-2.5">
            <AlertTriangle size={16} className="text-stone-500" />
            <span className="text-[13px] font-medium text-stone-500">
              {t('productDetail.lowStockWarning', { count: stock })}
            </span>
          </div>
        )}
        {/* Low-stock urgency badge */}
        {(() => {
          const stockVal = product?.market_stock ?? product?.stock ?? 100;
          if (!isOutOfStock && stockVal > 0 && stockVal <= 5) {
            return (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-950 animate-pulse" />
                  Solo quedan {stockVal} unidades
                </span>
              </div>
            );
          }
          return null;
        })()}

        {/* Shipping estimate */}
        <div className="mt-3 flex items-center gap-2 text-sm py-2">
          <Truck size={16} className={isFreeShipping || product?.free_shipping ? 'text-stone-950' : 'text-stone-500'} />
          {product?.free_shipping ? (
            <span className="font-semibold text-stone-950">&#10003; {t('products.freeShipping', 'Envío gratis')}</span>
          ) : isFreeShipping ? (
            <span className="font-semibold text-stone-950">&#10003; {t('products.freeShipping', 'Envío gratis')}</span>
          ) : (
            <span className="text-stone-500">{t('product_detail.shippingFrom', 'Envío desde €4.90')}</span>
          )}
        </div>

        {/* Already in cart indicator */}
        {inCartQty > 0 && (
          <div className="flex items-center gap-1 text-xs text-stone-500 pb-1">
            <ShoppingBag size={14} />
            <span>&#10003; {inCartQty} en tu carrito</span>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex gap-4 py-3 border-t border-stone-100 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-stone-500">
            <Lock size={14} /> Pago seguro
          </span>
          <span className="flex items-center gap-1.5 text-xs text-stone-500">
            <Package size={14} /> {t('product_detail.trackableShipping', 'Envío rastreable')}
          </span>
          {hasCertifications && (
            <span className="flex items-center gap-1.5 text-xs text-stone-500">
              <Check size={14} /> Certificado verificado
            </span>
          )}
        </div>

        {/* Return policy collapsible */}
        <div className="border-t border-stone-100 py-3">
          <button
            type="button"
            onClick={() => setReturnPolicyOpen((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-stone-950"
          >
            <span>{t('product_detail.politicaDeDevolucion', 'Política de devolución')}</span>
            <ChevronDown
              size={16}
              className={`text-stone-500 transition-transform duration-200 ${returnPolicyOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence initial={false}>
            {returnPolicyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p className="mt-2 text-xs leading-relaxed text-stone-500">
                  {t('product_detail.returnPolicy', 'Tienes 14 días desde la recepción para devolver tu pedido. Los productos alimentarios perecederos no admiten devolución.')}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
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
                  className={`flex items-center justify-between rounded-2xl px-3.5 py-3 transition-all duration-150 ${
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
                        Ahorra {convertAndFormatPrice(calculateSavings(pack, selectedVariant), product?.display_currency || product?.currency || 'EUR')}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-stone-950">
                    {convertAndFormatPrice(pack.price, product?.display_currency || product?.currency || 'EUR')}
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
        <div className="flex items-center rounded-2xl shadow-sm">
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={isOutOfStock || isUnavailableInCountry}
            aria-label="Reducir cantidad"
            className="flex h-11 w-11 items-center justify-center text-stone-500 disabled:cursor-not-allowed"
          >
            <Minus size={16} />
          </motion.button>
          <span
            aria-live="polite"
            aria-label={`Cantidad: ${quantity}`}
            className="min-w-[36px] text-center text-sm font-semibold text-stone-950"
          >
            {quantity}
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={isOutOfStock || isUnavailableInCountry}
            aria-label="Aumentar cantidad"
            className="flex h-11 w-11 items-center justify-center text-stone-500 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
          </motion.button>
        </div>
      </div>

      {/* ── Producer Card ── */}
      {storeInfo && (
        <Link
          to={storeSlug ? `/store/${storeSlug}` : '/stores'}
          className="flex items-center gap-3 border-t border-stone-200 px-4 py-3.5 no-underline"
          onClick={() => trackEvent('producer_profile_clicked', { producer_id: product?.producer_id, from: 'product_detail' })}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-stone-200 bg-stone-100">
            {storeInfo.logo ? (
              <img loading="lazy" src={storeInfo.logo} alt={storeInfo.name} className="h-full w-full object-cover" />
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
            disabled={askingProducer}
            className="inline-flex items-center gap-1.5 py-2 text-[13px] font-medium text-stone-950 hover:underline disabled:opacity-50"
            aria-label="Mensaje al vendedor"
          >
            <MessageCircle size={14} className={askingProducer ? 'animate-pulse' : ''} /> {askingProducer ? 'Abriendo chat...' : 'Preguntar al productor'}
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

        {/* Ingredients — hidden when no data */}
        {(currentIngredients?.length > 0 || (product.ingredients && product.ingredients !== 'No declarados')) && (
        <CollapsibleSection title={t('productDetail.ingredients', 'Ingredientes')} icon={<Leaf size={16} className="text-stone-500" />}>
          {currentIngredients?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {currentIngredients.map((ingredient, idx) => (
                <span key={idx} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-950">
                  {typeof ingredient === 'object' ? stripEmoji(ingredient.name) : stripEmoji(ingredient)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-stone-500">{product.ingredients}</p>
          )}
        </CollapsibleSection>
        )}

        {/* Nutritional Info — hidden when no data */}
        {(() => {
          const nutri = currentNutritionalInfo || product.nutrition || product.nutritional_info;
          if (!nutri || Object.keys(nutri).length === 0) return null;
          const nutriRows = [
            ['calories', t('certificate.nutritionLabels.energy', 'Energía'), 'kcal'],
            ['fat', 'Grasas', 'g'],
            ['saturated_fat', 'Grasas Sat.', 'g'],
            ['carbohydrates', 'Carbohidratos', 'g'],
            ['sugars', t('certificate.nutritionLabels.sugars', 'Azúcares'), 'g'],
            ['protein', t('certificate.nutritionLabels.protein', 'Proteínas'), 'g'],
            ['fiber', 'Fibra', 'g'],
            ['salt', 'Sal', 'g'],
            ['sodium', 'Sodio', 'mg'],
          ].filter(([key]) => nutri[key] !== undefined);
          if (nutriRows.length === 0) return null;
          return (
            <CollapsibleSection title={t('productDetail.nutritionalInfo', 'Información Nutricional')} icon={<Wheat size={16} className="text-stone-500" />}>
              <p className="mb-2.5 text-[11px] text-stone-500">Por 100g</p>
              <div className="grid grid-cols-2 gap-y-2">
                {nutriRows.map(([key, label, unit]) => (
                  <React.Fragment key={key}>
                    <span className="text-sm text-stone-500">{label}</span>
                    <span className="text-sm font-medium text-stone-950 text-right">{nutri[key]}{unit}</span>
                  </React.Fragment>
                ))}
              </div>
            </CollapsibleSection>
          );
        })()}

        {/* Origen */}
        <CollapsibleSection title="Origen" icon={<MapPin size={16} className="text-stone-500" />}>
          {(product.country_origin || product.origin || product.producer_name) ? (
            <div className="space-y-1">
              {(product.country_origin || product.origin) && (
                <p className="text-sm text-stone-600">
                  {product.country_origin || product.origin}
                </p>
              )}
              {product.producer_name && (
                <p className="text-sm text-stone-600">
                  Elaborado por: {product.producer_name}
                </p>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-stone-500">Origen no especificado</p>
          )}
        </CollapsibleSection>

        {/* Allergens — hidden when no data */}
        {(() => {
          const allergenBadges = [];
          if (product.is_gluten_free) allergenBadges.push('Sin gluten');
          if (product.is_vegan) allergenBadges.push('Vegano');
          if (product.is_halal) allergenBadges.push('Halal');
          const allergenList = currentAllergens || product.allergens || [];
          if (allergenList.length === 0 && allergenBadges.length === 0) return null;
          return (
            <CollapsibleSection title={t('productDetail.allergens', 'Alérgenos')} icon={<AlertTriangle size={16} className="text-stone-500" />}>
              <div className="flex flex-wrap gap-2">
                {allergenBadges.map((badge) => (
                  <span key={badge} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-950">
                    {badge}
                  </span>
                ))}
                {allergenList.map((allergen, idx) => (
                  <span key={idx} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-950">
                    {allergen}
                  </span>
                ))}
              </div>
            </CollapsibleSection>
          );
        })()}

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

      </div>{/* close right column */}
      </div>{/* close 2-col wrapper */}

      {/* ── Reviews Preview (full width below both columns) ── */}
      <div className="mx-auto max-w-[1200px] px-4 py-5">
        {/* Review summary line */}
        <div className="mb-3 flex items-center gap-2">
          <Star size={18} className="fill-stone-950 text-stone-950" />
          <span className="text-lg font-bold text-stone-950">
            {Number.isFinite(normalizedAverageRating) ? normalizedAverageRating.toFixed(1) : '0.0'}
          </span>
          <span className="text-lg text-stone-400 font-normal">·</span>
          <span className="text-lg text-stone-500">{totalReviews} {t('productDetail.reviews', 'reseñas')}</span>
        </div>

        {/* Rating breakdown bars */}
        {reviews.length > 0 && (() => {
          const maxRating = 10;
          const counts = Array.from({ length: maxRating }, (_, i) => {
            const star = maxRating - i;
            return { star, count: reviews.filter(r => Math.round(Number(r.rating)) === star).length };
          });
          const maxCount = Math.max(...counts.map(c => c.count), 1);
          return (
            <div className="mb-4 space-y-1.5">
              {counts.map(({ star, count }) => {
                const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-5 text-right font-medium text-stone-500">{star}</span>
                    <Star size={10} className="fill-stone-950 text-stone-950 shrink-0" />
                    <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-stone-950 transition-all"
                        style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-stone-400">{pct}%</span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Header row: title + write review button */}
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-950">
            {t('reviews.title', 'Resenas')} ({totalReviews})
          </h2>
          {canReview && !showReviewForm && (
            <button
              type="button"
              onClick={() => { setShowReviewForm(true); trackEvent('review_form_opened', { product_id: productId }); }}
              className="min-h-[44px] rounded-full border border-stone-200 px-3.5 py-2.5 text-[13px] font-medium text-stone-950"
            >
              {t('reviews.write', 'Escribir resena')}
            </button>
          )}
        </div>

        {/* Rating summary + distribution */}
        {totalReviews > 0 && (
          <div className="mb-4 rounded-2xl shadow-sm bg-white p-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <p className="text-3xl font-bold text-stone-950">{normalizedAverageRating.toFixed(1)}</p>
                <div className="flex gap-0.5 mt-1 justify-center">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14} className={s <= Math.round(normalizedAverageRating) ? 'fill-stone-950 text-stone-950' : 'text-stone-200'} />
                  ))}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">{totalReviews} {t('reviews.title', 'resenas')}</p>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                {[5,4,3,2,1].map(star => {
                  const count = distribution[star] || 0;
                  const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-stone-500 w-3 text-right">{star}</span>
                      <Star size={10} className="fill-stone-950 text-stone-950 shrink-0" />
                      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-stone-950 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-stone-400 w-8">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sort selector */}
        {reviews.length > 1 && (
          <div className="mb-3">
            <select
              value={reviewSort}
              onChange={(e) => { setReviewSort(e.target.value); trackEvent('review_sort_changed', { sort: e.target.value }); }}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-950 outline-none"
            >
              <option value="recent">{t('reviews.sort_recent', 'Mas recientes')}</option>
              <option value="helpful">{t('reviews.sort_helpful', 'Mas utiles')}</option>
              <option value="highest">{t('reviews.sort_highest', 'Mayor puntuacion')}</option>
              <option value="lowest">{t('reviews.sort_lowest', 'Menor puntuacion')}</option>
            </select>
          </div>
        )}

        {/* Review Form */}
        {showReviewForm && (
          <div className="mb-4 rounded-2xl shadow-sm bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-stone-950">
              {t('reviews.your_review', 'Tu resena')}
            </p>
            {/* Star rating 1-5 */}
            <p className="text-[13px] text-stone-500 mb-1.5">{t('reviews.how_rate', 'Como valorarias este producto?')}</p>
            <div role="radiogroup" aria-label={t('reviews.rating', 'Puntuacion')} className="mb-3 flex gap-1">
              {[1,2,3,4,5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setReviewRating(s)}
                  role="radio"
                  aria-checked={s === reviewRating}
                  aria-label={`${s} ${s === 1 ? 'estrella' : 'estrellas'}`}
                  className="bg-transparent border-none cursor-pointer p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <Star size={28} fill={s <= reviewRating ? '#0c0a09' : 'none'} color={s <= reviewRating ? '#0c0a09' : '#e7e5e4'} />
                </button>
              ))}
            </div>
            {/* Title (optional) */}
            <input
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value.slice(0, 100))}
              placeholder={t('reviews.title_placeholder', 'Titulo (opcional)')}
              className="w-full mb-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-950 outline-none"
              maxLength={100}
            />
            {/* Comment */}
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value.slice(0, 2000))}
              placeholder={t('reviews.comment_placeholder', 'Comparte tu experiencia...')}
              aria-label={t('reviews.comment_label', 'Comentario de la resena')}
              rows={4}
              className="w-full resize-y rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-[13px] text-stone-950 outline-none"
            />
            <div className="flex justify-between items-center mt-1 mb-2">
              <span className="text-[11px] text-stone-400">
                {reviewComment.length < 10 ? t('reviews.min_hint', 'Min. 10 caracteres') : ''}
              </span>
              <span className="text-[11px] text-stone-400">{reviewComment.length}/2000</span>
            </div>
            {/* Verified badge */}
            <div className="flex items-center gap-1 mb-3 text-[11px] text-stone-500 font-medium">
              <Check size={12} strokeWidth={2.5} />
              {t('reviews.verified_badge', 'Compra verificada')}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="min-h-[44px] rounded-full bg-stone-950 px-6 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {submittingReview ? t('reviews.submitting', 'Publicando...') : t('reviews.submit', 'Publicar resena')}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="min-h-[44px] rounded-full border border-stone-200 px-5 py-2 text-[13px] font-medium text-stone-500"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
            </div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {reviews.map((review) => (
              <div key={review.review_id || `${review.user_id}-${review.created_at}`} className="rounded-2xl shadow-sm bg-white p-3.5">
                {/* Header */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 overflow-hidden shrink-0">
                      {review.user_avatar ? (
                        <img src={review.user_avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User size={16} className="text-stone-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[13px] font-semibold text-stone-950">
                          {review.user_name || review.user_username || t('reviews.anonymous', 'Cliente')}
                        </p>
                        {(review.is_verified_purchase || review.verified || review.verified_purchase) && (
                          <span className="text-[11px] text-stone-500 font-medium flex items-center gap-0.5">
                            <Check size={10} strokeWidth={2.5} /> {t('reviews.verified_badge', 'Compra verificada')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400">
                        {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} className={s <= review.rating ? 'fill-stone-950 text-stone-950' : 'text-stone-200'} />
                    ))}
                  </div>
                </div>
                {/* Title */}
                {review.title && (
                  <p className="text-sm font-semibold text-stone-950 mb-1">{review.title}</p>
                )}
                {/* Comment */}
                <p className="text-[13px] leading-relaxed text-stone-500">
                  {review.comment || review.text}
                </p>
                {/* Images */}
                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {review.images.map((img, idx) => (
                      <div key={idx} className="w-16 h-16 rounded-xl bg-stone-100 overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
                {/* Helpful */}
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { toggleHelpful(review.review_id); trackEvent('review_helpful_voted', { review_id: review.review_id }); }}
                    className="flex items-center gap-1 text-[12px] text-stone-500 bg-transparent border-none cursor-pointer p-0"
                  >
                    <ThumbsUp size={13} /> {t('reviews.helpful', 'Util')} {review.helpful_count > 0 ? `(${review.helpful_count})` : ''}
                  </button>
                  {/* Section 3.5b — Report this review */}
                  <ReportButton contentType="review" contentId={review.review_id} contentOwnerId={review.user_id} />
                </div>
                {/* Producer response */}
                {review.producer_response && (
                  <div className="mt-3 pt-3 border-t border-stone-100">
                    <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                      {t('reviews.producer_response', 'Respuesta del productor')}
                    </p>
                    <p className="text-[13px] leading-relaxed text-stone-500">
                      {review.producer_response}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl shadow-sm bg-white p-8 text-center">
            <Star size={32} className="mx-auto mb-3 text-stone-200" />
            <p className="text-sm text-stone-500">
              {canReview
                ? t('reviews.empty_can_review', 'Aun no hay resenas. Se el primero!')
                : t('reviews.empty_no_purchase', 'Aun no hay resenas')}
            </p>
            {!canReview && canReviewReason === 'no_delivered_order' && (
              <p className="text-xs text-stone-400 mt-1">
                {t('reviews.buy_to_review', 'Compra este producto para dejar tu resena')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Recipes with this product ── */}
      {productRecipes.length > 0 && (
        <div className="mx-auto max-w-[1200px] py-5">
          <h2 className="mb-3.5 ml-4 text-base font-semibold text-stone-950">Recetas con este producto</h2>
          <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide [scroll-snap-type:x_mandatory]">
            {productRecipes.map((r) => {
              const rid = r.recipe_id || r.id;
              return (
                <Link
                  key={rid}
                  to={`/recipes/${rid}`}
                  className="w-[180px] shrink-0 [scroll-snap-align:start] no-underline"
                >
                  <div className="h-[120px] w-[180px] overflow-hidden rounded-2xl bg-stone-100">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.title} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ChefHat size={24} className="text-stone-300" />
                      </div>
                    )}
                  </div>
                  <p className="mt-1.5 truncate text-xs font-medium text-stone-950">{r.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500">
                    <Clock3 size={11} /> {r.time_minutes || 0} min
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── B2B Wholesale Card — only for product owner (producer/importer) ── */}
      {user && (user.role === 'producer' || user.role === 'importer') &&
        (user.user_id === product.seller_id || user.id === product.seller_id) && (
        <div className="px-4 pb-4">
          <div className="rounded-2xl shadow-sm bg-stone-100 p-4">
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
                        {convertAndFormatPrice(product.b2b_settings.wholesale_price, product.display_currency || product.currency || 'EUR')} / ud
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
                  {t('product_detail.addToB2BCatalog', 'Añade este producto al catálogo B2B para recibir pedidos mayoristas.')}
                </p>
                <button
                  type="button"
                  onClick={() => setShowB2BModal(true)}
                  className="rounded-full bg-stone-950 px-5 py-2 text-[13px] font-semibold text-white"
                >
                  {t('product_detail.addToB2B', 'Añadir al catálogo B2B')}
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
        <div className="mx-auto max-w-[1200px] py-5">
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
                  <div className="h-[140px] w-[140px] overflow-hidden rounded-2xl bg-stone-100">
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
                    {convertAndFormatPrice(rp.display_price || rp.price || 0, rp.display_currency || rp.currency || 'EUR')}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Market Request "Traelo a mi pais" ── */}
      {isUnavailableInCountry && (
        <div className="mx-auto max-w-[1200px] px-4 py-4 mb-2">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-center">
            <p className="text-sm font-semibold text-stone-950 mb-1">
              {t('marketRequest.unavailable', 'Este producto aun no esta disponible en tu pais.')}
            </p>
            {marketCount > 0 && (
              <p className="text-xs text-stone-600 mb-3">
                {marketCount} {marketCount === 1 ? 'persona' : 'personas'} en tu pais ya lo han pedido.
              </p>
            )}
            {userHasRequested ? (
              <p className="text-xs text-stone-500 flex items-center justify-center gap-1">
                <Check size={14} /> {t('marketRequest.alreadyRequested', 'Ya lo pediste. Te avisaremos cuando este disponible.')}
              </p>
            ) : (
              <>
                <button
                  onClick={() => setShowMarketModal(true)}
                  className="px-6 py-2.5 bg-stone-950 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors"
                >
                  {t('marketRequest.bringToMyCountry', 'Traelo a mi pais')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Market request modal */}
      {showMarketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowMarketModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-stone-950 mb-2">
              {t('marketRequest.modalTitle', 'Solicitar este producto')}
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              {marketCount > 0 ? `Otros ${marketCount} ya lo han pedido. ` : ''}
              {t('marketRequest.modalDesc', 'Cuando llegue, te avisaremos.')}
            </p>
            <div className="mb-4">
              <label className="text-xs font-medium text-stone-600 mb-1 block">{t('marketRequest.whyLabel', 'Por que lo quieres? (opcional)')}</label>
              <input
                value={marketNotes}
                onChange={(e) => setMarketNotes(e.target.value)}
                maxLength={200}
                placeholder={t('marketRequest.notesPlaceholder', 'Me encantaria probarlo...')}
                className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-stone-400"
              />
            </div>
            <button
              onClick={async () => {
                setRequestingMarket(true);
                try {
                  const res = await apiClient.post('/market-requests', { product_id: product.product_id, notes: marketNotes });
                  setMarketCount(res?.count || marketCount + 1);
                  setUserHasRequested(true);
                  setShowMarketModal(false);
                  toast.success(t('marketRequest.success', 'Solicitud enviada. Te avisaremos cuando este disponible.'));
                  trackEvent('market_request_submitted', { product_id: product.product_id, consumer_country: userCountry });
                } catch (err) {
                  toast.error(err?.data?.detail || 'Error');
                } finally {
                  setRequestingMarket(false);
                }
              }}
              disabled={requestingMarket}
              className="w-full py-2.5 bg-stone-950 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {requestingMarket ? 'Enviando...' : t('marketRequest.submit', 'Enviar solicitud')}
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 border-t border-stone-200 bg-white/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3">
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

          {/* Buy Now + Add to Cart */}
          <div className="flex gap-2 flex-1">
            <button
              type="button"
              onClick={async () => {
                if (addingRef.current || isOutOfStock || isUnavailableInCountry) {
                  if (isUnavailableInCountry) {
                    toast.error(t('marketRequest.unavailable', 'Este producto aun no esta disponible en tu pais.'));
                  }
                  return;
                }
                addingRef.current = true;
                try {
                  const success = await addToCart(productId, quantity, selectedVariant?.variant_id, selectedPack?.pack_id);
                  if (success && success !== 'redirect') navigate('/cart');
                } finally {
                  addingRef.current = false;
                }
              }}
              disabled={isOutOfStock || isUnavailableInCountry}
              className="flex-1 h-11 bg-white text-stone-950 border border-stone-950 rounded-full text-sm font-semibold transition-colors hover:bg-stone-50 disabled:opacity-50"
            >
              Comprar ahora
            </button>
            <motion.button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || isUnavailableInCountry}
              whileTap={{ scale: 0.96 }}
              animate={{
                background: addedToCart
                  ? '#0c0a09'
                  : (isOutOfStock || isUnavailableInCountry)
                    ? '#f5f5f4'
                    : '#0c0a09',
              }}
              transition={{ duration: 0.3 }}
              className={`flex-1 flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold ${
                (isOutOfStock || isUnavailableInCountry) ? 'cursor-not-allowed text-stone-500' : 'text-white'
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
    </div>
    {product && <AddToWishlistModal isOpen={showWishlistModal} onClose={() => setShowWishlistModal(false)} productId={product.product_id} productName={product.name} />}
    </>
  );
}
