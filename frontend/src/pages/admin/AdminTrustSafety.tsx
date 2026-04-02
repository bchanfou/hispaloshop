// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

// ── Helpers ───────────────────────────────────────────────────────────

const RISK_COLORS = (score) => {
  if (score >= 80) return 'bg-stone-950 text-white';
  if (score >= 60) return 'bg-stone-700 text-white';
  if (score >= 40) return 'bg-stone-300 text-stone-800';
  return 'bg-stone-100 text-stone-600';
};

const REASON_LABELS = {
  spam:       'Spam',
  misleading: t('admin_trust_safety.enganoso', 'Engañoso'),
  offensive:  'Ofensivo',
  fraud:      'Fraude',
  copyright:  'Copyright',
  other:      'Otro',
};

const CONTENT_TYPE_LABELS = {
  post:     t('post_detail.publicacion', 'Publicación'),
  reel:     'Reel',
  story:    'Historia',
  product:  'Producto',
  review:   t('admin_trust_safety.resena', 'Reseña'),
  recipe:   'Receta',
  user_bio: 'Perfil',
  profile:  'Perfil',
};

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Stat card ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, highlight }) {
  return (
    <div className={`rounded-[20px] border p-5 ${highlight ? 'border-stone-800 bg-stone-950 text-white' : 'border-stone-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm ${highlight ? 'text-white/60' : 'text-stone-500'}`}>{label}</p>
          <p className={`mt-2 text-3xl font-semibold tracking-tight ${highlight ? 'text-white' : 'text-stone-950'}`}>
            {value ?? '—'}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${highlight ? 'bg-white/10' : 'bg-stone-100'}`}>
          <Icon className={`h-5 w-5 ${highlight ? 'text-white' : 'text-stone-700'}`} />
        </div>
      </div>
    </div>
  );
}

// ── Pagination controls ───────────────────────────────────────────────

function Pagination({ page, pages, onPrev, onNext }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between">
      <p className="text-sm text-stone-500">Página {page} de {pages}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrev}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white transition-colors hover:bg-stone-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={onNext}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white transition-colors hover:bg-stone-50 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Queue tab ─────────────────────────────────────────────────────────

function QueueTab() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [contentType, setContentType] = useState('');
  const [acting, setActing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, status: 'pending' };
      if (contentType) params.content_type = contentType;
      const data = await apiClient.get('/moderation/queue', { params });
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (error) {
      toast.error(error?.response?.data?.detail || t('admin_trust_safety.noSePudoCargarLaColaDeModeracion', 'No se pudo cargar la cola de moderación'));
    } finally {
      setLoading(false);
    }
  }, [page, contentType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [contentType]);

  const handleAction = async (item_id, action) => {
    setActing(item_id + action);
    try {
      await apiClient.post(
        `/moderation/queue/${item_id}/action`,
        { action }
      );
      toast.success(action === 'approve' ? 'Contenido aprobado' : t('admin_trust_safety.accionAplicada', 'Acción aplicada'));
      setItems((prev) => prev.filter((i) => i.item_id !== item_id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (error) {
      toast.error(error?.response?.data?.detail || t('admin_trust_safety.noSePudoAplicarLaAccion', 'No se pudo aplicar la acción'));
    } finally {
      setActing(null);
    }
  };

  const CONTENT_TYPES = ['', 'post', 'reel', 'product', 'review', 'recipe', 'profile'];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-stone-500">{total} elementos pendientes</p>
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="h-9 rounded-full border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-stone-400"
        >
          <option value="">Todos los tipos</option>
          {CONTENT_TYPES.slice(1).map((ct) => (
            <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct] || ct}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-stone-200" />
          <p className="mt-4 text-sm font-semibold text-stone-950">{t('admin_trust_safety.colaVacia', 'Cola vacía')}</p>
          <p className="mt-1 text-sm text-stone-500">{t('admin_trust_safety.noHayContenidoPendienteDeRevision', 'No hay contenido pendiente de revisión.')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-stone-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs font-semibold uppercase tracking-[0.08em] text-stone-400">
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">ID contenido</th>
                  <th className="px-5 py-4">{t('admin_trust_safety.senales', 'Señales')}</th>
                  <th className="px-5 py-4">Riesgo</th>
                  <th className="px-5 py-4">Fuente</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {items.map((item) => (
                  <tr key={item.item_id} className="transition-colors hover:bg-stone-50">
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 capitalize">
                        {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-stone-500">
                      {item.content_id.slice(0, 16)}…
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(item.flags || []).slice(0, 3).map((f) => (
                          <span key={f} className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600">
                            {f}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${RISK_COLORS(item.risk_score)}`}>
                        {item.risk_score}
                      </span>
                    </td>
                    <td className="px-5 py-4 capitalize text-stone-500 text-xs">
                      {item.source === 'auto' ? '🤖 Automático' : '👤 Reporte'}
                    </td>
                    <td className="px-5 py-4 text-stone-500 text-xs">{formatDate(item.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={acting !== null}
                          onClick={() => handleAction(item.item_id, 'approve')}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-colors hover:bg-stone-200 disabled:opacity-40"
                          aria-label="Aprobar" title="Aprobar"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={acting !== null}
                          onClick={() => handleAction(item.item_id, 'remove')}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 text-white transition-colors hover:bg-stone-800 disabled:opacity-40"
                          aria-label="Eliminar" title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={acting !== null}
                          onClick={() => handleAction(item.item_id, 'warn')}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40"
                          aria-label="Avisar usuario" title="Avisar usuario"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={acting !== null}
                          onClick={() => handleAction(item.item_id, 'suspend')}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-40"
                          aria-label="Suspender usuario" title="Suspender usuario"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} pages={pages} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
    </div>
  );
}

// ── Reports tab ───────────────────────────────────────────────────────

function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [contentType, setContentType] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, status: 'pending' };
      if (reason) params.reason = reason;
      if (contentType) params.content_type = contentType;
      const data = await apiClient.get('/moderation/reports', { params });
      setReports(Array.isArray(data.reports) ? data.reports : []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch (error) {
      toast.error(error?.response?.data?.detail || t('admin_trust_safety.noSePudieronCargarLosReportes', 'No se pudieron cargar los reportes'));
    } finally {
      setLoading(false);
    }
  }, [page, reason, contentType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [reason, contentType]);

  const REASONS = ['', 'spam', 'misleading', 'offensive', 'fraud', 'copyright', 'other'];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-stone-500">{total} reportes pendientes</p>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-9 rounded-full border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-stone-400"
        >
          <option value="">Todos los motivos</option>
          {REASONS.slice(1).map((r) => (
            <option key={r} value={r}>{REASON_LABELS[r] || r}</option>
          ))}
        </select>
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="h-9 rounded-full border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-stone-400"
        >
          <option value="">Todos los tipos</option>
          {['post', 'reel', 'product', 'review', 'recipe', 'profile'].map((ct) => (
            <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct] || ct}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Flag className="h-10 w-10 text-stone-200" />
          <p className="mt-4 text-sm font-semibold text-stone-950">Sin reportes</p>
          <p className="mt-1 text-sm text-stone-500">{t('admin_trust_safety.noHayReportesConLosFiltrosSeleccio', 'No hay reportes con los filtros seleccionados.')}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-stone-100 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs font-semibold uppercase tracking-[0.08em] text-stone-400">
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">ID contenido</th>
                  <th className="px-5 py-4">Motivo</th>
                  <th className="px-5 py-4">{t('productDetail.description', 'Descripción')}</th>
                  <th className="px-5 py-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {reports.map((r) => (
                  <tr key={r.report_id} className="hover:bg-stone-50">
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 capitalize">
                        {CONTENT_TYPE_LABELS[r.content_type] || r.content_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-stone-500">
                      {r.content_id?.slice(0, 14)}…
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-800 capitalize">
                        {REASON_LABELS[r.reason] || r.reason}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-[240px]">
                      <p className="truncate text-xs text-stone-500">
                        {r.description || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-500">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} pages={pages} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
    </div>
  );
}

// ── Stats tab ─────────────────────────────────────────────────────────

function StatsTab({ stats, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  const cards = [
    { icon: ShieldAlert,  label: 'En cola (pendiente)',    value: stats?.pending_queue,     highlight: (stats?.pending_queue || 0) > 0 },
    { icon: AlertTriangle,label: 'Alto riesgo (≥70)',      value: stats?.high_risk_items,   highlight: (stats?.high_risk_items || 0) > 0 },
    { icon: Flag,         label: 'Reportes pendientes',    value: stats?.pending_reports,   highlight: false },
    { icon: Shield,       label: 'Acciones hoy',           value: stats?.actions_today,     highlight: false },
    { icon: ShieldCheck,  label: t('admin_trust_safety.marcadosAutomaticamente', 'Marcados automáticamente'), value: stats?.auto_flagged,    highlight: false },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ icon, label, value, highlight }) => (
          <StatCard key={label} icon={icon} label={label} value={value} highlight={highlight} />
        ))}
      </div>

      <div className="rounded-[24px] border border-stone-100 bg-white p-6">
        <h3 className="mb-2 text-sm font-semibold text-stone-950">{t('admin_trust_safety.politicasDeLaPlataforma', 'Políticas de la plataforma')}</h3>
        <ul className="mt-3 space-y-2 text-sm text-stone-600">
          {[
            t('admin_trust_safety.productosProhibidosArmasDrogasCon', 'Productos prohibidos: armas, drogas, contenido ilegal, artículos falsificados.'),
            'Comportamiento: no se permite acoso, odio ni spam.',
            t('admin_trust_safety.resenasDebenSerAutenticasVerificad', 'Reseñas: deben ser auténticas, verificadas y basadas en compras reales.'),
            t('admin_trust_safety.vendedoresResponsablesDeLaVeracidad', 'Vendedores: responsables de la veracidad de las descripciones y la seguridad alimentaria.'),
            t('admin_trust_safety.contenidoGeneradoPorUsuariosSujeto', 'Contenido generado por usuarios: sujeto a moderación automática y humana.'),
          ].map((policy) => (
            <li key={policy} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400" />
              {policy}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

const TABS = [
  { key: 'queue',   label: t('admin_trust_safety.colaDeModeracion', 'Cola de moderación') },
  { key: 'reports', label: 'Reportes' },
  { key: 'stats',   label: t('store.stats', 'Estadísticas') },
];

export default function AdminTrustSafety() {
  const [activeTab, setActiveTab] = useState('queue');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await apiClient.get('/moderation/stats');
      setStats(data);
    } catch {
      setStats({});
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Trust & Safety</h1>
          <p className="mt-1 text-sm text-stone-500">
            Moderación, reportes e integridad de la plataforma.
          </p>
        </div>
        <button
          type="button"
          onClick={loadStats}
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar stats
        </button>
      </div>

      {/* Stats strip */}
      {!statsLoading && stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={`rounded-2xl border px-4 py-3 ${(stats.high_risk_items || 0) > 0 ? 'border-stone-800 bg-stone-950' : 'border-stone-100 bg-white'}`}>
            <p className={`text-xs ${(stats.high_risk_items || 0) > 0 ? 'text-white/60' : 'text-stone-500'}`}>Alto riesgo</p>
            <p className={`mt-1 text-2xl font-semibold ${(stats.high_risk_items || 0) > 0 ? 'text-white' : 'text-stone-950'}`}>
              {stats.high_risk_items ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white px-4 py-3">
            <p className="text-xs text-stone-500">En cola</p>
            <p className="mt-1 text-2xl font-semibold text-stone-950">{stats.pending_queue ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white px-4 py-3">
            <p className="text-xs text-stone-500">Reportes</p>
            <p className="mt-1 text-2xl font-semibold text-stone-950">{stats.pending_reports ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white px-4 py-3">
            <p className="text-xs text-stone-500">Acciones hoy</p>
            <p className="mt-1 text-2xl font-semibold text-stone-950">{stats.actions_today ?? 0}</p>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-2xl border border-stone-100 bg-white p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`flex-1 rounded-2xl py-2.5 text-sm font-medium transition-all duration-150 ${
              activeTab === key
                ? 'bg-stone-950 text-white'
                : 'text-stone-500 hover:text-stone-950'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'queue'   && <QueueTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'stats'   && <StatsTab stats={stats} loading={statsLoading} />}
    </div>
  );
}
