import React from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

/**
 * Promoted product card inserted into the feed at intervals.
 * Props: product ({ id, name, price, image_url, images, producer_name, store_name })
 *        onDismiss: () => void
 */
export default function SponsoredProductCard({ product, onDismiss }) {
  if (!product) return null;

  const image = product.image_url || product.images?.[0]?.url || product.images?.[0] || '';
  const name = product.name || 'Producto';
  const price = product.price != null ? `${Number(product.price).toFixed(2)} €` : '';
  const producer = product.producer_name || product.store_name || '';

  return (
    <div className="mx-4 my-2 rounded-2xl border border-stone-100 bg-white overflow-hidden relative">
      {/* Patrocinado badge */}
      <span className="absolute top-3 right-3 z-10 bg-stone-100 text-stone-500 text-[10px] rounded-full px-2 py-0.5 font-medium">
        Patrocinado
      </span>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
          className="absolute top-3 left-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-stone-400 hover:text-stone-700 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <Link to={`/products/${product.id}`} className="block">
        {/* Product image */}
        {image ? (
          <div className="aspect-[4/5] w-full overflow-hidden">
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[4/5] w-full bg-stone-50 flex items-center justify-center">
            <span className="text-stone-300 text-sm">Sin imagen</span>
          </div>
        )}

        {/* Info */}
        <div className="p-3.5">
          <p className="text-[14px] font-semibold text-stone-950 leading-tight line-clamp-2">
            {name}
          </p>
          {producer && (
            <p className="mt-0.5 text-[12px] text-stone-400">{producer}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            {price && (
              <span className="text-[15px] font-bold text-stone-950">{price}</span>
            )}
            <span className="rounded-full bg-stone-950 px-4 py-1.5 text-[12px] font-semibold text-white">
              Ver producto
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
