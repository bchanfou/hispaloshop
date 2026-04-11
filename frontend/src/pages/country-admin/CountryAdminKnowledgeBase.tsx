import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../services/api/client';

const COUNTRY_FLAGS: Record<string, string> = {
  ES: '🇪🇸', KR: '🇰🇷', US: '🇺🇸', FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', PT: '🇵🇹',
  MX: '🇲🇽', AR: '🇦🇷', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪', BR: '🇧🇷', JP: '🇯🇵',
  GB: '🇬🇧', NL: '🇳🇱', BE: '🇧🇪',
};

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
const STATUS_KEYS = ['all', 'published', 'draft'];
const PAGE_SIZE = 20;

type KbArticle = {
  slug: string;
  title?: string;
  title_en?: string;
  title_ko?: string;
  body?: string;
  body_en?: string;
  body_ko?: string;
  category?: string;
  role_target?: string;
  country_target?: string;
  published?: boolean;
  view_count?: number;
  created_at?: string;
  updated_at?: string;
};

type OutletCtx = { countryCode?: string };

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return '—';
  }
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

export default function CountryAdminKnowledgeBase() {
  const { t } = useTranslation();
  const ctx = useOutletContext<OutletCtx>() || {};
  const countryCode = (ctx.countryCode || '').toUpperCase();
  const flag = COUNTRY_FLAGS[countryCode] || '';

  const [items, setItems] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errored, setErrored] = useState<boolean>(false);
  const [category, setCategory] = useState<string>('');
  const [roleTarget, setRoleTarget] = useState<string>('');
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrored(false);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (category) params.set('category', category);
      if (roleTarget) params.set('role', roleTarget);
      if (status && status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const data = await apiClient.get(`/country-admin/support/articles?${params.toString()}`);
      setItems((data && (data as { items?: KbArticle[] }).items) || []);
      setPage(1);
    } catch (err) {
      setErrored(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, roleTarget, status, search]);

  useEffect(() => { load(); }, [load]);

  const handleTogglePublish = async (article: KbArticle) => {
    if (article.published) {
      setConfirmUnpublish(article.slug);
      return;
    }
    try {
      await apiClient.put(`/country-admin/support/articles/${article.slug}`, { published: true });
      toast.success(t('countryAdmin.knowledgeBase.editor.success.published', 'Artículo publicado'));
      load();
    } catch {
      toast.error(t('countryAdmin.actionError', 'No se pudo completar la acción'));
    }
  };

  const confirmUnpublishNow = async () => {
    const slug = confirmUnpublish;
    if (!slug) return;
    try {
      await apiClient.put(`/country-admin/support/articles/${slug}`, { published: false });
      toast.success(t('countryAdmin.knowledgeBase.editor.success.unpublished', 'Artículo despublicado'));
      load();
    } catch {
      toast.error(t('countryAdmin.actionError', 'No se pudo completar la acción'));
    } finally {
      setConfirmUnpublish(null);
    }
  };

  const handleDelete = async () => {
    const slug = confirmDelete;
    if (!slug) return;
    try {
      await apiClient.delete(`/country-admin/support/articles/${slug}`);
      toast.success(t('countryAdmin.knowledgeBase.editor.success.deleted', 'Artículo eliminado'));
      load();
    } catch {
      toast.error(t('countryAdmin.actionError', 'No se pudo completar la acción'));
    } finally {
      setConfirmDelete(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-stone-950" strokeWidth={1.5} />
            <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">
              {t('countryAdmin.knowledgeBase.title', 'Centro de Ayuda')}
            </h1>
            {flag && (
              <span className="inline-flex items-center gap-1 text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded-full ml-2">
                <span>{flag}</span>
                <span>{countryCode}</span>
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500">
            {t('countryAdmin.knowledgeBase.subtitle', 'Gestiona los artículos de ayuda de {{country}}', {
              country: countryCode || '—',
            })}
          </p>
        </div>
        <Link
          to="/country-admin/knowledge-base/new"
          className="inline-flex items-center gap-2 bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium px-4 py-2.5 rounded-full transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span>{t('countryAdmin.knowledgeBase.newArticle', 'Nuevo artículo')}</span>
        </Link>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('countryAdmin.knowledgeBase.filters.search', 'Buscar por slug o título...')}
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:border-stone-400"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:border-stone-400"
        >
          <option value="">{t('countryAdmin.knowledgeBase.filters.category', 'Categoría')}</option>
          {CATEGORY_KEYS.map((k) => (
            <option key={k} value={k}>
              {t(`countryAdmin.knowledgeBase.categories.${k}`, k)}
            </option>
          ))}
        </select>
        <select
          value={roleTarget}
          onChange={(e) => setRoleTarget(e.target.value)}
          className="px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:border-stone-400"
        >
          <option value="">{t('countryAdmin.knowledgeBase.filters.roleTarget', 'Rol')}</option>
          {ROLE_KEYS.map((k) => (
            <option key={k} value={k}>
              {t(`countryAdmin.knowledgeBase.roles.${k}`, k)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:border-stone-400"
        >
          {STATUS_KEYS.map((k) => (
            <option key={k} value={k}>
              {t(`countryAdmin.knowledgeBase.filters.statusOptions.${k}`, k)}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <Skeleton />
      ) : errored ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
          <AlertTriangle className="w-8 h-8 text-stone-400 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-stone-600 mb-4">{t('countryAdmin.loadError', 'No se pudo cargar la lista')}</p>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 text-sm text-stone-950 hover:underline"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
            {t('common.retry', 'Reintentar')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto mb-4" strokeWidth={1.25} />
          <p className="text-sm text-stone-600 mb-4">
            {t('countryAdmin.knowledgeBase.noArticles', 'Aún no hay artículos para tu país.')}
          </p>
          <Link
            to="/country-admin/knowledge-base/new"
            className="inline-flex items-center gap-2 bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            {t('countryAdmin.knowledgeBase.createFirst', 'Crea el primero')}
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">{t('countryAdmin.knowledgeBase.table.slug', 'Slug')}</th>
                  <th className="text-left px-4 py-3">{t('countryAdmin.knowledgeBase.table.title', 'Título')}</th>
                  <th className="text-left px-4 py-3">{t('countryAdmin.knowledgeBase.table.category', 'Categoría')}</th>
                  <th className="text-left px-4 py-3">{t('countryAdmin.knowledgeBase.table.roleTarget', 'Rol')}</th>
                  <th className="text-left px-4 py-3">{t('countryAdmin.knowledgeBase.table.views', 'Vistas')}</th>
                  <th className="text-left px-4 py-3">{t('countryAdmin.knowledgeBase.table.status', 'Estado')}</th>
                  <th className="text-left px-4 py-3">{t('countryAdmin.knowledgeBase.table.lastEdit', 'Editado')}</th>
                  <th className="text-right px-4 py-3">{t('countryAdmin.knowledgeBase.table.actions', 'Acciones')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pageItems.map((a) => (
                  <tr key={a.slug} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-xs font-mono text-stone-500">{a.slug}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-950 truncate max-w-xs">{a.title || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-stone-700 text-xs">
                      {a.category
                        ? t(`countryAdmin.knowledgeBase.categories.${a.category}`, a.category)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-700 text-xs">
                      {a.role_target
                        ? t(`countryAdmin.knowledgeBase.roles.${a.role_target}`, a.role_target)
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">{a.view_count || 0}</td>
                    <td className="px-4 py-3">
                      {a.published ? (
                        <span className="inline-block text-xs px-2 py-1 rounded-full bg-stone-950 text-white">
                          {t('countryAdmin.knowledgeBase.status.published', 'Publicado')}
                        </span>
                      ) : (
                        <span className="inline-block text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-700">
                          {t('countryAdmin.knowledgeBase.status.draft', 'Borrador')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">{formatDate(a.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/country-admin/knowledge-base/${a.slug}/edit`}
                          className="p-2 text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-colors"
                          title={t('countryAdmin.knowledgeBase.actions.edit', 'Editar')}
                        >
                          <Pencil className="w-4 h-4" strokeWidth={1.5} />
                        </Link>
                        <button
                          onClick={() => handleTogglePublish(a)}
                          className="p-2 text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-colors"
                          title={
                            a.published
                              ? t('countryAdmin.knowledgeBase.actions.unpublish', 'Despublicar')
                              : t('countryAdmin.knowledgeBase.actions.publish', 'Publicar')
                          }
                        >
                          {a.published ? (
                            <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                          ) : (
                            <Eye className="w-4 h-4" strokeWidth={1.5} />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(a.slug)}
                          className="p-2 text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded-lg transition-colors"
                          title={t('countryAdmin.knowledgeBase.actions.delete', 'Eliminar')}
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-3">
            {pageItems.map((a) => (
              <li key={a.slug} className="bg-white border border-stone-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs text-stone-400 font-mono truncate">{a.slug}</p>
                    <p className="font-medium text-stone-950 truncate">{a.title || '—'}</p>
                  </div>
                  {a.published ? (
                    <span className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-stone-950 text-white">
                      {t('countryAdmin.knowledgeBase.status.published', 'Publicado')}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] px-2 py-1 rounded-full bg-stone-100 text-stone-700">
                      {t('countryAdmin.knowledgeBase.status.draft', 'Borrador')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mb-3">
                  {a.category
                    ? t(`countryAdmin.knowledgeBase.categories.${a.category}`, a.category)
                    : '—'}{' '}
                  ·{' '}
                  {a.role_target
                    ? t(`countryAdmin.knowledgeBase.roles.${a.role_target}`, a.role_target)
                    : '—'}{' '}
                  · {a.view_count || 0}{' '}
                  {t('countryAdmin.knowledgeBase.table.views', 'vistas').toLowerCase()}
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/country-admin/knowledge-base/${a.slug}/edit`}
                    className="flex-1 text-center text-xs bg-stone-100 hover:bg-stone-200 text-stone-950 px-3 py-2 rounded-xl transition-colors"
                  >
                    {t('countryAdmin.knowledgeBase.actions.edit', 'Editar')}
                  </Link>
                  <button
                    onClick={() => handleTogglePublish(a)}
                    className="flex-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-950 px-3 py-2 rounded-xl transition-colors"
                  >
                    {a.published
                      ? t('countryAdmin.knowledgeBase.actions.unpublish', 'Despublicar')
                      : t('countryAdmin.knowledgeBase.actions.publish', 'Publicar')}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(a.slug)}
                    className="p-2 text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded-xl transition-colors"
                    aria-label={t('countryAdmin.knowledgeBase.actions.delete', 'Eliminar')}
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-full bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('common.previous', 'Anterior')}
              </button>
              <span className="text-xs text-stone-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-full bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('common.next', 'Siguiente')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-stone-950 mb-2">
              {t('countryAdmin.knowledgeBase.confirmDelete', '¿Eliminar este artículo?')}
            </h3>
            <p className="text-sm text-stone-600 mb-5">
              {t(
                'countryAdmin.knowledgeBase.confirmDeleteBody',
                'El artículo quedará oculto para los usuarios. Esta acción queda registrada en la auditoría.',
              )}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm bg-stone-950 hover:bg-stone-800 text-white rounded-full transition-colors"
              >
                {t('countryAdmin.knowledgeBase.actions.delete', 'Eliminar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unpublish confirm modal */}
      {confirmUnpublish && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmUnpublish(null)}>
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-stone-950 mb-2">
              {t('countryAdmin.knowledgeBase.confirmUnpublish', '¿Despublicar este artículo?')}
            </h3>
            <p className="text-sm text-stone-600 mb-5">
              {t(
                'countryAdmin.knowledgeBase.confirmUnpublishBody',
                'Dejará de aparecer en el Centro de Ayuda público. Podrás volver a publicarlo más tarde.',
              )}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmUnpublish(null)}
                className="px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
              >
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={confirmUnpublishNow}
                className="px-4 py-2 text-sm bg-stone-950 hover:bg-stone-800 text-white rounded-full transition-colors"
              >
                {t('countryAdmin.knowledgeBase.actions.unpublish', 'Despublicar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
