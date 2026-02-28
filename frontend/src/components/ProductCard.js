import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Truck, Heart, ImageOff, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { toast } from 'sonner';
import { sanitizeImageUrl } from '../utils/helpers';

// Helper function to format numbers with commas
const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString('en-US');
};

// Image with fallback
const ProductImage = ({ src, alt, className }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const getInitials = () => {
    const words = (alt || '').split(' ').filter(w => w.length > 0);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const safeSrc = sanitizeImageUrl(src);

  if (error || !safeSrc) {
    return (
      <div className={`flex items-center justify-center bg-amber-50 ${className}`}>
        <span className="font-semibold text-2xl text-amber-600 select-none">{getInitials()}</span>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className={`flex items-center justify-center bg-stone-100 animate-pulse ${className}`}>
          <ImageOff className="w-8 h-8 text-stone-300" />
        </div>
      )}
      <img
        src={safeSrc}
        alt={alt}
        className={`${className} ${loading ? 'hidden' : ''}`}
        onLoad={() => setLoading(false)}
        onError={() => { setError(true); setLoading(false); }}
        loading="lazy"
      />
    </>
  );
};

export default function ProductCard({ product, variant = 'default' }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice, t, currency } = useLocale();

  // Use display_price and display_currency from backend (country-specific)
  const basePrice = product.display_price || product.price;
  const baseCurrency = product.display_currency || 'EUR';
  
  // Convert to user's selected currency
  const displayPrice = convertAndFormatPrice(basePrice, baseCurrency);

  // Shipping info
  const shippingCost = product.shipping_cost;
  const freeShippingMinQty = product.free_shipping_min_qty;
  const isFreeShipping = !shippingCost || shippingCost === 0;
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'KRW' ? '₩' : '€';

  // Stock status calculations
  const trackStock = product.track_stock !== false;
  const stock = product.market_stock ?? product.stock ?? 100;
  const lowStockThreshold = product.low_stock_threshold ?? 5;
  const isOutOfStock = trackStock && stock <= 0;
  const isLowStock = trackStock && stock > 0 && stock <= lowStockThreshold;
  const isUnavailableInCountry = product.available_in_country === false;

  // Trust signals data
  const hasRating = product.average_rating !== undefined && product.average_rating !== null;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error(t('errors.loginRequired', 'Inicia sesión para añadir productos'), {
        action: {
          label: t('auth.login', 'Login'),
          onClick: () => window.location.href = '/login'
        }
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

    // Show loading state
    toast.loading(t('cart.adding', 'Añadiendo...'), { id: 'add-to-cart' });
    
    const success = await addToCart(product.product_id, 1);
    if (success) {
      toast.success(t('success.added', '¡Añadido al carrito!'), { id: 'add-to-cart' });
    } else {
      toast.error(t('errors.generic', 'Error al añadir'), { id: 'add-to-cart' });
    }
  };

  const handleBuyNow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error(t('errors.loginRequired', 'Inicia sesión para comprar'), {
        action: {
          label: t('auth.login', 'Login'),
          onClick: () => window.location.href = '/login'
        }
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

  // Mobile Compact Variant - Instagram style with price overlay
  if (variant === 'compact') {
    return (
      <Link
        to={`/products/${product.product_id}`}
        className="group relative bg-white rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300"
        data-testid={`product-card-${product.product_id}`}
      >
        {/* Image with overlay */}
        <div className={`relative aspect-square overflow-hidden bg-stone-100 ${isOutOfStock || isUnavailableInCountry ? 'opacity-60' : ''}`}>
          <ProductImage
            src={product.images?.[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Unavailable in country badge */}
          {isUnavailableInCountry && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-lg">
                {t('products.notAvailable')}
              </span>
            </div>
          )}
          
          {/* Price Badge - Bottom right */}
          <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
            <span className="font-heading text-sm font-bold text-text-primary">{displayPrice}</span>
          </div>
          
          {/* Free Shipping Badge - Top left */}
          {isFreeShipping && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
              {t('products.freeShippingShort', 'GRATIS')}
            </div>
          )}
          
          {/* Stock Badge */}
          {isOutOfStock && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
              {t('products.soldOut', 'Agotado')}
            </div>
          )}
          
          {/* Rating - Bottom left */}
          {hasRating && product.average_rating > 0 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-0.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
              <Star className="w-2.5 h-2.5 fill-yellow-400 stroke-yellow-400" />
              <span className="font-medium">{product.average_rating.toFixed(1)}</span>
            </div>
          )}
          
          {/* Quick Add "+" button — floating on image */}
          {!isOutOfStock && !isUnavailableInCountry && (
            <button
              onClick={handleAddToCart}
              className="absolute top-2 right-2 w-8 h-8 bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 touch-manipulation md:opacity-0 md:group-hover:opacity-100"
              style={{ opacity: undefined }}
              data-testid={`quick-add-${product.product_id}`}
              aria-label={t('products.addToCart')}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Minimal info below image */}
        <div className="p-2">
          <h3 className="text-xs font-medium text-text-primary line-clamp-2 leading-tight">
            {product.name}
          </h3>
        </div>
      </Link>
    );
  }

  // Default Variant - Full card
  return (
    <Link
      to={`/products/${product.product_id}`}
      className="group relative bg-white rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-stone-100 flex flex-col h-full"
      data-testid={`product-card-${product.product_id}`}
    >
      {/* Product Image Container - Fixed aspect ratio */}
      <div className={`relative aspect-square overflow-hidden bg-stone-100 flex-shrink-0 ${isOutOfStock || isUnavailableInCountry ? 'opacity-60' : ''}`}>
        <ProductImage
          src={product.images?.[0]}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          data-testid="product-image"
        />
        
        {/* Unavailable in country badge */}
        {isUnavailableInCountry && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full shadow-md" data-testid="unavailable-badge">
            {t('products.notAvailableRegion')}
          </div>
        )}
        
        {/* Stock Badge - Top Left */}
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
        
        {/* Free Shipping Badge - Top Right */}
        {isFreeShipping && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-semibold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
            <Truck className="w-3 h-3" />
            <span className="hidden sm:inline">{t('products.freeShippingShort', 'Gratis')}</span>
          </div>
        )}
      </div>

      {/* Content - Flexible height */}
      <div className="p-3 flex flex-col flex-grow">
        {/* Product Name */}
        <h3 
          className="font-heading text-sm font-medium text-text-primary mb-1.5 line-clamp-2 leading-tight group-hover:text-text-secondary transition-colors"
          data-testid="product-name"
        >
          {product.name}
        </h3>

        {/* Rating & Reviews - Compact */}
        <div className="flex items-center gap-1 mb-2 text-xs" data-testid="trust-signals">
          <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
          <span className="font-medium text-text-primary">
            {hasRating ? product.average_rating.toFixed(1) : '0.0'}
          </span>
          <span className="text-text-muted">
            ({formatNumber(product.review_count || 0)})
          </span>
          {product.units_sold > 0 && (
            <>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">
                {formatNumber(product.units_sold)} {t('products.sold', 'sold')}
              </span>
            </>
          )}
        </div>

        {/* Certification Tags - Compact pills */}
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

        {/* Spacer to push price and buttons to bottom */}
        <div className="flex-grow" />

        {/* Price */}
        <div className="mb-2">
          <span 
            className="font-heading text-lg font-bold text-text-primary"
            data-testid="product-price"
          >
            {displayPrice}
          </span>
        </div>

        {/* Shipping Info - Only on non-free shipping */}
        {!isFreeShipping && shippingCost > 0 && (
          <div className="mb-2 flex items-center gap-1 text-[10px] text-text-muted">
            <Truck className="w-3 h-3" />
            <span>
              +{currencySymbol}{shippingCost?.toFixed(2)} {t('products.shipping', 'envío')}
            </span>
          </div>
        )}

        {/* Action Buttons */}
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
            {t('products.addShort', 'Añadir')}
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
