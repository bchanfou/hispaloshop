import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, TrendingUp, Trash2, FileText, Target, Bell } from 'lucide-react';
import DOMPurify from 'dompurify';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: Array<{ tool: string; input: unknown; result: unknown }>;
}

interface RebecaAlert {
  severity: 'high' | 'medium' | 'low';
  type: string;
  message: string;
  action: string;
}

interface RebecaProfile {
  onboarding_completed: boolean;
  interaction_count: number;
  business_profile: {
    category_focus?: string;
    stage?: string;
    main_goal?: string;
    main_pain?: string;
  };
}

const QUICK_PROMPTS_ONBOARDED = [
  { label: 'Resumen semanal', icon: FileText, prompt: 'Hazme el resumen semanal de mi negocio y propón 3 acciones' },
  { label: 'Mis objetivos', icon: Target, prompt: '¿Cómo voy con mis objetivos este mes?' },
  { label: 'Oportunidades', icon: TrendingUp, prompt: 'Analiza mi tienda y dame las 3 mayores oportunidades ahora mismo' },
  { label: 'Competencia', icon: Bell, prompt: 'Compárame con otros productores de mi categoría' },
];

const QUICK_PROMPTS_NEW = [
  { label: 'Diagnóstico inicial', icon: TrendingUp, prompt: 'Hola Rebeca, analiza mi tienda y dime qué 3 cosas debería mejorar primero' },
  { label: 'Mis ventas', icon: FileText, prompt: 'Enséñame cómo van mis ventas este mes' },
  { label: 'Precios', icon: Target, prompt: '¿Mis precios están bien comparados con la competencia?' },
  { label: 'Reseñas', icon: Bell, prompt: 'Resumen de mis reseñas' },
];

function parseMarkdownSafe(text: string): string {
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

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-950">
        <span className="text-[10px] font-semibold text-white">R</span>
      </div>
      <div className="flex gap-1 rounded-2xl rounded-bl-[4px] bg-stone-100 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-2 w-2 rounded-full bg-stone-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

function getStoredMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem('rebeca_ai_messages');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeMessages(msgs: Message[]) {
  try {
    sessionStorage.setItem('rebeca_ai_messages', JSON.stringify(msgs.slice(-50)));
  } catch {}
}

export default function RebecaAI() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(() => getStoredMessages());
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [alerts, setAlerts] = useState<RebecaAlert[]>([]);
  const [profile, setProfile] = useState<RebecaProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Load profile + alerts on mount (for pulse indicator)
  useEffect(() => {
    apiClient.get('/v1/rebeca-ai/profile').then(setProfile).catch(() => {});
    apiClient.get('/v1/rebeca-ai/alerts').then((data: any) => {
      if (data?.alerts) setAlerts(data.alerts);
    }).catch(() => {});
  }, []);

  const hasUrgentAlerts = alerts.some((a) => a.severity === 'high');
  const alertCount = alerts.length;
  const isOnboarded = profile?.onboarding_completed ?? false;
  const quickPrompts = isOnboarded ? QUICK_PROMPTS_ONBOARDED : QUICK_PROMPTS_NEW;

  const clearChat = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem('rebeca_ai_messages');
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      toolCalls: [],
    };

    setMessages((prev) => {
      const next = [...prev, userMessage];
      storeMessages(next);
      return next;
    });
    setIsLoading(true);
    setInput('');

    try {
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const data = await apiClient.post('/v1/rebeca-ai/chat', { messages: allMessages });

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'Lo siento, no he podido procesar tu mensaje.',
        timestamp: new Date().toISOString(),
        toolCalls: data.tool_calls || [],
      };

      setMessages((prev) => {
        const next = [...prev, assistantMessage];
        storeMessages(next);
        return next;
      });
    } catch (err: any) {
      const is403 = err?.response?.status === 403 || err?.status === 403;
      const is429 = err?.response?.status === 429 || err?.status === 429;
      const errorMessage: Message = {
        role: 'assistant',
        content: is403
          ? 'Rebeca AI está disponible en planes PRO y ELITE.'
          : is429
          ? 'Demasiadas solicitudes. Espera un momento.'
          : 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.',
        timestamp: new Date().toISOString(),
        toolCalls: [],
      };
      setMessages((prev) => {
        const next = [...prev, errorMessage];
        storeMessages(next);
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-[88px] right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-stone-950 shadow-[0_4px_24px_rgba(0,0,0,0.20)] transition-transform hover:scale-105 active:scale-95"
            aria-label="Abrir Rebeca"
          >
            <TrendingUp className="h-6 w-6 text-white" />

            {/* Urgent alert pulse ring */}
            {hasUrgentAlerts && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-white"
                animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            )}

            {/* Alert count badge */}
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-stone-950 shadow">
                {alertCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-[20px] bg-white shadow-lg md:inset-x-auto md:bottom-4 md:right-4 md:h-[600px] md:w-[380px] md:rounded-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-950">
                    <span className="text-sm font-semibold text-white">R</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-semibold text-stone-950">Rebeca</span>
                      <span className="h-2 w-2 rounded-full bg-stone-950" />
                    </div>
                    <p className="text-[12px] text-stone-500">Tu asesora comercial</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                      aria-label="Limpiar chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center pt-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                      <TrendingUp className="h-8 w-8 text-stone-950" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-stone-950">Hola, soy Rebeca</h3>
                    <p className="mt-1 text-center text-sm text-stone-500">
                      Tu asesora comercial para el mercado local
                    </p>

                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {QUICK_PROMPTS.map((label) => (
                        <button
                          key={label}
                          onClick={() => sendMessage(label)}
                          className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 transition-all hover:bg-stone-50 hover:shadow-sm active:scale-95"
                        >
                          <TrendingUp size={14} className="text-stone-500" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={i} className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-950">
                          <span className="text-[10px] font-semibold text-white">R</span>
                        </div>
                      )}
                      <div
                        className={`${isUser ? 'max-w-[75%]' : 'max-w-[85%]'} ${
                          isUser
                            ? 'rounded-2xl rounded-br-[4px] bg-stone-950 px-4 py-3 text-white'
                            : 'rounded-2xl rounded-bl-[4px] bg-stone-100 px-4 py-3 text-stone-950'
                        }`}
                      >
                        {isUser ? (
                          <p className="text-[15px] leading-relaxed">{msg.content}</p>
                        ) : (
                          <div
                            className="text-[15px] leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: parseMarkdownSafe(msg.content || '') }}
                          />
                        )}
                        {msg.timestamp && (
                          <p className="mt-1 text-[11px] text-stone-400">
                            {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-stone-100 p-4">
                <div className="flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pregunta a Rebeca..."
                    className="flex-1 border-none bg-transparent text-[15px] text-stone-950 placeholder-stone-400 outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                      input.trim()
                        ? 'bg-stone-950 text-white hover:scale-105'
                        : 'bg-stone-200 text-stone-400'
                    }`}
                    aria-label="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
