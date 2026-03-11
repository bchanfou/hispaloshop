import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loader2, ShoppingBag } from 'lucide-react';
import ProductDetailOverlay from '../store/ProductDetailOverlay';
import { API } from '../../utils/api';
import { resolveUserImage } from '../../features/user/queries';

export default function ContextualProductSuggestions({ contentType, contentId, title = 'Productos relacionados' }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    axios
      .get(`${API}/intelligence/contextual-products`, {
        params: { content_type: contentType, content_id: contentId, limit: 5 },
      })
      .then((response) => {
        if (active) {
          setProducts(response.data?.items || []);
        }
      })
      .catch(() => {
        if (active) {
          setProducts([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [contentId, contentType]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-stone-100 bg-white p-5">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando productos relacionados
        </div>
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <>
      <section className="rounded-3xl border border-stone-100 bg-white p-5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-stone-700" />
          <h3 className="text-base font-semibold text-stone-950">{title}</h3>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 5).map((product) => (
            <button
              key={product.product_id}
              type="button"
              onClick={() => setSelectedProduct(product)}
              className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="h-14 w-14 overflow-hidden rounded-xl bg-stone-100">
                {product.images?.[0] || product.image ? (
                  <img
                    src={resolveUserImage(product.images?.[0] || product.image)}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-950">{product.name}</p>
                <p className="mt-1 text-xs text-stone-500">Abrir producto</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedProduct ? (
        <ProductDetailOverlay product={selectedProduct} store={selectedProduct.store || null} onClose={() => setSelectedProduct(null)} />
      ) : null}
    </>
  );
}
