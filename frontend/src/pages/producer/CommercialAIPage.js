import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Globe, TrendingUp, FileText, ArrowRight, Lock } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '../../context/AuthContext';
import { useProducerPlan } from '../../context/ProducerPlanContext';
import apiClient from '../../services/api/client';
import { useNavigate } from 'react-router-dom';

const SUGGESTIONS = [
  '¿Dónde vender mi aceite?',
  'Genera contrato B2B',
  '¿Qué mercados me recomiendas?',
  'Análisis de Alemania',
  'Regulaciones Francia',
];

const OPPORTUNITIES = [
  { flag: '🇩🇪', country: 'Alemania', product: 'Aceite de oliva ecológico', trend: '+34%', period: 'Q2 2026' },
  { flag: '🇫🇷', country: 'Francia', product: 'Jamón ibérico', trend: '+22%', period: 'Q1 2026' },
  { flag: '🇬🇧', country: 'Reino Unido', product: 'Vino tinto D.O.', trend: '+18%', period: 'Q3 2026' },
];

function parseMarkdownSafe(text) {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br/>');
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['strong', 'em', 'br'] });
}

function UpgradeBanner() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100">
        <Lock className="h-10 w-10 text-stone-400" />
      </div>
      <h2 className="mt-6 text-2xl font-bold text-stone-950">Agente Comercial IA</h2>
      <p className="mt-2 max-w-md text-stone-500">
        Accede a tu representante de ventas internacional con análisis de mercados,
        matching con importadores y generación de contratos.
      </p>
      <button
        onClick={() => navigate('/productor')}
        className="mt-8 rounded-full bg-[#5856D6] px-8 py-3 font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        Actualizar a ELITE
      </button>
    </div>
  );
}

export default function CommercialAIPage() {
  const { user } = useAuth();
  const { plan } = useProducerPlan();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isElite = plan?.toLowerCase() === 'elite';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  if (!isElite) {
    return <UpgradeBanner />;
  }

  const handleSend = async (text) => {
    const content = text || input.trim();
    if (!content || isLoading) return;

    const userMsg = { role: 'user', content, timestamp: new Date().toISOString() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setIsLoading(true);

    try {
      const data = await apiClient.post('/v1/commercial-ai/chat', {
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, timestamp: new Date().toISOString() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error al contactar al agente comercial.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-[32px] font-bold text-stone-950">Agente Comercial</h1>
          <span className="rounded-full bg-[#5856D6] px-3 py-1 text-xs font-semibold text-white">ELITE</span>
        </div>
        <p className="mt-1 text-stone-500">Tu representante de ventas internacional</p>
      </div>

      {/* Opportunities */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-stone-950">Oportunidades detectadas</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {OPPORTUNITIES.map((opp) => (
            <div
              key={opp.country}
              className="min-w-[240px] flex-shrink-0 rounded-apple-lg border border-stone-200 bg-white p-5 shadow-apple-sm transition-all hover:shadow-apple-md"
            >
              <span className="text-2xl">{opp.flag}</span>
              <h3 className="mt-2 font-semibold text-stone-950">{opp.country}</h3>
              <p className="mt-1 text-sm text-stone-500">{opp.product}</p>
              <div className="mt-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-hs-green" />
                <span className="text-sm font-medium text-hs-green">Demanda {opp.trend}</span>
                <span className="text-xs text-stone-400">{opp.period}</span>
              </div>
              <button
                onClick={() => handleSend(`Analiza el mercado de ${opp.product} en ${opp.country}`)}
                className="mt-3 flex items-center gap-1 text-sm font-medium text-stone-950 transition-colors hover:text-stone-700"
              >
                Ver análisis <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="rounded-apple-xl border border-stone-200 bg-white shadow-apple-md">
        <div className="border-b border-stone-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5856D6]">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-stone-950">Chat con el Agente</p>
              <p className="text-xs text-stone-500">Claude Sonnet — análisis avanzado</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-12">
              <Globe className="h-12 w-12 text-stone-300" />
              <p className="mt-4 text-sm text-stone-500">Pregunta sobre mercados, regulaciones o importadores</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="rounded-full border border-stone-200 px-3 py-2 text-[13px] text-stone-700 transition-all hover:bg-stone-50 active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'bg-stone-950 text-white'
                      : 'bg-stone-50 text-stone-900'
                  }`}
                >
                  {isUser ? (
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                  ) : (
                    <div
                      className="text-[15px] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: parseMarkdownSafe(msg.content) }}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-1 rounded-2xl bg-stone-50 px-4 py-3 w-fit">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block h-2 w-2 rounded-full bg-stone-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-stone-100 p-4">
          <div className="flex items-center gap-2 rounded-full bg-stone-50 px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta al Agente Comercial..."
              className="flex-1 border-none bg-transparent text-[15px] text-stone-900 placeholder-stone-400 outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                input.trim() ? 'bg-[#5856D6] text-white' : 'bg-stone-200 text-stone-400'
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
