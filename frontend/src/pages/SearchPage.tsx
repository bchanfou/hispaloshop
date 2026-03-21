// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, X, ChefHat, ShoppingBag, Store, Users, Clock, TrendingUp, Hash } from 'lucide-react';
import apiClient from '../services/api/client';
import { useLocale } from '../context/LocaleContext';
import SEO from '../components/SEO';
import SlideTabIndicator from '../components/motion/SlideTabIndicator';
import { toast } from 'sonner';

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
  { key: 'recipes', label: 'Recetas', icon: ChefHat },
  { key: 'stores', label: 'Tiendas', icon: Store },
  { key: 'creators', label: 'Personas', icon: Users },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'newest', label: 'Más reciente' },
];

/* ── Skeleton ── */
function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-stone-100">
      <div className="animate-pulse bg-stone-200" style={{ aspectRatio: '4/5' }} />
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
    <Link to={`/products/${p.product_id || p.id}`} className="group block overflow-hidden rounded-2xl bg-white no-underline" style={{ border: '0.5px solid #e7e5e4' }}>
      <div className="overflow-hidden bg-stone-100" style={{ aspectRatio: '4/5' }}>
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
    <Link to={`/recipes/${r.recipe_id || r.id}`} className="group block overflow-hidden rounded-2xl bg-white no-underline" style={{ border: '0.5px solid #e7e5e4' }}>
      <div className="overflow-hidden bg-stone-100" style={{ aspectRatio: '4/5' }}>
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
  const [trending, setTrending] = useState(TRENDING_FALLBACK);
  const searchIdRef = useRef(0);

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
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const reqId = ++searchIdRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const sortParam = sortBy !== 'relevance' ? sortBy : undefined;
        const data = await apiClient.get('/search', { params: { q: query.trim(), limit: 8, sort: sortParam } });
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
  }, [query, sortBy, setSearchParams]);

  const executeSearch = useCallback(async (q) => {
    const reqId = ++searchIdRef.current;
    setLoading(true);
    try {
      const sortParam = sortBy !== 'relevance' ? sortBy : undefined;
      const data = await apiClient.get('/search', { params: { q, limit: 8, sort: sortParam } });
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
  }, [sortBy, setSearchParams]);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    saveHistory(query.trim());
    setHistory(getHistory());
    executeSearch(query.trim());
  }, [query, executeSearch]);

  const handleHistoryClick = (term) => {
    setQuery(term);
    saveHistory(term);
    setHistory(getHistory());
    executeSearch(term);
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
        <form onSubmit={handleSubmit} role="search" aria-label="Buscar en Hispaloshop" className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { window.history.length > 1 ? navigate(-1) : navigate('/discover'); }}
            aria-label="Volver"
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <ArrowLeft size={20} className="text-stone-950" />
          </button>

          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-stone-100 border-none px-4 py-3">
            <Search size={16} className="shrink-0 text-stone-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              autoComplete="off"
              className="flex-1 bg-transparent text-sm text-stone-950 outline-none placeholder:text-stone-400"
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
        </form>
      </div>

      <div className="mx-auto max-w-[600px] px-3">

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
            <div className="mb-4 grid grid-cols-2 gap-2">
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
            <Search size={48} className="text-stone-300" />
            <p className="mt-4 text-lg font-semibold text-stone-950">Sin resultados para "{query}"</p>
            <p className="mt-1 mb-6 text-sm text-stone-500">
              Prueba con otro término
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
                <div className="grid grid-cols-3 gap-2">
                  {sortedProducts.map(p => <ProductCardLocal key={p.product_id || p.id} p={p} />)}
                </div>
              </section>
            )}
            {showRecipes && (
              <section>
                <SectionHeader icon={ChefHat} label="Recetas" count={counts.recipes} />
                <div className="grid grid-cols-3 gap-2">
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
                {results.stores.map(s => <PersonRow key={s.store_id || s.id} person={s} linkBase="/store/" />)}
              </section>
            )}
          </motion.div>
        )}

        {/* ── Empty state: history + trending ── */}
        {!loading && isEmpty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
            {history.length > 0 && (
              <section className="pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-stone-950">Recientes</span>
                  <button onClick={handleClearHistory} className="px-2 text-xs text-stone-400">
                    Borrar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map(term => (
                    <button
                      key={term}
                      onClick={() => handleHistoryClick(term)}
                      className={pillCls(false) + ' gap-1.5'}
                    >
                      <Clock size={12} className="text-stone-400" />
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="pt-6">
              <span className="mb-3 block text-[13px] font-bold text-stone-950">Tendencias</span>
              <div className="flex flex-col">
                {trending.map((term, i) => (
                  <button
                    key={term}
                    onClick={() => { setQuery(term); saveHistory(term); setHistory(getHistory()); executeSearch(term); }}
                    className="flex items-center gap-3 py-3 text-left border-b border-stone-100 last:border-b-0"
                  >
                    <Hash size={16} className="shrink-0 text-stone-300" />
                    <span className="text-sm text-stone-950 capitalize">{term}</span>
                  </button>
                ))}
              </div>
            </section>
          </motion.div>
        )}
      </div>
    </div>
  );
}
