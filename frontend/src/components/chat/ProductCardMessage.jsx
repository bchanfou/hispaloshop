import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';

const getProductId = (product) => product?.product_id || product?.id || null;

export default function ProductCardMessage({ product }) {
  const [imgError, setImgError] = useState(false);

  if (!product) return null;

  const productId = getProductId(product);
  const priceCents = Number(product.price_cents) || 0;

  return (
    <div className="max-w-sm rounded-xl border border-stone-200 bg-white p-3">
      {product.image_url && !imgError ? (
        <img
          src={product.image_url}
          alt={product.name || 'Producto'}
          loading="lazy"
          onError={() => setImgError(true)}
          className="mb-2 h-36 w-full rounded-md object-cover"
        />
      ) : (
        <div className="mb-2 flex h-36 w-full items-center justify-center rounded-md bg-stone-100">
          <Package className="h-8 w-8 text-stone-400" />
        </div>
      )}
      <h4 className="text-sm font-semibold text-stone-950">{product.name || 'Producto'}</h4>
      <p className="text-sm text-stone-600">{priceCents > 0 ? `${(priceCents / 100).toFixed(2)} \u20AC` : ''}</p>
      {productId ? (
        <Link
          to={`/products/${productId}`}
          className="mt-2 inline-block text-sm font-medium text-stone-950 underline underline-offset-2 transition-colors hover:text-stone-700"
        >
          Comprar
        </Link>
      ) : null}
    </div>
  );
}
