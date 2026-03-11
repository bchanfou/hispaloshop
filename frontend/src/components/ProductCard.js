import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Star, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import ProductImage from './ui/ProductImage.tsx';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';

const formatNumber = (value) => {
  if (value === undefined || value === null) return '0';
  return Number(value).toLocaleString('es-ES');
};

const getProductId = (product) => product?.product_id || product?.id || null;

export default function ProductCard({ product, variant = 'default' }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice, t } = useLocale();
  const productId = getProductId(product);

  const basePrice = product.display_price || product.price || 0;
  const baseCurrency = product.display_currency || product.currency || 'EUR';
  const displayPrice = convertAndFormatPrice(basePrice, baseCurrency);
  const shippingCost = Number(product.shipping_cost || 0);
  const isFreeShipping = shippingCost === 0;
  const trackStock = product.track_stock !== false;
  const stock = product.market_stock ?? product.stock ?? 100;
  const lowStockThreshold = product.low_stock_threshold ?? 5;
  const isOutOfStock = trackStock && stock <= 0;
  const isLowStock = trackStock && stock > 0 && stock <= lowStockThreshold;
  const isUnavailableInCountry = product.available_in_country === false;
  const hasRating = product.average_rating !== undefined && product.average_rating !== null;
  const primaryImage = product.images?.[0] || product.image_url || null;

  const handleAuthRequired = (message) => {
    toast.error(message, {
      action: {
        label: t('auth.login', 'Entrar'),
        onClick: () => {
          window.location.href = '/login';
        },
      },
    });
  };

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      handleAuthRequired(t('errors.loginRequired', 'Inicia sesión para añadir productos'));
      return;
    }

    if (isUnavailableInCountry) {
      toast.error(t('products.notAvailableRegion', 'No disponible en tu zona'));
      return;
    }

    if (isOutOfStock) {
      toast.error(t('products.outOfStock', 'Agotado'));
      return;
    }

    if (!productId) {
      toast.error(t('errors.generic', 'No hemos podido completar la acción'));
      return;
    }

    toast.loading(t('cart.adding', 'Añadiendo...'), { id: `add-to-cart-${productId}` });
    const success = await addToCart(productId, 1);

    if (success) {
      toast.success(t('success.added', 'Añadido al carrito'), { id: `add-to-cart-${productId}` });
      return;
    }

    toast.error(t('errors.generic', 'No hemos podido completar la acción'), { id: `add-to-cart-${productId}` });
  };

  const handleBuyNow = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      handleAuthRequired(t('errors.loginRequired', 'Inicia sesión para comprar'));
      return;
    }

    if (isOutOfStock) {
      toast.error(t('products.outOfStock', 'Agotado'));
      return;
    }

    if (!productId) {
      toast.error(t('errors.generic', 'No hemos podido completar la acción'));
      return;
    }

    toast.loading(t('cart.processing', 'Procesando...'), { id: `buy-now-${productId}` });
    const success = await addToCart(productId, 1);

    if (success) {
      toast.dismiss(`buy-now-${productId}`);
      window.location.href = '/cart';
      return;
    }

    toast.error(t('errors.generic', 'No hemos podido completar la acción'), { id: `buy-now-${productId}` });
  };

  if (variant === 'compact') {
    return (
      <Link
        to={`/products/${productId}`}
        className="group relative overflow-hidden rounded-2xl border border-stone-100 bg-white p-3 shadow-sm transition-all duration-150 ease-out hover:-translate-y-[1px] hover:border-stone-300 hover:shadow-sm"
        data-testid={`product-card-${productId}`}
      >
        <div className={`relative aspect-square overflow-hidden rounded-xl bg-stone-100 ${isOutOfStock || isUnavailableInCountry ? 'opacity-60' : ''}`}>
          <ProductImage
            src={primaryImage}
            productName={product.name}
            className="h-full w-full rounded-xl"
            imageClassName="group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 50vw, 20vw"
          />

          {isFreeShipping && !isOutOfStock && !isUnavailableInCountry ? (
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

          {!isOutOfStock && !isUnavailableInCountry ? (
            <button
              type="button"
              onClick={handleAddToCart}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 text-white shadow-sm transition-all active:scale-[0.99] md:opacity-0 md:group-hover:opacity-100"
              data-testid={`quick-add-${productId}`}
              aria-label={t('products.addToCart', 'Añadir al carrito')}
            >
              <Plus className="h-4 w-4" />
            </button>
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

  return (
    <Link
      to={`/products/${productId}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white p-4 shadow-sm transition-all duration-150 ease-out hover:-translate-y-[1px] hover:border-stone-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-950/15"
      data-testid={`product-card-${productId}`}
    >
      <div className={`relative aspect-square overflow-hidden rounded-xl bg-stone-100 ${isOutOfStock || isUnavailableInCountry ? 'opacity-60' : ''}`}>
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

      <div className="flex flex-1 flex-col pt-4">
        <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-5 text-stone-900" data-testid="product-name">
          {product.name}
        </h3>

        <div className="mb-3 flex items-center gap-1 text-xs text-stone-500" data-testid="trust-signals">
          <Star className="h-3.5 w-3.5 fill-stone-500 stroke-stone-500" />
          <span className="font-medium text-stone-700">
            {hasRating ? Number(product.average_rating).toFixed(1) : '0.0'}
          </span>
          <span>({formatNumber(product.review_count || 0)})</span>
          {(product.units_sold || product.total_sold) > 0 ? (
            <>
              <span className="text-stone-400">·</span>
              <span>{formatNumber(product.units_sold || product.total_sold)} {t('products.sold', 'vendidos')}</span>
            </>
          ) : null}
        </div>

        {product.certifications && product.certifications.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-1.5" data-testid="product-certifications">
            {product.certifications.slice(0, 3).map((cert, index) => (
              <span
                key={`${cert}-${index}`}
                className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-medium text-stone-600"
                data-testid={`cert-badge-${cert}`}
              >
                {String(cert).toLowerCase()}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto">
          <div className="mb-2 text-base font-semibold text-stone-950" data-testid="product-price">
            {displayPrice}
          </div>

          {!isFreeShipping && shippingCost > 0 ? (
            <div className="mb-3 flex items-center gap-1 text-[11px] text-stone-500">
              <Truck className="h-3 w-3" />
              <span>+{convertAndFormatPrice(shippingCost, baseCurrency)} {t('products.shipping', 'de envío')}</span>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`h-auto flex-1 rounded-full border border-stone-200 bg-white py-2.5 text-xs text-stone-700 transition-all duration-150 ease-out hover:bg-stone-50 active:scale-[0.99] ${
                isOutOfStock ? 'cursor-not-allowed opacity-50' : ''
              }`}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              data-testid="add-to-cart-button"
              aria-label={`${t('products.addShort', 'Añadir')} ${product.name}`}
            >
              {t('products.addShort', 'Añadir')}
            </Button>
            <Button
              size="sm"
              className={`h-auto flex-1 rounded-full bg-stone-950 py-2.5 text-xs text-white transition-all duration-150 ease-out hover:bg-stone-800 active:scale-[0.99] ${
                isOutOfStock ? 'cursor-not-allowed opacity-50' : ''
              }`}
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              data-testid="buy-now-button"
              aria-label={`${t('products.buyNow', 'Comprar')} ${product.name}`}
            >
              {t('products.buyNow', 'Comprar')}
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
