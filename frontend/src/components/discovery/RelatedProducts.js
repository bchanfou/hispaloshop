import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import axios from 'axios';
import { API } from '../../utils/api';

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
    setLoading(true);
    axios
      .get(`${API}/discovery/related-products/${productId}?limit=6`, { withCredentials: true })
      .then((res) => setProducts(res.data?.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-body text-base font-semibold text-stone-950">{title}</h2>
        <button
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
                key={product.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/products/${product.id}`)}
                className="min-w-[148px] shrink-0 overflow-hidden rounded-[20px] border border-stone-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md md:min-w-0"
              >
                <img
                  src={product.image_url || product.images?.[0] || '/placeholder-product.png'}
                  alt={product.name}
                  loading="lazy"
                  className="h-32 w-full object-cover"
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
