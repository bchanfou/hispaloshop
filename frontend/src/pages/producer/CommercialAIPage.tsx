// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Globe, TrendingUp, ArrowRight, Lock, FileText,
  BarChart3, Users, Sparkles, ChevronRight,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '../../context/AuthContext';
import { useProducerPlan } from '../../context/ProducerPlanContext';
import apiClient from '../../services/api/client';
import { useNavigate } from 'react-router-dom';

/* ───────── constants ───────── */

const SUGGESTIONS = [
  { icon: '🇩🇪', text: 'Analiza Alemania para aceite' },
  { icon: '📊', text: '¿Qué mercados me recomiendas?' },
  { icon: '📝', text: 'Genera un contrato B2B' },
  { icon: '🇫🇷', text: 'Regulaciones Francia' },
  { icon: '📈', text: 'Predice demanda 6 meses' },
];

const OPPORTUNITIES = [
  { flag: '🇩🇪', country: 'Alemania', product: 'Aceite de oliva ecológico', trend: '+34%', period: 'Q2 2026' },
  { flag: '🇫🇷', country: 'Francia', product: 'Jamón ibérico', trend: '+22%', period: 'Q1 2026' },
  { flag: '🇬🇧', country: 'Reino Unido', product: 'Vino tinto D.O.', trend: '+18%', period: 'Q3 2026' },
  { flag: '🇯🇵', country: 'Japón', product: 'Aceite AOVE premium', trend: '+15%', period: 'Q4 2026' },
];

const TOOL_LABELS = {
  search_importers: { icon: Users, label: 'Importadores', color: '#57534e' },
  analyze_market: { icon: BarChart3, label: 'Mercado', color: '#44403c' },
  predict_demand: { icon: TrendingUp, label: 'Predicción', color: '#0c0a09' },
  generate_contract: { icon: FileText, label: 'Contrato', color: '#78716c' },
  check_producer_plan: { icon: Sparkles, label: 'Plan', color: '#6E6E73' },
};

/* ───────── helpers ───────── */

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

/* ───────── UpgradeBanner ───────── */

function UpgradeBanner() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-20 h-20 rounded-full bg-stone-50 flex items-center justify-center mb-7">
        <Lock size={36} className="text-stone-400" strokeWidth={1.5} />
      </div>

      <h2 className="text-[28px] font-bold text-stone-950 tracking-tight mb-3">
        Agente Comercial IA
      </h2>

      <p className="text-base text-stone-500 leading-relaxed max-w-[420px] mb-9">
        Accede a tu representante de ventas internacional con análisis de mercados,
        matching con importadores y generación de contratos.
      </p>

      <button
        onClick={() => navigate('/productor')}
        className="px-8 py-3.5 rounded-full bg-stone-700 text-white border-none text-[15px] font-semibold cursor-pointer transition-transform duration-200 hover:scale-[1.03]"
      >
        Actualizar a ELITE
      </button>
    </div>
  );
}

/* ───────── ToolCallCard ───────── */

function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_LABELS[toolCall.tool] || { icon: Globe, label: toolCall.tool, color: '#6E6E73' };
  const Icon = meta.icon;

  return (
    <div className="rounded-[14px] border border-black/[0.08] bg-white overflow-hidden mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none cursor-pointer text-[13px] text-stone-950"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${meta.color}14` }}
        >
          <Icon size={14} color={meta.color} />
        </div>
        <span className="font-semibold flex-1 text-left">
          {meta.label}
        </span>
        <ChevronRight
          size={14}
          className="text-stone-400 transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>
      {expanded && (
        <div className="px-3.5 pb-3 text-xs text-stone-500 font-mono leading-relaxed whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
          {JSON.stringify(toolCall.result, null, 2)}
        </div>
      )}
    </div>
  );
}

/* ───────── Main Page ───────── */

export default function CommercialAIPage() {
  const { user } = useAuth();
  const { plan } = useProducerPlan();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState([]);
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
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
      });

      if (data.tool_calls?.length) {
        setToolCalls(prev => [...prev, ...data.tool_calls]);
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.response,
          toolCalls: data.tool_calls || [],
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error al contactar al agente comercial. Inténtalo de nuevo.',
          timestamp: new Date().toISOString(),
        },
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

  const hasMessages = messages.length > 0;

  return (
    <div className="max-w-[920px] mx-auto px-5 pt-8 pb-[120px]">
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1.5">
          <h1 className="text-[32px] font-bold text-stone-950 tracking-tight m-0">
            Agente Comercial
          </h1>
          <span className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-[11px] font-bold tracking-wide">
            ELITE
          </span>
        </div>
        <p className="text-[15px] text-stone-500 m-0">
          Tu representante de ventas internacional con IA
        </p>
      </div>

      {/* ── Opportunity Cards ── */}
      {!hasMessages && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="mb-8"
        >
          <h2 className="text-[17px] font-semibold text-stone-950 mb-4">
            Oportunidades detectadas
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {OPPORTUNITIES.map((opp, i) => (
              <motion.div
                key={opp.country}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="min-w-[220px] shrink-0 snap-start rounded-2xl border border-black/[0.08] bg-white px-[18px] py-5 shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => handleSend(`Analiza el mercado de ${opp.product} en ${opp.country}`)}
              >
                <span className="text-[28px]">{opp.flag}</span>
                <p className="text-[15px] font-semibold text-stone-950 mt-2.5 mb-1">
                  {opp.country}
                </p>
                <p className="text-[13px] text-stone-500 m-0 mb-2.5">
                  {opp.product}
                </p>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-stone-950" />
                  <span className="text-[13px] font-semibold text-stone-950">
                    {opp.trend}
                  </span>
                  <span className="text-[11px] text-stone-400">{opp.period}</span>
                </div>
                <div className="flex items-center gap-1 mt-2.5 text-[13px] font-medium text-stone-950">
                  Ver análisis <ArrowRight size={13} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Chat Container ── */}
      <div className="rounded-[18px] border border-black/[0.08] bg-white shadow-md overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.08]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #44403c, #57534e)' }}>
            <Globe size={20} color="#FFFFFF" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-stone-950 m-0">
              Chat con el Agente
            </p>
            <p className="text-xs text-stone-500 m-0">
              Claude Sonnet — análisis avanzado
            </p>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-stone-950" />
        </div>

        {/* Messages Area */}
        <div
          className="overflow-y-auto px-5 pt-5 pb-3 transition-[height] duration-300 ease-in-out"
          style={{ height: hasMessages ? 420 : 320 }}
        >
          {/* Empty state */}
          {!hasMessages && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center mb-4">
                <Globe size={28} className="text-stone-400" strokeWidth={1.5} />
              </div>
              <p className="text-[15px] text-stone-500 mb-5 max-w-[320px] m-0">
                Pregunta sobre mercados, regulaciones o importadores
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-[480px]">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.text}
                    onClick={() => handleSend(s.text)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-black/[0.08] bg-white text-[13px] text-stone-950 cursor-pointer transition-colors duration-200 hover:bg-stone-50"
                  >
                    <span>{s.icon}</span> {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          <AnimatePresence>
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[80%]">
                    {/* Tool call cards before assistant message */}
                    {!isUser && msg.toolCalls?.length > 0 && (
                      <div className="mb-2">
                        {msg.toolCalls.map((tc, j) => (
                          <ToolCallCard key={j} toolCall={tc} />
                        ))}
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 ${isUser ? 'bg-[#0A0A0A] text-white rounded-[18px_18px_4px_18px]' : 'bg-stone-50 text-stone-950 rounded-[18px_18px_18px_4px]'}`}
                    >
                      {isUser ? (
                        <p className="text-[15px] leading-relaxed m-0">
                          {msg.content}
                        </p>
                      ) : (
                        <div
                          className="text-[15px] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: parseMarkdownSafe(msg.content) }}
                        />
                      )}
                    </div>
                    <p className={`text-[11px] text-stone-400 mt-1 mx-1 ${isUser ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Loading dots */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-[5px] px-4 py-3 rounded-[18px_18px_18px_4px] bg-stone-50 w-fit"
            >
              {[0, 1, 2].map(i => (
                <motion.span
                  key={i}
                  className="block w-[7px] h-[7px] rounded-full bg-stone-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-black/[0.08]">
          <div className="flex items-center gap-2.5 pl-[18px] pr-1.5 py-1.5 rounded-full bg-stone-50 border border-black/[0.08] transition-all duration-200">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta al Agente Comercial..."
              className="flex-1 border-none bg-transparent text-[15px] text-stone-950 outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className={`w-9 h-9 rounded-full border-none flex items-center justify-center shrink-0 transition-all duration-200 ${
                input.trim()
                  ? 'bg-[#0A0A0A] text-white cursor-pointer'
                  : 'bg-stone-50 text-stone-400 cursor-default'
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {!hasMessages && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 mt-6"
        >
          {[
            { label: 'Mercados', value: '9', sub: 'países analizados' },
            { label: 'Importadores', value: '150+', sub: 'verificados' },
            { label: 'Contratos', value: 'PDF', sub: 'generación automática' },
            { label: 'Datos', value: '2026', sub: 'actualizados' },
          ].map((stat, i) => (
            <div key={stat.label} className="rounded-[14px] bg-white border border-black/[0.08] px-4 py-[18px] text-center">
              <p className="text-2xl font-bold text-stone-950 tracking-tight mb-0.5 m-0">
                {stat.value}
              </p>
              <p className="text-[13px] font-semibold text-stone-950 mb-0.5 m-0">
                {stat.label}
              </p>
              <p className="text-xs text-stone-400 m-0">
                {stat.sub}
              </p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
