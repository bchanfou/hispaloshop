import React from 'react';

const V2 = {
  black: '#0c0a09',
  stone: '#78716c',
  border: '#e7e5e4',
  white: '#fff',
  fontSans: 'Inter, system-ui, sans-serif',
  radiusXl: 20,
};

export default function SharedRecipeCard({ recipe, onView }) {
  if (!recipe) return null;

  return (
    <div
      className="overflow-hidden"
      style={{
        width: 260,
        backgroundColor: V2.white,
        borderRadius: V2.radiusXl,
        border: `1px solid ${V2.border}`,
        fontFamily: V2.fontSans,
      }}
    >
      {/* Recipe image */}
      <img
        src={recipe.image || recipe.image_url || '/placeholder.png'}
        alt={recipe.name || 'Receta'}
        style={{
          width: '100%',
          height: 140,
          objectFit: 'cover',
          display: 'block',
        }}
      />

      {/* Info */}
      <div style={{ padding: 12 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: V2.black,
            margin: 0,
            lineHeight: '1.3',
          }}
        >
          {'\uD83C\uDF73'} {recipe.name}
        </p>

        <p style={{ fontSize: 12, color: V2.stone, margin: '4px 0 0' }}>
          {recipe.author ? `By @${recipe.author}` : ''}
          {recipe.author && recipe.duration ? ' \u00B7 ' : ''}
          {recipe.duration || ''}
        </p>

        <button
          type="button"
          onClick={() => onView?.(recipe.id)}
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: V2.black,
            background: 'none',
            border: 'none',
            padding: 0,
            marginTop: 8,
            cursor: 'pointer',
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          Ver receta &rarr;
        </button>
      </div>
    </div>
  );
}
