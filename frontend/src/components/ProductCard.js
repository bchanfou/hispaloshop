import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star, Truck } from 'lucide-react';
import { toast } from 'sonner';
import ProductImage from './ui/ProductImage.tsx';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';

const formatNumber = (value) => {
  if (value === undefined || value === null) return '0';
  return Number(value).toLocaleString('es-ES');
};

const getProductId = (product) => product?.product_id || product?.id || null;

// ── Botón + con feedback ✓, sin presión visual de compra ─────────────────────
function AddButton({ onAdd, isDisabled, testId }) {
  const [confirmed, setConfirmed] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmed || isDisabled) return;
    await onAdd(e);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      data-testid={testId}
      aria-label="Añadir al carrito"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
        confirmed
          ? 'bg-stone-200 text-stone-700'
          : isDisabled
          ? 'cursor-not-allowed bg-stone-100 text-stone-300'
          : 'bg-stone-950 text-white hover:bg-stone-800'
      }`}
    >
      {confirmed ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      )}
    </button>
  );
}

function ProductCard({ product, variant = 'default' }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice, t } = useLocale();
  const productId = getProductId(product);

  const basePrice     = product.display_price || product.price || 0;
  const baseCurrency  = product.display_currency || product.currency || 'EUR';
  const displayPrice  = convertAndFormatPrice(basePrice, baseCurrency);
  const shippingCost  = Number(product.shipping_cost || 0);
  const isFreeShipping = shippingCost === 0;
  const trackStock    = product.track_stock !== false;
  const stock         = product.market_stock ?? product.stock ?? 100;
  const lowStockThreshold = product.low_stock_threshold ?? 5;
  const isOutOfStock  = trackStock && stock <= 0;
  const isLowStock    = trackStock && stock > 0 && stock <= lowStockThreshold;
  const isUnavailableInCountry = product.available_in_country === false;
  const hasRating     = product.average_rating !== undefined && product.average_rating !== null;
  const primaryImage  = product.images?.[0] || product.image_url || null;
  const isBlocked     = isOutOfStock || isUnavailableInCountry;

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      toast.error(t('errors.loginRequired', 'Inicia sesión para añadir productos'), {
        action: { label: t('auth.login', 'Entrar'), onClick: () => { window.location.href = '/login'; } },
      });
      return;
    }
    if (isUnavailableInCountry) { toast.error(t('products.notAvailableRegion', 'No disponible en tu zona')); return; }
    if (isOutOfStock)           { toast.error(t('products.outOfStock', 'Agotado'));                          return; }
    if (!productId)             { toast.error(t('errors.generic', 'No hemos podido completar la acción'));   return; }

    const success = await addToCart(productId, 1);
    if (!success) toast.error(t('errors.generic', 'No hemos podido completar la acción'));
  };

  // ── Variante compacta (grid pequeño) ─────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <Link
        to={`/products/${productId}`}
        className="group relative overflow-hidden rounded-2xl border border-stone-100 bg-white p-3 shadow-sm transition-all duration-150 ease-out hover:-translate-y-[1px] hover:border-stone-300 hover:shadow-sm"
        data-testid={`product-card-${productId}`}
      >
        <div className={`relative aspect-square overflow-hidden rounded-xl bg-stone-100 ${isBlocked ? 'opacity-60' : ''}`}>
          <ProductImage
            src={primaryImage}
            productName={product.name}
            className="h-full w-full rounded-xl"
            imageClassName="group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, 20vw"
          />

          {isFreeShipping && !isBlocked ? (
            <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-semibold text-stone-950 shadow-sm">
              {t('products.freeShippingShort', 'Gratis')}
            </span>
          ) : null}

          {isOutOfStock ? (
            <span className="absolute left-2 top-2 rounded-full bg-stone-950 px-2 py-1 text-[10px] font-semibold text-white">
              {t('products.soldOut', 'Agotado')}
            </span>
          ) : null}

          {hasRating && Number(product.average_rating) > 0 ? (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] text-white">
              <Star className="h-3 w-3 fill-white stroke-white" />
              <span>{Number(product.average_rating).toFixed(1)}</span>
            </div>
          ) : null}

          {!isBlocked ? (
            <div className="absolute right-2 top-2 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
              <AddButton onAdd={handleAddToCart} isDisabled={false} testId={`quick-add-${productId}`} />
            </div>
          ) : null}

          <div className="absolute bottom-2 right-2 rounded-full bg-white/95 px-2.5 py-1 text-sm font-semibold text-stone-950 shadow-sm backdrop-blur">
            {displayPrice}
          </div>
        </div>

        <div className="pt-3">
          <h3 className="line-clamp-2 text-xs font-medium leading-tight text-stone-900">{product.name}</h3>
        </div>
      </Link>
    );
  }

  // ── Variante default (grid principal) ────────────────────────────────────────
  return (
    <Link
      to={`/products/${productId}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white p-4 shadow-sm transition-all duration-150 ease-out hover:-translate-y-[1px] hover:border-stone-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950/15"
      data-testid={`product-card-${productId}`}
    >
      {/* Imagen */}
      <div className={`relative aspect-square overflow-hidden rounded-xl bg-stone-100 ${isBlocked ? 'opacity-60' : ''}`}>
        <ProductImage
          src={primaryImage}
          productName={product.name}
          className="h-full w-full rounded-xl"
          imageClassName="group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
          data-testid="product-image"
        />

        {isUnavailableInCountry ? (
          <span className="absolute left-2 top-2 rounded-full bg-stone-950 px-2.5 py-1 text-[10px] font-semibold text-white" data-testid="unavailable-badge">
            {t('products.notAvailableRegion', 'No disponible')}
          </span>
        ) : null}

        {!isUnavailableInCountry && isLowStock && !isOutOfStock ? (
          <span className="absolute left-2 top-2 rounded-full bg-stone-950 px-2.5 py-1 text-[10px] font-semibold text-white" data-testid="low-stock-badge">
            {t('products.onlyLeft', { count: stock, defaultValue: `Quedan ${stock}` })}
          </span>
        ) : null}

        {isOutOfStock ? (
          <span className="absolute left-2 top-2 rounded-full bg-stone-950 px-2.5 py-1 text-[10px] font-semibold text-white" data-testid="out-of-stock-badge">
            {t('products.soldOut', 'Agotado')}
          </span>
        ) : null}

        {isFreeShipping && !isOutOfStock ? (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-stone-950 shadow-sm backdrop-blur">
            <Truck className="h-3 w-3" />
            <span className="hidden sm:inline">{t('products.freeShippingShort', 'Gratis')}</span>
          </div>
        ) : null}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col pt-3">
        <h3 className="mb-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-stone-900" data-testid="product-name">
          {product.name}
        </h3>

        {/* Productor */}
        {product.producer_name || product.store_name ? (
          <p className="mb-1.5 truncate text-[12px] text-stone-500">
            {product.producer_name || product.store_name}
          </p>
        ) : null}

        {/* Rating */}
        <div className="mb-auto flex items-center gap-1 text-[11px] text-stone-500" data-testid="trust-signals">
          <Star className="h-3 w-3 fill-stone-400 stroke-stone-400" />
          <span className="font-medium text-stone-600">
            {hasRating ? Number(product.average_rating).toFixed(1) : '—'}
          </span>
          <span>({formatNumber(product.review_count || 0)})</span>
        </div>

        {/* Certificaciones */}
        {product.certifications?.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1" data-testid="product-certifications">
            {product.certifications.slice(0, 2).map((cert, i) => (
              <span
                key={`${cert}-${i}`}
                className="rounded-full border border-stone-100 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-500"
              >
                {String(cert).toLowerCase()}
              </span>
            ))}
          </div>
        ) : null}

        {/* Precio + botón — zona de acción sin agresividad */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[16px] font-semibold leading-tight text-stone-950" data-testid="product-price">
              {displayPrice}
            </div>
            {!isFreeShipping && shippingCost > 0 ? (
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-400">
                <Truck className="h-2.5 w-2.5" />
                <span>+{convertAndFormatPrice(shippingCost, baseCurrency)}</span>
              </div>
            ) : null}
          </div>

          <AddButton
            onAdd={handleAddToCart}
            isDisabled={isBlocked}
            testId={`add-to-cart-${productId}`}
          />
        </div>
      </div>
    </Link>
  );
}

const areProductPropsEqual = (prev, next) => {
  const p = prev.product;
  const n = next.product;
  return (
    (p?.product_id || p?.id) === (n?.product_id || n?.id) &&
    p?.price === n?.price &&
    p?.display_price === n?.display_price &&
    p?.stock === n?.stock &&
    p?.market_stock === n?.market_stock &&
    p?.average_rating === n?.average_rating &&
    p?.name === n?.name &&
    p?.image_url === n?.image_url &&
    p?.images?.[0] === n?.images?.[0] &&
    prev.variant === next.variant
  );
};

export default React.memo(ProductCard, areProductPropsEqual);
