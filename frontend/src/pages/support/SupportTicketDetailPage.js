import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Send, Star } from 'lucide-react';

export default function SupportTicketDetailPage() {
  const { t } = useTranslation();
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [showCsat, setShowCsat] = useState(false);
  const [csatRating, setCsatRating] = useState(0);
  const [csatComment, setCsatComment] = useState('');
  const csatShownRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await apiClient.get(`/support/tickets/${ticketId}`);
      setTicket(data?.ticket || null);
      setMessages(data?.messages || []);
      if (data?.ticket?.status === 'resolved' && !csatShownRef.current) {
        const csat = await apiClient.get(`/support/tickets/${ticketId}`).catch(() => null);
        // We don't have a "has csat" endpoint in user surface; show modal once per session.
        csatShownRef.current = true;
        setShowCsat(true);
      }
    } catch (err) {
      toast.error(err?.message || t('support.notFound', 'Ticket no encontrado'));
    } finally {
      setLoading(false);
    }
  }, [ticketId, t]);

  useEffect(() => { load(); }, [load]);

  // Polling cada 30s para nuevos mensajes
  useEffect(() => {
    if (!ticket || ['closed', 'resolved'].includes(ticket?.status)) return;
    const interval = setInterval(() => {
      apiClient.get(`/support/tickets/${ticketId}`).then((d) => setMessages(d?.messages || [])).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [ticketId, ticket]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await apiClient.post(`/support/tickets/${ticketId}/messages`, { body: body.trim() });
      setBody('');
      await load();
    } catch (err) {
      toast.error(err?.message || t('support.sendError', 'Error enviando mensaje'));
    } finally {
      setSending(false);
    }
  };

  const reopen = async () => {
    try {
      await apiClient.post(`/support/tickets/${ticketId}/reopen`);
      toast.success(t('support.reopened', 'Ticket reabierto'));
      await load();
    } catch (err) {
      toast.error(err?.message || t('support.reopenError', 'No se pudo reabrir'));
    }
  };

  const submitCsat = async () => {
    if (csatRating < 1) return;
    try {
      await apiClient.post(`/support/tickets/${ticketId}/csat`, { rating: csatRating, comment: csatComment });
      toast.success(t('support.csatThanks', 'Gracias por tu valoración'));
      setShowCsat(false);
    } catch (err) {
      toast.error(err?.message || t('support.csatError', 'Error'));
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><Loader2 className="w-6 h-6 text-stone-400 animate-spin" /></div>;
  if (!ticket) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><p className="text-stone-500">{t('support.notFound', 'Ticket no encontrado')}</p></div>;

  return (
    <div className="min-h-screen bg-stone-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/support/tickets" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-950 mb-4">
          <ArrowLeft className="w-4 h-4" /> {t('common.back', 'Volver')}
        </Link>

        <header className="bg-white rounded-2xl border border-stone-200 p-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-xs text-stone-400 font-mono">{ticket.ticket_number}</p>
              <h1 className="text-xl font-semibold text-stone-950 mt-1">{ticket.subject}</h1>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-700">{t(`support.status.${ticket.status}`, ticket.status)}</span>
          </div>
          <p className="text-xs text-stone-500">{t(`support.cat.${ticket.category}`, ticket.category)} · {new Date(ticket.created_at).toLocaleString()}</p>
        </header>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 mb-4">
          {messages.map((m) => (
            <div key={m.message_id} className={`flex ${m.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.sender_role === 'user' ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-950'
              }`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                {m.attachments?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {m.attachments.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer" className={`block text-xs underline ${m.sender_role === 'user' ? 'text-white/80' : 'text-stone-600'}`}>{a.filename}</a>
                    ))}
                  </div>
                )}
                <p className={`text-[10px] mt-1 ${m.sender_role === 'user' ? 'text-white/60' : 'text-stone-400'}`}>
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {ticket.status === 'closed' ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 text-center">
            <p className="text-sm text-stone-500 mb-3">{t('support.closedHint', 'Cerrado. Puedes reabrirlo dentro de 30 días si el problema persiste.')}</p>
            <button onClick={reopen} className="px-4 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800">{t('support.reopen', 'Reabrir')}</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder={t('support.replyPh', 'Escribe tu respuesta...')}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-stone-400"
            />
            <div className="flex justify-end mt-2">
              <button onClick={send} disabled={sending || !body.trim()} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800 disabled:opacity-40">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t('support.send', 'Enviar')}
              </button>
            </div>
          </div>
        )}
      </div>

      {showCsat && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCsat(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-stone-950">{t('support.csat.title', '¿Cómo fue la atención?')}</h3>
            <p className="text-sm text-stone-500">{t('support.csat.subtitle', 'Tu valoración nos ayuda a mejorar.')}</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setCsatRating(n)} className="p-2">
                  <Star className={`w-8 h-8 ${n <= csatRating ? 'fill-stone-950 text-stone-950' : 'text-stone-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              value={csatComment}
              onChange={(e) => setCsatComment(e.target.value)}
              rows={3}
              placeholder={t('support.csat.commentPh', 'Comentario opcional...')}
              maxLength={1000}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCsat(false)} className="px-4 py-2 rounded-xl border border-stone-200 text-sm text-stone-700">{t('common.skip', 'Omitir')}</button>
              <button onClick={submitCsat} disabled={csatRating < 1} className="px-4 py-2 rounded-xl bg-stone-950 text-white text-sm disabled:opacity-40">{t('common.send', 'Enviar')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
