// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Grid3X3,
  List,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { CATEGORIES } from '../components/feed/CategoryPills';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';
import { useTranslation } from 'react-i18next';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'bestsellers', label: 'Más vendidos' },
  { value: 'rated', label: 'Mejor valorados' },
];

const FILTER_FEATURES = [
  'Envío gratis',
  'Producto BIO',
  'De mi zona',
  'Con descuento',
  'Novedad',
];

const PRICE_RANGES = [
  { label: '0–10', min: 0, max: 10 },
  { label: '10–25', min: 10, max: 25 },
  { label: '25–50', min: 25, max: 50 },
  { label: '50+', min: 50, max: Infinity },
];

const CategoryPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFeatures, setActiveFeatures] = useState([]);
  const [activePrice, setActivePrice] = useState('');

  const category = CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[0];
  const Icon = category.icon;

  const { products, pagination, isLoading, error } = useProducts({
    category: categoryId,
    sort: sortBy,
  });

  const filteredProducts = useMemo(() => {
    let list = products;
    if (activePrice) {
      const range = PRICE_RANGES.find((r) => r.label === activePrice);
      if (range) {
        list = list.filter((p) => {
          const price = p.price ?? 0;
          return price >= range.min && price < range.max;
        });
      }
    }
    if (activeFeatures.length > 0) {
      list = list.filter((p) => {
        const tags = [
          ...(p.tags || []),
          ...(p.certifications || []),
          p.is_bio && 'Producto BIO',
          p.free_shipping && t('common.freeShipping', 'Envío gratis'),
          p.is_new && 'Novedad',
          p.has_discount && 'Con descuento',
          p.is_local && 'De mi zona',
        ].filter(Boolean);
        return activeFeatures.every((f) => tags.includes(f));
      });
    }
    return list;
  }, [products, activePrice, activeFeatures]);

  const toggleFeature = (feature) => {
    setActiveFeatures((prev) =>
      prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]
    );
  };

  const clearFilters = () => {
    setActiveFeatures([]);
    setActivePrice('');
  };

  const hasActiveFilters = activeFeatures.length > 0 || Boolean(activePrice);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
        <div className="text-center">
          <p className="mb-4 text-sm text-stone-600">Error al cargar productos</p>
          <button
            type="button"
            onClick={() => navigate(0)}
            className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-stone-100 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Volver"
              className="flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-stone-100">
                <Icon className="h-4 w-4 text-stone-700" />
              </div>
              <h1 className="text-base font-semibold text-stone-950">{category.label}</h1>
              {category.badge ? (
                <span className="rounded-full bg-stone-950 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {category.badge}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('/search')}
              aria-label="Buscar"
              className="flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              aria-label={`Filtros${hasActiveFilters ? ` (${activeFeatures.length + (activePrice ? 1 : 0)} activos)` : ''}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100"
            >
              <SlidersHorizontal className="h-[18px] w-[18px]" />
              {hasActiveFilters && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-stone-950 text-[9px] font-bold text-white">
                  {activeFeatures.length + (activePrice ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2">
          <p className="text-xs text-stone-500">
            {isLoading ? 'Cargando…' : `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''}`}
          </p>
          <div className="flex items-center gap-2">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Ordenar productos"
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700 focus:border-stone-950 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {/* View toggle */}
            <div className="flex overflow-hidden rounded-full border border-stone-200 bg-stone-50">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label={t('products.vistaCuadricula', 'Vista cuadrícula')}
                className={`flex h-11 w-11 items-center justify-center transition-colors ${
                  viewMode === 'grid' ? 'bg-stone-950 text-white' : 'text-stone-500 hover:bg-stone-100'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="Vista lista"
                className={`flex h-11 w-11 items-center justify-center transition-colors ${
                  viewMode === 'list' ? 'bg-stone-950 text-white' : 'text-stone-500 hover:bg-stone-100'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active filters */}
        {hasActiveFilters ? (
          <div className="flex items-center gap-2 overflow-x-auto border-t border-stone-100 px-4 py-2 scrollbar-hide">
            {activeFeatures.map((feature) => (
              <button
                key={feature}
                type="button"
                onClick={() => toggleFeature(feature)}
                className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700"
              >
                {feature}
                <X className="h-3 w-3" />
              </button>
            ))}
            {activePrice ? (
              <button
                type="button"
                onClick={() => setActivePrice('')}
                className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-700"
              >
                {activePrice}
                <X className="h-3 w-3" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 text-xs text-stone-500 underline-offset-2 hover:underline"
            >
              Limpiar
            </button>
          </div>
        ) : null}
      </div>

      {/* Products */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton-shimmer w-full h-48" />
                <div className="p-3 space-y-2">
                  <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                  <div className="skeleton-shimmer h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
              <Search className="h-7 w-7 text-stone-400" />
            </div>
            <h3 className="text-base font-semibold text-stone-950">Sin resultados</h3>
            <p className="mt-2 max-w-xs text-sm text-stone-500">
              Prueba con otra categoría o ajusta los filtros.
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800"
              >
                Quitar filtros
              </button>
            ) : null}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.product_id || product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.3) }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.product_id || product.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.3) }}
              >
                <ProductCard product={product} variant="horizontal" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Ver más — link to full catalog with category filter */}
        {!isLoading && filteredProducts.length >= 10 && (
          <button
            type="button"
            onClick={() => navigate(`/products?category=${encodeURIComponent(categoryId)}`)}
            className="w-full py-3 mt-4 text-sm font-semibold text-stone-950 bg-white rounded-full hover:bg-stone-100 transition-colors border border-stone-200"
          >
            Ver más productos
          </button>
        )}
      </div>

      {/* Filter sheet */}
      <AnimatePresence>
      {showFilters ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm" onClick={() => setShowFilters(false)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-base font-semibold text-stone-950">Filtrar</h3>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                aria-label="Cerrar filtros"
                className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Price */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-stone-950">Precio</h4>
                <div className="flex flex-wrap gap-2">
                  {PRICE_RANGES.map((range) => (
                    <button
                      key={range.label}
                      type="button"
                      onClick={() => setActivePrice((prev) => (prev === range.label ? '' : range.label))}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        activePrice === range.label
                          ? 'border-stone-950 bg-stone-950 text-white'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-stone-950">{t('category.caracteristicas', 'Características')}</h4>
                <div className="space-y-3">
                  {FILTER_FEATURES.map((feature) => {
                    const isChecked = activeFeatures.includes(feature);
                    return (
                      <label
                        key={feature}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleFeature(feature)}
                          className="sr-only peer"
                        />
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-stone-950/30 ${
                            isChecked ? 'border-stone-950 bg-stone-950' : 'border-stone-200'
                          }`}
                        >
                          {isChecked ? (
                            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : null}
                        </div>
                        <span className="text-sm text-stone-700">
                          {feature}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="mt-6 w-full rounded-full bg-stone-950 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-800"
            >
              {hasActiveFilters
                ? `Ver ${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''}`
                : 'Aplicar filtros'}
            </button>
          </motion.div>
        </div>
      ) : null}
      </AnimatePresence>
    </div>
  );
};

export default CategoryPage;
