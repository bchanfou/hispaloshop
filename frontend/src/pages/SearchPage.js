import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, X, ChefHat, ShoppingBag, Store, Users, Clock, TrendingUp } from 'lucide-react';
import apiClient from '../services/api/client';

const HISTORY_KEY = 'hispal_search_history';
const MAX_HISTORY = 8;

// ── Local history helpers ────────────────────────────────────────
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(q) {
  const prev = getHistory().filter((x) => x !== q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...prev].slice(0, MAX_HISTORY)));
}
function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// ── Skeletons ────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="animate-pulse bg-stone-100 rounded-2xl overflow-hidden">
      <div className="aspect-square bg-stone-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-stone-200 rounded-full w-3/4" />
        <div className="h-3 bg-stone-100 rounded-full w-1/3" />
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-stone-200 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-stone-200 rounded-full w-2/3" />
        <div className="h-3 bg-stone-100 rounded-full w-1/3" />
      </div>
    </div>
  );
}

// ── Result cards ─────────────────────────────────────────────────
function ProductCard({ p }) {
  return (
    <Link to={`/products/${p.product_id}`} className="group">
      <div className="rounded-2xl overflow-hidden border border-stone-100 hover:shadow-md transition-shadow bg-white">
        <div className="aspect-square bg-stone-50">
          {p.images?.[0] ? (
            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-stone-300" />
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-stone-950 line-clamp-2 leading-snug">{p.name}</p>
          {p.price != null && (
            <p className="text-sm font-semibold text-stone-950 mt-1">
              {p.price.toFixed(2)} {p.currency || 'EUR'}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function RecipeCard({ r }) {
  return (
    <Link to={`/recipes/${r.recipe_id}`} className="group">
      <div className="rounded-2xl overflow-hidden border border-stone-100 hover:shadow-md transition-shadow bg-white">
        <div className="aspect-square bg-stone-50">
          {r.cover_image ? (
            <img src={r.cover_image} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-stone-300" />
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-stone-950 line-clamp-2 leading-snug">{r.title}</p>
          {r.prep_time_minutes && (
            <p className="text-xs text-stone-400 mt-1">{r.prep_time_minutes} min</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function CreatorRow({ c }) {
  return (
    <Link to={`/user/${c.user_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
      <div className="w-11 h-11 rounded-full bg-stone-200 overflow-hidden flex-shrink-0">
        {c.profile_image ? (
          <img src={c.profile_image} alt={c.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-500 font-semibold text-sm">
            {(c.name || 'U')[0].toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-950 truncate">{c.name}</p>
        {c.username && <p className="text-xs text-stone-400 truncate">@{c.username}</p>}
      </div>
      {c.followers_count > 0 && (
        <span className="text-xs text-stone-400 flex-shrink-0">{c.followers_count} seg.</span>
      )}
    </Link>
  );
}

function StoreRow({ s }) {
  const storeIdentifier = s.slug || s.store_slug || s.store_id;

  return (
    <Link to={`/store/${storeIdentifier}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors">
      <div className="w-11 h-11 rounded-xl bg-stone-200 overflow-hidden flex-shrink-0">
        {s.profile_image || s.cover_image ? (
          <img src={s.profile_image || s.cover_image} alt={s.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store className="w-5 h-5 text-stone-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-950 truncate">{s.name}</p>
        {s.location && <p className="text-xs text-stone-400 truncate">{s.location}</p>}
      </div>
    </Link>
  );
}

// ── Section header ────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, count }) {
  return (
    <div className="flex items-center justify-between px-4 pb-3 pt-6">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-stone-400" strokeWidth={1.8} />
        <span className="text-sm font-semibold text-stone-950">{label}</span>
      </div>
      {count > 0 && (
        <span className="text-xs text-stone-400">{count} resultados</span>
      )}
    </div>
  );
}

// ── TRENDING placeholder ──────────────────────────────────────────
const TRENDING = ['aceite de oliva', 'gazpacho', 'ibérico', 'queso manchego', 'almendra', 'azafrán'];

// ── Main page ─────────────────────────────────────────────────────
export default function SearchPage() {
  const navigate      = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef      = useRef(null);

  const [query,   setQuery]   = useState(searchParams.get('q') || '');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(getHistory);

  const isEmpty = !query.trim();

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiClient.get('/search', {
          params: { q: query.trim(), limit: 8 },
        });
        setResults(data);
        setSearchParams({ q: query.trim() }, { replace: true });
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [query, setSearchParams]);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      if (!query.trim()) return;
      saveHistory(query.trim());
      setHistory(getHistory());
    },
    [query],
  );

  const handleHistoryClick = (term) => {
    setQuery(term);
    saveHistory(term);
    setHistory(getHistory());
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const hasResults = results && (
    results.products?.length  > 0 ||
    results.recipes?.length   > 0 ||
    results.stores?.length    > 0 ||
    results.creators?.length  > 0
  );

  return (
    <div className="min-h-screen bg-white max-w-2xl mx-auto">

      {/* ── Search bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-100 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="p-2 -ml-1 hover:bg-stone-100 rounded-full transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-stone-700" />
          </button>

          <div className="flex-1 flex items-center gap-2 bg-stone-100 rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos, recetas, tiendas..."
              className="flex-1 bg-transparent text-sm text-stone-950 placeholder:text-stone-400 outline-none"
              autoComplete="off"
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  key="clear"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  type="button"
                  onClick={() => { setQuery(''); setResults(null); setSearchParams({}); inputRef.current?.focus(); }}
                  className="flex-shrink-0 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>

      {/* ── Loading ────────────────────────────────────────────── */}
      {loading && (
        <div className="px-4 py-4 space-y-6">
          <div>
            <div className="h-4 bg-stone-100 rounded-full w-28 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[0,1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          </div>
          <div>
            <div className="h-4 bg-stone-100 rounded-full w-24 mb-2" />
            {[0,1,2].map(i => <RowSkeleton key={i} />)}
          </div>
        </div>
      )}

      {/* ── No results ─────────────────────────────────────────── */}
      {!loading && results && !hasResults && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center py-20 px-8 text-center"
        >
          <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-stone-400" />
          </div>
          <p className="text-base font-semibold text-stone-950 mb-1">Sin resultados</p>
          <p className="text-sm text-stone-500 leading-relaxed">
            No encontramos nada para <span className="font-medium">"{query}"</span>.
            Prueba con otro término.
          </p>
        </motion.div>
      )}

      {/* ── Search results ─────────────────────────────────────── */}
      {!loading && hasResults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">

          {/* Products */}
          {results.products?.length > 0 && (
            <section>
              <SectionHeader icon={ShoppingBag} label="Productos" count={results.products.length} />
              <div className="grid grid-cols-2 gap-3 px-4">
                {results.products.map((p) => (
                  <ProductCard key={p.product_id} p={p} />
                ))}
              </div>
            </section>
          )}

          {/* Recipes */}
          {results.recipes?.length > 0 && (
            <section>
              <SectionHeader icon={ChefHat} label="Recetas" count={results.recipes.length} />
              <div className="grid grid-cols-2 gap-3 px-4">
                {results.recipes.map((r) => (
                  <RecipeCard key={r.recipe_id} r={r} />
                ))}
              </div>
            </section>
          )}

          {/* Creators */}
          {results.creators?.length > 0 && (
            <section>
              <SectionHeader icon={Users} label="Creadores" count={results.creators.length} />
              <div className="border-t border-stone-50">
                {results.creators.map((c) => (
                  <CreatorRow key={c.user_id} c={c} />
                ))}
              </div>
            </section>
          )}

          {/* Stores */}
          {results.stores?.length > 0 && (
            <section>
              <SectionHeader icon={Store} label="Tiendas" count={results.stores.length} />
              <div className="border-t border-stone-50">
                {results.stores.map((s) => (
                  <StoreRow key={s.store_id} s={s} />
                ))}
              </div>
            </section>
          )}
        </motion.div>
      )}

      {/* ── Empty state: history + trending ────────────────────── */}
      {!loading && isEmpty && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">

          {/* Search history */}
          {history.length > 0 && (
            <section className="px-4 pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-stone-400" strokeWidth={1.8} />
                  <span className="text-sm font-semibold text-stone-950">Recientes</span>
                </div>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                >
                  Borrar
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleHistoryClick(term)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 rounded-full text-sm text-stone-700 hover:bg-stone-200 transition-colors"
                  >
                    <Clock className="w-3 h-3 text-stone-400" />
                    {term}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Trending */}
          <section className="px-4 pt-8">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-stone-400" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-stone-950">Tendencias</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="px-3.5 py-2 bg-white border border-stone-200 rounded-full text-sm text-stone-700 hover:border-stone-400 hover:bg-stone-50 transition-colors capitalize"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
        </motion.div>
      )}
    </div>
  );
}
