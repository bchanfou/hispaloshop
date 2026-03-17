import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowLeft, X, ChefHat, ShoppingBag, Store, Users, Clock, TrendingUp } from 'lucide-react';
import apiClient from '../services/api/client';
import SEO from '../components/SEO';

const font = { fontFamily: 'var(--font-sans)' };
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

const TABS = [
  { key: 'all', label: 'Todo' },
  { key: 'products', label: 'Productos', icon: ShoppingBag },
  { key: 'recipes', label: 'Recetas', icon: ChefHat },
  { key: 'stores', label: 'Tiendas', icon: Store },
  { key: 'creators', label: 'Creadores', icon: Users },
];

/* ── Skeleton ── */
function CardSkeleton() {
  return (
    <div style={{
      borderRadius: 'var(--radius-xl)', overflow: 'hidden',
      background: 'var(--color-surface)',
    }}>
      <div style={{ aspectRatio: '1', background: 'var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ padding: 12 }}>
        <div style={{ height: 12, borderRadius: 6, background: 'var(--color-border)', width: '75%', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 12, borderRadius: 6, background: 'var(--color-surface)', width: '33%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-border)', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, borderRadius: 6, background: 'var(--color-border)', width: '66%', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 12, borderRadius: 6, background: 'var(--color-surface)', width: '33%', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

/* ── Result Components ── */
function ProductCard({ p }) {
  return (
    <Link to={`/products/${p.product_id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        border: '1px solid var(--color-border)', background: 'var(--color-white)',
        transition: 'box-shadow 0.2s',
      }}>
        <div style={{ aspectRatio: '1', background: 'var(--color-surface)', overflow: 'hidden' }}>
          {p.images?.[0] ? (
            <img src={p.images[0]} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={32} color="var(--color-stone)" />
            </div>
          )}
        </div>
        <div style={{ padding: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {p.name}
          </p>
          {p.price != null && (
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-black)', margin: '4px 0 0' }}>
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
    <Link to={`/recipes/${r.recipe_id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        border: '1px solid var(--color-border)', background: 'var(--color-white)',
      }}>
        <div style={{ aspectRatio: '1', background: 'var(--color-surface)', overflow: 'hidden' }}>
          {r.cover_image ? (
            <img src={r.cover_image} alt={r.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChefHat size={32} color="var(--color-stone)" />
            </div>
          )}
        </div>
        <div style={{ padding: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-black)', margin: 0, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {r.title}
          </p>
          {r.prep_time_minutes && (
            <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: '4px 0 0' }}>{r.prep_time_minutes} min</p>
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
    <Link to={`${linkBase}${person.slug || person.store_slug || id}`} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      textDecoration: 'none', borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: isStore ? 'var(--radius-lg)' : '50%',
        background: 'var(--color-surface)', flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {img ? (
          <img src={img} alt={name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : isStore ? (
          <Store size={18} color="var(--color-stone)" />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-stone)' }}>{name[0].toUpperCase()}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-black)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </p>
        {sub && (
          <p style={{ fontSize: 12, color: 'var(--color-stone)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sub}
          </p>
        )}
      </div>
      {person.followers_count > 0 && (
        <span style={{ fontSize: 12, color: 'var(--color-stone)', flexShrink: 0 }}>{person.followers_count} seg.</span>
      )}
    </Link>
  );
}

function SectionHeader({ icon: Icon, label, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color="var(--color-stone)" />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-black)' }}>{label}</span>
      </div>
      {count > 0 && (
        <span style={{ fontSize: 12, color: 'var(--color-stone)' }}>{count} resultados</span>
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
  const [sortBy, setSortBy] = useState('relevance'); // relevance | price_asc | price_desc | newest
  const [trending, setTrending] = useState(TRENDING_FALLBACK);

  const isEmpty = !query.trim();

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fetch trending terms from API
  useEffect(() => {
    apiClient.get('/discovery/trending', { params: { type: 'products', limit: 8 } })
      .then((data) => {
        const terms = (data?.items || data || [])
          .map(item => item.name || item.title || item.query)
          .filter(Boolean);
        if (terms.length > 0) setTrending(terms);
      })
      .catch(() => { /* keep fallback */ });
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiClient.get('/search', { params: { q: query.trim(), limit: 8 } });
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

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    saveHistory(query.trim());
    setHistory(getHistory());
  }, [query]);

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
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', ...font }}>
      <SEO title="Buscar — Hispaloshop" description="Busca productos artesanales, recetas, tiendas y creadores de alimentación saludable local." />
      {/* ── Search Bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: '10px 16px',
      }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
          >
            <ArrowLeft size={22} color="var(--color-black)" />
          </button>

          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--color-surface)', borderRadius: 'var(--radius-full, 999px)',
            padding: '8px 14px',
          }}>
            <Search size={16} color="var(--color-stone)" style={{ flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos, recetas, tiendas..."
              autoComplete="off"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontSize: 14, color: 'var(--color-black)', ...font,
              }}
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}
                >
                  <X size={16} color="var(--color-stone)" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px' }}>

        {/* ── Tabs (when results exist) ── */}
        {!loading && hasResults && (
          <div style={{
            display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)',
            overflowX: 'auto', marginTop: 4,
          }}>
            {TABS.map(tab => {
              const active = activeTab === tab.key;
              const count = tab.key === 'all' ? totalCount : counts[tab.key] || 0;
              if (tab.key !== 'all' && count === 0) return null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '10px 14px', fontSize: 13, fontWeight: active ? 700 : 500,
                    color: active ? 'var(--color-black)' : 'var(--color-stone)',
                    borderBottom: active ? '2px solid var(--color-black)' : '2px solid transparent',
                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
                    ...font,
                  }}
                >
                  {tab.label}
                  {count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      background: active ? 'var(--color-black)' : 'var(--color-surface)',
                      color: active ? 'var(--color-white)' : 'var(--color-stone)',
                      borderRadius: 'var(--radius-full, 999px)',
                      padding: '1px 6px', minWidth: 18, textAlign: 'center',
                    }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Sort bar (when products visible) ── */}
        {!loading && hasResults && (activeTab === 'all' || activeTab === 'products') && counts.products > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 0' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: 'var(--color-surface)', border: 'none',
                borderRadius: 'var(--radius-full, 999px)',
                padding: '6px 12px', fontSize: 12, fontWeight: 500,
                color: 'var(--color-black)', cursor: 'pointer', ...font,
                outline: 'none',
              }}
            >
              <option value="relevance">Relevancia</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="newest">Más recientes</option>
            </select>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ paddingTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
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
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', textAlign: 'center' }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <Search size={24} color="var(--color-stone)" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-black)', margin: '0 0 4px' }}>Sin resultados</p>
            <p style={{ fontSize: 14, color: 'var(--color-stone)', margin: 0, lineHeight: 1.5 }}>
              No encontramos nada para <strong>"{query}"</strong>. Prueba con otro término.
            </p>
          </motion.div>
        )}

        {/* ── Results ── */}
        {!loading && hasResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: 80 }}>
            {showProducts && (
              <section>
                <SectionHeader icon={ShoppingBag} label="Productos" count={counts.products} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[...results.products].sort((a, b) => {
                    if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
                    if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
                    if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                    return 0; // relevance = API order
                  }).map(p => <ProductCard key={p.product_id} p={p} />)}
                </div>
              </section>
            )}
            {showRecipes && (
              <section>
                <SectionHeader icon={ChefHat} label="Recetas" count={counts.recipes} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: 80 }}>
            {history.length > 0 && (
              <section style={{ paddingTop: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="var(--color-stone)" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-black)' }}>Recientes</span>
                  </div>
                  <button
                    onClick={handleClearHistory}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-stone)', ...font }}
                  >
                    Borrar
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {history.map(term => (
                    <button
                      key={term}
                      onClick={() => handleHistoryClick(term)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', background: 'var(--color-surface)',
                        borderRadius: 'var(--radius-full, 999px)',
                        border: 'none', fontSize: 13, color: 'var(--color-black)',
                        cursor: 'pointer', ...font,
                      }}
                    >
                      <Clock size={12} color="var(--color-stone)" />
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section style={{ paddingTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <TrendingUp size={16} color="var(--color-stone)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-black)' }}>Tendencias</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {trending.map(term => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    style={{
                      padding: '7px 14px', background: 'var(--color-white)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-full, 999px)',
                      fontSize: 13, color: 'var(--color-black)',
                      cursor: 'pointer', textTransform: 'capitalize', ...font,
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </section>
          </motion.div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
    </div>
  );
}
