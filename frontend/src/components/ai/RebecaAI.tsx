import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, TrendingUp, Trash2, FileText, Target, Bell, RotateCw, ChevronLeft, Activity } from 'lucide-react';
import DOMPurify from 'dompurify';
import apiClient from '../../services/api/client';
import { trackEvent } from '../../utils/analytics';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: Array<{ tool: string; input: unknown; result: unknown }>;
  failed?: boolean;       // true if send failed — shows retry button
  originalText?: string;  // original user text, used for retry
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

interface RebecaGoal {
  goal_id: string;
  type: string;
  target: number;
  period: string;
  current_progress?: number;
  progress_pct?: number;
}

interface RebecaBriefing {
  summary: {
    revenue: number;
    orders: number;
    items_sold: number;
    revenue_change_pct: number;
    avg_rating: number;
    new_reviews: number;
  };
  alerts: RebecaAlert[];
  opportunities: Array<{ title: string; action: string; impact: string }>;
  recommended_actions: Array<{ priority: number; title: string; action: string; why: string }>;
}

interface RebecaHealth {
  overall_score: number;
  dimensions: Record<string, { score: number; label: string; detail: string }>;
  insights: Array<{ dimension: string; severity: 'high' | 'medium' | 'low'; message: string }>;
}

type PanelView = null | 'alerts' | 'briefing' | 'goals' | 'health';

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

export default function RebecaAI({ onRequestClose }: { onRequestClose?: () => void } = {}) {
  const [messages, setMessages] = useState<Message[]>(() => getStoredMessages());
  const [isLoading, setIsLoading] = useState(false);
  const isManaged = typeof onRequestClose === 'function';
  const [isOpen, setIsOpen] = useState(isManaged);
  const [input, setInput] = useState('');
  const [alerts, setAlerts] = useState<RebecaAlert[]>([]);
  const [profile, setProfile] = useState<RebecaProfile | null>(null);
  const [panelView, setPanelView] = useState<PanelView>(null);
  const [briefing, setBriefing] = useState<RebecaBriefing | null>(null);
  const [goals, setGoals] = useState<RebecaGoal[]>([]);
  const [health, setHealth] = useState<RebecaHealth | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
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
    apiClient.get('/v1/rebeca-ai/alerts').then((data: { alerts?: RebecaAlert[] }) => {
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

      trackEvent('rebeca_message_sent', { has_tool_call: (data.tool_calls || []).length > 0 });
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
      const status = err?.response?.status ?? err?.status;
      const is403 = status === 403;
      const is429 = status === 429;
      const isNetwork = !status;
      const isRetryable = is429 || isNetwork || (status >= 500 && status < 600);
      const errorMessage: Message = {
        role: 'assistant',
        content: is403
          ? 'Rebeca AI está disponible en planes PRO y ELITE.'
          : is429
          ? 'Demasiadas solicitudes. Espera un momento.'
          : isNetwork
          ? 'Sin conexión. Comprueba tu red.'
          : 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.',
        timestamp: new Date().toISOString(),
        toolCalls: [],
        failed: isRetryable,
        originalText: isRetryable ? text : undefined,
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

  const retryMessage = useCallback((failedMessage: Message) => {
    if (!failedMessage.originalText) return;
    // Remove the failed error message and resend
    setMessages((prev) => {
      const next = prev.filter((m) => m !== failedMessage);
      storeMessages(next);
      return next;
    });
    sendMessage(failedMessage.originalText);
  }, [sendMessage]);

  const openPanel = useCallback(async (view: Exclude<PanelView, null>) => {
    setPanelView(view);
    setPanelError(null);
    if (view === 'alerts') { trackEvent('rebeca_alert_viewed', { alert_type: 'all' }); return; }
    setPanelLoading(true);
    try {
      if (view === 'briefing') {
        const data = await apiClient.get('/v1/rebeca-ai/briefing');
        setBriefing(data);
        trackEvent('rebeca_briefing_viewed');
      } else if (view === 'goals') {
        const data = await apiClient.get('/v1/rebeca-ai/goals');
        setGoals(data?.goals || []);
      } else if (view === 'health') {
        const data = await apiClient.get('/v1/rebeca-ai/health');
        setHealth(data);
      }
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status;
      if (status === 429) {
        setPanelError('Demasiadas peticiones. Espera un momento.');
      } else if (status >= 500) {
        setPanelError('Error del servidor. Inténtalo de nuevo.');
      } else if (!status) {
        setPanelError('Sin conexión. Comprueba tu red.');
      } else {
        setPanelError('No pudimos cargar los datos.');
      }
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const closePanel = useCallback(() => {
    setPanelView(null);
    setPanelError(null);
  }, []);

  const handleCloseRebeca = useCallback(() => {
    if (isManaged) { onRequestClose?.(); return; }
    setIsOpen(false);
  }, [isManaged, onRequestClose]);

  // ESC key closes panel (nested) or chat (if no panel open)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (panelView) closePanel();
        else handleCloseRebeca();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, panelView, closePanel]);

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isManaged && !isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => { setIsOpen(true); trackEvent('rebeca_opened'); }}
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
              onClick={handleCloseRebeca}
            />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rebeca-dialog-title"
              className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-[20px] bg-white shadow-lg md:inset-x-auto md:bottom-4 md:right-4 md:h-[600px] md:w-[380px] md:rounded-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-950">
                    <span className="text-sm font-semibold text-white">R</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span id="rebeca-dialog-title" className="text-[15px] font-semibold text-stone-950">Rebeca</span>
                      <span className="h-2 w-2 rounded-full bg-stone-950" />
                    </div>
                    <p className="truncate text-[11px] text-stone-500">Tu asesora comercial</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {/* Alerts */}
                  <button
                    onClick={() => openPanel('alerts')}
                    className="relative rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
                    aria-label={`Alertas (${alertCount})`}
                  >
                    <Bell className="h-4 w-4" />
                    {alertCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-stone-950 px-1 text-[9px] font-bold text-white">
                        {alertCount}
                      </span>
                    )}
                  </button>
                  {/* Briefing */}
                  <button
                    onClick={() => openPanel('briefing')}
                    className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
                    aria-label="Resumen semanal"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                  {/* Goals */}
                  <button
                    onClick={() => openPanel('goals')}
                    className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
                    aria-label="Mis objetivos"
                  >
                    <Target className="h-4 w-4" />
                  </button>
                  {/* Store Health */}
                  <button
                    onClick={() => openPanel('health')}
                    className="rounded-full p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-950"
                    aria-label="Salud de la tienda"
                  >
                    <Activity className="h-4 w-4" />
                  </button>
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
                    onClick={handleCloseRebeca}
                    className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* ── Onboarding CTA banner (new users) ── */}
              {profile && !isOnboarded && messages.length === 0 && (
                <div className="border-b border-stone-100 bg-stone-50 px-4 py-3">
                  <p className="text-[12px] font-semibold text-stone-950">
                    Completa tu perfil de negocio
                  </p>
                  <p className="mt-0.5 text-[11px] text-stone-500">
                    30 segundos para que personalice cada análisis a tu tienda.
                  </p>
                  <button
                    onClick={() => sendMessage('Hola Rebeca, hagamos mi diagnóstico inicial. Analiza mi tienda y pregúntame lo que necesites para mi perfil de negocio.')}
                    className="mt-2 rounded-full bg-stone-950 px-3 py-1 text-[11px] font-medium text-white hover:scale-105 transition-transform"
                  >
                    Empezar
                  </button>
                </div>
              )}

              {/* ── Action Panel overlay (alerts / briefing / goals / health) ── */}
              <AnimatePresence>
                {panelView && (
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-x-0 top-[57px] bottom-0 z-10 flex flex-col bg-white rounded-b-2xl md:rounded-b-2xl"
                  >
                    {/* Panel header */}
                    <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
                      <button
                        onClick={closePanel}
                        className="rounded-full p-1.5 text-stone-500 transition-colors hover:bg-stone-100"
                        aria-label="Volver al chat"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <h3 className="text-[14px] font-semibold text-stone-950">
                        {panelView === 'alerts' && 'Alertas'}
                        {panelView === 'briefing' && 'Resumen semanal'}
                        {panelView === 'goals' && 'Mis objetivos'}
                        {panelView === 'health' && 'Salud de la tienda'}
                      </h3>
                    </div>

                    {/* Panel content */}
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                      {panelLoading && (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
                        </div>
                      )}

                      {!panelLoading && panelError && (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                            <RotateCw className="h-5 w-5 text-stone-400" />
                          </div>
                          <p className="mt-3 text-[13px] text-stone-500">{panelError}</p>
                          <button
                            onClick={() => panelView && openPanel(panelView)}
                            className="mt-3 flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1.5 text-[12px] font-medium text-white hover:scale-105 transition-transform"
                          >
                            <RotateCw className="h-3 w-3" /> Reintentar
                          </button>
                        </div>
                      )}

                      {/* Alerts panel */}
                      {!panelLoading && !panelError && panelView === 'alerts' && (
                        <>
                          {alerts.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                              <Bell className="h-8 w-8 text-stone-300" />
                              <p className="mt-3 text-[13px] text-stone-500">Sin alertas ahora mismo.</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {alerts.map((alert, i) => (
                                <button
                                  key={`${alert.type}-${i}`}
                                  onClick={() => {
                                    closePanel();
                                    sendMessage(`${alert.message}. ${alert.action}.`);
                                  }}
                                  aria-label={`${alert.severity}: ${alert.message}`}
                                  className="flex w-full items-start gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-3 text-left transition-all hover:border-stone-300 hover:shadow-sm active:scale-[0.98]"
                                >
                                  <span
                                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                      alert.severity === 'high'
                                        ? 'bg-stone-950'
                                        : alert.severity === 'medium'
                                        ? 'bg-stone-600'
                                        : 'bg-stone-400'
                                    }`}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-medium text-stone-950">{alert.message}</p>
                                    <p className="mt-0.5 text-[12px] text-stone-500">→ {alert.action}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* Briefing panel */}
                      {!panelLoading && !panelError && panelView === "briefing" && (
                        <>
                          {!briefing ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                              <FileText className="h-8 w-8 text-stone-300" />
                              <p className="mt-3 text-[13px] text-stone-500">No se pudo generar el resumen.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Summary cards */}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-stone-200 bg-white p-3">
                                  <p className="text-[10px] uppercase tracking-wide text-stone-500">Ingresos 7d</p>
                                  <p className="mt-1 text-[18px] font-bold text-stone-950">{briefing.summary.revenue.toFixed(0)}€</p>
                                  {briefing.summary.revenue_change_pct !== 0 && (
                                    <p className={`mt-0.5 text-[11px] font-medium ${briefing.summary.revenue_change_pct > 0 ? 'text-stone-950' : 'text-stone-500'}`}>
                                      {briefing.summary.revenue_change_pct > 0 ? '↑' : '↓'} {Math.abs(briefing.summary.revenue_change_pct)}%
                                    </p>
                                  )}
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-white p-3">
                                  <p className="text-[10px] uppercase tracking-wide text-stone-500">Pedidos</p>
                                  <p className="mt-1 text-[18px] font-bold text-stone-950">{briefing.summary.orders}</p>
                                  <p className="mt-0.5 text-[11px] text-stone-500">{briefing.summary.items_sold} uds</p>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-white p-3">
                                  <p className="text-[10px] uppercase tracking-wide text-stone-500">Rating</p>
                                  <p className="mt-1 text-[18px] font-bold text-stone-950">{briefing.summary.avg_rating}★</p>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-white p-3">
                                  <p className="text-[10px] uppercase tracking-wide text-stone-500">Reseñas</p>
                                  <p className="mt-1 text-[18px] font-bold text-stone-950">{briefing.summary.new_reviews}</p>
                                </div>
                              </div>

                              {/* Recommended actions */}
                              {briefing.recommended_actions.length > 0 && (
                                <div>
                                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                    Acciones recomendadas
                                  </p>
                                  <div className="space-y-2">
                                    {briefing.recommended_actions.map((action, i) => (
                                      <button
                                        key={`action-${i}`}
                                        onClick={() => {
                                          closePanel();
                                          sendMessage(`${action.title}. ${action.action}.`);
                                        }}
                                        className="flex w-full items-start gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left transition-all hover:border-stone-300 hover:shadow-sm active:scale-[0.98]"
                                      >
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-950 text-[10px] font-bold text-white">
                                          {action.priority}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[13px] font-medium text-stone-950">{action.title}</p>
                                          <p className="mt-0.5 text-[11px] text-stone-500">{action.why}</p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Goals panel */}
                      {!panelLoading && !panelError && panelView === "goals" && (
                        <>
                          {goals.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                              <Target className="h-8 w-8 text-stone-300" />
                              <p className="mt-3 text-[13px] text-stone-500">Aún no tienes objetivos.</p>
                              <button
                                onClick={() => {
                                  closePanel();
                                  sendMessage('Ayúdame a crear un objetivo mensual de facturación');
                                }}
                                className="mt-4 rounded-full bg-stone-950 px-4 py-2 text-[12px] font-medium text-white hover:scale-105 transition-transform"
                              >
                                Crear mi primer objetivo
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {goals.map((goal) => {
                                const pct = Math.min(100, goal.progress_pct ?? 0);
                                const typeLabels: Record<string, string> = {
                                  revenue: 'Facturación',
                                  units: 'Unidades',
                                  new_customers: 'Nuevos clientes',
                                  rating: 'Rating medio',
                                  reviews: 'Reseñas nuevas',
                                };
                                return (
                                  <div
                                    key={goal.goal_id}
                                    className="rounded-xl border border-stone-200 bg-white p-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <p className="text-[13px] font-medium text-stone-950">
                                        {typeLabels[goal.type] || goal.type}
                                      </p>
                                      <span className="text-[11px] text-stone-500">{goal.period}</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[12px]">
                                      <span className="text-stone-950 font-semibold">
                                        {goal.current_progress ?? 0} / {goal.target}
                                      </span>
                                      <span className={`font-bold ${pct >= 100 ? 'text-stone-950' : 'text-stone-500'}`}>
                                        {pct.toFixed(0)}%
                                      </span>
                                    </div>
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                                      <div
                                        className="h-full rounded-full bg-stone-950 transition-all"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}

                      {/* Health panel */}
                      {!panelLoading && !panelError && panelView === 'health' && health && (
                        <div className="space-y-4">
                          {/* Overall score ring */}
                          <div className="flex flex-col items-center rounded-xl border border-stone-200 bg-white p-4">
                            <div className="relative flex h-20 w-20 items-center justify-center">
                              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="16" fill="none" stroke="#e7e5e4" strokeWidth="3" />
                                <circle
                                  cx="18" cy="18" r="16" fill="none" stroke="#0c0a09" strokeWidth="3"
                                  strokeDasharray={`${(health.overall_score / 100) * 100.53} 100.53`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="text-[20px] font-bold text-stone-950">{health.overall_score}</span>
                            </div>
                            <p className="mt-2 text-[11px] uppercase tracking-wide text-stone-500">Salud general</p>
                          </div>

                          {/* Dimension scores */}
                          <div className="space-y-2">
                            {(Object.entries(health.dimensions) as [string, { label: string; score: number; detail: string }][]).map(([key, dim]) => (
                              <div key={key} className="rounded-xl border border-stone-200 bg-white p-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[13px] font-medium text-stone-950">{dim.label}</p>
                                  <span className={`text-[12px] font-bold ${dim.score >= 70 ? 'text-stone-950' : dim.score >= 40 ? 'text-stone-600' : 'text-stone-400'}`}>
                                    {dim.score}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-stone-500">{dim.detail}</p>
                                <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-100">
                                  <div className="h-full rounded-full bg-stone-950 transition-all" style={{ width: `${dim.score}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Insights */}
                          {health.insights.length > 0 && (
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                {health.insights.length} insight{health.insights.length > 1 ? 's' : ''} accionable{health.insights.length > 1 ? 's' : ''}
                              </p>
                              <div className="space-y-2">
                                {health.insights.map((insight, i) => (
                                  <button
                                    key={`insight-${insight.dimension}-${i}`}
                                    onClick={() => {
                                      closePanel();
                                      sendMessage(insight.message);
                                    }}
                                    className="flex w-full items-start gap-2 rounded-xl border border-stone-200 bg-white p-3 text-left hover:border-stone-300 hover:shadow-sm transition-all"
                                  >
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${insight.severity === 'high' ? 'bg-stone-950' : insight.severity === 'medium' ? 'bg-stone-600' : 'bg-stone-400'}`} />
                                    <p className="text-[12px] text-stone-700 flex-1 min-w-0">{insight.message}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!panelLoading && !panelError && panelView === 'health' && !health && (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                          <Activity className="h-8 w-8 text-stone-300" />
                          <p className="mt-3 text-[13px] text-stone-500">Sin datos suficientes.</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center pt-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                      <TrendingUp className="h-8 w-8 text-stone-950" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-stone-950">
                      {isOnboarded ? 'Hola de nuevo' : 'Hola, soy Rebeca'}
                    </h3>
                    <p className="mt-1 text-center text-sm text-stone-500">
                      {isOnboarded
                        ? 'Tu asesora comercial, lista para ayudarte'
                        : 'Déjame analizar tu tienda en 30 segundos'}
                    </p>

                    <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-2">
                      {quickPrompts.map(({ label, icon: Icon, prompt }) => (
                        <button
                          key={label}
                          onClick={() => sendMessage(prompt)}
                          aria-label={`Enviar: ${label}`}
                          className="flex flex-col items-start gap-1.5 rounded-xl border border-stone-200 bg-white p-3 text-left text-[13px] text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50 hover:shadow-sm active:scale-95"
                        >
                          <Icon size={16} className="text-stone-950" />
                          <span className="font-medium text-stone-950">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  const key = `${msg.timestamp}-${msg.role}-${i}`;
                  return (
                    <div key={key} className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {!isUser && (
                        <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-950">
                          <span className="text-[10px] font-semibold text-white">R</span>
                        </div>
                      )}
                      <div
                        className={`${isUser ? 'max-w-[75%]' : 'max-w-[85%]'} ${
                          isUser
                            ? 'rounded-2xl rounded-br-[4px] bg-stone-950 px-4 py-3 text-white'
                            : msg.failed
                            ? 'rounded-2xl rounded-bl-[4px] border border-stone-200 bg-white px-4 py-3 text-stone-950'
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
                        {msg.failed && msg.originalText && (
                          <button
                            onClick={() => retryMessage(msg)}
                            disabled={isLoading}
                            className="mt-2 flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1 text-[12px] font-medium text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            aria-label="Reintentar envío"
                          >
                            <RotateCw className="h-3 w-3" />
                            <span>Reintentar</span>
                          </button>
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
