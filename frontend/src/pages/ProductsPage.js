import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Search, SlidersHorizontal, Truck, X } from 'lucide-react';
import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import CategoryNav from '../components/CategoryNav';
import Footer from '../components/Footer';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { country, currency, language } = useLocale();
  const { t, i18n } = useTranslation();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const currentLang = i18n.language || language || 'es';

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || searchParams.get('categoria') || '',
    certifications: [],
    origin_country: '',
    minPrice: '',
    maxPrice: '',
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || 'relevance',
    freeShipping: false,
  });

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

  const queryFilters = useMemo(
    () => ({
      country,
      lang: currentLang,
      origin_country: filters.origin_country || undefined,
      min_price: filters.minPrice || undefined,
      max_price: filters.maxPrice || undefined,
      search: filters.search || undefined,
      sort: filters.sort !== 'relevance' ? filters.sort : undefined,
      free_shipping: filters.freeShipping ? 'true' : undefined,
      certifications: filters.certifications.length > 0 ? filters.certifications.join(',') : undefined,
    }),
    [country, currentLang, filters],
  );

  const catalogQuery = useCatalog(queryFilters);
  const rawProducts = useMemo(() => flattenCatalogPages(catalogQuery.data?.pages), [catalogQuery.data?.pages]);
  const products = useMemo(() => {
    if (!filters.category) return rawProducts;
    return rawProducts.filter((product) => productMatchesCategory(product, filters.category));
  }, [filters.category, rawProducts]);

  const hasActiveFilters = Boolean(
    filters.category ||
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
  const currencySymbol = currency === 'USD' ? '$' : currency === 'KRW' ? 'KRW' : 'EUR';

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
    setFilters((prev) => ({ ...prev, category: nextCategory }));
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

  const renderOriginSelect = (className) => (
    <div className="relative">
      <select
        className={className}
        value={filters.origin_country}
        onChange={(event) => setFilters((prev) => ({ ...prev, origin_country: event.target.value }))}
        aria-label={t('products.originCountry', 'País de origen')}
      >
        <option value="">{t('products.allOrigins', 'Todos los orígenes')}</option>
        {COUNTRY_GROUPS.map((group) => (
          <optgroup key={group.region} label={group.region}>
            {group.countries.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <BackButton />
        <Breadcrumbs className="mb-4" />

        <section className="mb-8 rounded-[28px] border border-stone-100 bg-white px-5 py-5 shadow-sm md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">Catálogo</p>
              <h1 className="text-3xl font-semibold tracking-tight text-stone-950" data-testid="products-page-title">
                {t('products.title', 'Productos')}
              </h1>
              <p className="mt-2 text-sm text-stone-500">
                Descubrimiento limpio, filtros serenos y producto presentado con más aire.
              </p>
            </div>

            <div className="flex flex-col gap-3 md:w-[520px] md:items-end">
              <div className="flex w-full items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    type="text"
                    placeholder={t('products.searchPlaceholder', 'Buscar productos')}
                    value={filters.search}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setFilters((prev) => ({ ...prev, search: nextValue }));
                      updateSearchParams({ search: nextValue });
                    }}
                    className="h-11 rounded-full border-stone-200 bg-stone-50 pl-9 placeholder:text-stone-400 focus:border-stone-950"
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
                    className="h-11 appearance-none rounded-full border border-stone-200 bg-white px-4 py-2.5 pr-9 text-sm outline-none focus:border-stone-950"
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

                <Button
                  variant="outline"
                  className="flex h-11 items-center gap-2 rounded-full border-stone-200 bg-white lg:hidden"
                  onClick={() => setShowMobileFilters(true)}
                  aria-label={t('products.filters', 'Filtros')}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('products.filters', 'Filtros')}</span>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <CategoryNav
          products={rawProducts}
          activeCategory={filters.category}
          onSelectCategory={setCategoryFilter}
          title="Descubre por categoría"
          variant="catalog"
        />

        <section className="mb-6 hidden rounded-[28px] border border-stone-100 bg-white p-4 shadow-sm lg:block">
          <div className="flex flex-wrap items-center gap-3">
            {renderOriginSelect('min-w-[160px] appearance-none rounded-full border border-stone-200 bg-white px-4 py-2.5 pr-8 text-sm outline-none transition-all duration-150 ease-out hover:bg-stone-50 focus:border-stone-950')}

            <div className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 transition-all duration-150 ease-out hover:bg-stone-50">
              <span className="text-xs text-stone-400">{currencySymbol}</span>
              <Input
                type="number"
                placeholder="Mín"
                value={filters.minPrice}
                onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: event.target.value }))}
                className="h-7 w-16 border-0 bg-transparent p-0 text-xs focus:ring-0"
                aria-label="Precio mínimo"
              />
              <span className="text-xs text-stone-300">-</span>
              <Input
                type="number"
                placeholder="Máx"
                value={filters.maxPrice}
                onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
                className="h-7 w-16 border-0 bg-transparent p-0 text-xs focus:ring-0"
                aria-label="Precio máximo"
              />
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700">
                {getCategoryLabel(filters.category)}
                <button type="button" onClick={() => setCategoryFilter(filters.category)} className="rounded-full p-0.5 hover:bg-stone-100" aria-label="Quitar filtro de categoría">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
            {filters.freeShipping ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1.5 text-xs font-medium text-white">
                <Truck className="h-3 w-3" />
                {t('products.freeShipping', 'Envío gratis')}
                <button type="button" onClick={() => setFilters((prev) => ({ ...prev, freeShipping: false }))} className="rounded-full p-0.5 hover:bg-white/10" aria-label="Quitar filtro de envío gratis">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
            {filters.origin_country ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700">
                {allCountries.find((item) => item.code === filters.origin_country)?.name || filters.origin_country}
                <button type="button" onClick={() => setFilters((prev) => ({ ...prev, origin_country: '' }))} className="rounded-full p-0.5 hover:bg-stone-100" aria-label="Quitar filtro de país">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null}
          </div>
        ) : null}

        <p className="mb-5 text-sm text-stone-500">
          {products.length} {t('products.resultsFound', 'resultados')}
        </p>

        {catalogQuery.isLoading ? (
          <div className="py-16 text-center" data-testid="loading-spinner">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-stone-950" />
            <p className="text-stone-500">{t('common.loading', 'Cargando...')}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[28px] border border-stone-100 bg-white py-16 text-center shadow-sm" data-testid="no-products">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
              <Search className="h-8 w-8 text-stone-300" />
            </div>
            <p className="mb-2 text-lg font-medium text-stone-950">{t('products.noProducts', 'No hay productos')}</p>
            <p className="mb-4 text-sm text-stone-500">
              {t('products.tryDifferentFilters', 'Prueba con otros filtros o busca otra categoría.')}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" onClick={clearFilters} className="rounded-full border-stone-200 bg-white hover:bg-stone-50">
                {t('products.clearFilters', 'Limpiar')}
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5" data-testid="products-grid">
              {products.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>

            {catalogQuery.hasNextPage ? (
              <div className="mt-8 flex justify-center">
                <Button
                  type="button"
                  onClick={() => catalogQuery.fetchNextPage()}
                  disabled={catalogQuery.isFetchingNextPage}
                  className="rounded-full bg-stone-950 text-white hover:bg-stone-800"
                >
                  {catalogQuery.isFetchingNextPage ? t('common.loading', 'Cargando...') : t('products.loadMore', 'Cargar más')}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {showMobileFilters ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute bottom-0 right-0 top-0 flex w-[320px] max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-stone-950">{t('products.filters', 'Filtros')}</h2>
              <button type="button" onClick={() => setShowMobileFilters(false)} className="rounded-full p-1.5 transition-colors hover:bg-stone-100" aria-label="Cerrar filtros">
                <X className="h-5 w-5 text-stone-500" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
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
                <Button
                  variant="outline"
                  className="h-11 flex-1 rounded-full border-stone-200"
                  onClick={() => {
                    clearFilters();
                    setShowMobileFilters(false);
                  }}
                >
                  {t('products.clearFilters', 'Limpiar')}
                </Button>
              ) : null}
              <Button className="h-11 flex-1 rounded-full bg-stone-950 text-white hover:bg-stone-800" onClick={() => setShowMobileFilters(false)}>
                {t('products.applyFilters', 'Aplicar')} ({products.length})
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Footer />
    </div>
  );
}
