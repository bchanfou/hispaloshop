import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Truck, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { toast } from 'sonner';
import ProductImage from './ui/ProductImage.tsx';

const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString('en-US');
};

export default function ProductCard({ product, variant = 'default' }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice, t, currency } = useLocale();

  const basePrice = product.display_price || product.price;
  const baseCurrency = product.display_currency || 'EUR';
  const displayPrice = convertAndFormatPrice(basePrice, baseCurrency);

  const shippingCost = product.shipping_cost;
  const isFreeShipping = !shippingCost || shippingCost === 0;
  const currencySymbol = currency === 'EUR' ? 'â‚¬' : currency === 'USD' ? '$' : currency === 'KRW' ? 'â‚©' : 'â‚¬';

  const trackStock = product.track_stock !== false;
  const stock = product.market_stock ?? product.stock ?? 100;
  const lowStockThreshold = product.low_stock_threshold ?? 5;
  const isOutOfStock = trackStock && stock <= 0;
  const isLowStock = trackStock && stock > 0 && stock <= lowStockThreshold;
  const isUnavailableInCountry = product.available_in_country === false;
  const hasRating = product.average_rating !== undefined && product.average_rating !== null;
  const primaryImage = product.images?.[0] || product.image_url || null;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error(t('errors.loginRequired', 'Inicia sesiÃ³n para aÃ±adir productos'), {
        action: {
          label: t('auth.login', 'Login'),
          onClick: () => {
            window.location.href = '/login';
          },
        },
      });
      return;
    }

    if (isUnavailableInCountry) {
      toast.error(t('products.notAvailableCountry'));
      return;
    }

    if (isOutOfStock) {
      toast.error(t('products.outOfStock'));
      return;
    }

    toast.loading(t('cart.adding', 'AÃ±adiendo...'), { id: 'add-to-cart' });

    const success = await addToCart(product.product_id, 1);
    if (success) {
      toast.success(t('success.added', 'Â¡AÃ±adido al carrito!'), { id: 'add-to-cart' });
    } else {
      toast.error(t('errors.generic', 'Error al aÃ±adir'), { id: 'add-to-cart' });
    }
  };

  const handleBuyNow = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error(t('errors.loginRequired', 'Inicia sesiÃ³n para comprar'), {
        action: {
          label: t('auth.login', 'Login'),
          onClick: () => {
            window.location.href = '/login';
          },
        },
      });
      return;
    }

    if (isOutOfStock) {
      toast.error(t('products.outOfStock'));
      return;
    }

    toast.loading(t('cart.adding', 'Procesando...'), { id: 'buy-now' });

    const success = await addToCart(product.product_id, 1);
    if (success) {
      toast.dismiss('buy-now');
      window.location.href = '/cart';
    } else {
      toast.error(t('errors.generic', 'Error al procesar'), { id: 'buy-now' });
    }
  };

  if (variant === 'compact') {
    return (
      <Link
        to={`/products/${product.product_id}`}
        className="group relative bg-white rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300"
        data-testid={`product-card-${product.product_id}`}
      >
        <div className={`relative aspect-square overflow-hidden bg-stone-100 ${isOutOfStock || isUnavailableInCountry ? 'opacity-60' : ''}`}>
          <ProductImage
            src={primaryImage}
            productName={product.name}
            className="h-full w-full"
            imageClassName="group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 20vw"
          />

          {isUnavailableInCountry && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-lg">
                {t('products.notAvailable')}
              </span>
            </div>
          )}

          <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
            <span className="font-heading text-sm font-bold text-text-primary">{displayPrice}</span>
          </div>

          {isFreeShipping && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
              {t('products.freeShippingShort', 'GRATIS')}
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
              {t('products.soldOut', 'Agotado')}
            </div>
          )}

          {hasRating && product.average_rating > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-0.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
              <Star className="w-2.5 h-2.5 fill-yellow-400 stroke-yellow-400" />
              <span className="font-medium">{product.average_rating.toFixed(1)}</span>
            </div>
          )}

          {!isOutOfStock && !isUnavailableInCountry && (
            <button
              onClick={handleAddToCart}
              className="absolute top-2 right-2 w-8 h-8 bg-primary hover:bg-primary-hover text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 touch-manipulation md:opacity-0 md:group-hover:opacity-100"
              style={{ opacity: undefined }}
              data-testid={`quick-add-${product.product_id}`}
              aria-label={t('products.addToCart')}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-2">
          <h3 className="text-xs font-medium text-text-primary line-clamp-2 leading-tight">
            {product.name}
          </h3>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/products/${product.product_id}`}
      className="group relative bg-white rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-stone-100 flex flex-col h-full"
      data-testid={`product-card-${product.product_id}`}
    >
      <div className={`relative aspect-square overflow-hidden bg-stone-100 flex-shrink-0 ${isOutOfStock || isUnavailableInCountry ? 'opacity-60' : ''}`}>
        <ProductImage
          src={primaryImage}
          productName={product.name}
          className="h-full w-full"
          imageClassName="group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
          data-testid="product-image"
        />

        {isUnavailableInCountry && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-md" data-testid="unavailable-badge">
            {t('products.notAvailableRegion')}
          </div>
        )}

        {!isUnavailableInCountry && isLowStock && !isOutOfStock && (
          <div
            className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-md"
            data-testid="low-stock-badge"
          >
            {t('products.onlyLeft', { count: stock, defaultValue: `Solo quedan ${stock}` })}
          </div>
        )}

        {isOutOfStock && (
          <div
            className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-md"
            data-testid="out-of-stock-badge"
          >
            {t('products.soldOut', 'Agotado')}
          </div>
        )}

        {isFreeShipping && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-semibold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
            <Truck className="w-3 h-3" />
            <span className="hidden sm:inline">{t('products.freeShippingShort', 'Gratis')}</span>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-grow">
        <h3
          className="font-heading text-sm font-medium text-text-primary mb-1.5 line-clamp-2 leading-tight group-hover:text-text-secondary transition-colors"
          data-testid="product-name"
        >
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-2 text-xs" data-testid="trust-signals">
          <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
          <span className="font-medium text-text-primary">
            {hasRating ? product.average_rating.toFixed(1) : '0.0'}
          </span>
          <span className="text-text-muted">
            ({formatNumber(product.review_count || 0)})
          </span>
          {(product.units_sold || product.total_sold) > 0 && (
            <>
              <span className="text-text-muted">Â·</span>
              <span className="text-text-muted">
                {formatNumber(product.units_sold || product.total_sold)} {t('products.sold', 'sold')}
              </span>
            </>
          )}
        </div>

        {product.certifications && product.certifications.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2" data-testid="product-certifications">
            {product.certifications.slice(0, 3).map((cert, idx) => (
              <span
                key={idx}
                className="bg-stone-100 text-text-secondary px-2 py-0.5 rounded-full text-[10px] font-medium"
                data-testid={`cert-badge-${cert}`}
              >
                {cert.toLowerCase()}
              </span>
            ))}
          </div>
        )}

        <div className="flex-grow" />

        <div className="mb-2">
          <span
            className="font-heading text-lg font-bold text-text-primary"
            data-testid="product-price"
          >
            {displayPrice}
          </span>
        </div>

        {!isFreeShipping && shippingCost > 0 && (
          <div className="mb-2 flex items-center gap-1 text-[10px] text-text-muted">
            <Truck className="w-3 h-3" />
            <span>
              +{currencySymbol}{shippingCost?.toFixed(2)} {t('products.shipping', 'envÃ­o')}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`flex-1 rounded-full border-border-default text-text-secondary hover:bg-stone-50 text-xs py-2 h-auto ${
              isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            data-testid="add-to-cart-button"
          >
            {t('products.addShort', 'AÃ±adir')}
          </Button>
          <Button
            size="sm"
            className={`flex-1 rounded-full bg-ds-primary text-white hover:bg-ds-primary/90 text-xs py-2 h-auto ${
              isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            data-testid="buy-now-button"
          >
            {t('products.buyNow', 'Comprar')}
          </Button>
        </div>
      </div>
    </Link>
  );
}
