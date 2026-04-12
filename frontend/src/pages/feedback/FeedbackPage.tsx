// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, ChevronUp, MessageCircle, Search, Lightbulb, User as UserIcon,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  { value: '', labelKey: 'feedback.filters.all' },
  { value: 'ux', labelKey: 'feedback.categories.ux' },
  { value: 'feature', labelKey: 'feedback.categories.feature' },
  { value: 'content', labelKey: 'feedback.categories.content' },
  { value: 'commerce', labelKey: 'feedback.categories.commerce' },
  { value: 'b2b', labelKey: 'feedback.categories.b2b' },
  { value: 'mobile', labelKey: 'feedback.categories.mobile' },
  { value: 'i18n', labelKey: 'feedback.categories.i18n' },
  { value: 'other', labelKey: 'feedback.categories.other' },
];

const STATUS_STYLES = {
  new: 'bg-stone-200 text-stone-700',
  under_review: 'bg-stone-300 text-stone-800',
  planned: 'bg-stone-400 text-white',
  in_progress: 'bg-stone-600 text-white',
  implemented: 'bg-stone-900 text-white',
  declined: 'bg-stone-200 text-stone-400 line-through',
};

const STATUS_FILTERS = ['', 'new', 'under_review', 'planned', 'in_progress', 'implemented'];

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [sort, setSort] = useState('popular');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchIdeas = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('sort', sort);
      params.set('page', String(pageNum));
      params.set('limit', '20');
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (search) params.set('search', search);

      const res = await apiClient.get(`/feedback/ideas?${params}`);
      const data = res?.data || res;
      const newItems = data?.items || [];

      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setTotal(data?.total || 0);
      setHasMore(data?.has_more || false);
    } catch {
      if (!append) setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sort, category, status, search]);

  useEffect(() => {
    setPage(1);
    fetchIdeas(1, false);
  }, [fetchIdeas]);

  const handleVote = async (ideaId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.dispatchEvent(new CustomEvent('auth:prompt_registration', { detail: { action: 'like' } }));
      return;
    }
    try {
      const res = await apiClient.post(`/feedback/ideas/${ideaId}/vote`, {});
      const data = res?.data || res;
      setItems(prev => prev.map(item =>
        item.idea_id === ideaId
          ? { ...item, user_voted: data.voted, vote_count: data.vote_count }
          : item
      ));
    } catch {
      toast.error(t('feedback.errorVoting', 'Error al votar'));
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchIdeas(next, true);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-stone-200 transition-colors">
            <ArrowLeft size={20} className="text-stone-900" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-stone-950">{t('feedback.title', 'Ideas y Sugerencias')}</h1>
            <p className="text-xs text-stone-500">{t('feedback.subtitle', 'Ayudanos a mejorar HispaloShop')}</p>
          </div>
          {user ? (
            <button
              onClick={() => navigate('/feedback/new')}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-950 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-colors"
            >
              <Plus size={16} />
              {t('feedback.proposeButton', 'Proponer idea')}
            </button>
          ) : (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('auth:prompt_registration', { detail: { action: 'default' } }))}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-950 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-colors"
            >
              {t('feedback.loginToPropose', 'Inicia sesion para proponer')}
            </button>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="px-4 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder={t('feedback.searchPlaceholder', 'Buscar ideas...')}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-full outline-none focus:border-stone-400 transition-colors"
            />
          </div>
        </form>

        {/* Filters row */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="text-sm bg-white border border-stone-200 rounded-full px-3 py-1.5 text-stone-700 outline-none shrink-0"
          >
            <option value="popular">{t('feedback.sort.popular', 'Mas votadas')}</option>
            <option value="recent">{t('feedback.sort.recent', 'Mas recientes')}</option>
            {user && <option value="mine">{t('feedback.sort.mine', 'Mis ideas')}</option>}
          </select>

          {/* Status pills */}
          {STATUS_FILTERS.map(s => (
            <button
              key={s || 'all'}
              onClick={() => setStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
                status === s
                  ? 'bg-stone-950 text-white border-stone-950'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              {s ? t(`feedback.status.${s}`, s) : t('feedback.filters.allStatuses', 'Todas')}
            </button>
          ))}
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.value || 'all'}
              onClick={() => setCategory(c.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors shrink-0 ${
                category === c.value
                  ? 'bg-stone-950 text-white border-stone-950'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
              }`}
            >
              {t(c.labelKey, c.value || 'Todas')}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3 max-w-2xl mx-auto">
        {loading && items.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 space-y-3 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-11 h-14 bg-stone-100 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-16 bg-stone-100 rounded" />
                    <div className="h-5 w-3/4 bg-stone-100 rounded" />
                    <div className="h-3 w-full bg-stone-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Lightbulb size={48} className="mx-auto text-stone-300 mb-4" />
            <p className="text-stone-600 font-medium">{t('feedback.emptyState', 'Aun no hay ideas')}</p>
            <p className="text-sm text-stone-400 mt-1">{t('feedback.emptyStateSub', 'Se el primero en proponer una!')}</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-stone-400">{total} {t('feedback.ideasCount', 'ideas')}</p>
            <div className="space-y-3">
              {items.map(item => (
                <Link
                  key={item.idea_id}
                  to={`/feedback/${item.slug}`}
                  className="block"
                >
                  <motion.div
                    layout
                    className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      {/* Vote button */}
                      <button
                        onClick={(e) => handleVote(item.idea_id, e)}
                        className={`flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] p-2 rounded-xl transition-colors ${
                          item.user_voted
                            ? 'bg-stone-950 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        <ChevronUp size={18} />
                        <span className="text-xs font-semibold">{item.vote_count || 0}</span>
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                            {t(`feedback.categories.${item.category}`, item.category)}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[item.status] || STATUS_STYLES.new}`}>
                            {t(`feedback.status.${item.status}`, item.status)}
                          </span>
                        </div>

                        <h3 className="font-semibold text-stone-950 text-[15px] leading-snug">{item.title}</h3>
                        <p className="text-sm text-stone-600 mt-1 line-clamp-2">{item.description}</p>

                        <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                          <span className="flex items-center gap-1">
                            <UserIcon size={12} />
                            {item.author_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle size={12} />
                            {item.comment_count || 0}
                          </span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 text-sm text-stone-500 hover:text-stone-700 transition-colors"
              >
                {loading ? t('feedback.loading', 'Cargando...') : t('feedback.loadMore', 'Cargar mas')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
