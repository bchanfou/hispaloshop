import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { apiClient } from '../../services/api/client';

/**
 * Iris — AI assistant for country admins.
 *
 * Reuses the existing /ai/chat endpoint with a custom system prompt that
 * embeds the country admin's KPI context. Strict scoping is enforced
 * server-side (the context endpoint already filters by the admin's country).
 */
export default function IrisAssistant({ overview, countryCode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open || context) return;
    (async () => {
      try {
        const data = await apiClient.get('/country-admin/ai/context');
        setContext(data);
      } catch {
        setContext({ error: true });
      }
    })();
  }, [open, context]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const buildSystemPrompt = () => {
    if (!context || context.error) return '';
    const k = context.kpis || {};
    const ai = context.action_items || {};
    return [
      `You are Iris, the AI assistant for the country admin of ${context.country_name} (${context.country_code}).`,
      `Currency: ${context.currency}. Languages: ${(context.languages || []).join(', ')}.`,
      `Current KPIs (this month): GMV ${k.gmv_month_local} ${context.currency} (~$${k.gmv_month_usd}), ${k.orders_month} orders, refund rate ${k.refund_rate_pct}%, ${k.active_sellers} active sellers, ${k.pending_verifications} pending verifications.`,
      `Action items: ${ai.overdue_verifications} overdue verifications, ${ai.reported_products} reported products, ${ai.open_tickets} open tickets.`,
      'You only have data for this admin\'s country. If asked about other countries, refuse politely.',
      'Detect the user language and reply in their language.',
      'Be concise, neutral, professional. No emojis.',
    ].join(' ');
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setInput('');
    setSending(true);

    try {
      // Reuse the generic AI chat endpoint with a custom system prompt.
      const data = await apiClient.post('/ai/chat', {
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: text },
        ],
      });
      const reply = data?.reply || data?.message || data?.content || t('countryAdmin.iris.noReply', 'Sin respuesta');
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: t('countryAdmin.iris.error', 'No pude responder ahora mismo. Intenta de nuevo en unos minutos.'),
      }]);
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    t('countryAdmin.iris.q1', '¿Por qué bajó el GMV este mes?'),
    t('countryAdmin.iris.q2', '¿Qué productos reportados debo revisar primero?'),
    t('countryAdmin.iris.q3', 'Dame un resumen para mi reporte semanal'),
    t('countryAdmin.iris.q4', '¿Qué seller tiene peor SLA?'),
  ];

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-stone-700 text-white shadow-lg hover:bg-stone-950 transition-colors flex items-center justify-center"
          aria-label={t('countryAdmin.iris.open', 'Abrir Iris')}
        >
          <Sparkles className="w-5 h-5" strokeWidth={1.5} />
        </button>
      )}

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end p-0 md:p-6 bg-black/40">
          <div className="bg-white w-full md:w-[420px] md:h-[600px] h-full md:rounded-2xl flex flex-col shadow-2xl">
            <header className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-stone-700 text-white flex items-center justify-center">
                  <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-semibold text-stone-950 text-sm">Iris</p>
                  <p className="text-xs text-stone-500">
                    {t('countryAdmin.iris.subtitle', 'Asistente para country admins')}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-stone-500 hover:text-stone-950">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-stone-600">
                    {t('countryAdmin.iris.intro', 'Hola, soy Iris. Tengo el contexto actual de tu país. Pregúntame lo que quieras.')}
                  </p>
                  <div className="space-y-2">
                    {quickPrompts.map((q) => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="block w-full text-left text-xs px-3 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === 'user'
                      ? 'ml-auto bg-stone-950 text-white'
                      : 'mr-auto bg-stone-100 text-stone-950'
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {sending && (
                <div className="mr-auto bg-stone-100 rounded-2xl px-4 py-2 text-sm text-stone-500 inline-flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Iris…
                </div>
              )}
            </div>

            <footer className="p-3 border-t border-stone-200 flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                placeholder={t('countryAdmin.iris.placeholder', 'Pregunta a Iris…')}
                className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm"
                disabled={sending}
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="w-10 h-10 rounded-xl bg-stone-950 text-white hover:bg-stone-800 disabled:opacity-40 flex items-center justify-center"
              >
                <Send className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
