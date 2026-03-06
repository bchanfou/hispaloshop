import BackButton from '../components/BackButton';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import Breadcrumbs from '../components/Breadcrumbs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Search, ChevronDown, X, SlidersHorizontal, Truck,
  Droplets, Milk, Cookie, CakeSlice, Coffee,
  Croissant, Cherry, Wine, Soup, Snowflake, Salad, Pill,
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { API } from '../utils/api';
import { demoProducts } from '../data/demoData';
import { DEMO_MODE } from '../config/featureFlags';

const FALLBACK_CATEGORIES = [
  { category_id: 'cat-aceites', slug: 'aceite-condimentos', display_name: 'Aceites', name: 'Aceites', children: [] },
  { category_id: 'cat-lacteos', slug: 'lacteos', display_name: 'Lacteos', name: 'Lacteos', children: [] },
  { category_id: 'cat-conservas', slug: 'conservas', display_name: 'Conservas', name: 'Conservas', children: [] },
  { category_id: 'cat-snacks', slug: 'frutos-secos-snacks', display_name: 'Snacks', name: 'Snacks', children: [] },
  { category_id: 'cat-bebidas', slug: 'bebidas', display_name: 'Bebidas', name: 'Bebidas', children: [] },
  { category_id: 'cat-organico', slug: 'organico', display_name: 'Organico', name: 'Organico', children: [] },
  { category_id: 'cat-suplementos', slug: 'suplementos', display_name: 'Suplementos', name: 'Suplementos', children: [] },
];

const CATEGORY_VISUALS = [
  { slug: 'aceite-condimentos', label: 'Aceites', icon: Droplets, bg: 'bg-emerald-50', color: 'text-emerald-700' },
  { slug: 'lacteos', label: 'Lacteos', icon: Milk, bg: 'bg-blue-50', color: 'text-blue-700' },
  { slug: 'conservas', label: 'Conservas', icon: Soup, bg: 'bg-amber-50', color: 'text-amber-700' },
  { slug: 'frutos-secos-snacks', label: 'Snacks', icon: Cookie, bg: 'bg-orange-50', color: 'text-orange-700' },
  { slug: 'quesos', label: 'Quesos', icon: CakeSlice, bg: 'bg-yellow-50', color: 'text-yellow-700' },
  { slug: 'cafe-infusiones', label: 'Cafe', icon: Coffee, bg: 'bg-amber-50', color: 'text-amber-700' },
  { slug: 'panaderia', label: 'Panaderia', icon: Croissant, bg: 'bg-amber-50', color: 'text-amber-600' },
  { slug: 'frutas-verduras', label: 'Frutas', icon: Cherry, bg: 'bg-lime-50', color: 'text-lime-700' },
  { slug: 'bebidas', label: 'Bebidas', icon: Wine, bg: 'bg-purple-50', color: 'text-purple-700' },
  { slug: 'salsas-condimentos', label: 'Salsas', icon: Soup, bg: 'bg-rose-50', color: 'text-rose-600' },
  { slug: 'congelados', label: 'Congelados', icon: Snowflake, bg: 'bg-cyan-50', color: 'text-cyan-700' },
  { slug: 'organico', label: 'Organico', icon: Salad, bg: 'bg-green-50', color: 'text-green-600' },
  { slug: 'suplementos', label: 'Suplementos', icon: Pill, bg: 'bg-indigo-50', color: 'text-indigo-600' },
];

const mergeCategories = (remote = []) => {
  const bySlug = new Map();
  [...FALLBACK_CATEGORIES, ...remote].forEach((cat) => {
    if (!cat?.slug) return;
    if (cat.slug === 'carnes-huevos') return;
    bySlug.set(cat.slug, {
      ...cat,
      display_name: cat.display_name || cat.name || cat.slug,
      children: Array.isArray(cat.children) ? cat.children : [],
    });
  });
  return Array.from(bySlug.values());
};

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { country, language, currency } = useLocale();
  const { t, i18n } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const currentLang = i18n.language || language || 'es';

  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    certifications: [],
    origin_country: '',
    minPrice: '',
    maxPrice: '',
    search: searchParams.get('search') || '',
    sort: 'relevance',
    freeShipping: false
  });

  const currencySymbol = currency === 'EUR' ? '\u20AC' : currency === 'USD' ? '$' : currency === 'KRW' ? '\u20A9' : '\u20AC';

  useEffect(() => { fetchCategories(); }, [currentLang]);
  useEffect(() => { fetchProducts(); }, [filters, country, currentLang]);
  useEffect(() => {
    if (filters.category === 'carnes-huevos') {
      setFilters((prev) => ({ ...prev, category: '' }));
    }
  }, [filters.category]);

  // Lock body scroll when mobile filters open
  useEffect(() => {
    if (showMobileFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showMobileFilters]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories/tree?lang=${currentLang}`);
      const data = Array.isArray(response.data) ? response.data : [];
      setCategories(mergeCategories(data));
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(mergeCategories([]));
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('country', country);
      params.append('lang', currentLang);
      if (filters.category) params.append('category', filters.category);
      if (filters.certifications.length > 0) params.append('certifications', filters.certifications.join(','));
      if (filters.origin_country) params.append('origin_country', filters.origin_country);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort && filters.sort !== 'relevance') params.append('sort', filters.sort);
      if (filters.freeShipping) params.append('free_shipping', 'true');
      const response = await axios.get(`${API}/products?${params.toString()}`);
      const data = response.data?.products || response.data || [];
      setProducts(Array.isArray(data) && data.length ? data : (DEMO_MODE ? applyDemoFilters() : []));
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts(DEMO_MODE ? applyDemoFilters() : []);
    } finally {
      setLoading(false);
    }
  };

  const applyDemoFilters = () => {
    if (!DEMO_MODE) return [];
    let list = [...demoProducts];
    if (filters.category) list = list.filter((p) => p.category === filters.category);
    if (filters.search) {
      const needle = filters.search.toLowerCase();
      list = list.filter((p) => `${p.name} ${p.description || ''}`.toLowerCase().includes(needle));
    }
    if (filters.minPrice) list = list.filter((p) => Number(p.price || 0) >= Number(filters.minPrice));
    if (filters.maxPrice) list = list.filter((p) => Number(p.price || 0) <= Number(filters.maxPrice));
    if (filters.freeShipping) list = list.filter((p) => !p.shipping_cost || p.shipping_cost === 0);

    if (filters.sort === 'price_asc') list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (filters.sort === 'price_desc') list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (filters.sort === 'rating') list.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0));
    if (filters.sort === 'newest') list.sort((a, b) => String(b.product_id).localeCompare(String(a.product_id)));

    return list;
  };

  const handleCertificationToggle = (cert) => {
    setFilters((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter((c) => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  const clearFilters = () => {
    setFilters({ category: '', certifications: [], origin_country: '', minPrice: '', maxPrice: '', search: '', sort: 'relevance', freeShipping: false });
  };

  const hasActiveFilters = filters.category || filters.certifications.length > 0 || filters.origin_country || filters.minPrice || filters.maxPrice || filters.search || filters.freeShipping;

  // Find category display name for active filter tag
  const getCategoryDisplayName = (slug) => {
    for (const cat of categories) {
      if (cat.slug === slug) return cat.display_name || cat.name;
      for (const sub of (cat.children || [])) {
        if (sub.slug === slug) return sub.display_name || sub.name;
      }
    }
    return slug;
  };

  // Translated certification labels
  const certificationOptions = [
    { id: 'halal', label: t('certifications.halal', 'Halal') },
    { id: 'kosher', label: t('certifications.kosher', 'Kosher') },
    { id: 'vegan', label: t('certifications.vegan', 'Vegano') },
    { id: 'gluten-free', label: t('certifications.gluten-free', 'Sin Gluten') },
    { id: 'sugar-free', label: t('certifications.sugar-free', 'Sin Azucar') },
    { id: 'organic', label: t('certifications.organic', 'Organico') },
  ];

  // Country options grouped by region
  const countryGroups = [
    { region: t('regions.europe', 'Europa'), countries: [
      { code: 'Spain', name: t('countries.Spain', 'España') },
      { code: 'Italy', name: t('countries.Italy', 'Italia') },
      { code: 'France', name: t('countries.France', 'Francia') },
      { code: 'Greece', name: t('countries.Greece', 'Grecia') },
      { code: 'Portugal', name: t('countries.Portugal', 'Portugal') },
      { code: 'Germany', name: t('countries.Germany', 'Alemania') },
      { code: 'Netherlands', name: t('countries.Netherlands', 'Paises Bajos') },
      { code: 'Belgium', name: t('countries.Belgium', 'Belgica') },
      { code: 'United Kingdom', name: t('countries.UnitedKingdom', 'Reino Unido') },
      { code: 'Switzerland', name: t('countries.Switzerland', 'Suiza') },
      { code: 'Austria', name: t('countries.Austria', 'Austria') },
      { code: 'Poland', name: t('countries.Poland', 'Polonia') },
      { code: 'Ireland', name: t('countries.Ireland', 'Irlanda') },
      { code: 'Sweden', name: t('countries.Sweden', 'Suecia') },
      { code: 'Denmark', name: t('countries.Denmark', 'Dinamarca') },
      { code: 'Norway', name: t('countries.Norway', 'Noruega') },
      { code: 'Czech Republic', name: t('countries.CzechRepublic', 'Rep. Checa') },
      { code: 'Hungary', name: t('countries.Hungary', 'Hungria') },
      { code: 'Romania', name: t('countries.Romania', 'Rumania') },
      { code: 'Bulgaria', name: t('countries.Bulgaria', 'Bulgaria') },
      { code: 'Croatia', name: t('countries.Croatia', 'Croacia') },
      { code: 'Turkey', name: t('countries.Turkey', 'Turquia') },
    ]},
    { region: t('regions.americas', 'Americas'), countries: [
      { code: 'USA', name: t('countries.USA', 'Estados Unidos') },
      { code: 'Canada', name: t('countries.Canada', 'Canada') },
      { code: 'Mexico', name: t('countries.Mexico', 'Mexico') },
      { code: 'Colombia', name: t('countries.Colombia', 'Colombia') },
      { code: 'Argentina', name: t('countries.Argentina', 'Argentina') },
      { code: 'Chile', name: t('countries.Chile', 'Chile') },
      { code: 'Peru', name: t('countries.Peru', 'Peru') },
      { code: 'Brazil', name: t('countries.Brazil', 'Brasil') },
      { code: 'Ecuador', name: t('countries.Ecuador', 'Ecuador') },
      { code: 'Costa Rica', name: t('countries.CostaRica', 'Costa Rica') },
      { code: 'Dominican Republic', name: t('countries.DominicanRepublic', 'Rep. Dominicana') },
    ]},
    { region: t('regions.asiaOceania', 'Asia y Oceania'), countries: [
      { code: 'Korea', name: t('countries.Korea', 'Corea del Sur') },
      { code: 'Japan', name: t('countries.Japan', 'Japon') },
      { code: 'China', name: t('countries.China', 'China') },
      { code: 'India', name: t('countries.India', 'India') },
      { code: 'Thailand', name: t('countries.Thailand', 'Tailandia') },
      { code: 'Vietnam', name: t('countries.Vietnam', 'Vietnam') },
      { code: 'Indonesia', name: t('countries.Indonesia', 'Indonesia') },
      { code: 'Philippines', name: t('countries.Philippines', 'Filipinas') },
      { code: 'Australia', name: t('countries.Australia', 'Australia') },
      { code: 'New Zealand', name: t('countries.NewZealand', 'Nueva Zelanda') },
    ]},
    { region: t('regions.africaMiddleEast', 'Africa y Oriente Medio'), countries: [
      { code: 'Morocco', name: t('countries.Morocco', 'Marruecos') },
      { code: 'Tunisia', name: t('countries.Tunisia', 'Tunez') },
      { code: 'Egypt', name: t('countries.Egypt', 'Egipto') },
      { code: 'South Africa', name: t('countries.SouthAfrica', 'Sudafrica') },
      { code: 'Israel', name: t('countries.Israel', 'Israel') },
      { code: 'Lebanon', name: t('countries.Lebanon', 'Libano') },
      { code: 'Iran', name: t('countries.Iran', 'Iran') },
    ]},
  ];
  const allCountries = countryGroups.flatMap(g => g.countries);

  // Translated sort options
  const sortOptions = [
    { value: 'relevance', label: t('products.sort.relevance', 'Relevancia') },
    { value: 'price_asc', label: t('products.sort.price_asc', 'Precio: Menor a Mayor') },
    { value: 'price_desc', label: t('products.sort.price_desc', 'Precio: Mayor a Menor') },
    { value: 'rating', label: t('products.sort.rating', 'Mejor Valorados') },
    { value: 'newest', label: t('products.sort.newest', 'Mas Recientes') },
  ];

  // Desktop Top Filters Bar
  const TopFiltersBar = () => (
    <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-6" data-testid="filters-bar">
      <div className="flex flex-wrap items-center gap-3">
        {/* Country */}
        <div className="relative">
          <select
            className="appearance-none border border-stone-200 rounded-xl px-3 py-2.5 pr-8 text-sm focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27] transition-all outline-none bg-white min-w-[150px]"
            value={filters.origin_country}
            onChange={(e) => setFilters({ ...filters, origin_country: e.target.value })}
            data-testid="country-filter"
          >
            <option value="">{t('products.allOrigins')}</option>
            {countryGroups.map((g) => (
              <optgroup key={g.region} label={g.region}>
                {g.countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        </div>

        {/* Price Range */}
        <div className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-3 py-1.5 bg-white">
          <span className="text-stone-400 text-xs">{currencySymbol}</span>
          <Input type="number" placeholder="Min" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="w-16 h-7 text-xs border-0 p-0 focus:ring-0" data-testid="min-price-input" />
          <span className="text-stone-300 text-xs">-</span>
          <Input type="number" placeholder="Max" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="w-16 h-7 text-xs border-0 p-0 focus:ring-0" data-testid="max-price-input" />
        </div>

        {/* Free Shipping */}
        <button
          onClick={() => setFilters({ ...filters, freeShipping: !filters.freeShipping })}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all text-sm font-medium border ${filters.freeShipping ? 'bg-[#2D5A27] border-[#2D5A27] text-white shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:border-[#2D5A27]/40 hover:text-[#2D5A27]'}`}
          data-testid="free-shipping-filter"
        >
          <Truck className="w-4 h-4" />
          {t('products.freeShipping')}
        </button>

        {/* More Filters */}
        <Button variant="ghost" size="sm" className="text-stone-600 hover:text-[#2D5A27] gap-1.5 rounded-xl" onClick={() => setShowMoreFilters(!showMoreFilters)} data-testid="more-filters-toggle">
          <SlidersHorizontal className="w-4 h-4" />
          {showMoreFilters ? t('products.lessFilters') : t('products.moreFilters')}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1 rounded-xl" onClick={clearFilters} data-testid="clear-filters-button">
            <X className="w-4 h-4" /> {t('products.clearFilters')}
          </Button>
        )}
      </div>

      {/* Expanded Certifications */}
      {showMoreFilters && (
        <div className="pt-3 mt-3 border-t border-stone-100">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{t('products.certifications')}</p>
          <div className="flex flex-wrap gap-2">
            {certificationOptions.map((cert) => (
              <button
                key={cert.id}
                onClick={() => handleCertificationToggle(cert.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${filters.certifications.includes(cert.id) ? 'bg-[#2D5A27] text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                data-testid={`cert-filter-${cert.id}`}
              >
                {cert.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Mobile Filter Panel
  const MobileFilterPanel = () => (
    <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-filters">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileFilters(false)} />
      <div className="absolute right-0 top-0 bottom-0 w-[320px] max-w-[85vw] bg-white flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="font-heading text-lg font-semibold text-[#1C1C1C]">{t('products.filters')}</h2>
          <button onClick={() => setShowMobileFilters(false)} className="p-1.5 hover:bg-stone-100 rounded-full transition-colors" data-testid="close-mobile-filters">
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Free Shipping */}
          <button
            onClick={() => setFilters({ ...filters, freeShipping: !filters.freeShipping })}
            className={`flex items-center gap-3 w-full p-3.5 rounded-xl cursor-pointer transition-all border ${filters.freeShipping ? 'bg-[#2D5A27] border-[#2D5A27] text-white' : 'bg-stone-50 border-stone-200 text-stone-700 hover:border-[#2D5A27]/40'}`}
            data-testid="mobile-free-shipping"
          >
            <Truck className="w-4 h-4" />
            <span className="text-sm font-medium">{t('products.freeShipping')}</span>
          </button>

          {/* Certifications */}
          <div>
            <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">{t('products.certifications')}</Label>
            <div className="flex flex-wrap gap-2">
              {certificationOptions.map((cert) => (
                <button
                  key={cert.id}
                  onClick={() => handleCertificationToggle(cert.id)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${filters.certifications.includes(cert.id) ? 'bg-[#2D5A27] text-white border-[#2D5A27] shadow-sm' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'}`}
                  data-testid={`mobile-cert-${cert.id}`}
                >
                  {cert.label}
                </button>
              ))}
            </div>
          </div>

          {/* Country */}
          <div>
            <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">{t('products.originCountry')}</Label>
            <div className="relative">
              <select
                className="w-full appearance-none border border-stone-200 rounded-xl px-3 py-2.5 pr-8 text-sm focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27] outline-none bg-white"
                value={filters.origin_country}
                onChange={(e) => setFilters({ ...filters, origin_country: e.target.value })}
              >
                <option value="">{t('products.allOrigins')}</option>
                {countryGroups.map((g) => (
                  <optgroup key={g.region} label={g.region}>
                    {g.countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            </div>
          </div>

          {/* Price Range */}
          <div>
            <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">{t('products.priceRange')}</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">{currencySymbol}</span>
                <Input type="number" placeholder="Min" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} className="pl-7 h-10 text-sm rounded-xl" />
              </div>
              <span className="text-stone-300">-</span>
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">{currencySymbol}</span>
                <Input type="number" placeholder="Max" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} className="pl-7 h-10 text-sm rounded-xl" />
              </div>
            </div>
          </div>

          {/* Sort */}
          <div>
            <Label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">{t('products.sort.relevance').split(':')[0] || 'Sort'}</Label>
            <div className="relative">
              <select
                className="w-full appearance-none border border-stone-200 rounded-xl px-3 py-2.5 pr-8 text-sm focus:ring-2 focus:ring-[#2D5A27]/20 focus:border-[#2D5A27] outline-none bg-white"
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Footer with Apply/Clear */}
        <div className="px-5 py-4 border-t border-stone-100 flex gap-3">
          {hasActiveFilters && (
            <Button variant="outline" className="flex-1 rounded-xl h-11 border-stone-200" onClick={() => { clearFilters(); setShowMobileFilters(false); }}>
              {t('products.clearFilters')}
            </Button>
          )}
          <Button className="flex-1 rounded-xl h-11 bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white" onClick={() => setShowMobileFilters(false)} data-testid="apply-filters-btn">
            {t('products.applyFilters', 'Aplicar')} ({products.length})
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <BackButton />
        <Breadcrumbs className="mb-4" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h1 className="font-heading text-2xl md:text-3xl font-semibold text-[#1C1C1C]" data-testid="products-page-title">
            {t('products.title')}
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <Input type="text" placeholder={t('products.searchPlaceholder')} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="pl-9 rounded-xl border-stone-200 h-10" data-testid="search-input" />
            </div>
            <div className="relative hidden md:block">
              <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })} className="appearance-none px-3 py-2.5 pr-8 border border-stone-200 rounded-xl bg-white text-sm focus:outline-none focus:border-[#2D5A27]" data-testid="sort-filter">
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            </div>
            <Button variant="outline" className="lg:hidden flex items-center gap-2 rounded-xl border-stone-200 h-10" onClick={() => setShowMobileFilters(true)} data-testid="mobile-filter-toggle">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">{t('products.filters')}</span>
              {hasActiveFilters && (
                <span className="bg-[#2D5A27] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {filters.certifications.length + (filters.category ? 1 : 0) + (filters.origin_country ? 1 : 0) + (filters.freeShipping ? 1 : 0)}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Desktop Filters */}
        <div className="hidden lg:block"><TopFiltersBar /></div>

        {/* Active Filter Tags */}
        <div className="mb-4">
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORY_VISUALS.map((cat) => {
              const active = filters.category === cat.slug;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.slug}
                  onClick={() => setFilters((prev) => ({ ...prev, category: active ? '' : cat.slug }))}
                  className={`shrink-0 w-20 rounded-xl overflow-hidden border transition-all ${active ? 'border-[#2D5A27] ring-2 ring-[#2D5A27]/20' : 'border-stone-200 hover:border-stone-300'}`}
                  data-testid={`visual-category-${cat.slug}`}
                >
                  <div className={`h-12 flex items-center justify-center ${cat.bg}`}>
                    <Icon className={`w-5 h-5 ${cat.color}`} strokeWidth={1.5} />
                  </div>
                  <div className="px-1.5 py-1 text-[10px] font-medium text-stone-700 truncate">{cat.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {filters.freeShipping && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2D5A27]/10 text-[#2D5A27] text-xs font-medium rounded-full">
                <Truck className="w-3 h-3" /> {t('products.freeShipping')}
                <button onClick={() => setFilters({...filters, freeShipping: false})} className="hover:bg-[#2D5A27]/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.certifications.map(cert => (
              <span key={cert} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                {certificationOptions.find(c => c.id === cert)?.label}
                <button onClick={() => handleCertificationToggle(cert)} className="hover:bg-amber-200 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </span>
            ))}
            {filters.category && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-200 text-stone-700 text-xs font-medium rounded-full">
                {getCategoryDisplayName(filters.category)}
                <button onClick={() => setFilters({...filters, category: ''})} className="hover:bg-stone-300 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.origin_country && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-200 text-stone-700 text-xs font-medium rounded-full">
                {allCountries.find(c => c.code === filters.origin_country)?.name || filters.origin_country}
                <button onClick={() => setFilters({...filters, origin_country: ''})} className="hover:bg-stone-300 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-200 text-stone-700 text-xs font-medium rounded-full">
                {currencySymbol}{filters.minPrice || '0'} - {currencySymbol}{filters.maxPrice || '\u221E'}
                <button onClick={() => setFilters({...filters, minPrice: '', maxPrice: ''})} className="hover:bg-stone-300 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="text-sm text-stone-400 mb-4">{products.length} {t('products.resultsFound')}</p>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-16" data-testid="loading-spinner">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5A27] mx-auto mb-4"></div>
            <p className="text-stone-400">{t('common.loading', 'Cargando...')}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200" data-testid="no-products">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-stone-300" />
            </div>
            <p className="text-[#1C1C1C] text-lg font-medium mb-2">{t('products.noProducts')}</p>
            <p className="text-stone-400 text-sm mb-4">{t('products.tryDifferentFilters')}</p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="rounded-xl">{t('products.clearFilters')}</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" data-testid="products-grid">
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
