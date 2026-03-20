import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ProductImage from './ui/ProductImage.tsx';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';

const getProductId = (product) => product?.product_id || product?.id || null;

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
      style={{
        width: 44, height: 44,
        borderRadius: '9999px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        background: confirmed ? '#f5f5f4' : isDisabled ? '#f5f5f4' : '#0c0a09',
        color: confirmed ? '#78716c' : isDisabled ? '#78716c' : '#fff',
      }}
    >
      {confirmed ? (
        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 12, height: 12 }}>
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <Plus size={12} strokeWidth={2.5} />
      )}
    </button>
  );
}

function ProductCard({ product, variant = 'default' }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice, t } = useLocale();
  const productId = getProductId(product);

  const basePrice = product.display_price || product.price || 0;
  const baseCurrency = product.display_currency || product.currency || 'EUR';
  const displayPrice = convertAndFormatPrice(basePrice, baseCurrency);
  if (!productId) return null; // No ID, can't render card
  const trackStock = product.track_stock !== false;
  const stock = product.market_stock ?? product.stock ?? 100;
  const isOutOfStock = trackStock && stock <= 0;
  const isUnavailableInCountry = product.available_in_country === false;
  const primaryImage = product.images?.[0] || product.image_url || null;
  const isBlocked = isOutOfStock || isUnavailableInCountry;
  const certs = product.certifications || [];
  const isLowStock = !isOutOfStock && stock > 0 && stock <= 5;
  const originalPrice = product.original_price;
  const discountPct = (originalPrice && originalPrice > basePrice)
    ? Math.round((1 - basePrice / originalPrice) * 100)
    : null;
  const formattedOriginalPrice = discountPct
    ? convertAndFormatPrice(originalPrice, baseCurrency)
    : null;

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
    if (isOutOfStock) { toast.error(t('products.outOfStock', 'Agotado')); return; }
    if (!productId) { toast.error(t('errors.generic', 'Error')); return; }

    const success = await addToCart(productId, 1);
    if (!success) toast.error(t('errors.generic', 'Error'));
  };

  // ── Compact variant ─────────────────────────────
  if (variant === 'compact') {
    return (
      <Link
        to={`/products/${productId}`}
        className="group block overflow-hidden"
        style={{ borderRadius: '12px', background: '#ffffff', border: '0.5px solid #e7e5e4' }}
        data-testid={`product-card-${productId}`}
      >
        <div className={`relative aspect-square overflow-hidden ${isBlocked ? 'opacity-60' : ''}`}
          style={{ background: '#f5f5f4' }}
        >
          <ProductImage
            src={primaryImage}
            productName={product.name || 'Producto'}
            className="h-full w-full"
            imageClassName="group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 33vw, 20vw"
          />
          {isOutOfStock && (
            <span style={{
              position: 'absolute', left: 6, top: 6,
              background: '#0c0a09', color: '#fff',
              fontSize: 9, fontWeight: 500, padding: '2px 7px',
              borderRadius: '9999px', fontFamily: 'inherit',
            }}>
              Agotado
            </span>
          )}
          {isLowStock && (
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-stone-950 text-white px-2 py-0.5 rounded-full">
              Últimas unidades
            </span>
          )}
        </div>
        <div style={{ padding: '8px 8px 10px' }}>
          <p style={{ fontSize: 9, fontWeight: 500, color: '#0c0a09', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'inherit' }}>
            {product.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 9, color: '#78716c', fontFamily: 'inherit' }}>
              {displayPrice}
            </p>
            {discountPct && (
              <>
                <span style={{ fontSize: 8, color: '#a8a29e', textDecoration: 'line-through', fontFamily: 'inherit' }}>{formattedOriginalPrice}</span>
                <span style={{ fontSize: 8, fontWeight: 600, background: '#0c0a09', color: '#fff', padding: '1px 4px', borderRadius: 3, fontFamily: 'inherit' }}>-{discountPct}%</span>
              </>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ── Default variant (feed grid) ─────────────────
  return (
    <Link
      to={`/products/${productId}`}
      className="group block overflow-hidden product-card-hover"
      style={{
        borderRadius: '16px',
        background: '#ffffff',
        border: '0.5px solid #e7e5e4',
        transition: 'transform all 0.15s ease, box-shadow all 0.15s ease',
      }}
      data-testid={`product-card-${productId}`}
    >
      {/* Image */}
      <div className={`relative aspect-square overflow-hidden ${isBlocked ? 'opacity-60' : ''}`}
        style={{ background: '#f5f5f4' }}
      >
        <ProductImage
          src={primaryImage}
          productName={product.name || 'Producto'}
          className="h-full w-full"
          imageClassName="group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 50vw, 25vw"
        />

        {/* Certification badge */}
        {certs.length > 0 && !isBlocked && (
          <span style={{
            position: 'absolute', left: 8, top: 8,
            background: '#f5f5f4', color: '#0c0a09',
            fontSize: 9, fontWeight: 500, padding: '2px 7px',
            borderRadius: '9999px', fontFamily: 'inherit',
          }}>
            {String(certs[0]).toLowerCase()}
          </span>
        )}

        {isOutOfStock && (
          <span style={{
            position: 'absolute', left: 8, top: 8,
            background: '#0c0a09', color: '#fff',
            fontSize: 9, fontWeight: 500, padding: '2px 7px',
            borderRadius: '9999px', fontFamily: 'inherit',
          }}>
            Agotado
          </span>
        )}

        {/* Low-stock urgency badge */}
        {isLowStock && (
          <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-stone-950 text-white px-2 py-0.5 rounded-full">
            Últimas unidades
          </span>
        )}

        {/* Bookmark */}
        {!isBlocked && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            style={{
              position: 'absolute', right: 8, top: 8,
              background: 'rgba(255,255,255,0.85)', border: 'none',
              width: 28, height: 28, borderRadius: '9999px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#78716c',
            }}
            aria-label="Guardar"
          >
            <Bookmark size={14} strokeWidth={1.8} />
          </button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <p style={{
          fontSize: 11, fontWeight: 500, color: '#0c0a09',
          lineHeight: 1.3, fontFamily: 'inherit',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </p>

        {(product.producer_name || product.store_name) && (
          <p style={{ fontSize: 10, color: '#78716c', marginTop: 2, fontFamily: 'inherit' }}>
            {product.producer_name || product.store_name}
          </p>
        )}

        {/* Price + Add button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#0c0a09', fontFamily: 'inherit' }}>
                {displayPrice}
              </span>
              {discountPct && (
                <span className="text-xs font-semibold bg-stone-950 text-white px-1.5 py-0.5 rounded">
                  -{discountPct}%
                </span>
              )}
            </div>
            {discountPct && (
              <span className="line-through text-stone-400 text-xs">{formattedOriginalPrice}</span>
            )}
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
    prev.variant === next.variant
  );
};

export default React.memo(ProductCard, areProductPropsEqual);
