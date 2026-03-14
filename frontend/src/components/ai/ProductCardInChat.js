import React from 'react';
import { ShoppingCart } from 'lucide-react';

export default function ProductCardInChat({ product, onAddToCart, onViewProduct }) {
  if (!product) return null;

  return (
    <div
      className="my-2 flex cursor-pointer items-center gap-3 rounded-apple-md bg-white p-3 shadow-apple-sm transition-all duration-200 hover:shadow-apple-md"
      onClick={() => onViewProduct?.(product.id)}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="h-16 w-16 flex-shrink-0 rounded-apple-sm object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-apple-sm bg-hs-bg text-hs-muted">
          <ShoppingCart className="h-6 w-6" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-hs-text">{product.name}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-hs-muted">
          {product.certifications?.map((cert) => (
            <span key={cert} className="rounded-full bg-hs-bg px-2 py-0.5">
              {cert}
            </span>
          ))}
          <span className="font-semibold text-hs-text">
            {typeof product.price === 'number' ? `${product.price.toFixed(2)}€` : product.price}
          </span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddToCart?.(product.id, 1);
        }}
        className="flex-shrink-0 rounded-full bg-hs-black px-3 py-1.5 text-xs font-medium text-white transition-transform active:scale-95"
      >
        + Añadir
      </button>
    </div>
  );
}
