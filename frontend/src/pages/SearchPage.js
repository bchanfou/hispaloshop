import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, X, ChefHat, ShoppingBag, Store, Users, Clock, TrendingUp, UserPlus } from 'lucide-react';
import apiClient from '../services/api/client';
import SEO from '../components/SEO';
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

function SuggestedPeopleSection() {
  const [people, setPeople] = React.useState([]);
  const [followedIds, setFollowedIds] = React.useState(new Set());

  React.useEffect(() => {
    let active = true;
    apiClient.get('/discovery/suggested-users?context=search&limit=6')
      .then(data => { if (active) setPeople(data?.users || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (people.length === 0) return null;

  const handleFollow = async (userId) => {
    try {
      if (followedIds.has(userId)) {
        await apiClient.delete(`/users/${userId}/follow`);
        setFollowedIds(prev => { const s = new Set(prev); s.delete(userId); return s; });
      } else {
        await apiClient.post(`/users/${userId}/follow`, {});
        setFollowedIds(prev => new Set([...prev, userId]));
      }
    } catch { /* ignore */ }
  };

  return (
    <section className="pt-6">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-stone-500" />
          <span className="text-[13px] font-bold text-stone-950">Personas populares</span>
        </div>
        <Link to="/discover/people" className="text-[12px] font-semibold text-stone-500 no-underline hover:text-stone-700">
          Ver todos
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {people.map(u => {
          const isFollowed = followedIds.has(u.user_id);
          return (
            <div key={u.user_id} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
              <Link to={`/user/${u.username || u.user_id}`} className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-stone-100 block">
                {u.profile_image ? (
                  <img src={u.profile_image} alt={u.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-stone-400">{(u.name || '?')[0].toUpperCase()}</div>
                )}
              </Link>
              <Link to={`/user/${u.username || u.user_id}`} className="min-w-0 flex-1 no-underline">
                <p className="truncate text-[13px] font-semibold text-stone-950">{u.name}</p>
                <span className="text-[10px] text-stone-500">{ROLE_LABELS[u.role] || u.role}</span>
              </Link>
              <button
                onClick={() => handleFollow(u.user_id)}
                className={`min-h-[36px] shrink-0 rounded-full px-3.5 text-[11px] font-semibold border-none cursor-pointer transition-colors ${
                  isFollowed ? 'bg-stone-100 text-stone-500 hover:bg-stone-200' : 'bg-stone-950 text-white hover:bg-stone-800'
                }`}
              >
                {isFollowed ? 'Siguiendo' : 'Seguir'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const TABS = [
  { key: 'all', label: 'Todo' },
  { key: 'products', label: 'Productos', icon: ShoppingBag },
  { key: 'recipes', label: 'Recetas', icon: ChefHat },
  { key: 'stores', label: 'Tiendas', icon: Store },
  { key: 'creators', label: 'Personas', icon: Users },
];

/* ── Skeleton ── */
function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-stone-100">
      <div className="aspect-square animate-pulse bg-stone-200" />
      <div className="p-3">
        <div className="mb-2 h-3 w-3/4 animate-pulse rounded-md bg-stone-200" />
        <div className="h-3 w-1/3 animate-pulse rounded-md bg-stone-100" />
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-stone-200" />
      <div className="flex-1">
        <div className="mb-1.5 h-3.5 w-2/3 animate-pulse rounded-md bg-stone-200" />
        <div className="h-3 w-1/3 animate-pulse rounded-md bg-stone-100" />
      </div>
    </div>
  );
}

/* ── Result Components ── */
function ProductCard({ p }) {
  return (
    <Link to={`/products/${p.product_id || p.id}`} className="block no-underline">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white transition-shadow">
        <div className="aspect-square overflow-hidden bg-stone-100">
          {p.images?.[0] ? (
            <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ShoppingBag size={32} className="text-stone-500" />
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="line-clamp-2 text-[13px] font-medium leading-tight text-stone-950">
            {p.name}
          </p>
          {p.price != null && (
            <p className="mt-1 text-[13px] font-bold text-stone-950">
              {Number(p.price).toFixed(2)} {p.currency || 'EUR'}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function RecipeCard({ r }) {
  return (
    <Link to={`/recipes/${r.recipe_id || r.id}`} className="block no-underline">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="aspect-square overflow-hidden bg-stone-100">
          {r.cover_image ? (
            <img src={r.cover_image} alt={r.title} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ChefHat size={32} className="text-stone-500" />
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="line-clamp-2 text-[13px] font-medium leading-tight text-stone-950">
            {r.title}
          </p>
          {r.prep_time_minutes && (
            <p className="mt-1 text-xs text-stone-500">{r.prep_time_minutes} min</p>
          )}
        </div>
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
    <Link to={`${linkBase}${person.slug || person.store_slug || id}`} className="flex items-center gap-3 border-b border-stone-200 py-2.5 no-underline">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-stone-100 ${isStore ? 'rounded-lg' : 'rounded-full'}`}>
        {img ? (
          <img src={img} alt={name} loading="lazy" className="h-full w-full object-cover" />
        ) : isStore ? (
          <Store size={18} className="text-stone-500" />
        ) : (
          <span className="text-sm font-semibold text-stone-500">{(name[0] || '?').toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-stone-950">{name}</p>
        {sub && <p className="mt-0.5 truncate text-xs text-stone-500">{sub}</p>}
      </div>
      {person.followers_count > 0 && (
        <span className="shrink-0 text-xs text-stone-500">{person.followers_count} seg.</span>
      )}
    </Link>
  );
}

function SectionHeader({ icon: Icon, label, count }) {
  return (
    <div className="flex items-center justify-between pb-2.5 pt-5">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-stone-500" />
        <span className="text-[13px] font-bold text-stone-950">{label}</span>
      </div>
      {count > 0 && (
        <span className="text-xs text-stone-500">{count} resultados</span>
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

  const showProducts = (activeTab === 'all' || activeTab === 'products') && counts.products > 0;
  const showRecipes = (activeTab === 'all' || activeTab === 'recipes') && counts.recipes > 0;
  const showStores = (activeTab === 'all' || activeTab === 'stores') && counts.stores > 0;
  const showCreators = (activeTab === 'all' || activeTab === 'creators') && counts.creators > 0;

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO title="Buscar — Hispaloshop" description="Busca productos artesanales, recetas, tiendas y creadores de alimentación saludable local." />

      {/* ── Search Bar ── */}
      <div className="sticky top-0 z-40 border-b border-stone-200 bg-white px-4 py-2.5">
        <form onSubmit={handleSubmit} role="search" aria-label="Buscar en Hispaloshop" className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => { window.history.length > 1 ? navigate(-1) : navigate('/discover'); }}
            aria-label="Volver"
            className="flex h-11 w-11 shrink-0 items-center justify-center"
          >
            <ArrowLeft size={22} className="text-stone-950" />
          </button>

          <div className="flex flex-1 items-center gap-2 rounded-full bg-stone-100 px-3.5 py-2">
            <Search size={16} className="shrink-0 text-stone-500" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos, recetas, tiendas..."
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
                  className="flex h-8 w-8 shrink-0 items-center justify-center"
                >
                  <X size={16} className="text-stone-500" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>

      <div className="mx-auto max-w-[600px] px-4">

        {/* ── Tabs ── */}
        {!loading && hasResults && (
          <div className="mt-1 flex overflow-x-auto border-b border-stone-200">
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              const count = tab.key === 'all' ? totalCount : counts[tab.key] || 0;
              if (tab.key !== 'all' && count === 0) return null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex cursor-pointer items-center gap-1 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13px] ${
                    active
                      ? 'border-stone-950 font-bold text-stone-950'
                      : 'border-transparent font-medium text-stone-500'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`min-w-[18px] rounded-full px-1.5 py-px text-center text-[10px] font-bold ${
                      active ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Sort bar ── */}
        {!loading && hasResults && (activeTab === 'all' || activeTab === 'products') && counts.products > 1 && (
          <div className="flex items-center justify-end py-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Ordenar resultados"
              className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-950 outline-none"
            >
              <option value="relevance">Relevancia</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="newest">Más recientes</option>
            </select>
          </div>
        )}

        {/* ── Live region for screen readers ── */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {!loading && results && (hasResults ? `${totalCount} resultados encontrados` : `Sin resultados para ${query}`)}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="pt-4">
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            className="flex flex-col items-center px-5 py-16 text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
              <Search size={24} className="text-stone-500" />
            </div>
            <p className="mb-1 text-base font-semibold text-stone-950">Sin resultados</p>
            <p className="text-sm leading-relaxed text-stone-500">
              No encontramos nada para <strong>"{query}"</strong>. Prueba con otro término.
            </p>
          </motion.div>
        )}

        {/* ── Results ── */}
        {!loading && hasResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
            {showProducts && (
              <section>
                <SectionHeader icon={ShoppingBag} label="Productos" count={counts.products} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[...results.products].sort((a, b) => {
                    if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
                    if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
                    if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    return 0;
                  }).map(p => <ProductCard key={p.product_id} p={p} />)}
                </div>
              </section>
            )}
            {showRecipes && (
              <section>
                <SectionHeader icon={ChefHat} label="Recetas" count={counts.recipes} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {results.recipes.map(r => <RecipeCard key={r.recipe_id} r={r} />)}
                </div>
              </section>
            )}
            {showCreators && (
              <section>
                <SectionHeader icon={Users} label="Creadores" count={counts.creators} />
                {results.creators.map(c => <PersonRow key={c.user_id} person={c} linkBase="/user/" />)}
              </section>
            )}
            {showStores && (
              <section>
                <SectionHeader icon={Store} label="Tiendas" count={counts.stores} />
                {results.stores.map(s => <PersonRow key={s.store_id} person={s} linkBase="/store/" />)}
              </section>
            )}
          </motion.div>
        )}

        {/* ── Empty state: history + trending ── */}
        {!loading && isEmpty && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
            {history.length > 0 && (
              <section className="pt-5">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-stone-500" />
                    <span className="text-[13px] font-bold text-stone-950">Recientes</span>
                  </div>
                  <button onClick={handleClearHistory} className="min-h-[44px] px-2 text-xs text-stone-500">
                    Borrar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map(term => (
                    <button
                      key={term}
                      onClick={() => handleHistoryClick(term)}
                      className="flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-none bg-stone-100 px-3.5 py-2.5 text-[13px] text-stone-950"
                    >
                      <Clock size={12} className="text-stone-500" />
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="pt-6">
              <div className="mb-2.5 flex items-center gap-2">
                <TrendingUp size={16} className="text-stone-500" />
                <span className="text-[13px] font-bold text-stone-950">Tendencias</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trending.map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="min-h-[44px] cursor-pointer rounded-full border border-stone-200 bg-white px-3.5 py-2.5 text-[13px] capitalize text-stone-950"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>

            <SuggestedPeopleSection />
          </motion.div>
        )}
      </div>
    </div>
  );
}
