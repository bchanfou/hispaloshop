import React from 'react';
import { ShoppingCart, Star } from 'lucide-react';

export default function ProductCardInChat({ product, onAddToCart, onViewProduct }) {
  if (!product) return null;

  const inStock = product.in_stock !== false;

  return (
    <div
      className="my-2 flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 transition-all duration-200 hover:border-stone-300 hover:shadow-sm"
      onClick={() => onViewProduct?.(product.slug || product.id)}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
          <ShoppingCart className="h-6 w-6" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-950">{product.name}</p>

        {product.rating > 0 && (
          <div className="mt-0.5 flex items-center gap-1">
            <Star className="h-3 w-3 fill-stone-950 text-stone-950" />
            <span className="text-xs text-stone-600">{Number(product.rating).toFixed(1)}</span>
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
          {product.certifications?.map((cert) => (
            <span key={cert} className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
              {cert}
            </span>
          ))}
          <span className="font-semibold text-stone-950">
            {typeof product.price === 'number' ? `${product.price.toFixed(2)}€` : product.price}
            {product.unit && <span className="font-normal text-stone-400">/{product.unit}</span>}
          </span>
        </div>

        {!inStock && (
          <span className="mt-1 inline-block text-xs text-stone-400">Agotado</span>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (inStock) onAddToCart?.(product.id, 1);
        }}
        disabled={!inStock}
        className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-transform active:scale-95 ${
          inStock
            ? 'bg-stone-950 text-white hover:bg-stone-800'
            : 'cursor-not-allowed bg-stone-200 text-stone-400'
        }`}
      >
        {inStock ? '+ Añadir' : 'Agotado'}
      </button>
    </div>
  );
}
