import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Award, ChevronLeft, ChevronRight, ShoppingBag, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import ProductImage from '../ui/ProductImage.tsx';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLocale } from '../../context/LocaleContext';
import { useProductReviews as useProductReviewsHook } from '../../features/products/hooks';
import { useProductCertificate } from '../../features/products/queries';

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
          <span className="text-stone-400">·</span>
          <span className="text-stone-500">{formatDate(review.created_at)}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-stone-700">
          {review.comment}
        </p>
      </div>
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
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice } = useLocale();
  const productId = product?.product_id || product?.id;

  // Auto-fetch cuando el padre no pasa datos (p.ej. al abrir desde perfil de usuario)
  const { reviews: fetchedReviews } = useProductReviewsHook(reviews.length === 0 ? productId : null);
  const { data: certData } = useProductCertificate(certificates.length === 0 ? productId : null);

  const effectiveReviews = reviews.length > 0 ? reviews : (fetchedReviews ?? []);
  const fetchedCertArray = certData ? [{ ...certData, product_id: productId, product_name: product?.name }] : [];
  const effectiveCertificates = certificates.length > 0 ? certificates : fetchedCertArray;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

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
    (certificate) => normalizeEntityId(certificate.product_id) === normalizeEntityId(productId),
  );
  const relatedReviews = effectiveReviews.filter(
    (review) => normalizeEntityId(review.product_id) === normalizeEntityId(productId),
  );
  const price = convertAndFormatPrice(product?.display_price || product?.price || 0, product?.display_currency || product?.currency || 'EUR');

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Inicia sesión para añadir productos');
      return;
    }

    toast.loading('Añadiendo...', { id: `overlay-add-${productId}` });
    const success = await addToCart(productId, 1);
    if (success) {
      toast.success('Añadido al carrito', { id: `overlay-add-${productId}` });
      return;
    }

    toast.error('No hemos podido completar la acción', { id: `overlay-add-${productId}` });
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error('Inicia sesión para comprar');
      return;
    }

    toast.loading('Procesando...', { id: `overlay-buy-${productId}` });
    const success = await addToCart(productId, 1);
    if (success) {
      toast.dismiss(`overlay-buy-${productId}`);
      window.location.href = '/cart';
      return;
    }

    toast.error('No hemos podido completar la acción', { id: `overlay-buy-${productId}` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
        aria-label="Cerrar detalle del producto"
      />

      <div className="relative z-10 flex max-h-[88vh] w-full max-w-[700px] origin-center scale-100 flex-col overflow-hidden rounded-[28px] bg-white shadow-xl transition-transform duration-200 ease-out">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-400">
              Producto destacado
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stone-950">{product.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-950"
            aria-label="Cerrar detalle del producto"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-3xl bg-stone-100">
                <div className="aspect-square">
                  <ProductImage
                    src={images[imageIndex] || null}
                    productName={product.name}
                    className="h-full w-full"
                    imageClassName=""
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setImageIndex((current) => (current - 1 + images.length) % images.length)}
                      className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-stone-700 shadow-sm transition hover:bg-white"
                      aria-label="Imagen anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageIndex((current) => (current + 1) % images.length)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 text-stone-700 shadow-sm transition hover:bg-white"
                      aria-label="Imagen siguiente"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </div>

              {images.length > 1 ? (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setImageIndex(index)}
                      className={`overflow-hidden rounded-2xl border transition-all duration-150 ${
                        index === imageIndex ? 'border-stone-950' : 'border-stone-100 hover:border-stone-300'
                      }`}
                      aria-label={`Ver imagen ${index + 1}`}
                    >
                      <div className="aspect-square">
                        <ProductImage
                          src={image}
                          productName={`${product.name} ${index + 1}`}
                          className="h-full w-full"
                          imageClassName=""
                          sizes="96px"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-stone-100 bg-stone-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-stone-500">{store?.name || 'Tienda'}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-stone-950">{price}</p>
                  </div>
                  {product.average_rating ? (
                    <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700">
                      <Star className="h-3.5 w-3.5 fill-stone-950 stroke-stone-950" />
                      <span>{Number(product.average_rating).toFixed(1)}</span>
                    </div>
                  ) : null}
                </div>

                <p className="mt-4 text-sm leading-relaxed text-stone-700">
                  {product.description || product.short_description || 'Producto seleccionado desde la tienda.'}
                </p>

                <div className="mt-5 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                    onClick={handleAddToCart}
                    aria-label={`Añadir ${product.name} al carrito`}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Añadir
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 rounded-full bg-stone-950 text-white hover:bg-stone-800"
                    onClick={handleBuyNow}
                    aria-label={`Comprar ${product.name}`}
                  >
                    Comprar
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-stone-100 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">Productor</p>
                  <p className="mt-2 text-sm text-stone-700">{store?.name || 'Tienda asociada'}</p>
                </div>

                <div className="rounded-2xl border border-stone-100 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">Ingredientes</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">
                    {product.ingredients || 'Información pendiente de actualización por la tienda.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-100 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">Valores nutricionales</p>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">
                    {product.nutritional_info || product.nutritional_values || 'Información nutricional no disponible.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-stone-100 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-stone-700" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">Alérgenos</p>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">
                    {product.allergens || 'No especificados.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-6 rounded-3xl border border-stone-100 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-stone-950">Certificaciones</h3>
                <p className="mt-1 text-sm text-stone-500">Documentación digital asociada al producto.</p>
              </div>
              {relatedCertificates[0] ? (
                <Link to={`/certificate/${relatedCertificates[0].product_id}`} className="shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                    aria-label={`Ver certificado digital de ${product.name}`}
                  >
                    Ver certificado digital
                  </Button>
                </Link>
              ) : null}
            </div>

            {relatedCertificates.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {relatedCertificates.map((certificate) => (
                  <span
                    key={certificate.certificate_id || certificate.product_id}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700"
                  >
                    <Award className="h-3.5 w-3.5" />
                    {certificate.product_name || product.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-500">Todavía no hay certificados visibles para este producto.</p>
            )}
          </section>

          <section className="mt-6 rounded-3xl border border-stone-100 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-stone-950">Reseñas</h3>
                <p className="mt-1 text-sm text-stone-500">Comentarios de clientes en formato conversacional.</p>
              </div>
              <span className="text-sm text-stone-500">{relatedReviews.length}</span>
            </div>

            {relatedReviews.length > 0 ? (
              <div className="mt-4 space-y-3">
                {relatedReviews.map((review) => (
                  <ReviewRow key={review.review_id || `${review.user_id}-${review.created_at}`} review={review} />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-500">Todavía no hay reseñas para este producto.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
