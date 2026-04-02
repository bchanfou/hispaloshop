// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Send,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

// ── Helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES = {
  'abierto':                'bg-stone-100 text-stone-700',
  'en revisión':            'bg-stone-200 text-stone-800',
  'pendiente de respuesta': 'bg-stone-300 text-stone-800',
  'escalado a humano':      'bg-stone-800 text-white',
  'resuelto':               'bg-stone-50 text-stone-500',
  'cerrado':                'bg-stone-50 text-stone-400',
};

const PRIORITY_STYLES = {
  baja:    'bg-stone-100 text-stone-500',
  media:   'bg-stone-200 text-stone-700',
  alta:    'bg-stone-700 text-white',
  urgente: 'bg-stone-950 text-white',
};

const STATUSES = [
  'abierto', 'en revisión', 'pendiente de respuesta',
  'escalado a humano', 'resuelto', 'cerrado',
];
const PRIORITIES = ['baja', 'media', 'alta', 'urgente'];

const ADMIN_ACTIONS = [
  { key: 'refund_recommendation', label: 'Recomendar reembolso' },
  { key: 'replacement_request',   label: t('admin_support_case.solicitarReposicion', 'Solicitar reposición') },
  { key: 'manual_resolution',     label: t('admin_support_case.resolucionManual', 'Resolución manual') },
  { key: 'close',                 label: 'Cerrar caso' },
];

function formatTs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">{label}</p>
      <p className="text-sm text-stone-950">{value || '—'}</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────

export default function AdminSupportCase() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await apiClient.get(`/support/cases/${caseId}`);
      setCaseData(data);
    } catch {
      toast.error(t('admin_support_case.noSePudoCargarElCaso', 'No se pudo cargar el caso'));
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [caseData?.messages]);

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await apiClient.patch(
        `/support/cases/${caseId}/status`,
        { status: newStatus }
      );
      setCaseData((prev) => ({ ...prev, status: newStatus }));
      toast.success('Estado actualizado');
    } catch {
      toast.error(t('admin_support_case.noSePudoActualizarElEstado', 'No se pudo actualizar el estado'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    if (updatingPriority) return;
    setUpdatingPriority(true);
    const currentStatus = caseData?.status;
    try {
      await apiClient.patch(
        `/support/cases/${caseId}/status`,
        { status: currentStatus, priority: newPriority }
      );
      setCaseData((prev) => ({ ...prev, priority: newPriority }));
      toast.success('Prioridad actualizada');
    } catch {
      toast.error(t('admin_support_case.noSePudoActualizarLaPrioridad', 'No se pudo actualizar la prioridad'));
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const msg = await apiClient.post(
        `/support/cases/${caseId}/messages`,
        { content: reply.trim() }
      );
      setCaseData((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), msg],
      }));
      setReply('');
    } catch {
      toast.error(t('admin_support_case.noSePudoEnviarElMensaje', 'No se pudo enviar el mensaje'));
    } finally {
      setSending(false);
    }
  };

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      const data = await apiClient.post(
        `/support/cases/${caseId}/action`,
        { action }
      );
      setCaseData((prev) => ({ ...prev, status: data.new_status }));
      toast.success(t('admin_support_case.accionAplicada', 'Acción aplicada'));
    } catch {
      toast.error(t('admin_support_case.noSePudoAplicarLaAccion', 'No se pudo aplicar la acción'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-stone-50 p-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-950">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <p className="text-sm text-stone-500">Caso no encontrado.</p>
      </div>
    );
  }

  const messages = Array.isArray(caseData.messages) ? caseData.messages : [];
  const isClosed = ['resuelto', 'cerrado'].includes(caseData.status);

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/admin/support')}
        className="mb-5 inline-flex items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a soporte
      </button>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Case header */}
          <div className="rounded-[24px] border border-stone-100 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-stone-400">#{caseData.case_id}</p>
                <h1 className="mt-1 text-xl font-semibold capitalize text-stone-950">
                  {caseData.issue_type || 'Caso de soporte'}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_STYLES[caseData.status] || 'bg-stone-100 text-stone-600'}`}>
                  {caseData.status}
                </span>
                {caseData.priority && (
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_STYLES[caseData.priority] || 'bg-stone-100 text-stone-500'}`}>
                    {caseData.priority}
                  </span>
                )}
              </div>
            </div>

            {caseData.description && (
              <p className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-700">
                {caseData.description}
              </p>
            )}
          </div>

          {/* Chat thread */}
          <div className="rounded-[24px] border border-stone-100 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-stone-950">{t('admin_support_case.conversacion', 'Conversación')}</h2>

            {messages.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-400">{t('admin_support_case.sinMensajesAun', 'Sin mensajes aún.')}</p>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div key={msg.message_id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isAdmin ? 'bg-stone-950 text-white rounded-br-md' : 'bg-stone-100 text-stone-950 rounded-bl-md'}`}>
                        <p className="font-semibold text-[10px] mb-1 opacity-60 uppercase tracking-wider">
                          {isAdmin ? t('admin_support_case.tuAdmin', 'Tú (admin)') : 'Usuario'}
                        </p>
                        <p className="leading-relaxed">{msg.content}</p>
                        {msg.created_at && (
                          <p className={`mt-1 text-[10px] opacity-50`}>{formatTs(msg.created_at)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Escalation notice */}
            {caseData.status === 'escalado a humano' && (
              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                Un agente humano se ha unido a la conversación.
              </div>
            )}

            {/* Reply input */}
            {!isClosed && (
              <form onSubmit={handleSendReply} className="mt-5 flex items-end gap-3">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Escribe una respuesta..."
                  rows={2}
                  className="flex-1 resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-stone-400"
                />
                <button
                  type="submit"
                  disabled={!reply.trim() || sending}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white transition-colors hover:bg-stone-800 disabled:opacity-40"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            )}
            {isClosed && (
              <p className="mt-4 text-center text-xs text-stone-400">
                Este caso está cerrado. No se pueden añadir más mensajes.
              </p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* User info */}
          <div className="rounded-[24px] border border-stone-100 bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100">
                <User className="h-5 w-5 text-stone-500" />
              </div>
              <p className="font-semibold text-stone-950">{caseData.user_info?.name || 'Usuario'}</p>
            </div>
            <div className="space-y-3">
              <InfoRow label="Email" value={caseData.user_info?.email} />
              <InfoRow label="País" value={caseData.user_info?.country || caseData.country} />
              <InfoRow label="Pedido" value={caseData.order_id} />
              {caseData.order_info && (
                <InfoRow label="Estado pedido" value={caseData.order_info.status} />
              )}
            </div>
          </div>

          {/* Update status */}
          <div className="rounded-[24px] border border-stone-100 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-stone-950">Estado</h3>
            <div className="relative">
              <select
                value={caseData.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
                aria-label="Estado del caso"
                className="w-full appearance-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 pr-8 text-sm text-stone-950 outline-none focus:border-stone-400 disabled:opacity-60"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>

            <h3 className="mb-3 mt-5 text-sm font-semibold text-stone-950">Prioridad</h3>
            <div className="relative">
              <select
                value={caseData.priority || ''}
                onChange={(e) => handlePriorityChange(e.target.value)}
                disabled={updatingPriority}
                aria-label="Prioridad del caso"
                className="w-full appearance-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 pr-8 text-sm text-stone-950 outline-none focus:border-stone-400 disabled:opacity-60"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>
          </div>

          {/* Admin actions */}
          <div className="rounded-[24px] border border-stone-100 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-stone-950">Acciones</h3>
            <div className="space-y-2">
              {ADMIN_ACTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  disabled={isClosed || actionLoading}
                  onClick={() => handleAction(key)}
                  className="flex w-full items-center justify-between rounded-2xl border border-stone-100 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-40"
                >
                  {label}
                  <Check className="h-4 w-4 text-stone-300" />
                </button>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div className="rounded-[24px] border border-stone-100 bg-white p-5 space-y-3">
            <InfoRow label="Abierto el" value={formatTs(caseData.created_at)} />
            <InfoRow label=t('admin_support_case.ultimaActualizacion', 'Última actualización') value={formatTs(caseData.updated_at)} />
            {caseData.resolved_at && (
              <InfoRow label="Resuelto el" value={formatTs(caseData.resolved_at)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
