import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Clock, TrendingUp, User, Store, Package,
  ChefHat, Hash, FileText, ArrowRight, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';

type SearchTab = 'all' | 'users' | 'stores' | 'products' | 'recipes' | 'hashtags';

interface SearchResult {
  type: string;
  id: string;
  [key: string]: any;
}

export default function GlobalSearchModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Record<string, SearchResult[]>>({});
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trending, setTrending] = useState<Array<{query: string; count: number}>>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Focus input al abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      loadRecentAndTrending();
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) return;
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadRecentAndTrending = async () => {
    try {
      // Trending
      const trendingRes = await apiClient.get('/search/trending');
      setTrending(trendingRes.trending || []);
      
      // Recent (si hay usuario)
      if (user) {
        const recentRes = await apiClient.get('/search/history');
        setRecentSearches(recentRes.history?.map((h: any) => h.query) || []);
      }
    } catch (err) {
      console.error('Error loading search data:', err);
    }
  };

  // Debounce para sugerencias
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    const timeout = setTimeout(async () => {
      try {
        const res = await apiClient.get('/search/suggestions', {
          params: { q: query }
        });
        setSuggestions(res.suggestions || []);
      } catch (err) {
        console.error('Error loading suggestions:', err);
      }
    }, 150);
    
    return () => clearTimeout(timeout);
  }, [query]);

  // Búsqueda cuando el query cambia (con debounce)
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({});
      return;
    }
    
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/search/universal', {
          params: { q: query, limit: 10 }
        });
        setResults(res.results || {});
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [query]);

  const handleResultClick = (result: SearchResult) => {
    // Guardar en historial
    if (user) {
      apiClient.post('/search/history', {}, { params: { query } }).catch(() => {});
    }
    
    // Navegar según tipo
    switch (result.type) {
      case 'user':
        navigate(`/${result.username}`);
        break;
      case 'store':
        navigate(`/store/${result.slug}`);
        break;
      case 'product':
        navigate(`/products/${result.slug || result.id}`);
        break;
      case 'recipe':
        navigate(`/recipes/${result.slug}`);
        break;
      case 'hashtag':
        navigate(`/tag/${result.tag}`);
        break;
      case 'post':
        navigate(`/posts/${result.id}`);
        break;
    }
    
    onClose();
  };

  const handleRecentClick = (q: string) => {
    setQuery(q);
  };

  const handleClearRecent = async () => {
    try {
      await apiClient.delete('/search/history');
      setRecentSearches([]);
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  const handleDeleteRecent = async (q: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.delete(`/search/history/${encodeURIComponent(q)}`);
      setRecentSearches(prev => prev.filter(item => item !== q));
    } catch (err) {
      console.error('Error deleting search:', err);
    }
  };

  const tabs: { id: SearchTab; label: string; icon: any }[] = [
    { id: 'all', label: t('search.tabs.all', 'Todo'), icon: Search },
    { id: 'users', label: t('search.tabs.users', 'Usuarios'), icon: User },
    { id: 'stores', label: t('search.tabs.stores', 'Tiendas'), icon: Store },
    { id: 'products', label: t('search.tabs.products', 'Productos'), icon: Package },
    { id: 'recipes', label: t('search.tabs.recipes', 'Recetas'), icon: ChefHat },
    { id: 'hashtags', label: t('search.tabs.hashtags', 'Hashtags'), icon: Hash },
  ];

  const getFilteredResults = () => {
    if (activeTab === 'all') {
      // Combinar todos pero agrupar visualmente
      return results;
    }
    return { [activeTab]: results[activeTab] || [] };
  };

  const hasResults = Object.values(results).some(arr => arr.length > 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[80vh]"
          >
            {/* Header con search input */}
            <div className="p-4 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-stone-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search.placeholder', 'Buscar usuarios, tiendas, productos...')}
                  className="flex-1 text-lg outline-none placeholder:text-stone-400"
                />
                {loading && <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />}
                {query && (
                  <button onClick={() => setQuery('')} className="p-1 hover:bg-stone-100 rounded-full">
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                )}
                <kbd className="hidden sm:block px-2 py-1 text-xs bg-stone-100 text-stone-500 rounded">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Tabs */}
            {query.length >= 2 && (
              <div className="flex gap-1 p-2 border-b border-stone-100 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const count = results[tab.id]?.length || 0;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                      {count > 0 && (
                        <span className={`ml-1 text-xs ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Content */}
            <div className="overflow-y-auto max-h-[50vh]">
              {/* Sugerencias (cuando hay query corto) */}
              {query.length >= 1 && query.length < 2 && suggestions.length > 0 && (
                <div className="p-2">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(suggestion)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 rounded-lg"
                    >
                      <Search className="w-4 h-4 text-stone-400" />
                      <span>{suggestion}</span>
                      <ArrowRight className="w-4 h-4 text-stone-300 ml-auto" />
                    </button>
                  ))}
                </div>
              )}

              {/* Resultados de búsqueda */}
              {query.length >= 2 && (
                <>
                  {hasResults ? (
                    <div className="p-2">
                      {Object.entries(getFilteredResults()).map(([type, items]) => {
                        if (!items || items.length === 0) return null;
                        
                        return (
                          <div key={type} className="mb-4">
                            <h3 className="px-4 py-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                              {t(`search.type.${type}`, type)}
                            </h3>
                            {items.map((item: any) => (
                              <ResultItem
                                key={item.id}
                                result={item}
                                onClick={() => handleResultClick(item)}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ) : !loading ? (
                    <div className="p-8 text-center text-stone-500">
                      <Search className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                      <p>{t('search.noResults', 'No se encontraron resultados')}</p>
                      <p className="text-sm mt-1">
                        {t('search.tryDifferent', 'Intenta con otros términos')}
                      </p>
                    </div>
                  ) : null}
                </>
              )}

              {/* Estado vacío (sin query) */}
              {query.length === 0 && (
                <div className="p-4 space-y-6">
                  {/* Recientes */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-4 mb-2">
                        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                          {t('search.recent', 'Búsquedas recientes')}
                        </h3>
                        <button
                          onClick={handleClearRecent}
                          className="text-xs text-stone-500 hover:text-stone-700"
                        >
                          {t('common.clear', 'Limpiar')}
                        </button>
                      </div>
                      {recentSearches.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => handleRecentClick(q)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 rounded-lg group"
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-stone-400" />
                            <span>{q}</span>
                          </div>
                          <button
                            onClick={(e) => handleDeleteRecent(q, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-200 rounded"
                          >
                            <X className="w-4 h-4 text-stone-400" />
                          </button>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Trending */}
                  {trending.length > 0 && (
                    <div>
                      <h3 className="px-4 mb-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                        <TrendingUp className="w-4 h-4 inline mr-1" />
                        {t('search.trending', 'Tendencias')}
                      </h3>
                      {trending.slice(0, 5).map((trend, i) => (
                        <button
                          key={i}
                          onClick={() => handleRecentClick(trend.query)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 rounded-lg"
                        >
                          <span className="w-6 text-center text-sm font-semibold text-stone-400">
                            {i + 1}
                          </span>
                          <span>{trend.query}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer con shortcuts */}
            <div className="hidden sm:flex items-center justify-between px-4 py-2 bg-stone-50 border-t border-stone-100 text-xs text-stone-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border">↑↓</kbd>
                  {t('search.footer.navigate', 'Navegar')}
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border">↵</kbd>
                  {t('search.footer.select', 'Seleccionar')}
                </span>
              </div>
              <span>{t('search.footer.powered', 'Búsqueda inteligente')}</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Componente para renderizar un resultado según su tipo
function ResultItem({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const { type } = result;
  
  const renderContent = () => {
    switch (type) {
      case 'user':
        return (
          <div className="flex items-center gap-3">
            <img
              src={result.avatar || '/default-avatar.png'}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="font-medium">{result.name}</p>
              <p className="text-sm text-stone-500">@{result.username}</p>
            </div>
            {result.is_verified && (
              <span className="text-blue-500">✓</span>
            )}
          </div>
        );
        
      case 'store':
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-stone-400" />
            </div>
            <div>
              <p className="font-medium">{result.name}</p>
              <p className="text-sm text-stone-500 truncate max-w-xs">
                {result.description || result.location}
              </p>
            </div>
          </div>
        );
        
      case 'product':
        return (
          <div className="flex items-center gap-3">
            <img
              src={result.image || '/default-product.png'}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div className="flex-1">
              <p className="font-medium">{result.name}</p>
              <p className="text-sm text-stone-500">
                {result.price} {result.currency}
              </p>
            </div>
            {result.origin_country && (
              <span className="text-xs text-stone-400">{result.origin_country}</span>
            )}
          </div>
        );
        
      case 'recipe':
        return (
          <div className="flex items-center gap-3">
            <img
              src={result.cover_image || '/default-recipe.png'}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div>
              <p className="font-medium">{result.title}</p>
              <p className="text-sm text-stone-500">
                {result.total_time} min · {result.difficulty}
              </p>
            </div>
          </div>
        );
        
      case 'hashtag':
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
              <Hash className="w-5 h-5 text-stone-400" />
            </div>
            <div>
              <p className="font-medium">#{result.tag}</p>
              <p className="text-sm text-stone-500">
                {result.posts_count} posts
              </p>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-stone-400" />
            <span>{result.name || result.title || 'Resultado'}</span>
          </div>
        );
    }
  };
  
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 text-left hover:bg-stone-50 rounded-lg transition-colors"
    >
      {renderContent()}
    </button>
  );
}
