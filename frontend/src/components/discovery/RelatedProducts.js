import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import apiClient from '../../services/api/client';
import ProductImage from '../ui/ProductImage.tsx';

const getProductId = (product) => product?.product_id || product?.id || null;

const formatPrice = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return 'Consultar precio';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
};

function ProductSkeleton() {
  return (
    <div className="min-w-[148px] shrink-0 overflow-hidden rounded-[20px] border border-stone-200 bg-white animate-pulse md:min-w-0">
      <div className="h-32 w-full bg-stone-100" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-3/4 rounded bg-stone-100" />
        <div className="h-3 w-1/2 rounded bg-stone-100" />
        <div className="h-3.5 w-1/3 rounded bg-stone-100" />
      </div>
    </div>
  );
}

export default function RelatedProducts({ productId, title = 'Productos relacionados' }) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    let cancelled = false;
    setLoading(true);
    apiClient
      .get(`/discovery/related-products/${productId}?limit=6`)
      .then((data) => { if (!cancelled) setProducts(data?.products || []); })
      .catch(() => { if (!cancelled) setProducts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [productId]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-stone-950">{title}</h2>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-950"
        >
          Ver todo
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-6">
        {loading
          ? [...Array(6)].map((_, i) => <ProductSkeleton key={i} />)
          : products.map((product) => (
              <motion.button
                key={getProductId(product) || product.name}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const nextProductId = getProductId(product);
                  if (!nextProductId) return;
                  navigate(`/products/${nextProductId}`);
                }}
                className="min-w-[148px] shrink-0 overflow-hidden rounded-[20px] border border-stone-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md md:min-w-0"
              >
                <ProductImage
                  src={product.image_url || product.images?.[0] || null}
                  productName={product.name}
                  className="h-32 w-full"
                  sizes="148px"
                />
                <div className="p-3">
                  <p className="line-clamp-2 text-xs font-semibold text-stone-950">{product.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-stone-500">
                    {product.producer_name || 'Productor'}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-stone-950">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </motion.button>
            ))}
      </div>
    </section>
  );
}
