import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

// ── Helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES = {
  'abierto':                   'bg-stone-100 text-stone-700',
  'en revisión':               'bg-stone-200 text-stone-800',
  'pendiente de respuesta':    'bg-stone-300 text-stone-800',
  'escalado a humano':         'bg-stone-800 text-white',
  'resuelto':                  'bg-stone-50 text-stone-500',
  'cerrado':                   'bg-stone-50 text-stone-400',
};

const PRIORITY_STYLES = {
  baja:    'bg-stone-100 text-stone-500',
  media:   'bg-stone-200 text-stone-700',
  alta:    'bg-stone-700 text-white',
  urgente: 'bg-stone-950 text-white',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || 'bg-stone-100 text-stone-600'}`}>
      {status || '—'}
    </span>
  );
}

function PriorityBadge({ priority }) {
  if (!priority) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_STYLES[priority] || 'bg-stone-100 text-stone-500'}`}>
      {priority}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUSES = [
  '', 'abierto', 'en revisión', 'pendiente de respuesta',
  'escalado a humano', 'resuelto', 'cerrado',
];
const PRIORITIES = ['', 'baja', 'media', 'alta', 'urgente'];

// ── Component ─────────────────────────────────────────────────────────

export default function AdminSupport() {
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      const data = await apiClient.get('/support/cases', { params });
      setCases(data.cases || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      toast.error('No se pudieron cargar los casos de soporte');
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [page, status, priority]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [status, priority]);

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Soporte</h1>
          <p className="mt-1 text-sm text-stone-500">
            {total} {total === 1 ? 'caso' : 'casos'} en total
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-full border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-stone-400"
        >
          <option value="">Todos los estados</option>
          {STATUSES.slice(1).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="h-9 rounded-full border border-stone-200 bg-white px-3 text-sm text-stone-700 outline-none focus:border-stone-400"
        >
          <option value="">Todas las prioridades</option>
          {PRIORITIES.slice(1).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[24px] border border-stone-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="h-10 w-10 text-stone-200" />
            <p className="mt-4 text-sm font-medium text-stone-950">No hay casos</p>
            <p className="mt-1 text-sm text-stone-500">No hay casos de soporte con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs font-semibold uppercase tracking-[0.08em] text-stone-400">
                  <th className="px-5 py-4">Caso</th>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">País</th>
                  <th className="px-5 py-4">Prioridad</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {cases.map((c) => (
                  <tr key={c.case_id} className="transition-colors hover:bg-stone-50">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-stone-500">
                        #{c.case_id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-stone-950">{c.user_id.slice(0, 10)}…</td>
                    <td className="px-5 py-4 capitalize text-stone-700">{c.issue_type || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-stone-700">
                        {c.country || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-stone-500">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(c.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/admin/support/${c.case_id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-stone-950 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-stone-800"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Página {page} de {pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
