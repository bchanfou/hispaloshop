import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { AlertTriangle, Award, ChevronLeft, ChevronRight, MessageSquare, Plus, ShieldCheck, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import ProductImage from '../ui/ProductImage.tsx';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLocale } from '../../context/LocaleContext';
import { useProductReviews as useProductReviewsHook } from '../../features/products/hooks';
import { useProductCertificate } from '../../features/products/queries';
import { useTranslation } from 'react-i18next';

const normalizeEntityId = (value) => (value == null ? '' : String(value));

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// ── + button con feedback ✓ ───────────────────────────────────────────────────
function AddButton({ onAdd, isDisabled }) {
  const [confirmed, setConfirmed] = useState(false);
  const timerRef = React.useRef(null);

  React.useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleClick = async () => {
    if (confirmed || isDisabled) return;
    await onAdd();
    setConfirmed(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setConfirmed(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={t('product_detail_overlay.anadirAlCarrito', 'Añadir al carrito')}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
        confirmed
          ? 'bg-stone-200 text-stone-700'
          : isDisabled
          ? 'cursor-not-allowed bg-stone-100 text-stone-300'
          : 'bg-stone-950 text-white hover:bg-stone-800'
      }`}
    >
      {confirmed ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      )}
    </button>
  );
}

function ReviewRow({ review }) {
  const initial = review.user_name?.[0]?.toUpperCase() || 'U';

  return (
    <div className="flex gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-stone-700">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate font-medium text-stone-950">
            {review.user_name || 'Usuario'}
          </span>
          <span className="text-stone-300">·</span>
          <span className="text-stone-400 text-[12px]">{formatDate(review.created_at)}</span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-stone-700">
          {review.comment}
        </p>
      </div>
    </div>
  );
}

// ── Fila de info (productor, ingredientes, etc.) ──────────────────────────────
function InfoRow({ label, value, icon: Icon }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-stone-100 p-4">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5 text-stone-400" /> : null}
        <p className="text-[12px] font-medium text-stone-400">{label}</p>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-stone-700">{value}</p>
    </div>
  );
}

export default function ProductDetailOverlay({
  product,
  store,
  reviews = [],
  certificates = [],
  onClose,
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice } = useLocale();
  const productId = product?.product_id || product?.id;

  // Reset image index when product changes
  useEffect(() => { setImageIndex(0); setDescExpanded(false); }, [productId]);

  const { reviews: fetchedReviews, isLoading: loadingReviews } = useProductReviewsHook(reviews.length === 0 ? productId : null);
  const { data: certData, isLoading: loadingCerts } = useProductCertificate(certificates.length === 0 ? productId : null);

  const effectiveReviews = reviews.length > 0 ? reviews : (fetchedReviews ?? []);
  const fetchedCertArray = certData ? [{ ...certData, product_id: productId, product_name: product?.name }] : [];
  const effectiveCertificates = certificates.length > 0 ? certificates : fetchedCertArray;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const images = useMemo(() => {
    const gallery = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
    if (gallery.length > 0) return gallery;
    if (product?.image_url) return [product.image_url];
    return [];
  }, [product?.image_url, product?.images]);

  const relatedCertificates = effectiveCertificates.filter(
    (c) => normalizeEntityId(c.product_id) === normalizeEntityId(productId),
  );
  const relatedReviews = effectiveReviews.filter(
    (r) => normalizeEntityId(r.product_id) === normalizeEntityId(productId),
  );

  const price = convertAndFormatPrice(
    product?.display_price || product?.price || 0,
    product?.display_currency || product?.currency || 'EUR',
  );

  const description = product?.description || product?.short_description || '';
  const isDescLong = description.length > 120;

  const handleAddToCart = async () => {
    if (!user) {
      toast.error(t('product_detail_overlay.iniciaSesionParaAnadirProductos', 'Inicia sesión para añadir productos'));
      return;
    }
    try {
      const success = await addToCart(productId, 1);
      if (!success) toast.error(t('product_detail_overlay.noHemosPodidoCompletarLaAccion', 'No hemos podido completar la acción'));
    } catch {
      toast.error(t('product_detail_overlay.noHemosPodidoCompletarLaAccion', 'No hemos podido completar la acción'));
    }
  };

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
    <div role="dialog" aria-modal="true" aria-label={product?.name || 'Producto'} className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      {/* Backdrop */}
      <motion.button
        type="button"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Cerrar"
      />

      {/* Panel */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0, transition: { type: 'spring', damping: 28, stiffness: 300 } }}
        exit={{ y: '100%', transition: { duration: 0.22 } }}
        className="relative z-10 flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-modal"
      >

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold leading-tight text-stone-950 line-clamp-1">
            {product?.name || 'Producto'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 active:bg-stone-200"
            aria-label="Cerrar"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        {/* Scroll body */}
        <div className="overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">

            {/* Columna imagen */}
            <div className="space-y-2.5">
              <div className="relative overflow-hidden rounded-3xl bg-stone-100">
                <div className="aspect-square">
                  <ProductImage
                    src={images[imageIndex] || null}
                    productName={product.name}
                    className="h-full w-full"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition hover:bg-white"
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-stone-700 shadow-sm transition hover:bg-white"
                      aria-label="Imagen siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </div>

              {images.length > 1 ? (
                <div className="grid grid-cols-4 gap-1.5">
                  {images.map((img, i) => (
                    <button
                      key={`${img}-${i}`}
                      type="button"
                      onClick={() => setImageIndex(i)}
                      className={`overflow-hidden rounded-2xl border transition-all duration-150 ${
                        i === imageIndex ? 'border-stone-950' : 'border-stone-100 hover:border-stone-200'
                      }`}
                      aria-label={`Ver imagen ${i + 1}`}
                    >
                      <div className="aspect-square">
                        <ProductImage src={img} productName={`${product.name} ${i + 1}`} className="h-full w-full" sizes="80px" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Columna info */}
            <div className="space-y-4">

              {/* Precio + CTA */}
              <div className="rounded-3xl border border-stone-100 bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] text-stone-400">{store?.name || 'Tienda'}</p>
                    <p className="mt-0.5 text-[22px] font-semibold tracking-tight text-stone-950">{price}</p>
                  </div>
                  {product.average_rating ? (
                    <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-medium text-stone-700 shadow-sm">
                      <Star className="h-3 w-3 fill-stone-950 stroke-stone-950" />
                      <span>{Number(product.average_rating).toFixed(1)}</span>
                    </div>
                  ) : null}
                </div>

                {/* Descripción colapsable */}
                {description ? (
                  <div className="mt-3">
                    <p className={`text-[13px] leading-relaxed text-stone-600 ${descExpanded || !isDescLong ? '' : 'line-clamp-3'}`}>
                      {description}
                    </p>
                    {isDescLong && !descExpanded ? (
                      <button
                        type="button"
                        onClick={() => setDescExpanded(true)}
                        className="mt-1 text-[12px] text-stone-400 transition-colors hover:text-stone-600"
                      >
                        más
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {/* Botón único añadir */}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[13px] text-stone-500">{t('product_detail_overlay.anadirAlCarrito', 'Añadir al carrito')}</span>
                  <AddButton onAdd={handleAddToCart} isDisabled={product?.is_out_of_stock || (product?.track_stock !== false && (product?.market_stock ?? product?.stock ?? 100) <= 0)} />
                </div>
              </div>

              {/* Info cards */}
              <div className="grid gap-2.5">
                <InfoRow label="Ingredientes" value={Array.isArray(product.ingredients) ? product.ingredients.map(i => typeof i === 'object' ? i.name : i).join(', ') : product.ingredients} />
                <InfoRow label="Valores nutricionales" value={typeof (product.nutritional_info || product.nutritional_values) === 'object' && !Array.isArray(product.nutritional_info || product.nutritional_values) ? Object.entries(product.nutritional_info || product.nutritional_values).map(([k,v]) => `${k}: ${v}`).join(', ') : (product.nutritional_info || product.nutritional_values)} />
                <InfoRow label={t('productDetail.allergens', 'Alérgenos')} value={Array.isArray(product.allergens) ? product.allergens.join(', ') : product.allergens} icon={AlertTriangle} />
              </div>
            </div>
          </div>

          {/* Certificaciones */}
          <section className="mt-5 rounded-3xl border border-stone-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[14px] font-semibold text-stone-950">Certificaciones</h3>
              {relatedCertificates[0] ? (
                <Link
                  to={`/certificate/${relatedCertificates[0].product_id}`}
                  className="text-[12px] font-medium text-stone-500 transition-colors hover:text-stone-800"
                >
                  Ver certificado →
                </Link>
              ) : null}
            </div>

            {loadingCerts ? (
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-20 animate-pulse rounded-full bg-stone-100" />
                <div className="h-6 w-24 animate-pulse rounded-full bg-stone-100" />
              </div>
            ) : relatedCertificates.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {relatedCertificates.map((cert) => (
                  <span
                    key={cert.certificate_id || cert.product_id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-100 bg-stone-50 px-2.5 py-1 text-[11px] text-stone-600"
                  >
                    <Award className="h-3 w-3 text-stone-400" />
                    {cert.certificate_type || cert.name || cert.product_name || 'Certificado'}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-stone-400">
                <ShieldCheck size={16} />
                <p className="text-[13px] m-0">{t('product_detail_overlay.esteProductoAunNoTieneCertificados', 'Este producto aún no tiene certificados verificados.')}</p>
              </div>
            )}
          </section>

          {/* Reseñas */}
          <section className="mt-4 rounded-3xl border border-stone-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[14px] font-semibold text-stone-950">{t('store.reviews', 'Reseñas')}</h3>
              <span className="text-[12px] text-stone-400">{relatedReviews.length}</span>
            </div>

            {loadingReviews ? (
              <div className="mt-3 space-y-2">
                {[0, 1].map(i => (
                  <div key={i} className="flex gap-2">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-stone-100 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-1/3 animate-pulse rounded-full bg-stone-100" />
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-stone-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : relatedReviews.length > 0 ? (
              <div className="mt-3 space-y-2.5">
                {relatedReviews.map((review) => (
                  <ReviewRow key={review.review_id || `${review.user_id}-${review.created_at}`} review={review} />
                ))}
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-stone-400">
                <MessageSquare size={16} />
                <p className="text-[13px] m-0">{t('product_detail_overlay.seElPrimeroEnOpinarSobreEsteProdu', 'Sé el primero en opinar sobre este producto.')}</p>
              </div>
            )}
          </section>
        </div>
      </motion.div>
    </div>
    </FocusTrap>
  );
}
