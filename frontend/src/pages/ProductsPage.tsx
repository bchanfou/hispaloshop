// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Search, SlidersHorizontal, Truck, X, LayoutGrid, List, Globe, Check, AlertTriangle, Package, Loader2 } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import { CATEGORY_GROUPS, getCategoriesByGroup } from '../constants/categories';
import ProductCard from '../components/ProductCard';
import { getCategoryLabel, productMatchesCategory } from '../config/categories';
import { useLocale } from '../context/LocaleContext';
import { useCatalog } from '../features/products/queries/useProductQueries';
import { useTranslation } from 'react-i18next';

const CERTIFICATION_IDS = ['halal', 'kosher', 'vegan', 'gluten-free', 'sugar-free', 'organic'];

const COUNTRY_GROUPS = [
  {
    region: 'Europa',
    countries: [
      { code: 'Spain', name: 'España' },
      { code: 'Italy', name: 'Italia' },
      { code: 'France', name: 'Francia' },
      { code: 'Portugal', name: 'Portugal' },
      { code: 'Germany', name: 'Alemania' },
    ],
  },
  {
    region: 'América',
    countries: [
      { code: 'USA', name: 'Estados Unidos' },
      { code: 'Canada', name: 'Canadá' },
      { code: 'Mexico', name: 'México' },
      { code: 'Colombia', name: 'Colombia' },
    ],
  },
  {
    region: 'Asia y Oceanía',
    countries: [
      { code: 'Japan', name: 'Japón' },
      { code: 'Korea', name: 'Corea del Sur' },
      { code: 'Thailand', name: 'Tailandia' },
    ],
  },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'rating', label: 'Mejor valorados' },
  { value: 'newest', label: 'Más recientes' },
];

const flattenCatalogPages = (pages = []) =>
  pages.flatMap((page) => {
    if (Array.isArray(page)) return page;
    if (Array.isArray(page?.products)) return page.products;
    if (Array.isArray(page?.items)) return page.items;
    return [];
  });

export default function ProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { country, currency, language } = useLocale();
  const { t, i18n } = useTranslation();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryDropdownRef = useRef(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('products_view_mode') || 'grid');
  const currentLang = i18n.language || language || 'es';

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || searchParams.get('categoria') || '',
    subcategory: '',
    certifications: [],
    origin_country: '',
    minPrice: '',
    maxPrice: '',
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || 'relevance',
    freeShipping: false,
  });

  const getSubcategories = (groupSlug) => getCategoriesByGroup(groupSlug);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      category: searchParams.get('category') || searchParams.get('categoria') || '',
      search: searchParams.get('search') || '',
      sort: searchParams.get('sort') || 'relevance',
    }));
  }, [searchParams]);

  useEffect(() => {
    document.body.style.overflow = showMobileFilters ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileFilters]);

  // Close country dropdown on click outside
  useEffect(() => {
    if (!showCountryDropdown) return;
    const handler = (e) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCountryDropdown]);

  // Debounced values for search and price (avoid API call per keystroke)
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);
  const [debouncedMinPrice, setDebouncedMinPrice] = useState(filters.minPrice);
  const [debouncedMaxPrice, setDebouncedMaxPrice] = useState(filters.maxPrice);
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setDebouncedMinPrice(filters.minPrice);
      setDebouncedMaxPrice(filters.maxPrice);
      // Sync search to URL
      const nextParams = new URLSearchParams(searchParams);
      if (filters.search) nextParams.set('search', filters.search);
      else nextParams.delete('search');
      setSearchParams(nextParams, { replace: true });
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [filters.search, filters.minPrice, filters.maxPrice]); // eslint-disable-line react-hooks/exhaustive-deps

  const queryFilters = useMemo(
    () => ({
      country,
      lang: currentLang,
      origin_country: filters.origin_country || undefined,
      min_price: debouncedMinPrice || undefined,
      max_price: debouncedMaxPrice || undefined,
      search: debouncedSearch || undefined,
      sort: filters.sort !== 'relevance' ? filters.sort : undefined,
      free_shipping: filters.freeShipping ? 'true' : undefined,
      certifications: filters.certifications.length > 0 ? filters.certifications.join(',') : undefined,
    }),
    [country, currentLang, filters.origin_country, filters.sort, filters.freeShipping, filters.certifications, debouncedSearch, debouncedMinPrice, debouncedMaxPrice],
  );

  const catalogQuery = useCatalog(queryFilters);
  const rawProducts = useMemo(() => flattenCatalogPages(catalogQuery.data?.pages), [catalogQuery.data?.pages]);
  const products = useMemo(() => {
    let filtered = rawProducts;
    if (filters.category) {
      filtered = filtered.filter((product) => productMatchesCategory(product, filters.category));
    }
    if (filters.subcategory) {
      filtered = filtered.filter((product) => productMatchesCategory(product, filters.subcategory));
    }
    return filtered;
  }, [filters.category, filters.subcategory, rawProducts]);

  const hasActiveFilters = Boolean(
    filters.category ||
      filters.subcategory ||
      filters.certifications.length > 0 ||
      filters.origin_country ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.search ||
      filters.freeShipping,
  );

  const certificationOptions = CERTIFICATION_IDS.map((id) => ({
    id,
    label: t(`certifications.${id}`, id),
  }));
  const allCountries = COUNTRY_GROUPS.flatMap((group) => group.countries);
  const currencySymbol = currency === 'USD' ? '$' : currency === 'KRW' ? '₩' : '€';

  const updateSearchParams = (updates) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) nextParams.set(key, value);
      else nextParams.delete(key);
    });
    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      subcategory: '',
      certifications: [],
      origin_country: '',
      minPrice: '',
      maxPrice: '',
      search: '',
      sort: 'relevance',
      freeShipping: false,
    });
    setSearchParams(new URLSearchParams());
  };

  const setCategoryFilter = (categorySlug) => {
    const nextCategory = filters.category === categorySlug ? '' : categorySlug;
    setFilters((prev) => ({ ...prev, category: nextCategory, subcategory: '' }));
    const nextParams = new URLSearchParams(searchParams);
    if (nextCategory) nextParams.set('category', nextCategory);
    else nextParams.delete('category');
    nextParams.delete('categoria');
    setSearchParams(nextParams);
  };

  const handleCertificationToggle = (certification) => {
    setFilters((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(certification)
        ? prev.certifications.filter((item) => item !== certification)
        : [...prev.certifications, certification],
    }));
  };

  const renderOriginSelect = (buttonClassName) => {
    const selectedCountry = allCountries.find((item) => item.code === filters.origin_country);
    return (
      <div className="relative" ref={countryDropdownRef}>
        <button
          type="button"
          onClick={() => setShowCountryDropdown((prev) => !prev)}
          className={buttonClassName || `flex min-w-[160px] items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-150 ease-out ${
            filters.origin_country
              ? 'border-stone-950 bg-stone-950 text-white'
              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
          }`}
        >
          <Globe className="h-4 w-4 shrink-0" />
          <span className="truncate">{selectedCountry ? selectedCountry.name : t('products.allOrigins', 'Todos los orígenes')}</span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showCountryDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full z-50 mt-2 w-[220px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-lg"
            >
              <div className="max-h-[320px] overflow-y-auto py-2">
                <button
                  type="button"
                  onClick={() => { setFilters((prev) => ({ ...prev, origin_country: '' })); setShowCountryDropdown(false); }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                    !filters.origin_country ? 'bg-stone-50 font-semibold text-stone-950' : 'text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <span>{t('products.allOrigins', 'Todos los orígenes')}</span>
                  {!filters.origin_country && <Check className="h-4 w-4 text-stone-950" />}
                </button>
                {COUNTRY_GROUPS.map((group) => (
                  <div key={group.region}>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">{group.region}</p>
                    {group.countries.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => { setFilters((prev) => ({ ...prev, origin_country: item.code })); setShowCountryDropdown(false); }}
                        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                          filters.origin_country === item.code ? 'bg-stone-50 font-semibold text-stone-950' : 'text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <span>{item.name}</span>
                        {filters.origin_country === item.code && <Check className="h-4 w-4 text-stone-950" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
        <Breadcrumbs className="mb-4" />

        {/* Sticky header: search + controls */}
        <div className="sticky top-[52px] z-30 -mx-4 bg-stone-50 px-4 pb-1 pt-2 sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="shrink-0 text-lg font-semibold tracking-tight text-stone-950" data-testid="products-page-title">
              {t('products.title', 'Productos')}
            </h1>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder={t('products.searchPlaceholder', 'Buscar productos')}
                value={filters.search}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setFilters((prev) => ({ ...prev, search: nextValue }));
                }}
                className="h-10 w-full rounded-full border border-stone-200 bg-white pl-9 text-sm placeholder:text-stone-400 focus:outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-300"
                aria-label={t('products.searchPlaceholder', 'Buscar productos')}
              />
            </div>

            <div className="relative hidden md:block">
              <select
                value={filters.sort}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setFilters((prev) => ({ ...prev, sort: nextValue }));
                  updateSearchParams({ sort: nextValue === 'relevance' ? '' : nextValue });
                }}
                className="h-10 appearance-none rounded-full border border-stone-200 bg-white px-4 py-2 pr-9 text-sm outline-none focus:border-stone-950 focus:ring-1 focus:ring-stone-300"
                aria-label={t('products.sortLabel', 'Ordenar productos')}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(`products.sort.${option.value}`, option.label)}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1">
              <button
                type="button"
                onClick={() => { setViewMode('grid'); localStorage.setItem('products_view_mode', 'grid'); }}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${viewMode === 'grid' ? 'bg-stone-950 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                aria-label={t('products.vistaCuadricula', 'Vista cuadrícula')}
                aria-pressed={viewMode === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('list'); localStorage.setItem('products_view_mode', 'list'); }}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${viewMode === 'list' ? 'bg-stone-950 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
                aria-label="Vista lista"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 lg:hidden"
              onClick={() => setShowMobileFilters(true)}
              aria-label={t('products.filters', 'Filtros')}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{t('products.filters', 'Filtros')}</span>
            </button>
          </div>

          {/* Category pills — compact horizontal scroll */}
          <div className="mt-2 mb-1 scrollbar-hide flex gap-2 overflow-x-auto py-1">
            <button
              onClick={() => setCategoryFilter('')}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
                !filters.category ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'
              }`}
            >
              Todos
            </button>
            {CATEGORY_GROUPS.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setCategoryFilter(cat.slug === filters.category ? '' : cat.slug)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
                  filters.category === cat.slug ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Subcategory pills */}
          {filters.category && (
            <div className="mb-1 scrollbar-hide flex gap-1.5 overflow-x-auto pb-1">
              {getSubcategories(filters.category).map(sub => (
                <button
                  key={sub.slug}
                  onClick={() => setFilters(prev => ({ ...prev, subcategory: prev.subcategory === sub.slug ? '' : sub.slug }))}
                  className={`flex shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors ${
                    filters.subcategory === sub.slug ? 'bg-stone-700 text-white' : 'bg-stone-50 text-stone-500 border border-stone-200'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <section className="mb-6 hidden rounded-[28px] border border-stone-100 bg-white p-4 shadow-sm lg:block">
          <div className="flex flex-wrap items-center gap-3">
            {renderOriginSelect()}

            <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 transition-all duration-150 ease-out hover:bg-stone-50">
              <span className="text-xs font-medium text-stone-400">{currencySymbol}</span>
              <input
                type="number"
                placeholder="Mín"
                value={filters.minPrice}
                onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: event.target.value }))}
                className="h-6 w-14 border-0 bg-transparent p-0 text-sm text-stone-950 placeholder:text-stone-300 focus:outline-none"
                aria-label={t('products.precioMinimo', 'Precio mínimo')}
              />
              <div className="h-px w-3 bg-stone-300" />
              <input
                type="number"
                placeholder="Máx"
                value={filters.maxPrice}
                onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
                className="h-6 w-14 border-0 bg-transparent p-0 text-sm text-stone-950 placeholder:text-stone-300 focus:outline-none"
                aria-label={t('products.precioMaximo', 'Precio máximo')}
              />
              <span className="text-xs font-medium text-stone-400">{currencySymbol}</span>
            </div>

            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, freeShipping: !prev.freeShipping }))}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-150 ease-out ${
                filters.freeShipping
                  ? 'border-stone-950 bg-stone-950 text-white'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
              aria-pressed={filters.freeShipping}
            >
              <Truck className="h-4 w-4" />
              {t('products.freeShipping', 'Envío gratis')}
            </button>

            <button
              type="button"
              onClick={() => setShowMoreFilters((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-150 ease-out ${
                showMoreFilters ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
              aria-pressed={showMoreFilters}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showMoreFilters ? t('products.lessFilters', 'Menos filtros') : t('products.moreFilters', 'Más filtros')}
            </button>

            {hasActiveFilters ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-all duration-150 ease-out hover:bg-stone-50"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
                {t('products.clearFilters', 'Limpiar')}
              </button>
            ) : null}
          </div>

          {showMoreFilters ? (
            <div className="mt-4 border-t border-stone-100 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
                {t('products.certifications', 'Certificaciones')}
              </p>
              <div className="flex flex-wrap gap-2">
                {certificationOptions.map((cert) => (
                  <button
                    key={cert.id}
                    type="button"
                    onClick={() => handleCertificationToggle(cert.id)}
                    className={`rounded-full border px-4 py-2 text-sm transition-all duration-150 ease-out ${
                      filters.certifications.includes(cert.id)
                        ? 'border-stone-950 bg-stone-950 text-white'
                        : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                    }`}
                    aria-pressed={filters.certifications.includes(cert.id)}
                  >
                    {cert.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {hasActiveFilters ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.category ? (
              <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700">
                {getCategoryLabel(filters.category)}
                <button type="button" onClick={() => setCategoryFilter(filters.category)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-stone-100" aria-label={t('products.quitarFiltroDeCategoria', 'Quitar filtro de categoría')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
            {filters.freeShipping ? (
              <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1.5 text-xs font-medium text-white">
                <Truck className="h-3 w-3" />
                {t('products.freeShipping', 'Envío gratis')}
                <button type="button" onClick={() => setFilters((prev) => ({ ...prev, freeShipping: false }))} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10" aria-label={t('products.quitarFiltroDeEnvioGratis', 'Quitar filtro de envío gratis')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
            {filters.origin_country ? (
              <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700">
                {allCountries.find((item) => item.code === filters.origin_country)?.name || filters.origin_country}
                <button type="button" onClick={() => setFilters((prev) => ({ ...prev, origin_country: '' }))} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-stone-100" aria-label={t('products.quitarFiltroDePais', 'Quitar filtro de país')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
          </div>
        ) : null}

        <p className="mb-5 text-sm text-stone-500" aria-live="polite" aria-atomic="true">
          {products.length} {t('products.resultsFound', 'resultados')}
        </p>

        {catalogQuery.isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <AlertTriangle className="w-10 h-10 text-stone-300" />
            <p className="text-base font-semibold text-stone-950">Error al cargar</p>
            <p className="text-sm text-stone-500">Comprueba tu conexión e inténtalo de nuevo</p>
            <button onClick={() => catalogQuery.refetch()} className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors">
              Reintentar
            </button>
          </div>
        ) : catalogQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4" data-testid="loading-spinner" role="status" aria-label={t('common.loading', 'Cargando')}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-[4/5] rounded-xl bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[28px] border border-stone-100 bg-white py-16 text-center shadow-sm" data-testid="no-products">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
              <Package size={48} className="text-stone-300" strokeWidth={1.5} />
            </div>
            <p className="mb-2 text-base font-semibold text-stone-950">{t('products.noProducts', 'No hay productos con estos filtros')}</p>
            <p className="mb-4 text-sm text-stone-500">
              {t('products.tryDifferentFilters', 'Prueba con otros criterios')}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                {t('products.clearFilters', 'Limpiar filtros')}
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4" data-testid="products-grid">
                {products.map((product) => (
                  <ProductCard key={product.product_id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3" data-testid="products-list">
                {products.map((product) => (
                  <div
                    key={product.product_id}
                    className="flex items-center gap-4 bg-white rounded-2xl border border-stone-100 p-3 hover:border-stone-200 transition-colors cursor-pointer"
                    onClick={() => navigate(`/products/${product.product_id}`)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/products/${product.product_id}`); }}
                  >
                    <div className="w-20 h-20 rounded-2xl bg-stone-100 overflow-hidden flex-shrink-0">
                      {(product.images?.[0] || product.image_url || product.thumbnail) && (
                        <img
                          src={product.images?.[0] || product.image_url || product.thumbnail}
                          alt={product.name || product.product_name || ''}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-stone-950 truncate">
                        {product.name || product.product_name}
                      </p>
                      {product.producer_name && (
                        <p className="text-xs text-stone-400 mt-0.5 truncate">{product.producer_name}</p>
                      )}
                      {product.price != null && (
                        <p className="text-[13px] font-bold text-stone-950 mt-1">
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: product.currency || 'EUR' }).format(product.price)}
                        </p>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-stone-300 flex-shrink-0 -rotate-90" />
                  </div>
                ))}
              </div>
            )}

            {catalogQuery.hasNextPage ? (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => catalogQuery.fetchNextPage()}
                  disabled={catalogQuery.isFetchingNextPage}
                  className="rounded-full bg-stone-950 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
                >
                  {catalogQuery.isFetchingNextPage ? (
                    <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />{t('common.loading', 'Cargando...')}</span>
                  ) : t('products.loadMore', 'Cargar más')}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <AnimatePresence>
      {showMobileFilters ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowMobileFilters(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 right-0 top-0 flex w-[320px] max-w-[85vw] flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-stone-950">{t('products.filters', 'Filtros')}</h2>
              <button type="button" onClick={() => setShowMobileFilters(false)} className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-stone-100" aria-label="Cerrar filtros">
                <X className="h-5 w-5 text-stone-500" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {/* Sort (mobile only) */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {t('products.sortLabel', 'Ordenar')}
                </p>
                <div className="relative">
                  <select
                    value={filters.sort}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setFilters((prev) => ({ ...prev, sort: nextValue }));
                      updateSearchParams({ sort: nextValue === 'relevance' ? '' : nextValue });
                    }}
                    className="w-full appearance-none rounded-full border border-stone-200 bg-white px-4 py-2.5 pr-8 text-sm outline-none focus:border-stone-950"
                    aria-label={t('products.sortLabel', 'Ordenar productos')}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(`products.sort.${option.value}`, option.label)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, freeShipping: !prev.freeShipping }))}
                className={`flex w-full items-center gap-3 rounded-full border p-3.5 text-left transition-colors ${
                  filters.freeShipping
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Truck className="h-4 w-4" />
                <span className="text-sm font-medium">{t('products.freeShipping', 'Envío gratis')}</span>
              </button>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {t('products.certifications', 'Certificaciones')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {certificationOptions.map((cert) => (
                    <button
                      key={cert.id}
                      type="button"
                      onClick={() => handleCertificationToggle(cert.id)}
                      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                        filters.certifications.includes(cert.id)
                          ? 'border-stone-950 bg-stone-950 text-white'
                          : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {cert.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                  {t('products.originCountry', 'País de origen')}
                </p>
                {renderOriginSelect('w-full appearance-none rounded-full border border-stone-200 bg-white px-4 py-2.5 pr-8 text-sm outline-none focus:border-stone-950')}
              </div>
            </div>

            <div className="flex gap-3 border-t border-stone-100 px-5 py-4">
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="h-11 flex-1 rounded-full border border-stone-200 text-[13px] font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                  onClick={() => {
                    clearFilters();
                    setShowMobileFilters(false);
                  }}
                >
                  {t('products.clearFilters', 'Limpiar')}
                </button>
              ) : null}
              <button
                type="button"
                className="h-11 flex-1 rounded-full bg-stone-950 text-[13px] font-semibold text-white transition-colors hover:bg-stone-800"
                onClick={() => setShowMobileFilters(false)}
              >
                {t('products.applyFilters', 'Aplicar')} ({products.length})
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
      </AnimatePresence>

    </div>
  );
}
