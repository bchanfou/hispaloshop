import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Plus, Star, Leaf, Shield, Award } from 'lucide-react';
import { toast } from 'sonner';
import ProductImage from './ui/ProductImage.tsx';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';
import { useHaptics } from '../hooks/useHaptics';

const CERT_LABELS = {
  organic: 'Ecológico',
  dop: 'DOP',
  igp: 'IGP',
  gluten_free: 'Sin Gluten',
  vegan: 'Vegano',
  halal: 'Halal',
  km0: 'Km 0',
};

function getPrimaryCert(product) {
  if (product.is_organic) return 'organic';
  if (product.is_km0) return 'km0';
  if (product.is_vegan) return 'vegan';
  if (product.is_gluten_free) return 'gluten_free';
  if (product.is_halal) return 'halal';
  if (product.certifications?.length > 0) return product.certifications[0];
  return null;
}

const getProductId = (product) => product?.product_id || product?.id || null;

function AddButton({ onAdd, isDisabled, testId }) {
  const [confirmed, setConfirmed] = useState(false);
  const { trigger } = useHaptics();
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmed || isDisabled) return;
    trigger('light');
    await onAdd(e);
    setConfirmed(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setConfirmed(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      data-testid={testId}
      aria-label="Añadir al carrito"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-none transition-all ${
        isDisabled ? 'cursor-not-allowed bg-stone-100 text-stone-500'
        : confirmed ? 'cursor-pointer bg-stone-100 text-stone-500'
        : 'cursor-pointer bg-stone-950 text-white'
      }`}
    >
      {confirmed ? (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <Plus size={12} strokeWidth={2.5} />
      )}
    </button>
  );
}

function ProductCard({ product, variant = 'default', showAddButton = true }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice, t } = useLocale();
  const productId = getProductId(product);

  const basePrice = product.display_price || product.price || 0;
  const baseCurrency = product.display_currency || product.currency || 'EUR';
  const displayPrice = convertAndFormatPrice(basePrice, baseCurrency);
  if (!productId) return null;
  const trackStock = product.track_stock !== false;
  const stock = product.market_stock ?? product.stock ?? 100;
  const isOutOfStock = trackStock && stock <= 0;
  const isUnavailableInCountry = product.available_in_country === false;
  const primaryImage = product.images?.[0] || product.image_url || null;
  const isBlocked = isOutOfStock || isUnavailableInCountry;
  const isLowStock = !isOutOfStock && stock > 0 && stock <= 5;
  const originalPrice = product.original_price;
  const discountPct = (originalPrice && originalPrice > basePrice)
    ? Math.round((1 - basePrice / originalPrice) * 100)
    : null;
  const formattedOriginalPrice = discountPct
    ? convertAndFormatPrice(originalPrice, baseCurrency)
    : null;
  const rating = product.average_rating || product.rating;

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      toast.error(t('errors.loginRequired', 'Inicia sesión para añadir productos'), {
        action: { label: t('auth.login', 'Entrar'), onClick: () => navigate('/login') },
      });
      return;
    }
    if (isUnavailableInCountry) { toast.error(t('products.notAvailableRegion', 'No disponible en tu zona')); return; }
    if (isOutOfStock) { toast.error(t('products.outOfStock', 'Agotado')); return; }
    if (!productId) { toast.error(t('errors.generic', 'Error')); return; }

    const success = await addToCart(productId, 1);
    if (!success) toast.error(t('errors.generic', 'Error'));
  };

  const primaryCert = getPrimaryCert(product);

  // ── Compact variant ─────────────────────────────
  if (variant === 'compact') {
    return (
      <Link
        to={`/products/${productId}`}
        className="group block overflow-hidden rounded-2xl bg-white shadow-sm lg:hover:shadow-md lg:hover:-translate-y-0.5 transition-all duration-200"
        data-testid={`product-card-${productId}`}
      >
        <div className={`relative overflow-hidden bg-stone-100 aspect-[4/5] ${isBlocked ? 'opacity-60' : ''}`}>

          <ProductImage
            src={primaryImage}
            productName={product.name || 'Producto'}
            className="h-full w-full"
            imageClassName="group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 33vw, 20vw"
          />
          {isOutOfStock && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-stone-950 px-2 py-0.5 text-[9px] font-medium text-white">
              Agotado
            </span>
          )}
          {product.units_sold > 0 && !isOutOfStock && (
            <span className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-[9px] font-semibold text-white z-[2]">
              🔥 {product.units_sold} vendidos
            </span>
          )}
          {product.free_shipping && !isOutOfStock && (
            <span className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-semibold text-stone-950">
              Envío gratis
            </span>
          )}
          {primaryCert && (
            <span className="absolute bottom-1.5 left-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-semibold text-stone-950 flex items-center gap-0.5">
              <Leaf size={10} /> {CERT_LABELS[primaryCert] || primaryCert}
            </span>
          )}
          {!isBlocked && !primaryCert && isLowStock && (
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-stone-950 px-2 py-0.5 text-[10px] font-semibold text-white">
              Últimas uds.
            </span>
          )}
        </div>
        <div className="px-2 pb-2 pt-1.5">
          <p className="truncate text-[11px] font-semibold text-stone-950 leading-tight">
            {product.name}
          </p>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-950">
              {displayPrice}
            </span>
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

  // ── Default variant (feed grid) ─────────────────
  return (
    <Link
      to={`/products/${productId}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-sm lg:hover:shadow-md lg:hover:-translate-y-0.5 transition-all duration-200"
      data-testid={`product-card-${productId}`}
    >
      {/* Image — 4:5 aspect ratio */}
      <div className={`relative overflow-hidden ${isBlocked ? 'opacity-60' : ''}`}
        style={{ aspectRatio: '4/5' }}
      >
        <ProductImage
          src={primaryImage}
          productName={product.name || 'Producto'}
          className="h-full w-full"
          imageClassName="group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 50vw, 25vw"
        />

        {isOutOfStock && (
          <span className="absolute left-2 top-2 rounded-full bg-stone-950 px-2 py-0.5 text-[9px] font-medium text-white">
            Agotado
          </span>
        )}

        {product.free_shipping && !isOutOfStock && (
          <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-semibold text-stone-950">
            Envío gratis
          </span>
        )}

        {primaryCert && (
          <span className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] font-semibold text-stone-950 flex items-center gap-0.5">
            <Leaf size={10} /> {CERT_LABELS[primaryCert] || primaryCert}
          </span>
        )}

        {!isBlocked && !primaryCert && isLowStock && (
          <span className="absolute bottom-2 left-2 rounded-full bg-stone-950 px-2 py-0.5 text-[10px] font-semibold text-white">
            Últimas uds.
          </span>
        )}

        {discountPct && (
          <span className="absolute right-2 top-2 rounded-full bg-stone-950 px-1.5 py-0.5 text-[9px] font-bold text-white">
            -{discountPct}%
          </span>
        )}

      </div>

      {/* Info — tight 8px padding */}
      <div className="px-2 pb-2 pt-1.5">
        {/* Producer name */}
        {(product.producer_name || product.store_name) && (
          <p className="truncate text-xs text-stone-500 lg:group-hover:underline transition-colors">
            {product.producer_name || product.store_name}
          </p>
        )}

        {/* Product name — 1 line */}
        <p className="truncate text-sm font-semibold text-stone-950 leading-tight">
          {product.name}
        </p>

        {/* Rating stars */}
        {rating > 0 && (
          <div className="mt-0.5 flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={12}
                className={i < Math.round(rating) ? 'fill-stone-950 text-stone-950' : 'fill-stone-200 text-stone-200'}
              />
            ))}
            <span className="ml-0.5 text-[10px] text-stone-400">{Number(rating).toFixed(1)}</span>
          </div>
        )}

        {/* Price row + Add button */}
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-stone-950">{displayPrice}</span>
            {formattedOriginalPrice && (
              <span className="text-[10px] text-stone-400 line-through">{formattedOriginalPrice}</span>
            )}
          </div>
          {showAddButton && (
            <AddButton
              onAdd={handleAddToCart}
              isDisabled={isBlocked}
              testId={`add-to-cart-${productId}`}
            />
          )}
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
    p?.display_currency === n?.display_currency &&
    p?.stock === n?.stock &&
    p?.market_stock === n?.market_stock &&
    p?.available_in_country === n?.available_in_country &&
    p?.average_rating === n?.average_rating &&
    p?.name === n?.name &&
    p?.image_url === n?.image_url &&
    p?.images?.[0] === n?.images?.[0] &&
    p?.certifications?.length === n?.certifications?.length &&
    p?.original_price === n?.original_price &&
    p?.free_shipping === n?.free_shipping &&
    p?.is_organic === n?.is_organic &&
    p?.is_km0 === n?.is_km0 &&
    p?.is_vegan === n?.is_vegan &&
    p?.is_gluten_free === n?.is_gluten_free &&
    p?.is_halal === n?.is_halal &&
    prev.variant === next.variant &&
    prev.showAddButton === next.showAddButton
  );
};

export default React.memo(ProductCard, areProductPropsEqual);
