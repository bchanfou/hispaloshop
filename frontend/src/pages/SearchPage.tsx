// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, X, ChefHat, ShoppingBag, Store, Users, Clock, TrendingUp, Hash, SlidersHorizontal, Check, User } from 'lucide-react';
import apiClient from '../services/api/client';
import { useLocale } from '../context/LocaleContext';
import SEO from '../components/SEO';
import SlideTabIndicator from '../components/motion/SlideTabIndicator';
import { toast } from 'sonner';

/* ── Autocomplete Suggestion Item ── */
function SuggestionItem({ item, type, onClick }) {
  const img = item.images?.[0] || item.image_url || item.profile_image || item.cover_image;
  const name = item.name || item.title || item.username || 'Sin nombre';
  const badges = { products: 'Producto', creators: 'Persona', stores: 'Tienda' };
  const icons = { products: ShoppingBag, creators: User, stores: Store };
  const Icon = icons[type] || ShoppingBag;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-stone-50"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100">
        {img ? (
          <img src={img} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Icon size={14} className="text-stone-400" />
        )}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm text-stone-950">{name}</span>
      <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-500">
        {badges[type] || type}
      </span>
    </button>
  );
}

/* ── Autocomplete Dropdown ── */
function AutocompleteDropdown({ suggestions, onSelect, onClose }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const sections = [
    { key: 'products', label: 'Productos', icon: ShoppingBag, items: suggestions.products || [] },
    { key: 'creators', label: 'Personas', icon: Users, items: suggestions.creators || [] },
    { key: 'stores', label: 'Tiendas', icon: Store, items: suggestions.stores || [] },
  ].filter(s => s.items.length > 0);

  if (sections.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[420px] overflow-y-auto rounded-2xl bg-white p-2 shadow-lg"
    >
      {sections.map(section => (
        <div key={section.key}>
          <div className="flex items-center gap-2 px-3 pb-1 pt-2">
            <section.icon size={13} className="text-stone-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{section.label}</span>
          </div>
          {section.items.map((item, i) => (
            <SuggestionItem
              key={item.product_id || item.store_id || item.user_id || item.id || i}
              item={item}
              type={section.key}
              onClick={() => onSelect(item, section.key)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const HISTORY_KEY = 'hispal_search_history';
const MAX_HISTORY = 8;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(q) {
  const prev = getHistory().filter((x) => x !== q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...prev].slice(0, MAX_HISTORY)));
}
function clearHistoryStorage() {
  localStorage.removeItem(HISTORY_KEY);
}

const TRENDING_FALLBACK = ['aceite de oliva', 'gazpacho', 'ibérico', 'queso manchego', 'almendra', 'azafrán'];

const ROLE_LABELS = { producer: 'Productor', influencer: 'Influencer', consumer: 'Consumidor', importer: 'Importador' };

/* ── pill style helper (same as Discover) ── */
const pillCls = (active) =>
  `flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
    active
      ? 'bg-stone-950 text-white'
      : 'bg-stone-100 text-stone-700'
  }`;

const TABS = [
  { key: 'all', label: 'Todo' },
  { key: 'products', label: 'Productos', icon: ShoppingBag },
  { key: 'stores', label: 'Tiendas', icon: Store },
  { key: 'creators', label: 'Personas', icon: Users },
  { key: 'recipes', label: 'Recetas', icon: ChefHat },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'newest', label: 'Más reciente' },
];

const CERTIFICATION_OPTIONS = [
  { value: 'ecologico', label: 'Ecológico' },
  { value: 'dop', label: 'DOP' },
  { value: 'sin_gluten', label: 'Sin gluten' },
  { value: 'vegano', label: 'Vegano' },
  { value: 'km0', label: 'Km0' },
  { value: 'halal', label: 'Halal' },
];

/* ── Toggle Switch ── */
function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-stone-950' : 'bg-stone-200'}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

/* ── Skeleton ── */
function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-stone-100">
      <div className="animate-pulse bg-stone-200 aspect-[4/5]" />
      <div className="px-2 py-2">
        <div className="mb-1.5 h-3 w-3/4 animate-pulse rounded bg-stone-200" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-stone-100" />
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-stone-200" />
      <div className="flex-1">
        <div className="mb-1.5 h-3.5 w-2/3 animate-pulse rounded bg-stone-200" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-stone-100" />
      </div>
    </div>
  );
}

/* ── Result Components ── */
function ProductCardLocal({ p }) {
  const { convertAndFormatPrice } = useLocale();
  const img = p.images?.[0] || p.image_url;
  return (
    <Link to={`/products/${p.product_id || p.id}`} className="group block overflow-hidden rounded-2xl bg-white no-underline shadow-sm">
      <div className="overflow-hidden bg-stone-100 aspect-[4/5]">
        {img ? (
          <img src={img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ShoppingBag size={24} className="text-stone-300" />
          </div>
        )}
      </div>
      <div className="px-2 pb-2 pt-1.5">
        {p.producer_name && (
          <p className="truncate text-xs text-stone-500">{p.producer_name}</p>
        )}
        <p className="truncate text-sm font-semibold text-stone-950 leading-tight">{p.name}</p>
        {p.price != null && (
          <p className="mt-0.5 text-sm font-bold text-stone-950">
            {convertAndFormatPrice(p.display_price || p.price, p.display_currency || p.currency || 'EUR')}
          </p>
        )}
      </div>
    </Link>
  );
}

function RecipeCard({ r }) {
  const img = r.cover_image || r.image_url;
  return (
    <Link to={`/recipes/${r.recipe_id || r.id}`} className="group block overflow-hidden rounded-2xl bg-white no-underline shadow-sm">
      <div className="overflow-hidden bg-stone-100 aspect-[4/5]">
        {img ? (
          <img src={img} alt={r.title} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ChefHat size={24} className="text-stone-300" />
          </div>
        )}
      </div>
      <div className="px-2 pb-2 pt-1.5">
        <p className="truncate text-sm font-semibold text-stone-950 leading-tight">{r.title}</p>
        {r.prep_time_minutes && (
          <p className="mt-0.5 text-xs text-stone-500">{r.prep_time_minutes} min</p>
        )}
      </div>
    </Link>
  );
}

function PersonRow({ person, linkBase }) {
  const id = person.user_id || person.store_id;
  const name = person.name || 'Usuario';
  const sub = person.username ? `@${person.username}` : person.location || '';
  const img = person.profile_image || person.cover_image;
  const isStore = !!person.store_id;

  return (
    <Link to={`${linkBase}${person.slug || person.store_slug || id}`} className="flex items-center gap-3 border-b border-stone-100 py-2.5 no-underline last:border-b-0">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-stone-100 ${isStore ? 'rounded-2xl' : 'rounded-full'}`}>
        {img ? (
          <img src={img} alt={name} loading="lazy" className="h-full w-full object-cover" />
        ) : isStore ? (
          <Store size={18} className="text-stone-400" />
        ) : (
          <span className="text-sm font-semibold text-stone-400">{(name[0] || '?').toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-950">{name}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-stone-500">{sub}</p>}
      </div>
      {person.followers_count > 0 && (
        <span className="shrink-0 text-xs text-stone-400">{person.followers_count} seg.</span>
      )}
    </Link>
  );
}

function SectionHeader({ icon: Icon, label, count }) {
  return (
    <div className="flex items-center justify-between pb-2 pt-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-stone-400" />
        <span className="text-[13px] font-bold text-stone-950">{label}</span>
      </div>
      {count > 0 && (
        <span className="text-xs text-stone-400">{count}</span>
      )}
    </div>
  );
}

/* ── Main ── */
export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(getHistory);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [filterCerts, setFilterCerts] = useState([]);
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterFreeShipping, setFilterFreeShipping] = useState(false);
  // Applied filters (only set when user clicks "Aplicar")
  const [appliedFilters, setAppliedFilters] = useState({ minPrice: '', maxPrice: '', certs: [], inStock: false, freeShipping: false });
  const [trending, setTrending] = useState(TRENDING_FALLBACK);
  const [trendingHashtags, setTrendingHashtags] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestIdRef = useRef(0);
  const searchIdRef = useRef(0);

  const hasActiveFilters = useMemo(() => {
    return appliedFilters.minPrice !== '' || appliedFilters.maxPrice !== '' || appliedFilters.certs.length > 0 || appliedFilters.inStock || appliedFilters.freeShipping;
  }, [appliedFilters]);

  const toggleFilterCert = useCallback((cert) => {
    setFilterCerts(prev => prev.includes(cert) ? prev.filter(c => c !== cert) : [...prev, cert]);
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ minPrice: filterMinPrice, maxPrice: filterMaxPrice, certs: [...filterCerts], inStock: filterInStock, freeShipping: filterFreeShipping });
    setShowFilters(false);
  }, [filterMinPrice, filterMaxPrice, filterCerts, filterInStock, filterFreeShipping]);

  const handleClearFilters = useCallback(() => {
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterCerts([]);
    setFilterInStock(false);
    setFilterFreeShipping(false);
    setAppliedFilters({ minPrice: '', maxPrice: '', certs: [], inStock: false, freeShipping: false });
  }, []);

  const isEmpty = !query.trim();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    apiClient.get('/discovery/trending', { params: { type: 'products', limit: 8 } })
      .then((data) => {
        const terms = (data?.items || data || [])
          .map(item => item.name || item.title || item.query)
          .filter(Boolean);
        if (terms.length > 0) setTrending(terms);
      })
      .catch(() => {});

    apiClient.get('/discovery/trending', { params: { type: 'hashtags', limit: 8 } })
      .then((data) => {
        const items = (data?.items || data || []).filter(
          (item) => item.tag || item.name || item.hashtag
        );
        if (items.length > 0) setTrendingHashtags(items.slice(0, 8));
      })
      .catch(() => {});
  }, []);

  // Autocomplete suggestions (300ms debounce, >= 2 chars)
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions(null);
      setShowSuggestions(false);
      return;
    }
    const reqId = ++suggestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const data = await apiClient.get('/search', { params: { q: query.trim(), limit: 9 } });
        if (reqId !== suggestIdRef.current) return;
        const hasAny = (data?.products?.length || 0) + (data?.creators?.length || 0) + (data?.stores?.length || 0) > 0;
        if (hasAny) {
          setSuggestions({
            products: (data.products || []).slice(0, 3),
            creators: (data.creators || []).slice(0, 3),
            stores: (data.stores || []).slice(0, 3),
          });
          setShowSuggestions(true);
        } else {
          setSuggestions(null);
          setShowSuggestions(false);
        }
      } catch {
        if (reqId === suggestIdRef.current) {
          setSuggestions(null);
          setShowSuggestions(false);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSuggestionSelect = useCallback((item, type) => {
    setShowSuggestions(false);
    setSuggestions(null);
    if (type === 'products') {
      navigate(`/products/${item.product_id || item.id}`);
    } else if (type === 'stores') {
      navigate(`/store/${item.slug || item.store_slug || item.store_id || item.id}`);
    } else if (type === 'creators') {
      navigate(`/user/${item.slug || item.username || item.user_id || item.id}`);
    }
  }, [navigate]);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const reqId = ++searchIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const sortParam = sortBy !== 'relevance' ? sortBy : undefined;
        const params = { q: query.trim(), limit: 8, sort: sortParam };
        if (appliedFilters.minPrice) params.min_price = appliedFilters.minPrice;
        if (appliedFilters.maxPrice) params.max_price = appliedFilters.maxPrice;
        if (appliedFilters.certs.length > 0) params.certifications = appliedFilters.certs.join(',');
        if (appliedFilters.inStock) params.in_stock = true;
        if (appliedFilters.freeShipping) params.free_shipping = true;
        const data = await apiClient.get('/search', { params });
        if (reqId !== searchIdRef.current) return;
        setResults(data);
        setSearchParams({ q: query.trim() }, { replace: true });
      } catch (err) {
        if (reqId !== searchIdRef.current) return;
        setResults(null);
        toast.error('Error al buscar. Inténtalo de nuevo.');
      } finally {
        if (reqId === searchIdRef.current) setLoading(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [query, sortBy, appliedFilters, setSearchParams]);

  const executeSearch = useCallback(async (q) => {
    const reqId = ++searchIdRef.current;
    setLoading(true);
    try {
      const sortParam = sortBy !== 'relevance' ? sortBy : undefined;
      const params = { q, limit: 8, sort: sortParam };
      if (appliedFilters.minPrice) params.min_price = appliedFilters.minPrice;
      if (appliedFilters.maxPrice) params.max_price = appliedFilters.maxPrice;
      if (appliedFilters.certs.length > 0) params.certifications = appliedFilters.certs.join(',');
      if (appliedFilters.inStock) params.in_stock = true;
      if (appliedFilters.freeShipping) params.free_shipping = true;
      const data = await apiClient.get('/search', { params });
      if (reqId !== searchIdRef.current) return;
      setResults(data);
      setSearchParams({ q }, { replace: true });
    } catch {
      if (reqId !== searchIdRef.current) return;
      setResults(null);
      toast.error('Error al buscar. Inténtalo de nuevo.');
    } finally {
      if (reqId === searchIdRef.current) setLoading(false);
    }
  }, [sortBy, appliedFilters, setSearchParams]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    setSuggestions(null);
    saveHistory(query.trim());
    setHistory(getHistory());
    executeSearch(query.trim());
  }, [query, executeSearch]);

  const handleHistoryClick = (term) => {
    setQuery(term);
    setShowSuggestions(false);
    setSuggestions(null);
    saveHistory(term);
    setHistory(getHistory());
    executeSearch(term);
  };

  const handleRemoveHistoryItem = (term) => {
    const updated = getHistory().filter((x) => x !== term);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
  };

  const handleClearHistory = () => {
    clearHistoryStorage();
    setHistory([]);
  };

  const counts = {
    products: results?.products?.length || 0,
    recipes: results?.recipes?.length || 0,
    stores: results?.stores?.length || 0,
    creators: results?.creators?.length || 0,
  };
  const totalCount = counts.products + counts.recipes + counts.stores + counts.creators;
  const hasResults = totalCount > 0;

  const sortedProducts = useMemo(() => {
    if (!results?.products) return [];
    return [...results.products].sort((a, b) => {
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return 0;
    });
  }, [results?.products, sortBy]);

  const showProducts = (activeTab === 'all' || activeTab === 'products') && counts.products > 0;
  const showRecipes = (activeTab === 'all' || activeTab === 'recipes') && counts.recipes > 0;
  const showStores = (activeTab === 'all' || activeTab === 'stores') && counts.stores > 0;
  const showCreators = (activeTab === 'all' || activeTab === 'creators') && counts.creators > 0;

  return (
    <div className="min-h-screen bg-white">
      <SEO title="Buscar — Hispaloshop" description="Busca productos artesanales, recetas, tiendas y creadores de alimentación saludable local." />

      {/* ── Search Bar (sticky) ── */}
      <div className="sticky top-0 z-40 bg-white px-3 py-2">
        <form onSubmit={handleSubmit} role="search" aria-label="Buscar en Hispaloshop" className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => { window.history.length > 1 ? navigate(-1) : navigate('/discover'); }}
            aria-label="Volver"
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <ArrowLeft size={20} className="text-stone-950" />
          </button>

          <div className="flex h-12 flex-1 items-center gap-2 rounded-full bg-stone-100 px-5 focus-within:ring-2 focus-within:ring-stone-950">
            <Search size={16} className="shrink-0 text-stone-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              autoComplete="off"
              data-search-input
              className="flex-1 bg-transparent border-none text-sm text-stone-950 outline-none placeholder:text-stone-400"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  key="clear"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => { setQuery(''); setResults(null); setSearchParams({}); inputRef.current?.focus(); }}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-300"
                >
                  <X size={12} className="text-white" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            aria-label="Filtros"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white transition-colors hover:bg-stone-50 lg:hidden"
          >
            <SlidersHorizontal size={18} className="text-stone-950" />
            {hasActiveFilters && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-stone-950 ring-2 ring-white" />
            )}
          </button>

          {/* ── Autocomplete Dropdown ── */}
          {showSuggestions && suggestions && (
            <AutocompleteDropdown
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              onClose={() => setShowSuggestions(false)}
            />
          )}
        </form>

        {/* ── Filter Panel (mobile only — desktop uses sidebar) ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden lg:hidden"
            >
              <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
                {/* Price range */}
                <p className="mb-2 text-[13px] font-semibold text-stone-950">Rango de precio</p>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-10 flex-1 items-center rounded-xl border border-stone-200 px-3">
                    <span className="mr-1 text-sm text-stone-400">€</span>
                    <input
                      type="number"
                      min="0"
                      value={filterMinPrice}
                      onChange={(e) => setFilterMinPrice(e.target.value)}
                      placeholder="Min"
                      className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
                    />
                  </div>
                  <span className="text-sm text-stone-400">—</span>
                  <div className="flex h-10 flex-1 items-center rounded-xl border border-stone-200 px-3">
                    <span className="mr-1 text-sm text-stone-400">€</span>
                    <input
                      type="number"
                      min="0"
                      value={filterMaxPrice}
                      onChange={(e) => setFilterMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
                    />
                  </div>
                </div>

                {/* Certifications */}
                <p className="mb-2 text-[13px] font-semibold text-stone-950">Certificaciones</p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {CERTIFICATION_OPTIONS.map(cert => {
                    const isActive = filterCerts.includes(cert.value);
                    return (
                      <button
                        key={cert.value}
                        type="button"
                        onClick={() => toggleFilterCert(cert.value)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                          isActive ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {isActive && <Check size={12} />}
                        {cert.label}
                      </button>
                    );
                  })}
                </div>

                {/* Toggles */}
                <div className="mb-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-950">Solo en stock</span>
                    <ToggleSwitch checked={filterInStock} onChange={setFilterInStock} label="Solo en stock" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-stone-950">Envío gratis</span>
                    <ToggleSwitch checked={filterFreeShipping} onChange={setFilterFreeShipping} label="Envío gratis" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="flex-1 rounded-full bg-stone-950 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
                  >
                    Aplicar filtros
                  </button>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-sm text-stone-500 transition-colors hover:text-stone-700"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-auto max-w-[975px] px-3 lg:flex lg:gap-6">

        {/* ── Filter Sidebar (desktop: always visible left column) ── */}
        <aside className="hidden lg:block lg:w-[240px] lg:shrink-0">
          <div className="sticky top-[72px] rounded-2xl bg-white p-4 shadow-sm">
            {/* Price range */}
            <p className="mb-2 text-[13px] font-semibold text-stone-950">Rango de precio</p>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 flex-1 items-center rounded-xl border border-stone-200 px-3">
                <span className="mr-1 text-sm text-stone-400">&euro;</span>
                <input
                  type="number"
                  min="0"
                  value={filterMinPrice}
                  onChange={(e) => setFilterMinPrice(e.target.value)}
                  placeholder="Min"
                  className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
                />
              </div>
              <span className="text-sm text-stone-400">&mdash;</span>
              <div className="flex h-10 flex-1 items-center rounded-xl border border-stone-200 px-3">
                <span className="mr-1 text-sm text-stone-400">&euro;</span>
                <input
                  type="number"
                  min="0"
                  value={filterMaxPrice}
                  onChange={(e) => setFilterMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="w-full bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            {/* Certifications */}
            <p className="mb-2 text-[13px] font-semibold text-stone-950">Certificaciones</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {CERTIFICATION_OPTIONS.map(cert => {
                const isActive = filterCerts.includes(cert.value);
                return (
                  <button
                    key={cert.value}
                    type="button"
                    onClick={() => toggleFilterCert(cert.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      isActive ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'
                    }`}
                  >
                    {isActive && <Check size={12} />}
                    {cert.label}
                  </button>
                );
              })}
            </div>

            {/* Toggles */}
            <div className="mb-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-950">Solo en stock</span>
                <ToggleSwitch checked={filterInStock} onChange={setFilterInStock} label="Solo en stock" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-stone-950">Envio gratis</span>
                <ToggleSwitch checked={filterFreeShipping} onChange={setFilterFreeShipping} label="Envio gratis" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="w-full rounded-full bg-stone-950 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
              >
                Aplicar filtros
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-sm text-stone-500 transition-colors hover:text-stone-700"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* ── Results column ── */}
        <div className="lg:flex-1 min-w-0">

        {/* ── Tab pills (same style as Discover filter pills) ── */}
        {!loading && hasResults && (
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {TABS.map(tab => {
              const count = tab.key === 'all' ? totalCount : counts[tab.key] || 0;
              if (tab.key !== 'all' && count === 0) return null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={pillCls(activeTab === tab.key)}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1 min-w-[16px] rounded-full px-1 text-center text-[10px] font-bold ${
                      activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Sort pills ── */}
        {!loading && hasResults && (activeTab === 'all' || activeTab === 'products') && counts.products > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={pillCls(sortBy === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Live region for screen readers ── */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {!loading && results && (hasResults ? `${totalCount} resultados encontrados` : `Sin resultados para ${query}`)}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="pt-2">
            <div className="mb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {[0, 1, 2, 3].map(i => <CardSkeleton key={i} />)}
            </div>
            {[0, 1, 2].map(i => <RowSkeleton key={i} />)}
          </div>
        )}

        {/* ── No results ── */}
        {!loading && results && !hasResults && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center px-4 py-16 text-center"
          >
            <Search size={48} className="text-stone-300" strokeWidth={1.5} />
            <p className="mt-4 text-base font-semibold text-stone-950">Sin resultados para &ldquo;{query}&rdquo;</p>
            <p className="mt-1 mb-6 text-sm text-stone-500">
              Prueba con otros términos o revisa la ortografía
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Aceite de oliva', 'Jamón ibérico', 'Vino tinto'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className={pillCls(false)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Results — same 3-col grid as Discover ── */}
        {!loading && hasResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
            {showProducts && (
              <section>
                <SectionHeader icon={ShoppingBag} label="Productos" count={counts.products} />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {sortedProducts.map(p => <ProductCardLocal key={p.product_id || p.id} p={p} />)}
                </div>
              </section>
            )}
            {showRecipes && (
              <section>
                <SectionHeader icon={ChefHat} label="Recetas" count={counts.recipes} />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {results.recipes.map(r => <RecipeCard key={r.recipe_id || r.id} r={r} />)}
                </div>
              </section>
            )}
            {showCreators && (
              <section>
                <SectionHeader icon={Users} label="Creadores" count={counts.creators} />
                {results.creators.map(c => <PersonRow key={c.user_id || c.id} person={c} linkBase="/user/" />)}
              </section>
            )}
            {showStores && (
              <section>
                <SectionHeader icon={Store} label="Tiendas" count={counts.stores} />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {results.stores.map(s => <PersonRow key={s.store_id || s.id} person={s} linkBase="/store/" />)}
                </div>
              </section>
            )}
          </motion.div>
        )}

        {/* ── Empty state: history + trending ── */}
        {!loading && isEmpty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
            {history.length > 0 && (
              <section className="pt-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-stone-950">Recientes</span>
                  <button onClick={handleClearHistory} className="px-2 text-xs text-stone-400">
                    Borrar todo
                  </button>
                </div>
                <div className="flex flex-col">
                  {history.map(term => (
                    <div key={term} className="flex items-center border-b border-stone-100 last:border-b-0">
                      <button
                        onClick={() => handleHistoryClick(term)}
                        className="flex flex-1 items-center gap-3 py-3 text-left"
                      >
                        <Clock size={16} className="shrink-0 text-stone-400" />
                        <span className="text-sm text-stone-950">{term}</span>
                      </button>
                      <button
                        onClick={() => handleRemoveHistoryItem(term)}
                        aria-label={`Eliminar ${term} del historial`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-stone-100"
                      >
                        <X size={14} className="text-stone-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {trendingHashtags.length > 0 && (
              <section className="pt-6">
                <span className="mb-3 block text-[13px] font-bold text-stone-950">Tendencias</span>
                <div className="flex flex-col">
                  {trendingHashtags.map((item, i) => {
                    const tagName = item.tag || item.hashtag || item.name || '';
                    const count = item.post_count || item.count || 0;
                    return (
                      <button
                        key={tagName + i}
                        onClick={() => navigate(`/hashtag/${encodeURIComponent(tagName)}`)}
                        className="flex items-center gap-3 py-3 text-left border-b border-stone-100 last:border-b-0"
                      >
                        <Hash size={16} className="shrink-0 text-stone-400" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-stone-950">#{tagName}</span>
                          {count > 0 && (
                            <span className="ml-2 text-xs text-stone-500">{count} publicaciones</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="pt-6">
              <span className="mb-3 block text-[13px] font-bold text-stone-950">Búsquedas populares</span>
              <div className="flex flex-col">
                {trending.map((term, i) => (
                  <button
                    key={term}
                    onClick={() => { setQuery(term); saveHistory(term); setHistory(getHistory()); executeSearch(term); }}
                    className="flex items-center gap-3 py-3 text-left border-b border-stone-100 last:border-b-0"
                  >
                    <TrendingUp size={16} className="shrink-0 text-stone-300" />
                    <span className="text-sm text-stone-950 capitalize">{term}</span>
                  </button>
                ))}
              </div>
            </section>
          </motion.div>
        )}
        </div>{/* end results column */}
      </div>
    </div>
  );
}
