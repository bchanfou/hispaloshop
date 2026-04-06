import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FocusTrap from 'focus-trap-react';
import { Search, X, Users, Store, Hash, ShoppingBag, ChefHat, Loader2, Clock, TrendingUp, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { trackEvent } from '../utils/analytics';

const HISTORY_KEY = 'hispal_search_history';
const MAX_HISTORY = 10;

const TABS = [
  { key: 'all', label: 'Todo' },
  { key: 'products', label: 'Productos', icon: ShoppingBag },
  { key: 'stores', label: 'Tiendas', icon: Store },
  { key: 'users', label: 'Personas', icon: Users },
  { key: 'communities', label: 'Comunidades', icon: Users },
  { key: 'recipes', label: 'Recetas', icon: ChefHat },
  { key: 'hashtags', label: 'Hashtags', icon: Hash },
];

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').slice(0, MAX_HISTORY); } catch { return []; }
}
function saveToHistory(q) {
  if (!q || q.length < 2) return;
  const prev = getHistory().filter(h => h !== q);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([q, ...prev].slice(0, MAX_HISTORY)));
}
function removeFromHistory(q) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(getHistory().filter(h => h !== q)));
}

export default function GlobalSearch() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [history, setHistory] = useState(getHistory);
  const [trending, setTrending] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        if (!open) trackEvent('global_search_opened', { trigger: 'keyboard' });
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => { if (open) { inputRef.current?.focus(); setHistory(getHistory()); } }, [open]);

  // Load trending on open
  useEffect(() => {
    if (!open || trending.length) return;
    apiClient.get('/search/trending').then(d => setTrending(d?.queries || [])).catch(() => {});
  }, [open, trending.length]);

  // Search with debounce
  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const data = await apiClient.get(`/search?q=${encodeURIComponent(q)}&limit=5`);
      setResults(data || {});
      setSelected(-1);
      trackEvent('global_search_performed', { query: q.slice(0, 30), type: tab, results_count: Object.values(data || {}).flat().length });
    } catch { setResults({}); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 200);
    return () => clearTimeout(timeout);
  }, [query, search]);

  // Flatten results for keyboard nav
  const flatResults = useMemo(() => {
    if (!results) return [];
    const items = [];
    const addSection = (key, arr, urlFn) => {
      (arr || []).forEach(item => items.push({ ...item, _type: key, _url: urlFn(item) }));
    };
    if (tab === 'all' || tab === 'users') addSection('users', results.creators || results.users, u => `/@${u.username || u.user_id}`);
    if (tab === 'all' || tab === 'stores') addSection('stores', results.stores, s => `/store/${s.slug || s.store_id}`);
    if (tab === 'all' || tab === 'communities') addSection('communities', results.communities, c => `/community/${c.slug}`);
    if (tab === 'all' || tab === 'hashtags') addSection('hashtags', results.hashtags, h => `/tag/${h.tag || h.slug}`);
    if (tab === 'all' || tab === 'products') addSection('products', results.products, p => `/product/${p.slug || p.product_id}`);
    if (tab === 'all' || tab === 'recipes') addSection('recipes', results.recipes, r => `/recipes/${r.recipe_id}`);
    return items;
  }, [results, tab]);

  const handleSelect = (item) => {
    setOpen(false);
    saveToHistory(query);
    setQuery('');
    trackEvent('global_search_result_clicked', { type: item._type, item_id: item.product_id || item.user_id || item.store_id || item.slug, position: flatResults.indexOf(item) });
    navigate(item._url);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flatResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter') {
      if (flatResults[selected]) handleSelect(flatResults[selected]);
      else if (query.length >= 2) { saveToHistory(query); setOpen(false); navigate(`/search?q=${encodeURIComponent(query)}`); }
    }
  };

  const handleSubmit = () => {
    if (query.length >= 2) { saveToHistory(query); setOpen(false); navigate(`/search?q=${encodeURIComponent(query)}`); }
  };

  const openModal = useCallback(() => {
    setOpen(true);
    trackEvent('global_search_opened', { trigger: 'icon' });
  }, []);

  // Expose openModal for external triggers (header button)
  useEffect(() => {
    const handler = () => openModal();
    window.addEventListener('open-global-search', handler);
    return () => window.removeEventListener('open-global-search', handler);
  }, [openModal]);

  if (!open) return null;

  const hasQuery = query.length >= 2;
  const noResults = hasQuery && !loading && flatResults.length === 0;

  const renderSection = (label, icon, items) => {
    if (!items?.length) return null;
    const Icon = icon;
    return (
      <div className="py-1.5">
        <div className="flex items-center gap-2 px-4 py-1.5">
          <Icon size={13} className="text-stone-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</span>
        </div>
        {items.map((item, i) => {
          const globalIdx = flatResults.indexOf(item);
          return (
            <button key={`${item._type}-${i}`} onClick={() => handleSelect(item)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${globalIdx === selected ? 'bg-stone-50' : 'hover:bg-stone-50'}`}>
              {item.avatar || item.logo || item.image || item.cover_image ? (
                <img src={item.avatar || item.logo || item.image || item.cover_image} alt="" className="w-9 h-9 rounded-full object-cover bg-stone-100 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-stone-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-stone-950 truncate">{item._type === 'hashtags' ? `#${item.tag || item.name}` : item.name || item.title || item.username}</p>
                <p className="text-[11px] text-stone-400 truncate">{item.username ? `@${item.username}` : item.location || item.slug || (item.member_count ? `${item.member_count} miembros` : item.price ? `${Number(item.price).toFixed(2)} €` : '')}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
    <div className="fixed inset-0 z-[9999]" data-testid="global-search">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setOpen(false); trackEvent('global_search_closed', { had_query: hasQuery }); }} />
      <div className="relative max-w-[640px] mx-auto mt-0 md:mt-[12vh] h-full md:h-auto">
        <div className="bg-white md:rounded-2xl shadow-2xl md:border md:border-stone-200 overflow-hidden flex flex-col h-full md:h-auto md:max-h-[80vh]">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 border-b border-stone-100 shrink-0">
            <Search className="w-5 h-5 text-stone-400 shrink-0" />
            <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder={t('search.universal_placeholder', 'Buscar productos, personas, tiendas...')} className="flex-1 py-3.5 text-[15px] bg-transparent outline-none placeholder:text-stone-400" />
            {loading && <Loader2 className="w-4 h-4 animate-spin text-stone-400" />}
            <button onClick={() => { setOpen(false); trackEvent('global_search_closed', { had_query: hasQuery }); }} className="p-1.5 hover:bg-stone-100 rounded-full bg-transparent border-none cursor-pointer" aria-label="Cerrar">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-stone-100 px-2 shrink-0 scrollbar-hide">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`shrink-0 px-3 py-2 text-[12px] font-medium border-b-2 transition-colors bg-transparent border-t-0 border-l-0 border-r-0 cursor-pointer ${tab === t.key ? 'border-stone-950 text-stone-950' : 'border-transparent text-stone-400'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Results / Empty state */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {!hasQuery && (
              <div className="px-4 py-3">
                {history.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5"><Clock size={13} className="text-stone-400" /><span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{t('search.recent', 'Recientes')}</span></div>
                      <button onClick={() => { localStorage.removeItem(HISTORY_KEY); setHistory([]); }} className="text-[11px] text-stone-400 bg-transparent border-none cursor-pointer hover:text-stone-600">{t('search.clear_all', 'Limpiar')}</button>
                    </div>
                    {history.map(h => (
                      <div key={h} className="flex items-center gap-2 py-1.5">
                        <button onClick={() => { setQuery(h); }} className="flex-1 text-left text-[13px] text-stone-700 bg-transparent border-none cursor-pointer truncate hover:text-stone-950">{h}</button>
                        <button onClick={() => { removeFromHistory(h); setHistory(getHistory()); }} className="p-1 bg-transparent border-none cursor-pointer"><X size={12} className="text-stone-300" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {trending.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2"><TrendingUp size={13} className="text-stone-400" /><span className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{t('search.trending', 'Trending')}</span></div>
                    <div className="flex flex-wrap gap-1.5">
                      {trending.map(q => (
                        <button key={q} onClick={() => setQuery(q)} className="rounded-full bg-stone-100 px-3 py-1.5 text-[12px] text-stone-700 border-none cursor-pointer hover:bg-stone-200 transition-colors">{q}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {noResults && <div className="py-10 text-center text-[13px] text-stone-400">{t('search.no_results', 'Sin resultados para')} "{query}"</div>}

            {hasQuery && !noResults && (
              <>
                {(tab === 'all' || tab === 'users') && renderSection(t('search.section_users', 'Personas'), Users, flatResults.filter(r => r._type === 'users'))}
                {(tab === 'all' || tab === 'stores') && renderSection(t('search.section_stores', 'Tiendas'), Store, flatResults.filter(r => r._type === 'stores'))}
                {(tab === 'all' || tab === 'communities') && renderSection(t('search.section_communities', 'Comunidades'), Users, flatResults.filter(r => r._type === 'communities'))}
                {(tab === 'all' || tab === 'hashtags') && renderSection(t('search.section_hashtags', 'Hashtags'), Hash, flatResults.filter(r => r._type === 'hashtags'))}
                {(tab === 'all' || tab === 'products') && renderSection(t('search.section_products', 'Productos'), ShoppingBag, flatResults.filter(r => r._type === 'products'))}
                {(tab === 'all' || tab === 'recipes') && renderSection(t('search.section_recipes', 'Recetas'), ChefHat, flatResults.filter(r => r._type === 'recipes'))}
                {tab === 'all' && (results?.products?.length || 0) > 0 && (
                  <button onClick={handleSubmit} className="w-full py-3 text-center text-[13px] font-medium text-stone-500 bg-transparent border-none cursor-pointer hover:text-stone-950 hover:bg-stone-50 transition-colors">
                    {t('search.see_all_products', 'Ver todos los productos')} →
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400 shrink-0">
            <span>⌘K / Ctrl+K</span>
            <span>Esc {t('search.to_close', 'para cerrar')}</span>
          </div>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
}
