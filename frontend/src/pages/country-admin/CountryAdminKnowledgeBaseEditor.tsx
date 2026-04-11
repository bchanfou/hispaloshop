import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronRight, Eye, X, Loader2 } from 'lucide-react';
import { apiClient } from '../../services/api/client';

const CATEGORY_KEYS = [
  'order_issue',
  'payment_issue',
  'account_issue',
  'fiscal_issue',
  'product_complaint',
  'b2b_operation',
  'other',
];

const ROLE_KEYS = ['customer', 'producer', 'influencer', 'importer', 'all'];
const LANG_KEYS: Array<'es' | 'en' | 'ko'> = ['es', 'en', 'ko'];

type OutletCtx = { countryCode?: string };

type ArticleDraft = {
  slug: string;
  category: string;
  role_target: string;
  country_target: string;
  title: string;       // ES
  title_en: string;
  title_ko: string;
  body: string;        // ES
  body_en: string;
  body_ko: string;
  published: boolean;
};

const EMPTY_DRAFT: ArticleDraft = {
  slug: '',
  category: 'other',
  role_target: 'all',
  country_target: 'all',
  title: '',
  title_en: '',
  title_ko: '',
  body: '',
  body_en: '',
  body_ko: '',
  published: false,
};

// ── Inline markdown parser (~80 LOC, XSS-safe) ───────────────────────────
// Supports: h1/h2/h3, **bold**, *italic*, unordered lists, ordered lists,
// links [text](url), inline `code`. Escapes HTML first to prevent XSS.
function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(line: string): string {
  let out = escapeHtml(line);
  // Inline code `...`
  out = out.replace(/`([^`]+)`/g, '<code class="bg-stone-100 text-stone-800 px-1 py-0.5 rounded text-xs">$1</code>');
  // Bold **...**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-stone-950">$1</strong>');
  // Italic *...*
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // Links [text](url) — only allow http(s) / mailto / relative.
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) => {
    const safe = /^(https?:|mailto:|\/)/i.test(url) ? url : '#';
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="text-stone-950 underline">${text}</a>`;
  });
  return out;
}

export function renderMarkdown(src: string): string {
  if (!src) return '';
  const lines = src.split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (listType === 'ul') out.push('</ul>');
    if (listType === 'ol') out.push('</ol>');
    listType = null;
  };
  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, '');
    if (!line.trim()) {
      closeList();
      out.push('<br/>');
      continue;
    }
    // Headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      closeList();
      const level = h[1].length;
      const cls = level === 1
        ? 'text-2xl font-semibold text-stone-950 mt-4 mb-2'
        : level === 2
        ? 'text-xl font-semibold text-stone-950 mt-3 mb-2'
        : 'text-base font-semibold text-stone-950 mt-2 mb-1';
      out.push(`<h${level} class="${cls}">${renderInline(h[2])}</h${level}>`);
      continue;
    }
    // Ordered list
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (listType !== 'ol') {
        closeList();
        out.push('<ol class="list-decimal pl-5 space-y-1 text-sm text-stone-700">');
        listType = 'ol';
      }
      out.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }
    // Unordered list
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (listType !== 'ul') {
        closeList();
        out.push('<ul class="list-disc pl-5 space-y-1 text-sm text-stone-700">');
        listType = 'ul';
      }
      out.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p class="text-sm text-stone-700 leading-relaxed mb-2">${renderInline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

const SLUG_RE = /^[a-z0-9-]+$/;

export default function CountryAdminKnowledgeBaseEditor() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug: slugParam } = useParams<{ slug?: string }>();
  const ctx = useOutletContext<OutletCtx>() || {};
  const countryCode = (ctx.countryCode || '').toLowerCase();
  const isEditing = Boolean(slugParam);

  const [draft, setDraft] = useState<ArticleDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState<boolean>(isEditing);
  const [saving, setSaving] = useState<boolean>(false);
  const [slugTouched, setSlugTouched] = useState<boolean>(isEditing);
  const [activeLang, setActiveLang] = useState<'es' | 'en' | 'ko'>('es');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!slugParam) return;
    setLoading(true);
    try {
      // There is no GET-by-slug admin endpoint; pull from the list.
      const data = await apiClient.get(`/country-admin/support/articles?limit=200`);
      const items: ArticleDraft[] = (data as { items?: ArticleDraft[] }).items || [];
      const found = items.find((i) => i.slug === slugParam);
      if (!found) {
        toast.error(t('countryAdmin.knowledgeBase.notFound', 'Artículo no encontrado'));
        navigate('/country-admin/knowledge-base');
        return;
      }
      setDraft({
        slug: found.slug,
        category: found.category || 'other',
        role_target: found.role_target || 'all',
        country_target: found.country_target || 'all',
        title: found.title || '',
        title_en: found.title_en || '',
        title_ko: found.title_ko || '',
        body: found.body || '',
        body_en: found.body_en || '',
        body_ko: found.body_ko || '',
        published: Boolean(found.published),
      });
    } catch {
      toast.error(t('countryAdmin.loadError', 'No se pudo cargar la lista'));
    } finally {
      setLoading(false);
    }
  }, [slugParam, navigate, t]);

  useEffect(() => { load(); }, [load]);

  // Auto-slug from ES title when creating (until user touches slug).
  useEffect(() => {
    if (isEditing || slugTouched) return;
    if (draft.title) {
      setDraft((d) => ({ ...d, slug: slugify(d.title) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.title]);

  const validate = useCallback(
    (forPublish: boolean): Record<string, string> => {
      const e: Record<string, string> = {};
      if (!draft.slug) {
        e.slug = t('countryAdmin.knowledgeBase.editor.validation.slugRequired', 'Slug obligatorio');
      } else if (!SLUG_RE.test(draft.slug)) {
        e.slug = t('countryAdmin.knowledgeBase.editor.validation.slugInvalid', 'Slug inválido: solo minúsculas, números y guiones');
      }
      if (!draft.category) {
        e.category = t('countryAdmin.knowledgeBase.editor.validation.categoryRequired', 'Categoría obligatoria');
      }
      if (!draft.role_target) {
        e.role_target = t('countryAdmin.knowledgeBase.editor.validation.roleTargetRequired', 'Rol obligatorio');
      }
      const hasES = draft.title.trim() && draft.body.trim();
      const hasEN = draft.title_en.trim() && draft.body_en.trim();
      const hasKO = draft.title_ko.trim() && draft.body_ko.trim();
      if (!hasES && !hasEN && !hasKO) {
        e.lang = t('countryAdmin.knowledgeBase.editor.validation.atLeastOneLang', 'Completa al menos un idioma (título + cuerpo)');
      }
      if (forPublish && !hasES) {
        e.lang = t('countryAdmin.knowledgeBase.editor.validation.esRequiredForPublish', 'Para publicar, el español es obligatorio');
      }
      return e;
    },
    [draft, t],
  );

  const save = async (asPublished: boolean) => {
    const eMap = validate(asPublished);
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) {
      toast.error(Object.values(eMap)[0]);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: draft.slug,
        category: draft.category,
        role_target: draft.role_target,
        country_target: draft.country_target,
        title: draft.title,
        title_en: draft.title_en,
        title_ko: draft.title_ko,
        body: draft.body,
        body_en: draft.body_en,
        body_ko: draft.body_ko,
        published: asPublished,
      };
      if (isEditing) {
        await apiClient.put(`/country-admin/support/articles/${draft.slug}`, payload);
        toast.success(
          asPublished
            ? t('countryAdmin.knowledgeBase.editor.success.published', 'Artículo publicado')
            : t('countryAdmin.knowledgeBase.editor.success.updated', 'Artículo actualizado'),
        );
      } else {
        await apiClient.post(`/country-admin/support/articles`, payload);
        toast.success(t('countryAdmin.knowledgeBase.editor.success.created', 'Artículo creado'));
      }
      navigate('/country-admin/knowledge-base');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setErrors((prev) => ({
          ...prev,
          slug: t('countryAdmin.knowledgeBase.editor.validation.slugTaken', 'Ese slug ya existe'),
        }));
        toast.error(t('countryAdmin.knowledgeBase.editor.validation.slugTaken', 'Ese slug ya existe'));
      } else {
        toast.error(t('countryAdmin.actionError', 'No se pudo completar la acción'));
      }
    } finally {
      setSaving(false);
    }
  };

  const titleForLang = (lang: 'es' | 'en' | 'ko'): string => {
    if (lang === 'es') return draft.title;
    if (lang === 'en') return draft.title_en;
    return draft.title_ko;
  };
  const bodyForLang = (lang: 'es' | 'en' | 'ko'): string => {
    if (lang === 'es') return draft.body;
    if (lang === 'en') return draft.body_en;
    return draft.body_ko;
  };
  const setTitleForLang = (lang: 'es' | 'en' | 'ko', v: string) => {
    setDraft((d) => ({
      ...d,
      ...(lang === 'es' ? { title: v } : lang === 'en' ? { title_en: v } : { title_ko: v }),
    }));
  };
  const setBodyForLang = (lang: 'es' | 'en' | 'ko', v: string) => {
    setDraft((d) => ({
      ...d,
      ...(lang === 'es' ? { body: v } : lang === 'en' ? { body_en: v } : { body_ko: v }),
    }));
  };
  const isLangEmpty = (lang: 'es' | 'en' | 'ko') => !titleForLang(lang).trim() || !bodyForLang(lang).trim();

  const previewHtml = useMemo(() => renderMarkdown(bodyForLang(activeLang)), [draft, activeLang]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="flex items-center gap-1 text-xs text-stone-500 mb-2">
            <Link to="/country-admin/knowledge-base" className="hover:text-stone-950">
              {t('countryAdmin.knowledgeBase.editor.breadcrumb.kb', 'Centro de Ayuda')}
            </Link>
            <ChevronRight className="w-3 h-3" strokeWidth={1.5} />
            <span className="text-stone-950">
              {isEditing
                ? t('countryAdmin.knowledgeBase.editor.breadcrumb.edit', 'Editar')
                : t('countryAdmin.knowledgeBase.editor.breadcrumb.new', 'Nuevo')}
            </span>
          </nav>
          <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">
            {isEditing
              ? t('countryAdmin.knowledgeBase.editor.breadcrumb.edit', 'Editar')
              : t('countryAdmin.knowledgeBase.editor.breadcrumb.new', 'Nuevo')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/country-admin/knowledge-base')}
            className="px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
          >
            {t('countryAdmin.knowledgeBase.editor.cancel', 'Cancelar')}
          </button>
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="px-4 py-2 text-sm bg-stone-100 hover:bg-stone-200 text-stone-950 rounded-full transition-colors disabled:opacity-50"
          >
            {t('countryAdmin.knowledgeBase.editor.saveDraft', 'Guardar borrador')}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="px-4 py-2 text-sm bg-stone-950 hover:bg-stone-800 text-white rounded-full transition-colors disabled:opacity-50"
          >
            {t('countryAdmin.knowledgeBase.editor.publish', 'Publicar')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: metadata */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t('countryAdmin.knowledgeBase.editor.fields.slug', 'Slug')}
              </label>
              <input
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase() }));
                }}
                readOnly={isEditing}
                placeholder={t(
                  'countryAdmin.knowledgeBase.editor.fields.slugPlaceholder',
                  'ejemplo-de-articulo',
                )}
                className={`w-full px-3 py-2 rounded-xl border text-sm font-mono ${
                  isEditing ? 'bg-stone-50 text-stone-500' : 'bg-white'
                } ${errors.slug ? 'border-stone-950' : 'border-stone-200'}`}
              />
              {errors.slug && <p className="text-xs text-stone-950 mt-1">{errors.slug}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t('countryAdmin.knowledgeBase.editor.fields.category', 'Categoría')}
              </label>
              <select
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white"
              >
                {CATEGORY_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t(`countryAdmin.knowledgeBase.categories.${k}`, k)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t('countryAdmin.knowledgeBase.editor.fields.roleTarget', 'Rol destino')}
              </label>
              <select
                value={draft.role_target}
                onChange={(e) => setDraft((d) => ({ ...d, role_target: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white"
              >
                {ROLE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t(`countryAdmin.knowledgeBase.roles.${k}`, k)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                {t('countryAdmin.knowledgeBase.editor.fields.countryTarget', 'País destino')}
              </label>
              <select
                value={draft.country_target}
                onChange={(e) => setDraft((d) => ({ ...d, country_target: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white"
              >
                <option value="all">
                  {t('countryAdmin.knowledgeBase.countryTarget.all', 'Todos los países')}
                </option>
                {countryCode && (
                  <option value={countryCode}>
                    {t('countryAdmin.knowledgeBase.countryTarget.country', 'Solo {{country}}', {
                      country: countryCode.toUpperCase(),
                    })}
                  </option>
                )}
              </select>
            </div>

            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-700">
                  {t('countryAdmin.knowledgeBase.editor.publishToggle', 'Estado')}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    draft.published
                      ? 'bg-stone-950 text-white'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {draft.published
                    ? t('countryAdmin.knowledgeBase.status.published', 'Publicado')
                    : t('countryAdmin.knowledgeBase.status.draft', 'Borrador')}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowPreview(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-stone-950 bg-white border border-stone-200 hover:bg-stone-50 rounded-full transition-colors"
          >
            <Eye className="w-4 h-4" strokeWidth={1.5} />
            {t('countryAdmin.knowledgeBase.editor.preview', 'Previsualizar')}
          </button>
        </div>

        {/* Right: content editor */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            {/* Lang tabs */}
            <div className="flex items-center border-b border-stone-200 bg-stone-50 px-2">
              {LANG_KEYS.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setActiveLang(lang)}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                    activeLang === lang
                      ? 'text-stone-950'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <span className="uppercase">{lang}</span>
                  {isLangEmpty(lang) && (
                    <span className="ml-2 text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full">
                      {t('countryAdmin.knowledgeBase.editor.tabs.untranslated', 'Sin traducir')}
                    </span>
                  )}
                  {activeLang === lang && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-stone-950" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  {t('countryAdmin.knowledgeBase.editor.fields.title', 'Título')}
                </label>
                <input
                  value={titleForLang(activeLang)}
                  onChange={(e) => setTitleForLang(activeLang, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  {t('countryAdmin.knowledgeBase.editor.fields.body', 'Cuerpo (Markdown)')}
                </label>
                <textarea
                  value={bodyForLang(activeLang)}
                  onChange={(e) => setBodyForLang(activeLang, e.target.value)}
                  rows={16}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white font-mono leading-relaxed"
                  placeholder={
                    '# Encabezado\n\nTexto con **negrita**, *cursiva*, `código` y [enlace](https://example.com).\n\n- elemento 1\n- elemento 2\n\n1. paso uno\n2. paso dos'
                  }
                />
              </div>
              {errors.lang && (
                <p className="text-xs text-stone-950">{errors.lang}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <h3 className="text-base font-semibold text-stone-950">
                {t('countryAdmin.knowledgeBase.editor.preview', 'Previsualizar')}{' '}
                <span className="ml-2 text-xs text-stone-500 uppercase">({activeLang})</span>
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded-lg"
                aria-label={t('common.close', 'Cerrar')}
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <h1 className="text-2xl font-semibold text-stone-950 mb-4">
                {titleForLang(activeLang) || '—'}
              </h1>
              {/* eslint-disable-next-line react/no-danger */}
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
