// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Bug, Lightbulb, Sparkles, MessageSquare, ChevronUp, Check, Clock, Loader2, Filter } from 'lucide-react';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const TYPE_CONFIG = {
  bug: { icon: Bug, label: 'Bug', color: 'text-red-600', bg: 'bg-red-50' },
  feature: { icon: Lightbulb, label: 'Feature', color: 'text-amber-600', bg: 'bg-amber-50' },
  improvement: { icon: Sparkles, label: 'Mejora', color: 'text-blue-600', bg: 'bg-blue-50' },
  other: { icon: MessageSquare, label: 'Otro', color: 'text-stone-600', bg: 'bg-stone-100' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'text-stone-500', bg: 'bg-stone-100' },
  under_review: { label: 'En revisión', color: 'text-blue-600', bg: 'bg-blue-50' },
  planned: { label: 'Planificado', color: 'text-purple-600', bg: 'bg-purple-50' },
  in_progress: { label: 'En progreso', color: 'text-amber-600', bg: 'bg-amber-50' },
  done: { label: 'Completado', color: 'text-green-600', bg: 'bg-green-50' },
  declined: { label: 'Rechazado', color: 'text-red-500', bg: 'bg-red-50' },
};

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('popular');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  // Form state
  const [formType, setFormType] = useState('feature');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedback = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('sort_by', sortBy);
      params.set('page', String(pageNum));
      params.set('limit', '20');
      if (filterType) params.set('feedback_type', filterType);
      
      const data = await apiClient.get(`/feedback?${params}`);
      const newItems = data?.data?.items || [];
      
      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
      setHasMore(data?.data?.has_more || false);
    } catch (err: any) {
      // Si es 404, significa que no hay feedback aún - mostrar estado vacío sin error
      if (err?.status === 404 || err?.response?.status === 404) {
        setItems([]);
        setHasMore(false);
      } else {
        // Solo mostrar toast si no es un error de "no hay datos"
        const errorDetail = err?.response?.data?.detail || err?.message;
        if (errorDetail && errorDetail !== 'Feedback no encontrado') {
          toast.error('Error al cargar feedback');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [sortBy, filterType]);

  useEffect(() => {
    setPage(1);
    fetchFeedback(1, false);
  }, [fetchFeedback]);

  const handleVote = async (id, currentlyVoted) => {
    try {
      const res = await apiClient.post(`/feedback/${id}/vote`, {});
      const newVoted = res?.data?.data?.voted;
      const newCount = res?.data?.data?.votes;
      
      setItems(prev => prev.map(item => 
        item.feedback_id === id 
          ? { ...item, user_voted: newVoted, votes: newCount }
          : item
      ));
      
      if (newVoted) {
        toast.success('¡Voto registrado!');
      }
    } catch (e) {
      toast.error('Error al votar');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formTitle.length < 5) {
      toast.error('El título debe tener al menos 5 caracteres');
      return;
    }
    if (formDesc.length < 20) {
      toast.error('La descripción debe tener al menos 20 caracteres');
      return;
    }
    
    setSubmitting(true);
    try {
      await apiClient.post('/feedback', {
        feedback_type: formType,
        title: formTitle,
        description: formDesc
      });
      toast.success('¡Feedback enviado!');
      setShowForm(false);
      setFormTitle('');
      setFormDesc('');
      fetchFeedback(1, false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Error al enviar');
    } finally {
      setSubmitting(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeedback(nextPage, true);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-stone-200 transition-colors">
            <ArrowLeft size={20} className="text-stone-900" />
          </button>
          <h1 className="text-lg font-semibold text-stone-950">Feedback & Ideas</h1>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm bg-white border border-stone-200 rounded-full px-3 py-1.5 text-stone-700 outline-none"
          >
            <option value="popular">Más votados</option>
            <option value="trending">Tendencia</option>
            <option value="newest">Más recientes</option>
          </select>
          
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm bg-white border border-stone-200 rounded-full px-3 py-1.5 text-stone-700 outline-none"
          >
            <option value="">Todos los tipos</option>
            <option value="feature">Features</option>
            <option value="improvement">Mejoras</option>
            <option value="bug">Bugs</option>
            <option value="other">Otros</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Submit button */}
        <button 
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 p-4 bg-stone-950 text-white rounded-2xl font-medium hover:bg-stone-800 transition-colors"
        >
          <Plus size={20} />
          Enviar feedback o idea
        </button>

        {/* List */}
        {loading && items.length === 0 ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 space-y-3 animate-pulse">
                <div className="h-4 w-20 bg-stone-100 rounded" />
                <div className="h-5 w-3/4 bg-stone-100 rounded" />
                <div className="h-3 w-full bg-stone-100 rounded" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Lightbulb size={48} className="mx-auto text-stone-300 mb-4" />
            <p className="text-stone-500">No hay feedback aún</p>
            <p className="text-sm text-stone-400 mt-1">¡Sé el primero en enviar una idea!</p>
          </div>
        ) : (
          <>
            {items.map(item => {
              const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.other;
              const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
              const TypeIcon = typeConfig.icon;
              
              return (
                <motion.div 
                  key={item.feedback_id}
                  layout
                  className="bg-white rounded-2xl p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    {/* Vote button */}
                    <button
                      onClick={() => handleVote(item.feedback_id, item.user_voted)}
                      className={`flex flex-col items-center gap-0.5 min-w-[44px] p-2 rounded-xl transition-colors ${
                        item.user_voted ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      <ChevronUp size={18} />
                      <span className="text-xs font-semibold">{item.votes || 0}</span>
                    </button>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${typeConfig.bg} ${typeConfig.color}`}>
                          <TypeIcon size={10} />
                          {typeConfig.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => navigate(`/feedback/${item.slug || item.feedback_id}`)}
                        className="text-left bg-transparent border-none p-0 m-0 w-full"
                      >
                        <h3 className="font-semibold text-stone-950 text-[15px] leading-snug">{item.title}</h3>
                        <p className="text-sm text-stone-600 mt-1 line-clamp-2">{item.description}</p>
                      </button>
                      
                      <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                        <span>{item.voter_count} votos</span>
                        <span>·</span>
                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        <span>·</span>
                        <button
                          onClick={() => navigate(`/feedback/${item.slug || item.feedback_id}`)}
                          className="text-stone-400 hover:text-stone-600 bg-transparent border-none p-0"
                        >
                          {item.comment_count || 0} {t('feedback.detail.comments', 'Comentarios')}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {hasMore && (
              <button 
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 text-sm text-stone-500 hover:text-stone-700 transition-colors"
              >
                {loading ? 'Cargando...' : 'Cargar más'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Submit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-stone-950">Enviar feedback</h2>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-stone-100">
                  <ArrowLeft size={20} className="text-stone-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type selector */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormType(key)}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
                            formType === key 
                              ? 'border-stone-950 bg-stone-950 text-white' 
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <Icon size={18} />
                          <span className="text-sm font-medium">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Título</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Resume tu idea en una frase"
                    maxLength={100}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-950 focus:outline-none"
                  />
                  <p className="text-xs text-stone-400 mt-1">{formTitle.length}/100</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Descripción</label>
                  <textarea
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    placeholder="Describe tu idea con detalle. Cuanto más contexto, mejor."
                    rows={5}
                    maxLength={2000}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-950 focus:outline-none resize-none"
                  />
                  <p className="text-xs text-stone-400 mt-1">{formDesc.length}/2000 (mínimo 20)</p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || formTitle.length < 5 || formDesc.length < 20}
                  className="w-full py-4 bg-stone-950 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Enviar feedback'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
