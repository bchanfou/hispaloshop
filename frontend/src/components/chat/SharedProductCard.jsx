import React from 'react';

const V2 = {
  cream: '#ffffff',
  black: '#0c0a09',
  green: '#0c0a09',
  stone: '#78716c',
  border: '#e7e5e4',
  surface: '#f5f5f4',
  white: '#fff',
  greenLight: '#f5f5f4',
  greenBorder: '#d6d3d1',
  fontSans: 'Inter, system-ui, sans-serif',
  radiusMd: 12,
  radiusXl: 20,
};

export default function SharedProductCard({ product, sharedBy, onView }) {
  if (!product) return null;

  const hasInfluencer = sharedBy?.is_influencer && sharedBy?.username;

  return (
    <div
      className="flex overflow-hidden"
      style={{
        maxWidth: 280,
        backgroundColor: V2.white,
        borderRadius: V2.radiusXl,
        border: `1px solid ${V2.border}`,
        fontFamily: V2.fontSans,
      }}
    >
      {/* Product image */}
      <div className="shrink-0" style={{ padding: 8 }}>
        <img
          src={product.image || product.image_url || '/placeholder.png'}
          alt={product.name || 'Producto'}
          style={{
            width: 100,
            height: 100,
            objectFit: 'cover',
            borderRadius: V2.radiusMd,
          }}
        />
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center" style={{ padding: '10px 12px 10px 4px', minWidth: 0 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: V2.black,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.3',
          }}
        >
          {product.name}
        </p>

        <p style={{ fontSize: 14, fontWeight: 600, color: V2.black, margin: '4px 0 0' }}>
          {typeof product.price === 'number'
            ? `\u20AC${product.price.toFixed(2)}`
            : product.price}
        </p>

        {product.producer && (
          <p style={{ fontSize: 12, color: V2.stone, margin: '2px 0 0' }}>
            By {product.producer}
          </p>
        )}

        {hasInfluencer && (
          <p style={{ fontSize: 11, color: V2.green, margin: '4px 0 0' }}>
            Recomendado por @{sharedBy.username}
          </p>
        )}

        <button
          type="button"
          onClick={() => onView?.(product.id)}
          className="self-start"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: V2.black,
            background: 'none',
            border: 'none',
            padding: 0,
            marginTop: 6,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          Ver producto &rarr;
        </button>
      </div>
    </div>
  );
}
