// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb, ChevronUp, Search, Filter, RefreshCw, TrendingUp,
  Eye, MessageCircle, Clock, X, Loader2, Link2,
} from 'lucide-react';
import { apiClient } from '../../services/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const STATUS_OPTIONS = [
  { value: 'new', labelKey: 'feedback.status.new' },
  { value: 'under_review', labelKey: 'feedback.status.under_review' },
  { value: 'planned', labelKey: 'feedback.status.planned' },
  { value: 'in_progress', labelKey: 'feedback.status.in_progress' },
  { value: 'implemented', labelKey: 'feedback.status.implemented' },
  { value: 'declined', labelKey: 'feedback.status.declined' },
];

const STATUS_STYLES = {
  new: 'bg-stone-200 text-stone-700',
  under_review: 'bg-stone-300 text-stone-800',
  planned: 'bg-stone-400 text-white',
  in_progress: 'bg-stone-600 text-white',
  implemented: 'bg-stone-900 text-white',
  declined: 'bg-stone-200 text-stone-400',
};

const CATEGORY_OPTIONS = ['', 'ux', 'feature', 'content', 'commerce', 'b2b', 'mobile', 'i18n', 'other'];

export default function CountryAdminFeedback() {
  const { t } = useTranslation();

  // Metrics
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Ideas list
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sort, setSort] = useState('popular');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modals
  const [statusModal, setStatusModal] = useState(null); // { idea_id, current_status }
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  const [duplicateModal, setDuplicateModal] = useState(null); // { idea_id, title }
  const [duplicateSearch, setDuplicateSearch] = useState('');
  const [duplicateResults, setDuplicateResults] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [closingDuplicate, setClosingDuplicate] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const res = await apiClient.get('/feedback/admin/metrics');
      setMetrics(res?.data || res);
    } catch {
      // silently fail
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  const fetchIdeas = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('sort', sort);
      params.set('page', String(pageNum));
      params.set('limit', '50');
      if (filterStatus) params.set('status', filterStatus);
      if (filterCategory) params.set('category', filterCategory);
      if (search) params.set('search', search);
      const res = await apiClient.get(`/feedback/admin/ideas?${params}`);
      const data = res?.data || res;
      setIdeas(data?.items || []);
      setTotal(data?.total || 0);
    } catch {
      toast.error('Error al cargar ideas');
    } finally {
      setLoading(false);
    }
  }, [sort, filterStatus, filterCategory, search]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { setPage(1); fetchIdeas(1); }, [fetchIdeas]);

  const handleChangeStatus = async () => {
    if (!statusModal || !newStatus) return;
    setChangingStatus(true);
    try {
      await apiClient.patch(`/feedback/admin/ideas/${statusModal.idea_id}/status`, {
        status: newStatus,
        status_note: statusNote.trim() || null,
      });
      toast.success(t('feedback.admin.statusUpdated', 'Estado actualizado'));
      setStatusModal(null);
      setNewStatus('');
      setStatusNote('');
      fetchIdeas(page);
      fetchMetrics();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    } finally {
      setChangingStatus(false);
    }
  };

  const searchDuplicates = async (q) => {
    setDuplicateSearch(q);
    if (q.length < 3) { setDuplicateResults([]); return; }
    try {
      const res = await apiClient.get(`/feedback/admin/ideas?search=${encodeURIComponent(q)}&limit=10`);
      const data = res?.data || res;
      setDuplicateResults((data?.items || []).filter(i => i.idea_id !== duplicateModal?.idea_id));
    } catch {
      // silently fail
    }
  };

  const handleCloseDuplicate = async () => {
    if (!duplicateModal || !selectedTarget) return;
    setClosingDuplicate(true);
    try {
      await apiClient.post(`/feedback/admin/ideas/${duplicateModal.idea_id}/close-duplicate`, {
        target_idea_id: selectedTarget.idea_id,
      });
      toast.success(t('feedback.admin.duplicateClosed', 'Cerrada como duplicada'));
      setDuplicateModal(null);
      setSelectedTarget(null);
      setDuplicateSearch('');
      fetchIdeas(page);
      fetchMetrics();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error');
    } finally {
      setClosingDuplicate(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-950 flex items-center gap-2">
            <Lightbulb size={22} />
            {t('feedback.admin.title', 'Feedback de usuarios')}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">{t('feedback.admin.subtitle', 'Ideas y sugerencias de la comunidad')}</p>
        </div>
        <button
          onClick={() => { fetchMetrics(); fetchIdeas(page); }}
          className="p-2 rounded-xl hover:bg-stone-100 transition-colors"
        >
          <RefreshCw size={18} className="text-stone-500" />
        </button>
      </div>

      {/* KPI cards */}
      {metricsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-3 w-16 bg-stone-100 rounded mb-2" />
              <div className="h-6 w-10 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      ) : metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <p className="text-xs text-stone-500 mb-1">{t('feedback.admin.totalIdeas', 'Total ideas')}</p>
            <p className="text-2xl font-bold text-stone-950">{metrics.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <p className="text-xs text-stone-500 mb-1">{t('feedback.admin.unreviewed', 'Sin revisar')}</p>
            <p className="text-2xl font-bold text-stone-950">{metrics.unreviewed}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <p className="text-xs text-stone-500 mb-1 flex items-center gap-1"><TrendingUp size={12} />{t('feedback.admin.newThisWeek', 'Nuevas esta semana')}</p>
            <p className="text-2xl font-bold text-stone-950">{metrics.new_this_week}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-stone-200">
            <p className="text-xs text-stone-500 mb-1">{t('feedback.admin.implemented', 'Implementadas')}</p>
            <p className="text-2xl font-bold text-stone-950">{metrics.by_status?.implemented || 0}</p>
          </div>
        </div>
      )}

      {/* Top 5 by votes */}
      {metrics?.top_voted?.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-950 mb-3">{t('feedback.admin.topVoted', 'Top por votos')}</h2>
          <div className="space-y-2">
            {metrics.top_voted.slice(0, 5).map((idea, idx) => (
              <div key={idea.idea_id} className="flex items-center gap-3 text-sm">
                <span className="text-stone-400 w-5 text-right font-mono">{idx + 1}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[idea.status] || ''}`}>
                  {t(`feedback.status.${idea.status}`, idea.status)}
                </span>
                <span className="flex-1 truncate text-stone-700">{idea.title}</span>
                <span className="flex items-center gap-1 text-stone-500 shrink-0">
                  <ChevronUp size={14} />
                  {idea.vote_count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('feedback.admin.searchPlaceholder', 'Buscar ideas...')}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-200 rounded-xl outline-none focus:border-stone-400"
          />
        </form>
        <select value={sort} onChange={e => setSort(e.target.value)} className="text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 outline-none">
          <option value="popular">{t('feedback.sort.popular', 'Mas votadas')}</option>
          <option value="recent">{t('feedback.sort.recent', 'Mas recientes')}</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 outline-none">
          <option value="">{t('feedback.admin.allStatuses', 'Todos los estados')}</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{t(s.labelKey, s.value)}</option>
          ))}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 outline-none">
          <option value="">{t('feedback.admin.allCategories', 'Todas las categorias')}</option>
          {CATEGORY_OPTIONS.filter(Boolean).map(c => (
            <option key={c} value={c}>{t(`feedback.categories.${c}`, c)}</option>
          ))}
        </select>
      </div>

      {/* Ideas list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-12 bg-stone-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-stone-100 rounded" />
                  <div className="h-3 w-1/2 bg-stone-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500">{t('feedback.admin.noIdeas', 'No hay ideas')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-stone-400">{total} ideas</p>
          {ideas.map(idea => (
            <div key={idea.idea_id} className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-start gap-3">
                {/* Vote count */}
                <div className="flex flex-col items-center min-w-[40px] p-2 bg-stone-50 rounded-lg">
                  <ChevronUp size={16} className="text-stone-500" />
                  <span className="text-sm font-bold text-stone-700">{idea.vote_count || 0}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[idea.status] || ''}`}>
                      {t(`feedback.status.${idea.status}`, idea.status)}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {t(`feedback.categories.${idea.category}`, idea.category)}
                    </span>
                    {idea.merged_into && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-500">
                        {t('feedback.admin.merged', 'Duplicada')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-stone-950 text-sm">{idea.title}</h3>
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{idea.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-stone-400">
                    <span>{idea.author_name}</span>
                    <span className="flex items-center gap-0.5"><MessageCircle size={10} />{idea.comment_count || 0}</span>
                    <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => { setStatusModal({ idea_id: idea.idea_id, current_status: idea.status }); setNewStatus(idea.status); }}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors whitespace-nowrap"
                  >
                    {t('feedback.admin.changeStatus', 'Cambiar estado')}
                  </button>
                  {!idea.merged_into && (
                    <button
                      onClick={() => setDuplicateModal({ idea_id: idea.idea_id, title: idea.title })}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors whitespace-nowrap flex items-center gap-1"
                    >
                      <Link2 size={10} />
                      {t('feedback.admin.closeDuplicate', 'Duplicada')}
                    </button>
                  )}
                  <a
                    href={`/feedback/${idea.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] px-2.5 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <Eye size={10} />
                    {t('feedback.admin.viewPublic', 'Ver')}
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > 50 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchIdeas(p); }}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 disabled:opacity-50"
              >
                {t('feedback.admin.prev', 'Anterior')}
              </button>
              <span className="text-sm text-stone-500">{page} / {Math.ceil(total / 50)}</span>
              <button
                onClick={() => { const p = page + 1; setPage(p); fetchIdeas(p); }}
                disabled={page * 50 >= total}
                className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 disabled:opacity-50"
              >
                {t('feedback.admin.next', 'Siguiente')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Change Status Modal */}
      <AnimatePresence>
        {statusModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setStatusModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-stone-950">{t('feedback.admin.changeStatusTitle', 'Cambiar estado')}</h3>
                <button onClick={() => setStatusModal(null)} className="p-1 rounded-full hover:bg-stone-100"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-stone-400"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{t(s.labelKey, s.value)}</option>
                  ))}
                </select>
                <textarea
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder={t('feedback.admin.statusNotePlaceholder', 'Nota publica (opcional)')}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-stone-400 resize-none"
                />
                <div className="flex gap-3">
                  <button onClick={() => setStatusModal(null)} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-700">
                    {t('feedback.admin.cancel', 'Cancelar')}
                  </button>
                  <button
                    onClick={handleChangeStatus}
                    disabled={changingStatus || newStatus === statusModal.current_status}
                    className="flex-1 py-2.5 rounded-xl bg-stone-950 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {changingStatus && <Loader2 size={14} className="animate-spin" />}
                    {t('feedback.admin.update', 'Actualizar')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Close as Duplicate Modal */}
      <AnimatePresence>
        {duplicateModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setDuplicateModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-stone-950">{t('feedback.admin.closeDuplicateTitle', 'Cerrar como duplicada')}</h3>
                <button onClick={() => setDuplicateModal(null)} className="p-1 rounded-full hover:bg-stone-100"><X size={18} /></button>
              </div>
              <p className="text-sm text-stone-600 mb-3">
                {t('feedback.admin.closeDuplicateDesc', 'Selecciona la idea principal:')}
              </p>
              <input
                type="text"
                value={duplicateSearch}
                onChange={e => searchDuplicates(e.target.value)}
                placeholder={t('feedback.admin.searchTarget', 'Buscar idea principal...')}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm outline-none focus:border-stone-400 mb-3"
              />

              <div className="flex-1 overflow-y-auto space-y-1.5 mb-4">
                {duplicateResults.map(item => (
                  <button
                    key={item.idea_id}
                    onClick={() => setSelectedTarget(item)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${
                      selectedTarget?.idea_id === item.idea_id
                        ? 'border-stone-950 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-stone-950 truncate">{item.title}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">{item.vote_count} votos - {t(`feedback.status.${item.status}`, item.status)}</p>
                  </button>
                ))}
                {duplicateSearch.length >= 3 && duplicateResults.length === 0 && (
                  <p className="text-sm text-stone-400 text-center py-4">{t('feedback.admin.noResults', 'Sin resultados')}</p>
                )}
              </div>

              {selectedTarget && (
                <p className="text-xs text-stone-500 mb-3">
                  "{duplicateModal.title}" {t('feedback.admin.willBeClosedAs', 'sera cerrada como duplicada de')} "{selectedTarget.title}"
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setDuplicateModal(null)} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-700">
                  {t('feedback.admin.cancel', 'Cancelar')}
                </button>
                <button
                  onClick={handleCloseDuplicate}
                  disabled={!selectedTarget || closingDuplicate}
                  className="flex-1 py-2.5 rounded-xl bg-stone-950 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {closingDuplicate && <Loader2 size={14} className="animate-spin" />}
                  {t('feedback.admin.closeDuplicateBtn', 'Cerrar como duplicada')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
