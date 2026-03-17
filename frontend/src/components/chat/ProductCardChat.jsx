import React from 'react';
import { ShoppingCart, ArrowRight } from 'lucide-react';

const V2 = {
  cream: '#F7F6F2',
  black: '#0A0A0A',
  green: '#0c0a09',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  white: '#fff',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
  radiusXl: 20,
};

export default function ProductCardChat({ product, onAddToCart, onView }) {
  if (!product) return null;

  const price = typeof product.price_cents === 'number'
    ? `€${(product.price_cents / 100).toFixed(2)}`
    : typeof product.price === 'number'
      ? `€${product.price.toFixed(2)}`
      : null;

  return (
    <div
      style={{
        width: 240,
        backgroundColor: V2.white,
        borderRadius: V2.radiusXl,
        border: `1px solid ${V2.border}`,
        overflow: 'hidden',
        fontFamily: V2.fontSans,
      }}
    >
      {/* Product image */}
      {product.image_url && (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full object-cover"
          style={{ height: 120 }}
        />
      )}

      {/* Info section */}
      <div style={{ padding: 12 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: V2.black,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {product.name}
        </p>

        {price && (
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: V2.black,
              margin: '4px 0 0',
            }}
          >
            {price}
          </p>
        )}

        {product.producer_name && (
          <p
            style={{
              fontSize: 12,
              color: V2.stone,
              margin: '2px 0 0',
            }}
          >
            {product.producer_name}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2" style={{ marginTop: 10 }}>
          <button
            onClick={() => onAddToCart?.(product)}
            className="flex items-center justify-center gap-1 flex-1"
            style={{
              height: 36,
              backgroundColor: V2.green,
              color: V2.white,
              borderRadius: V2.radiusMd,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: V2.fontSans,
              cursor: 'pointer',
            }}
          >
            <ShoppingCart size={14} />
            Cesta
          </button>

          <button
            onClick={() => onView?.(product)}
            className="flex items-center justify-center gap-1 flex-1"
            style={{
              height: 36,
              backgroundColor: V2.surface,
              color: V2.black,
              borderRadius: V2.radiusMd,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: V2.fontSans,
              cursor: 'pointer',
            }}
          >
            Ver
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
