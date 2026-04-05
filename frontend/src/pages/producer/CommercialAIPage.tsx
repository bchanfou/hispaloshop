// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Globe, TrendingUp, ArrowRight, Lock, FileText,
  BarChart3, Users, Sparkles, ChevronRight, Bell, Target,
  Calendar, DollarSign, Mail, ClipboardList, Briefcase,
  RotateCw, X,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { useAuth } from '../../context/AuthContext';
import { useProducerPlan } from '../../context/ProducerPlanContext';
import apiClient from '../../services/api/client';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/* ───────── constants ───────── */

const DEFAULT_SUGGESTIONS = [
  { icon: '🔍', text: 'Detecta mis oportunidades de exportación' },
  { icon: '📋', text: 'Requisitos para exportar a Alemania' },
  { icon: '💰', text: 'Calcula costes Incoterm FOB vs DDP' },
  { icon: '📧', text: 'Crea un email de contacto para importador' },
  { icon: '📅', text: 'Ferias B2B próximas para mi producto' },
];

const TOOL_LABELS = {
  // Analytical
  search_importers: { icon: Users, label: 'Importadores', color: '#57534e' },
  smart_importer_match: { icon: Users, label: 'Matching IA', color: '#44403c' },
  analyze_market: { icon: BarChart3, label: 'Mercado', color: '#44403c' },
  predict_demand: { icon: TrendingUp, label: 'Predicción', color: '#0c0a09' },
  detect_export_opportunities: { icon: Sparkles, label: 'Oportunidades', color: '#0c0a09' },
  // Requirements & costs
  get_market_entry_requirements: { icon: ClipboardList, label: 'Requisitos', color: '#57534e' },
  calculate_incoterm_costs: { icon: DollarSign, label: 'Costes', color: '#44403c' },
  get_trade_shows: { icon: Calendar, label: 'Ferias', color: '#78716c' },
  // Content
  generate_pitch: { icon: Mail, label: 'Pitch email', color: '#57534e' },
  generate_contract: { icon: FileText, label: 'Contrato', color: '#78716c' },
  // Actions
  create_b2b_offer_draft: { icon: Briefcase, label: 'Oferta B2B', color: '#0c0a09' },
  send_offer_to_importer: { icon: Send, label: 'Enviar oferta', color: '#0c0a09' },
  // Pipeline/goals
  manage_pipeline: { icon: Users, label: 'Pipeline', color: '#44403c' },
  manage_export_goals: { icon: Target, label: 'Objetivos', color: '#44403c' },
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
        onClick={() => navigate('/producer/plan')}
        className="px-8 py-3.5 rounded-full bg-stone-700 text-white border-none text-[15px] font-semibold cursor-pointer transition-transform duration-200 hover:scale-[1.03]"
      >
        Actualizar a ELITE
      </button>
    </div>
  );
}

/* ───────── ToolCallCard ───────── */

function downloadPdfFromBase64(base64Data, filename = 'contrato_hispaloshop.pdf') {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_LABELS[toolCall.tool] || { icon: Globe, label: toolCall.tool, color: '#6E6E73' };
  const Icon = meta.icon;

  const hasPdf = toolCall.tool === 'generate_contract'
    && toolCall.result?.pdf_base64
    && toolCall.result?.pdf_generated !== false;

  return (
    <div className="rounded-[14px] border border-black/[0.08] bg-white overflow-hidden mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-transparent border-none cursor-pointer text-[13px] text-stone-950"
      >
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
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
        <div className="px-3.5 pb-3">
          {hasPdf && (
            <button
              onClick={() => downloadPdfFromBase64(toolCall.result.pdf_base64)}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-[13px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileText size={14} />
              Descargar contrato PDF
              {toolCall.result.pdf_size_kb && (
                <span className="text-stone-400 text-[11px]">({toolCall.result.pdf_size_kb} KB)</span>
              )}
            </button>
          )}
          <div className="text-xs text-stone-500 font-mono leading-relaxed whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
            {JSON.stringify(
              hasPdf ? { ...toolCall.result, pdf_base64: '[PDF data]' } : toolCall.result,
              null, 2,
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Main Page ───────── */

export default function CommercialAIPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { plan } = useProducerPlan();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicOpportunities, setDynamicOpportunities] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pedroProfile, setPedroProfile] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [goals, setGoals] = useState([]);
  const [panelView, setPanelView] = useState(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isElite = plan?.toLowerCase() === 'elite';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Load dynamic data (opportunities + alerts + profile) on mount for ELITE users
  useEffect(() => {
    if (!isElite) return;
    apiClient.get('/v1/commercial-ai/opportunities').then((data) => {
      if (data?.opportunities) setDynamicOpportunities(data.opportunities);
    }).catch(() => {});
    apiClient.get('/v1/commercial-ai/alerts').then((data) => {
      if (data?.alerts) setAlerts(data.alerts);
    }).catch(() => {});
    apiClient.get('/v1/commercial-ai/profile').then(setPedroProfile).catch(() => {});
  }, [isElite]);

  const alertCount = alerts.length;
  const hasUrgentAlerts = alerts.some((a) => a.severity === 'high');
  const isOnboarded = pedroProfile?.onboarding_completed ?? false;

  const openPanel = useCallback(async (view) => {
    setPanelView(view);
    setPanelError(null);
    if (view === 'alerts') return;
    setPanelLoading(true);
    try {
      if (view === 'briefing') {
        const data = await apiClient.get('/v1/commercial-ai/briefing');
        setBriefing(data);
      } else if (view === 'pipeline') {
        const data = await apiClient.get('/v1/commercial-ai/pipeline');
        setPipeline(data);
      } else if (view === 'goals') {
        const data = await apiClient.get('/v1/commercial-ai/goals');
        setGoals(data?.goals || []);
      }
    } catch (err) {
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

  // ESC key closes panel
  useEffect(() => {
    if (!panelView) return;
    const handler = (e) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [panelView, closePanel]);

  if (!isElite) {
    return <UpgradeBanner />;
  }

  const handleSend = async (text) => {
    const content = text || input.trim();
    if (!content || isLoading) return;

    const userMsg = { role: 'user', content, timestamp: new Date().toISOString() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    try {
      const data = await apiClient.post('/v1/commercial-ai/chat', {
        messages: allMessages.map(m => ({ role: m.role, content: m.content })),
      });

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
          content: t('commercial_a_i.errorAlContactarAlAgenteComercial', 'Error al contactar al agente comercial. Inténtalo de nuevo.'),
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

      {/* ── Action buttons: Alerts, Briefing, Pipeline, Goals ── */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => openPanel('alerts')}
          aria-label={`Alertas (${alertCount})`}
          className="relative flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-stone-950 transition-all hover:border-stone-300 hover:shadow-sm"
        >
          <Bell size={14} />
          Alertas
          {alertCount > 0 && (
            <span className={`ml-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${hasUrgentAlerts ? 'bg-stone-950' : 'bg-stone-600'}`}>
              {alertCount}
            </span>
          )}
        </button>
        <button
          onClick={() => openPanel('briefing')}
          aria-label="Briefing mensual de exportación"
          className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-stone-950 transition-all hover:border-stone-300 hover:shadow-sm"
        >
          <FileText size={14} />
          Briefing mensual
        </button>
        <button
          onClick={() => openPanel('pipeline')}
          aria-label="Pipeline de leads"
          className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-stone-950 transition-all hover:border-stone-300 hover:shadow-sm"
        >
          <Users size={14} />
          Pipeline
        </button>
        <button
          onClick={() => openPanel('goals')}
          aria-label="Objetivos de exportación"
          className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-[13px] font-medium text-stone-950 transition-all hover:border-stone-300 hover:shadow-sm"
        >
          <Target size={14} />
          Objetivos
        </button>
      </div>

      {/* ── Onboarding CTA (if not onboarded yet) ── */}
      {isElite && pedroProfile && !isOnboarded && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Sparkles size={18} className="mt-0.5 shrink-0 text-stone-950" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-stone-950">
                Completa tu perfil de exportación
              </p>
              <p className="mt-0.5 text-[12px] text-stone-500">
                Déjame 30 segundos para conocer tu negocio y personalizar cada análisis.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSend('Hola Pedro, hagamos mi diagnóstico inicial. Analiza mi tienda y pregúntame lo que necesites para mi perfil de exportación.')}
            className="shrink-0 rounded-full bg-stone-950 px-4 py-1.5 text-[12px] font-medium text-white transition-transform hover:scale-105"
          >
            Empezar
          </button>
        </motion.div>
      )}

      {/* ── Opportunity Cards (dynamic) ── */}
      {!hasMessages && dynamicOpportunities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="mb-8"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[17px] font-semibold text-stone-950">
              Tus oportunidades de exportación
            </h2>
            <span className="text-[11px] text-stone-400">Personalizadas por Pedro</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {dynamicOpportunities.map((opp, i) => (
              <motion.div
                key={opp.country_code}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="min-w-[240px] shrink-0 snap-start rounded-2xl border border-black/[0.08] bg-white px-[18px] py-5 shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => handleSend(`Analiza ${opp.country_name} para ${opp.category}, dame precios, importadores y requisitos`)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[28px]">{opp.flag}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700">
                    Score {opp.score}
                  </span>
                </div>
                <p className="text-[15px] font-semibold text-stone-950 mt-2.5 mb-1">
                  {opp.country_name}
                </p>
                <p className="text-[13px] text-stone-500 m-0 mb-2.5 capitalize">
                  {opp.category}
                </p>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp size={13} className="text-stone-950" />
                  <span className="text-[13px] font-semibold text-stone-950">
                    +{opp.growth_yoy_pct}% YoY
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 m-0">
                  {opp.avg_price_eur_kg ? `${opp.avg_price_eur_kg}€/kg · ` : ''}{opp.importers_on_platform} importadores · arancel {opp.tariff_pct}%
                </p>
                <div className="flex items-center gap-1 mt-2.5 text-[13px] font-medium text-stone-950">
                  Ver análisis <ArrowRight size={13} />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Panel Overlay (alerts / briefing / pipeline / goals) ── */}
      <AnimatePresence>
        {panelView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center pt-[80px] px-4"
            onClick={closePanel}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pedro-panel-title"
              className="w-full max-w-[600px] max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                <h3 id="pedro-panel-title" className="text-[16px] font-semibold text-stone-950">
                  {panelView === 'alerts' && 'Alertas'}
                  {panelView === 'briefing' && 'Briefing mensual'}
                  {panelView === 'pipeline' && 'Pipeline de leads'}
                  {panelView === 'goals' && 'Objetivos de exportación'}
                </h3>
                <button
                  onClick={closePanel}
                  className="p-1 rounded-full hover:bg-stone-100"
                  aria-label={`Cerrar panel de ${panelView}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {panelLoading && (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
                  </div>
                )}

                {!panelLoading && panelError && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                      <Lock size={20} className="text-stone-400" />
                    </div>
                    <p className="text-[13px] text-stone-500">{panelError}</p>
                    <button
                      onClick={() => openPanel(panelView)}
                      className="mt-3 flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1.5 text-[12px] font-medium text-white hover:scale-105 transition-transform"
                    >
                      <RotateCw size={12} /> Reintentar
                    </button>
                  </div>
                )}

                {/* Alerts panel */}
                {!panelLoading && !panelError && panelView === "alerts" && (
                  <div className="space-y-2">
                    {alerts.length === 0 ? (
                      <p className="text-center text-[14px] text-stone-500 py-8">Sin alertas ahora mismo.</p>
                    ) : alerts.map((alert, i) => (
                      <button
                        key={`${alert.type}-${alert.severity}-${i}`}
                        onClick={() => { closePanel(); handleSend(`${alert.message}. ${alert.action}.`); }}
                        className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-4 text-left hover:border-stone-300 hover:shadow-sm transition-all"
                      >
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${alert.severity === 'high' ? 'bg-stone-950' : alert.severity === 'medium' ? 'bg-stone-600' : 'bg-stone-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-medium text-stone-950">{alert.message}</p>
                          <p className="mt-1 text-[12px] text-stone-500">→ {alert.action}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Briefing panel */}
                {!panelLoading && !panelError && panelView === "briefing" && !briefing && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText size={32} className="mb-3 text-stone-300" />
                    <p className="text-[13px] text-stone-500">Aún no hay datos suficientes para generar el briefing.</p>
                  </div>
                )}
                {!panelLoading && !panelError && panelView === "briefing" && briefing && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-stone-200 bg-white p-4">
                        <p className="text-[10px] uppercase tracking-wide text-stone-500">Ofertas enviadas 30d</p>
                        <p className="mt-1 text-[22px] font-bold text-stone-950">{briefing.summary?.offers_sent || 0}</p>
                        {briefing.summary?.change_pct_vs_prev_month !== 0 && (
                          <p className="mt-0.5 text-[11px] text-stone-500">
                            {briefing.summary.change_pct_vs_prev_month > 0 ? '↑' : '↓'} {Math.abs(briefing.summary.change_pct_vs_prev_month)}% vs mes previo
                          </p>
                        )}
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-white p-4">
                        <p className="text-[10px] uppercase tracking-wide text-stone-500">Aceptadas</p>
                        <p className="mt-1 text-[22px] font-bold text-stone-950">{briefing.summary?.offers_accepted || 0}</p>
                        <p className="mt-0.5 text-[11px] text-stone-500">
                          Conv. {briefing.summary?.conversion_rate || 0}%
                        </p>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-white p-4">
                        <p className="text-[10px] uppercase tracking-wide text-stone-500">Ingresos B2B</p>
                        <p className="mt-1 text-[22px] font-bold text-stone-950">{briefing.summary?.total_revenue_eur || 0}€</p>
                      </div>
                      <div className="rounded-xl border border-stone-200 bg-white p-4">
                        <p className="text-[10px] uppercase tracking-wide text-stone-500">Pipeline activo</p>
                        <p className="mt-1 text-[22px] font-bold text-stone-950">{briefing.summary?.active_pipeline_leads || 0}</p>
                      </div>
                    </div>

                    {briefing.recommended_actions?.length > 0 && (
                      <div>
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Acciones recomendadas</p>
                        <div className="space-y-2">
                          {briefing.recommended_actions.map((action, i) => (
                            <button
                              key={`action-${i}`}
                              onClick={() => { closePanel(); handleSend(`${action.title}. ${action.action}.`); }}
                              className="flex w-full items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left hover:border-stone-300 transition-all"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-950 text-[11px] font-bold text-white">{action.priority}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-stone-950">{action.title}</p>
                                <p className="mt-0.5 text-[11px] text-stone-500">{action.why}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {briefing.upcoming_trade_shows?.length > 0 && (
                      <div>
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Próximas ferias</p>
                        <div className="space-y-2">
                          {briefing.upcoming_trade_shows.map((show, i) => (
                            <div key={`show-${i}`} className="rounded-xl border border-stone-200 bg-white p-3">
                              <p className="text-[13px] font-medium text-stone-950">{show.name} — {show.city}</p>
                              <p className="mt-0.5 text-[11px] text-stone-500">En {show.days_until} días · {show.date}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pipeline panel */}
                {!panelLoading && !panelError && panelView === "pipeline" && (
                  <div className="space-y-4">
                    {!pipeline || pipeline.total === 0 ? (
                      <p className="text-center text-[14px] text-stone-500 py-8">Sin leads en el pipeline aún.</p>
                    ) : (
                      Object.entries(pipeline.by_stage || {}).map(([stage, leads]) => (
                        <div key={stage}>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">{stage} ({leads.length})</p>
                          <div className="space-y-2">
                            {leads.map((lead) => (
                              <div key={lead.lead_id} className="rounded-xl border border-stone-200 bg-white p-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[13px] font-medium text-stone-950">{lead.importer_name || 'Importador'}</p>
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${lead.heat === 'hot' ? 'bg-stone-950 text-white' : lead.heat === 'warm' ? 'bg-stone-200 text-stone-950' : 'bg-stone-100 text-stone-500'}`}>
                                    {lead.heat}
                                  </span>
                                </div>
                                <p className="mt-1 text-[11px] text-stone-500">{lead.importer_country} · {lead.days_since_update}d sin update</p>
                                {lead.notes && <p className="mt-1 text-[11px] text-stone-400">{lead.notes}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Goals panel */}
                {!panelLoading && !panelError && panelView === "goals" && (
                  <div className="space-y-3">
                    {goals.length === 0 ? (
                      <div className="text-center py-8">
                        <Target size={32} className="mx-auto mb-3 text-stone-300" />
                        <p className="text-[14px] text-stone-500">Aún no tienes objetivos de exportación.</p>
                        <button
                          onClick={() => { closePanel(); handleSend('Ayúdame a crear mi primer objetivo de exportación'); }}
                          className="mt-4 rounded-full bg-stone-950 px-4 py-2 text-[12px] font-medium text-white hover:scale-105 transition-transform"
                        >
                          Crear mi primer objetivo
                        </button>
                      </div>
                    ) : goals.map((goal) => {
                      const pct = Math.min(100, goal.progress_pct ?? 0);
                      const typeLabels = {
                        first_contract: 'Primer contrato',
                        new_market_entry: 'Entrada a nuevo mercado',
                        export_revenue: 'Ingresos exportación',
                        new_importers: 'Nuevos importadores',
                      };
                      return (
                        <div key={goal.goal_id} className="rounded-xl border border-stone-200 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] font-medium text-stone-950">{typeLabels[goal.type] || goal.type}</p>
                            {goal.target_market && <span className="text-[11px] text-stone-500">{goal.target_market}</span>}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[12px]">
                            <span className="text-stone-950 font-semibold">{goal.current_progress ?? 0} / {goal.target}</span>
                            <span className={`font-bold ${pct >= 100 ? 'text-stone-950' : 'text-stone-500'}`}>{pct.toFixed(0)}%</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                            <div className="h-full rounded-full bg-stone-950 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {DEFAULT_SUGGESTIONS.map(s => (
                  <button
                    type="button"
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
                  key={`${msg.timestamp || 'nt'}-${msg.role}-${i}`}
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
                          <ToolCallCard key={`${msg.timestamp}-tc-${j}`} toolCall={tc} />
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
                      {msg.timestamp && !isNaN(new Date(msg.timestamp).getTime()) ? new Date(msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''}
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
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              aria-label="Enviar"
              className={`w-9 h-9 rounded-full border-none flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-40 ${
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
            { label: 'Herramientas', value: '15', sub: 'análisis, acciones, coaching' },
            { label: 'Mercados', value: '9', sub: 'con checklists detallados' },
            { label: 'Ferias B2B', value: '10+', sub: 'calendario 2026' },
            { label: 'Acciones', value: 'live', sub: 'ofertas, pipeline, pitches' },
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
