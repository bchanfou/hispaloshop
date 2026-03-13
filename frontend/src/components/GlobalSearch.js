import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, Package, ShoppingBag, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/client';

const typeIcons = { user: Users, product: Package, order: ShoppingBag };
const typeColors = { user: 'text-blue-500', product: 'text-emerald-500', order: 'text-purple-500' };

export default function GlobalSearch() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await apiClient.get(`/superadmin/search?q=${encodeURIComponent(q)}`);
      setResults(data.results || []);
      setSelected(0);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const handleSelect = (result) => {
    setOpen(false);
    setQuery('');
    if (result.url) navigate(result.url);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) handleSelect(results[selected]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]" data-testid="global-search">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative max-w-xl mx-auto mt-[15vh]">
        <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-stone-100">
            <Search className="w-5 h-5 text-text-muted shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('search.placeholder', 'Buscar usuarios, productos y pedidos...')}
              className="flex-1 py-4 text-sm bg-transparent outline-none placeholder:text-text-muted"
              data-testid="search-input"
            />
            {loading && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-stone-100 rounded">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {results.length === 0 && query.length >= 2 && !loading && (
              <div className="py-8 text-center text-sm text-text-muted">{t('search.noResults', 'No hay resultados para')} "{query}"</div>
            )}
            {results.map((r, i) => {
              const Icon = typeIcons[r.type] || Package;
              const color = typeColors[r.type] || 'text-stone-500';
              return (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => handleSelect(r)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors ${i === selected ? 'bg-stone-50' : ''}`}
                  data-testid={`result-${r.type}-${i}`}
                >
                  <Icon className={`w-4 h-4 ${color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
                    <p className="text-xs text-text-muted truncate">{r.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-text-muted uppercase bg-stone-100 px-2 py-0.5 rounded-full shrink-0">{r.type}</span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-text-muted">
            <span>Ctrl+K {t('search.toSearch', 'to search')}</span>
            <span>Esc {t('search.toClose', 'to close')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
