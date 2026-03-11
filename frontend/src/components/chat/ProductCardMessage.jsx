import React from 'react';
import { Link } from 'react-router-dom';

const getProductId = (product) => product?.product_id || product?.id || null;

export default function ProductCardMessage({ product }) {
  if (!product) return null;

  const productId = getProductId(product);

  return (
    <div className="border rounded-xl p-3 max-w-sm">
      {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-36 object-cover rounded-md mb-2" />}
      <h4 className="font-semibold text-sm">{product.name}</h4>
      <p className="text-sm text-slate-600">€ {(product.price_cents / 100).toFixed(2)}</p>
      {productId ? <Link to={`/products/${productId}`} className="inline-block mt-2 text-emerald-700 text-sm font-medium">Comprar</Link> : null}
    </div>
  );
}
