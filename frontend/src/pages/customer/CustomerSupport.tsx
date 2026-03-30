// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Loader2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';

// ── Helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES = {
  'abierto':                'bg-stone-100 text-stone-700',
  'en revisión':            'bg-stone-200 text-stone-800',
  'pendiente de respuesta': 'bg-stone-300 text-stone-800',
  'escalado a humano':      'bg-stone-800 text-white',
  'resuelto':               'bg-stone-50 text-stone-500',
  'cerrado':                'bg-stone-50 text-stone-400',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] || 'bg-stone-100 text-stone-600'}`}>
      {status || '—'}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTs(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ── CaseDetail — inline thread view ──────────────────────────────────

function CaseDetail({ caseData, onBack, onMessageSent }) {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const isClosed = ['resuelto', 'cerrado', 'resolved', 'closed'].includes(caseData.status);
  const messages = caseData.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const msg = await apiClient.post(
        `/support/my-cases/${caseData.case_id}/messages`,
        { content: reply.trim() },
      );
      onMessageSent(caseData.case_id, msg);
      setReply('');
    } catch (err) {
      toast.error(err.message || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Ver todos los casos
      </button>

      {/* Case header */}
      <div className="rounded-[24px] border border-stone-100 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xs text-stone-400">#{(caseData.case_id || '').slice(0, 8)}</p>
            <h2 className="mt-1 text-lg font-semibold capitalize text-stone-950">
              {caseData.issue_type || 'Caso de soporte'}
            </h2>
            <p className="mt-1 text-xs text-stone-500">Abierto el {formatDate(caseData.created_at)}</p>
          </div>
          <StatusBadge status={caseData.status} />
        </div>
        {caseData.description && (
          <p className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-600">
            {caseData.description}
          </p>
        )}
      </div>

      {/* Thread */}
      <div className="rounded-[24px] border border-stone-100 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-stone-950">Conversación</h3>

        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-400">
            Aún no hay mensajes. Recibirás una respuesta en breve.
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.message_id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? 'bg-stone-950 text-white rounded-br-md' : 'bg-stone-100 text-stone-950 rounded-bl-md'}`}>
                    {!isUser && (
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                        Soporte Hispaloshop
                      </p>
                    )}
                    <p>{msg.content}</p>
                    {msg.created_at && (
                      <p className="mt-1 text-[10px] opacity-50">{formatTs(msg.created_at)}</p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {caseData.status === 'escalado a humano' && (
          <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            Un agente humano se ha unido a la conversación.
          </div>
        )}

        {isClosed && (
          <p className="text-sm text-stone-500 text-center py-4">
            Este caso está cerrado
          </p>
        )}

        <form onSubmit={handleSend} className="mt-5 flex items-end gap-3">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Escribe un mensaje..."
            rows={2}
            disabled={isClosed}
            className={`flex-1 resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-stone-400 ${isClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          <button
            type="submit"
            disabled={!reply.trim() || sending || isClosed}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white transition-colors hover:bg-stone-800 disabled:opacity-40 ${isClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────

export default function CustomerSupport() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get('/support/my-cases');
      setCases(Array.isArray(data) ? data : []);
    } catch {
      toast.error('No se pudo cargar tu historial de soporte');
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpenCase = async (caseItem) => {
    try {
      const data = await apiClient.get(`/support/my-cases/${caseItem.case_id}`);
      setSelectedCase(data);
    } catch {
      toast.error('No se pudo abrir el caso');
    }
  };

  const handleMessageSent = (caseId, newMsg) => {
    setSelectedCase((prev) =>
      prev && prev.case_id === caseId
        ? { ...prev, messages: [...(prev.messages || []), newMsg], status: 'pendiente de respuesta' }
        : prev,
    );
    setCases((prev) =>
      prev.map((c) =>
        c.case_id === caseId ? { ...c, status: 'pendiente de respuesta' } : c,
      ),
    );
  };

  if (selectedCase) {
    return (
      <div className="mx-auto max-w-[975px] p-4 sm:p-6">
        <CaseDetail
          caseData={selectedCase}
          onBack={() => setSelectedCase(null)}
          onMessageSent={handleMessageSent}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[975px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-950">Mis solicitudes</h1>
        <p className="mt-1 text-sm text-stone-500">
          Historial de tus casos de soporte con Hispaloshop.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-[24px] border border-stone-100 bg-white p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-3 w-16 bg-stone-100 rounded" />
                <div className="h-5 w-20 bg-stone-100 rounded-full" />
              </div>
              <div className="h-4 w-48 bg-stone-100 rounded" />
              <div className="h-3 w-32 bg-stone-100 rounded" />
            </div>
          ))}
        </div>
      ) : cases.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-stone-200 bg-white px-6 py-16 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-stone-200" />
          <h2 className="mt-4 text-base font-semibold text-stone-950">Sin solicitudes</h2>
          <p className="mt-2 text-sm text-stone-500">
            No tienes ningún caso de soporte abierto. Si necesitas ayuda, habla con HI.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <button
              key={c.case_id}
              type="button"
              onClick={() => handleOpenCase(c)}
              className="flex w-full items-start justify-between gap-4 rounded-[24px] border border-stone-100 bg-white p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[10px] text-stone-400">#{(c.case_id || '').slice(0, 8)}</p>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1.5 text-sm font-semibold capitalize text-stone-950">
                  {c.issue_type || 'Solicitud de soporte'}
                </p>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-stone-500">{c.description}</p>
                )}
                <p className="mt-2 text-xs text-stone-400">{formatDate(c.created_at)}</p>
              </div>
              <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-stone-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
