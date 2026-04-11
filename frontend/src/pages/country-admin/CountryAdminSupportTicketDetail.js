import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Send, ShieldAlert, Lock, Tag, Check } from 'lucide-react';

export default function CountryAdminSupportTicketDetail() {
  const { t } = useTranslation();
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [markStatus, setMarkStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiClient.get(`/country-admin/support/tickets/${ticketId}`);
      setData(d);
    } catch (err) {
      toast.error(err?.message || t('countryAdmin.support.notFound', 'Ticket no encontrado'));
      navigate('/country-admin/support');
    } finally {
      setLoading(false);
    }
  }, [ticketId, navigate, t]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/country-admin/support/tickets/${ticketId}/messages`, {
        body: body.trim(),
        is_internal_note: isInternal,
        mark_status: markStatus || undefined,
      });
      setBody('');
      setMarkStatus('');
      setIsInternal(false);
      toast.success(t('countryAdmin.support.replySent', 'Respuesta enviada'));
      await load();
    } catch (err) {
      toast.error(err?.message || t('countryAdmin.support.replyError', 'Error enviando'));
    } finally {
      setSending(false);
    }
  };

  const escalate = async () => {
    if (escalateReason.trim().length < 30) {
      toast.error(t('countryAdmin.support.escalateMin', 'Razón mínimo 30 caracteres'));
      return;
    }
    try {
      await apiClient.post(`/country-admin/support/tickets/${ticketId}/escalate`, { reason: escalateReason.trim() });
      toast.success(t('countryAdmin.support.escalated', 'Escalado a super admin'));
      setEscalateOpen(false);
      await load();
    } catch (err) {
      toast.error(err?.message || 'Error');
    }
  };

  const close = async () => {
    if (!window.confirm(t('countryAdmin.support.confirmClose', '¿Cerrar este ticket?'))) return;
    try {
      await apiClient.post(`/country-admin/support/tickets/${ticketId}/close`);
      toast.success(t('countryAdmin.support.closed', 'Ticket cerrado'));
      await load();
    } catch (err) {
      toast.error(err?.message || 'Error');
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-stone-400 animate-spin" /></div>;
  if (!data) return null;

  const { ticket, messages, user_snapshot, user_ticket_count } = data;

  return (
    <div className="space-y-6">
      <Link to="/country-admin/support" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-950">
        <ArrowLeft className="w-4 h-4" /> {t('common.back', 'Volver')}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <p className="text-xs text-stone-400 font-mono mb-1">{ticket.ticket_number}</p>
            <h2 className="text-xl font-semibold text-stone-950">{ticket.subject}</h2>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-700">{t(`support.status.${ticket.status}`, ticket.status)}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-700">{t(`support.cat.${ticket.category}`, ticket.category)}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-stone-950 text-white">{ticket.priority}</span>
              <span className="text-xs text-stone-500">{new Date(ticket.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
            {messages.map((m) => (
              <div key={m.message_id} className={`flex ${m.sender_role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.is_internal_note
                    ? 'bg-amber-50 border border-amber-200 text-stone-800'
                    : m.sender_role === 'user'
                      ? 'bg-stone-100 text-stone-950'
                      : 'bg-stone-950 text-white'
                }`}>
                  {m.is_internal_note && (
                    <p className="text-[10px] uppercase tracking-wider text-amber-700 mb-1 inline-flex items-center gap-1">
                      <Lock className="w-3 h-3" /> {t('countryAdmin.support.internalNote', 'Nota interna')}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${m.sender_role === 'user' ? 'text-stone-400' : 'text-white/60'}`}>
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKey}
              rows={4}
              placeholder={t('countryAdmin.support.replyPh', 'Responde al usuario... (Ctrl+Enter para enviar)')}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none"
            />
            <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-stone-700">
                <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                {t('countryAdmin.support.markInternal', 'Nota interna (no visible al usuario)')}
              </label>
              <select
                value={markStatus}
                onChange={(e) => setMarkStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs bg-white"
              >
                <option value="">{t('countryAdmin.support.dontChange', 'No cambiar estado')}</option>
                <option value="in_progress">→ in_progress</option>
                <option value="awaiting_user">→ awaiting_user</option>
                <option value="resolved">→ resolved</option>
              </select>
              <button
                onClick={send}
                disabled={sending || !body.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800 disabled:opacity-40"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t('common.send', 'Enviar')}
              </button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {user_snapshot && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-stone-950 mb-3">{t('countryAdmin.support.userInfo', 'Info del usuario')}</h3>
              <p className="text-sm text-stone-950">{user_snapshot.name}</p>
              <p className="text-xs text-stone-500">{user_snapshot.email}</p>
              <p className="text-xs text-stone-500 mt-1">{user_snapshot.role} · {user_snapshot.country}</p>
              <p className="text-xs text-stone-400 mt-2">{user_ticket_count} {t('countryAdmin.support.totalTickets', 'tickets totales')}</p>
            </div>
          )}

          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-2">
            <button
              onClick={() => setEscalateOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-700 hover:bg-stone-100"
            >
              <ShieldAlert className="w-4 h-4" />
              {t('countryAdmin.support.escalate', 'Escalar a super admin')}
            </button>
            <button
              onClick={close}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-700 hover:bg-stone-100"
            >
              <Check className="w-4 h-4" />
              {t('countryAdmin.support.close', 'Cerrar ticket')}
            </button>
          </div>

          {ticket.tags?.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-stone-950 mb-3 inline-flex items-center gap-2">
                <Tag className="w-4 h-4" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1">
                {ticket.tags.map((tg) => (
                  <span key={tg} className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">{tg}</span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {escalateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEscalateOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-stone-950">{t('countryAdmin.support.escalateTitle', 'Escalar a super admin')}</h3>
            <textarea
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              rows={4}
              placeholder={t('countryAdmin.support.escalateReasonPh', 'Razón mínimo 30 caracteres')}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
            />
            <p className="text-xs text-stone-400">{escalateReason.length} / 30</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEscalateOpen(false)} className="px-4 py-2 rounded-xl border border-stone-200 text-sm">{t('common.cancel', 'Cancelar')}</button>
              <button onClick={escalate} disabled={escalateReason.trim().length < 30} className="px-4 py-2 rounded-xl bg-stone-950 text-white text-sm disabled:opacity-40">
                {t('common.confirm', 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
