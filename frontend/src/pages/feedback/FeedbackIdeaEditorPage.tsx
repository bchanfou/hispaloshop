// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const CATEGORY_OPTIONS = [
  { value: 'ux', labelKey: 'feedback.categories.ux' },
  { value: 'feature', labelKey: 'feedback.categories.feature' },
  { value: 'content', labelKey: 'feedback.categories.content' },
  { value: 'commerce', labelKey: 'feedback.categories.commerce' },
  { value: 'b2b', labelKey: 'feedback.categories.b2b' },
  { value: 'mobile', labelKey: 'feedback.categories.mobile' },
  { value: 'i18n', labelKey: 'feedback.categories.i18n' },
  { value: 'other', labelKey: 'feedback.categories.other' },
];

export default function FeedbackIdeaEditorPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const isEdit = Boolean(slug);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('feature');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [ideaId, setIdeaId] = useState(null);

  // Load existing idea for edit mode
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await apiClient.get(`/feedback/ideas/${slug}`);
        const idea = res?.data || res;
        if (idea.author_id !== user?.user_id) {
          toast.error(t('feedback.editor.notAuthor', 'Solo el autor puede editar'));
          navigate('/feedback');
          return;
        }
        setTitle(idea.title || '');
        setDescription(idea.description || '');
        setCategory(idea.category || 'feature');
        setIdeaId(idea.idea_id);
      } catch {
        toast.error(t('feedback.editor.errorLoading', 'Error al cargar la idea'));
        navigate('/feedback');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, isEdit, user, navigate, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (title.trim().length < 5) {
      toast.error(t('feedback.validation.titleMinLength', 'El titulo debe tener al menos 5 caracteres'));
      return;
    }
    if (description.trim().length < 20) {
      toast.error(t('feedback.validation.descMinLength', 'La descripcion debe tener al menos 20 caracteres'));
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit && ideaId) {
        await apiClient.patch(`/feedback/ideas/${ideaId}`, {
          title: title.trim(),
          description: description.trim(),
          category,
        });
        toast.success(t('feedback.editor.saved', 'Cambios guardados'));
        navigate(`/feedback/${slug}`);
      } else {
        const res = await apiClient.post('/feedback/ideas', {
          title: title.trim(),
          description: description.trim(),
          category,
        });
        const idea = res?.data || res;
        toast.success(t('feedback.editor.published', 'Idea publicada'));
        navigate(`/feedback/${idea.slug}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('feedback.editor.errorSubmit', 'Error al enviar'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-stone-200 transition-colors">
            <ArrowLeft size={20} className="text-stone-900" />
          </button>
          <h1 className="text-lg font-semibold text-stone-950">
            {isEdit ? t('feedback.editor.editTitle', 'Editar idea') : t('feedback.editor.newTitle', 'Proponer idea')}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 max-w-lg mx-auto space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            {t('feedback.editor.titleLabel', 'Titulo')}
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('feedback.placeholders.title', 'Resume tu idea en una frase')}
            maxLength={120}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-950 focus:outline-none text-stone-950"
          />
          <p className="text-xs text-stone-400 mt-1 text-right">{title.length}/120</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            {t('feedback.editor.descLabel', 'Descripcion')}
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('feedback.placeholders.description', 'Describe tu idea con detalle. Cuanto mas contexto, mejor.')}
            rows={6}
            maxLength={2000}
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-950 focus:outline-none resize-none text-stone-950"
          />
          <p className="text-xs text-stone-400 mt-1 text-right">{description.length}/2000 ({t('feedback.editor.minChars', 'minimo 20')})</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            {t('feedback.editor.categoryLabel', 'Categoria')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  category === opt.value
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 text-stone-700 hover:border-stone-300'
                }`}
              >
                {t(opt.labelKey, opt.value)}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            {t('feedback.editor.cancel', 'Cancelar')}
          </button>
          <button
            type="submit"
            disabled={submitting || title.trim().length < 5 || description.trim().length < 20}
            className="flex-1 py-3.5 bg-stone-950 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {isEdit
              ? t('feedback.editor.save', 'Guardar cambios')
              : t('feedback.editor.publish', 'Publicar idea')
            }
          </button>
        </div>
      </form>
    </div>
  );
}
