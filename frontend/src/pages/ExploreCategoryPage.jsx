import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Package, RefreshCw, Leaf, Cookie, CupSoda, Baby, PawPrint, Crown, Sprout, Apple, Beef, Fish, MilkOff, Egg, Droplets, Wine, Bean, Wheat, Candy, Flame, Nut, Popcorn, CakeSlice, Citrus, Coffee, Droplet, Smile, Dog, Cat, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';
import ProductCard from '../components/ProductCard';
import { getGroupBySlug, getCategoriesByGroup } from '../constants/categories';

const ICON_MAP = { Leaf, Package, Cookie, CupSoda, Baby, PawPrint, Crown, Sprout, Apple, Beef, Fish, MilkOff, Egg, Droplets, Wine, Bean, Wheat, Candy, Flame, Nut, Popcorn, CakeSlice, Citrus, Coffee, Droplet, Smile, Dog, Cat, Award };
const getIcon = (name) => ICON_MAP[name] || Package;

export default function ExploreCategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSubSlug, setActiveSubSlug] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const group = useMemo(() => getGroupBySlug(slug), [slug]);

  const subcategories = useMemo(() => {
    if (!group) return [];
    return getCategoriesByGroup(group.slug);
  }, [group]);

  // Reset active sub and fetch products when group changes
  const prevSlugRef = useRef(slug);
  useEffect(() => {
    let cancelled = false;
    let effectiveActiveSubSlug = activeSubSlug;
    if (prevSlugRef.current !== slug) {
      setActiveSubSlug(null);
      effectiveActiveSubSlug = null;
      prevSlugRef.current = slug;
    }

    setLoading(true);
    setError(false);
    const categoryParam = effectiveActiveSubSlug || (subcategories.length > 0 ? subcategories[0].slug : slug);

    apiClient
      .get('/products', { params: { category: categoryParam, limit: 40 } })
      .then((res) => {
        if (!cancelled) {
          const list = res?.items || res?.products || (Array.isArray(res) ? res : res?.data?.products || res?.data || []);
          setProducts(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {
        if (!cancelled) { setProducts([]); setError(true); }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeSubSlug, subcategories, slug, retryKey]);

  if (!group) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Search size={48} className="text-stone-300" strokeWidth={1.5} />
        <p className="text-[15px] text-stone-500">Categoría no encontrada</p>
        <button
          onClick={() => navigate('/explore')}
          className="border-none bg-transparent text-sm font-semibold text-stone-950 underline"
        >
          Volver a Explorar
        </button>
      </div>
    );
  }

  const effectiveSubSlug = activeSubSlug || (subcategories.length > 0 ? subcategories[0].slug : null);

  return (
    <div className="min-h-screen bg-white">
      {/* Topbar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <button
          onClick={() => navigate('/explore')}
          className="flex h-11 w-11 items-center justify-center"
          aria-label="Volver"
        >
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        {React.createElement(getIcon(group.icon), { size: 22, className: 'text-stone-950' })}
        <span className="flex-1 text-[17px] font-bold text-stone-950">{group.label}</span>
        {!loading && products.length > 0 && (
          <span className="text-xs text-stone-500">
            {products.length} producto{products.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Subcategory pills */}
      {subcategories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
          {subcategories.map((cat) => {
            const isActive = cat.slug === effectiveSubSlug;
            return (
              <button
                key={cat.slug}
                onClick={() => setActiveSubSlug(cat.slug)}
                aria-pressed={isActive}
                className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 bg-white text-stone-950'
                }`}
              >
                {React.createElement(getIcon(cat.icon), { size: 14 })}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Product grid */}
      <div className="px-4 pt-2 pb-20">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-stone-100" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Package size={48} className="text-stone-300" strokeWidth={1.5} />
            <p className="text-center text-[15px] text-stone-500">
              No se pudieron cargar los productos
            </p>
            <button
              onClick={() => setRetryKey(k => k + 1)}
              className="mt-1 flex items-center gap-1.5 rounded-full bg-stone-950 px-5 py-2.5 text-[13px] font-semibold text-white"
            >
              <RefreshCw size={14} /> Reintentar
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Package size={48} className="text-stone-300" strokeWidth={1.5} />
            <p className="text-center text-[15px] text-stone-500">
              No hay productos en esta categoría todavía
            </p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4"
          >
            {products.map((product) => (
              <ProductCard key={product.product_id || product.id} product={product} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
