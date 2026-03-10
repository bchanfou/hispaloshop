import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import BackButton from '../components/BackButton';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import Breadcrumbs from '../components/Breadcrumbs';
import CategoryNav from '../components/CategoryNav';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Search, ChevronDown, X, SlidersHorizontal, Truck,
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { API } from '../utils/api';

import { getCategoryLabel, productMatchesCategory } from '../config/categories';

const certificationIds = ['halal', 'kosher', 'vegan', 'gluten-free', 'sugar-free', 'organic'];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { country, language, currency } = useLocale();
  const { t, i18n } = useTranslation();
  const [rawProducts, setRawProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const currencySymbol = currency === 'EUR' ? 'EUR' : currency === 'USD' ? '$' : currency === 'KRW' ? 'KRW' : 'EUR';

  useEffect(() => {
    const nextCategory = searchParams.get('category') || searchParams.get('categoria') || '';
    const nextSearch = searchParams.get('search') || '';
    const nextSort = searchParams.get('sort') || 'relevance';
    setFilters((prev) => ({
      ...prev,
      category: nextCategory,
      search: nextSearch,
      sort: nextSort,
    }));
  }, [searchParams]);

  useEffect(() => {
    fetchProducts();
  }, [country, currentLang, filters.origin_country, filters.minPrice, filters.maxPrice, filters.search, filters.sort, filters.freeShipping]);

  useEffect(() => {
    if (showMobileFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMobileFilters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('country', country);
      params.append('lang', currentLang);
      if (filters.origin_country) params.append('origin_country', filters.origin_country);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort && filters.sort !== 'relevance') params.append('sort', filters.sort);
      if (filters.freeShipping) params.append('free_shipping', 'true');
      if (filters.certifications.length > 0) params.append('certifications', filters.certifications.join(','));

      const response = await axios.get(`${API}/products?${params.toString()}`);
      const data = response.data?.products || response.data || [];
      setRawProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setRawProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const products = useMemo(() => {
    let list = [...rawProducts];
    if (filters.category) {
      list = list.filter((product) => productMatchesCategory(product, filters.category));
    }
    return list;
  }, [filters.category, rawProducts]);

  const certificationOptions = certificationIds.map((id) => ({
    id,
    label: t(`certifications.${id}`, id),
  }));

  const countryGroups = [
    { region: t('regions.europe', 'Europa'), countries: [
      { code: 'Spain', name: t('countries.Spain', 'España') },
      { code: 'Italy', name: t('countries.Italy', 'Italia') },
      { code: 'France', name: t('countries.France', 'Francia') },
      { code: 'Portugal', name: t('countries.Portugal', 'Portugal') },
      { code: 'Germany', name: t('countries.Germany', 'Alemania') },
    ]},
    { region: t('regions.americas', 'Americas'), countries: [
      { code: 'USA', name: t('countries.USA', 'Estados Unidos') },
      { code: 'Canadá', name: t('countries.Canadá', 'Canadá') },
      { code: 'Mexico', name: t('countries.Mexico', 'Mexico') },
      { code: 'Colombia', name: t('countries.Colombia', 'Colombia') },
    ]},
    { region: t('regions.asiaOceania', 'Asia y Oceania'), countries: [
      { code: 'Japan', name: t('countries.Japan', 'Japón') },
      { code: 'Korea', name: t('countries.Korea', 'Corea del Sur') },
      { code: 'Thailand', name: t('countries.Thailand', 'Tailandia') },
    ]},
  ];
  const allCountries = countryGroups.flatMap((group) => group.countries);

  const sortOptions = [
    { value: 'relevance', label: t('products.sort.relevance', 'Relevancia') },
    { value: 'price_asc', label: t('products.sort.price_asc', 'Precio: Menor a Mayor') },
    { value: 'price_desc', label: t('products.sort.price_desc', 'Precio: Mayor a Menor') },
    { value: 'rating', label: t('products.sort.rating', 'Mejor Valorados') },
    { value: 'newest', label: t('products.sort.newest', 'Más Recientes') },
  ];

  const setCategoryFilter = (categorySlug) => {
    const nextCategory = filters.category === categorySlug ? '' : categorySlug;
    setFilters((prev) => ({ ...prev, category: nextCategory }));

    const nextParams = new URLSearchParams(searchParams);
    if (nextCategory) nextParams.set('category', nextCategory);
    else nextParams.delete('category');
    nextParams.delete('categoria');
    setSearchParams(nextParams);
  };

  const updateSearchParams = (updates) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) nextParams.set(key, value);
      else nextParams.delete(key);
    });
    setSearchParams(nextParams);
  };

  const handleCertificationToggle = (cert) => {
    setFilters((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter((value) => value !== cert)
        : [...prev.certifications, cert],
    }));
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

  const hasActiveFilters = (
    filters.category
    || filters.certifications.length > 0
    || filters.origin_country
    || filters.minPrice
    || filters.maxPrice
    || filters.search
    || filters.freeShipping
  );

  const TopFiltersBar = () => (
    <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4" data-testid="filters-bar">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            className="min-w-[150px] appearance-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 pr-8 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
            value={filters.origin_country}
            onChange={(event) => setFilters({ ...filters, origin_country: event.target.value })}
            data-testid="country-filter"
          >
            <option value="">{t('products.allOrigins')}</option>
            {countryGroups.map((group) => (
              <optgroup key={group.region} label={group.region}>
                {group.countries.map((item) => (
                  <option key={item.code} value={item.code}>{item.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5">
          <span className="text-xs text-stone-400">{currencySymbol}</span>
          <Input type="number" placeholder="Min" value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} className="h-7 w-16 border-0 p-0 text-xs focus:ring-0" />
          <span className="text-xs text-stone-300">-</span>
          <Input type="number" placeholder="Max" value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} className="h-7 w-16 border-0 p-0 text-xs focus:ring-0" />
        </div>

        <button
          onClick={() => setFilters({ ...filters, freeShipping: !filters.freeShipping })}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${filters.freeShipping ? 'border-accent bg-accent text-white shadow-sm' : 'border-stone-200 bg-white text-stone-600 hover:border-accent/40 hover:text-accent'}`}
          data-testid="free-shipping-filter"
        >
          <Truck className="h-4 w-4" />
          {t('products.freeShipping')}
        </button>

        <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl text-stone-600 hover:text-accent" onClick={() => setShowMoreFilters(!showMoreFilters)}>
          <SlidersHorizontal className="h-4 w-4" />
          {showMoreFilters ? t('products.lessFilters') : t('products.moreFilters')}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="gap-1 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600" onClick={clearFilters}>
            <X className="h-4 w-4" />
            {t('products.clearFilters')}
          </Button>
        )}
      </div>

      {showMoreFilters && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">{t('products.certifications')}</p>
          <div className="flex flex-wrap gap-2">
            {certificationOptions.map((cert) => (
              <button
                key={cert.id}
                onClick={() => handleCertificationToggle(cert.id)}
                className={`rounded-full px-3 py-1.5 text-sm transition-all ${filters.certifications.includes(cert.id) ? 'bg-accent text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
              >
                {cert.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const MobileFilterPanel = () => (
    <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-filters">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
      <div className="absolute right-0 top-0 bottom-0 flex w-[320px] max-w-[85vw] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="font-heading text-lg font-semibold text-primary">{t('products.filters')}</h2>
          <button onClick={() => setShowMobileFilters(false)} className="rounded-full p-1.5 transition-colors hover:bg-stone-100">
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <button
            onClick={() => setFilters({ ...filters, freeShipping: !filters.freeShipping })}
            className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${filters.freeShipping ? 'border-accent bg-accent text-white' : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-accent/40'}`}
          >
            <Truck className="h-4 w-4" />
            <span className="text-sm font-medium">{t('products.freeShipping')}</span>
          </button>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">{t('products.certifications')}</Label>
            <div className="flex flex-wrap gap-2">
              {certificationOptions.map((cert) => (
                <button
                  key={cert.id}
                  onClick={() => handleCertificationToggle(cert.id)}
                  className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${filters.certifications.includes(cert.id) ? 'border-accent bg-accent text-white shadow-sm' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'}`}
                >
                  {cert.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-stone-500">{t('products.originCountry')}</Label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 pr-8 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                value={filters.origin_country}
                onChange={(event) => setFilters({ ...filters, origin_country: event.target.value })}
              >
                <option value="">{t('products.allOrigins')}</option>
                {countryGroups.map((group) => (
                  <optgroup key={group.region} label={group.region}>
                    {group.countries.map((item) => (
                      <option key={item.code} value={item.code}>{item.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-stone-100 px-5 py-4">
          {hasActiveFilters && (
            <Button variant="outline" className="h-11 flex-1 rounded-xl border-stone-200" onClick={() => { clearFilters(); setShowMobileFilters(false); }}>
              {t('products.clearFilters')}
            </Button>
          )}
          <Button className="h-11 flex-1 rounded-xl bg-primary text-white hover:bg-primary-hover" onClick={() => setShowMobileFilters(false)}>
            {t('products.applyFilters', 'Aplicar')} ({products.length})
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <BackButton />
        <Breadcrumbs className="mb-4" />

        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h1 className="font-heading text-2xl font-semibold text-primary md:text-3xl" data-testid="products-page-title">
            {t('products.title')}
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                type="text"
                placeholder={t('products.searchPlaceholder')}
                value={filters.search}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setFilters((prev) => ({ ...prev, search: nextValue }));
                  updateSearchParams({ search: nextValue });
                }}
                className="h-10 rounded-xl border-stone-200 pl-9"
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
                className="appearance-none rounded-xl border border-stone-200 bg-white px-3 py-2.5 pr-8 text-sm focus:border-accent focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>
            <Button variant="outline" className="flex h-10 items-center gap-2 rounded-xl border-stone-200 lg:hidden" onClick={() => setShowMobileFilters(true)}>
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">{t('products.filters')}</span>
            </Button>
          </div>
        </div>

        <CategoryNav
          products={rawProducts}
          activeCategory={filters.category}
          onSelectCategory={setCategoryFilter}
          title="Descubre por Categoria"
        />

        <div className="hidden lg:block">
          <TopFiltersBar />
        </div>

        {hasActiveFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.category && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700">
                {getCategoryLabel(filters.category)}
                <button onClick={() => setCategoryFilter(filters.category)} className="rounded-full p-0.5 hover:bg-stone-300"><X className="h-3 w-3" /></button>
              </span>
            )}
            {filters.freeShipping && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                <Truck className="h-3 w-3" />
                {t('products.freeShipping')}
                <button onClick={() => setFilters({ ...filters, freeShipping: false })} className="rounded-full p-0.5 hover:bg-accent/20"><X className="h-3 w-3" /></button>
              </span>
            )}
            {filters.origin_country && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-200 px-2.5 py-1 text-xs font-medium text-stone-700">
                {allCountries.find((item) => item.code === filters.origin_country)?.name || filters.origin_country}
                <button onClick={() => setFilters({ ...filters, origin_country: '' })} className="rounded-full p-0.5 hover:bg-stone-300"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        <p className="mb-4 text-sm text-stone-400">{products.length} {t('products.resultsFound')}</p>

        {loading ? (
          <div className="py-16 text-center" data-testid="loading-spinner">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-accent" />
            <p className="text-stone-400">{t('common.loading', 'Cargando...')}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white py-16 text-center" data-testid="no-products">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
              <Search className="h-8 w-8 text-stone-300" />
            </div>
            <p className="mb-2 text-lg font-medium text-primary">{t('products.noProducts')}</p>
            <p className="mb-4 text-sm text-stone-400">{t('products.tryDifferentFilters')}</p>
            {hasActiveFilters && <Button variant="outline" onClick={clearFilters} className="rounded-xl">{t('products.clearFilters')}</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="products-grid">
            {products.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
      </div>

      {showMobileFilters && <MobileFilterPanel />}
      <Footer />
    </div>
  );
}
