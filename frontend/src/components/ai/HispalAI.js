import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { X, Send, Sparkles, Mic, Trash2, RotateCw, Bell, Activity, BarChart3, ChevronLeft } from 'lucide-react';
import DOMPurify from 'dompurify';
import useHispalAI from '../../hooks/useHispalAI';
import { useAuth } from '../../context/AuthContext';
import ProductCardInChat from './ProductCardInChat';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

/* â”€â”€ Helpers â”€â”€ */

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

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-950">
        <Sparkles className="h-3 w-3 text-white" />
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

/* â”€â”€ Main component â”€â”€ */

export default function HispalAI({ onRequestClose } = {}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    aiProfile,
    alerts,
    wellness,
    purchases,
    suggestions,
    sendMessage,
    clearChat,
    retryMessage,
    loadWellness,
    loadPurchases,
    addToCartFromChat,
  } = useHispalAI();

  const [input, setInput] = useState('');
  const [panelView, setPanelView] = useState(null); // null | 'alerts' | 'wellness' | 'purchases'
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState(null);

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const isManaged = typeof onRequestClose === 'function';

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    if (isManaged) {
      const timer = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
  }, [isManaged]);

  /* â”€â”€ Panel helpers â”€â”€ */
  const openPanel = useCallback(async (view) => {
    setPanelView(view);
    setPanelLoading(true);
    setPanelError(null);
    try {
      if (view === 'wellness') await loadWellness();
      if (view === 'purchases') await loadPurchases();
    } catch {
      setPanelError('Error al cargar. IntÃ©ntalo de nuevo.');
    }
    setPanelLoading(false);
  }, [loadWellness, loadPurchases]);

  const closePanel = useCallback(() => {
    setPanelView(null);
    setPanelLoading(false);
    setPanelError(null);
  }, []);

  /* â”€â”€ Input helpers â”€â”€ */
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    sendMessage(text);
    setInput('');
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleAddToCart = useCallback((product) => {
    if (addToCartFromChat) addToCartFromChat(product);
  }, [addToCartFromChat]);

  if (!isManaged) return null;

  return (
    <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="david-dialog-title"
        className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-[20px] bg-white shadow-lg md:inset-x-auto md:bottom-4 md:right-4 md:h-[600px] md:w-[380px] md:rounded-2xl pb-[env(safe-area-inset-bottom)]"
      >
        {/* â”€â”€ Header â”€â”€ */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-950">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span id="david-dialog-title" className="text-[16px] font-semibold text-stone-950">David</span>
                <span className="h-2 w-2 rounded-full bg-stone-950" />
              </div>
              <p className="text-[12px] text-stone-500">{t('hispal_a_i.tuCompaneroDeCompras', 'Tu compaÃ±ero de compras')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => openPanel('alerts')}
              className="relative rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              aria-label="Alertas"
            >
              <Bell className="h-5 w-5" />
              {alerts && alerts.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
            <button
              onClick={() => openPanel('wellness')}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              aria-label="Bienestar"
            >
              <Activity className="h-5 w-5" />
            </button>
            <button
              onClick={() => openPanel('purchases')}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              aria-label="Compras"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <button
              onClick={clearChat}
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              aria-label="Limpiar chat"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              aria-label="Cerrar"
              onClick={onRequestClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* â”€â”€ Sub-panel overlay (alerts / wellness / purchases) â”€â”€ */}
        <AnimatePresence>
          {panelView && (
            <motion.div
              key="subpanel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="absolute inset-0 top-[65px] z-10 flex flex-col bg-white rounded-b-2xl"
            >
              <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
                <button
                  onClick={closePanel}
                  className="rounded-full p-1.5 text-stone-500 transition-colors hover:bg-stone-100"
                  aria-label="Volver al chat"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="text-[14px] font-semibold text-stone-950">
                  {panelView === 'alerts' && t('david.panel_alerts', 'Alertas')}
                  {panelView === 'wellness' && t('david.panel_wellness', 'Mi bienestar')}
                  {panelView === 'purchases' && t('david.panel_purchases', 'Mis compras')}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {panelLoading && (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
                  </div>
                )}

                {!panelLoading && panelError && (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <RotateCw className="h-6 w-6 text-stone-300" />
                    <p className="mt-3 text-[13px] text-stone-500">{panelError}</p>
                    <button
                      onClick={() => openPanel(panelView)}
                      className="mt-3 flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1.5 text-[12px] font-medium text-white"
                    >
                      <RotateCw className="h-3 w-3" /> Reintentar
                    </button>
                  </div>
                )}

                {/* Alerts */}
                {!panelLoading && !panelError && panelView === 'alerts' && (
                  <>
                    {!alerts || alerts.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <Bell className="h-8 w-8 text-stone-300" />
                        <p className="mt-3 text-[13px] text-stone-500">{t('david.no_alerts', 'Sin alertas ahora mismo.')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {alerts.map((alert, i) => (
                          <button
                            key={`${alert.type}-${alert.severity}-${i}`}
                            onClick={() => { closePanel(); sendMessage(`${alert.message}. ${alert.action}.`); }}
                            aria-label={`Alerta: ${alert.message}`}
                            className="flex w-full items-start gap-2.5 rounded-xl border border-stone-200 bg-white px-3 py-3 text-left hover:border-stone-300 transition-all"
                          >
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              alert.severity === 'high' ? 'bg-stone-950'
                              : alert.severity === 'medium' ? 'bg-stone-600' : 'bg-stone-400'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-stone-950">{alert.message}</p>
                              <p className="mt-0.5 text-[12px] text-stone-500">â†’ {alert.action}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Wellness */}
                {!panelLoading && !panelError && panelView === 'wellness' && (
                  <>
                    {!wellness ? (
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <Activity className="h-8 w-8 text-stone-300" />
                        <p className="mt-3 text-[13px] text-stone-500">{t('david.no_data', 'Sin datos suficientes aÃºn.')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col items-center rounded-xl border border-stone-200 bg-white p-4">
                          <div className="relative flex h-20 w-20 items-center justify-center">
                            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                              <circle cx="18" cy="18" r="16" fill="none" stroke="#e7e5e4" strokeWidth="3" />
                              <circle
                                cx="18" cy="18" r="16" fill="none" stroke="#0c0a09" strokeWidth="3"
                                strokeDasharray={`${(wellness.overall_score / 100) * 100.53} 100.53`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="text-[20px] font-bold text-stone-950">{wellness.overall_score}</span>
                          </div>
                          <p className="mt-2 text-[11px] uppercase tracking-wide text-stone-500">Bienestar</p>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(wellness.dimensions || {}).map(([key, dim]) => (
                            <div key={key} className="rounded-xl border border-stone-200 bg-white p-3">
                              <div className="flex items-center justify-between">
                                <p className="text-[13px] font-medium text-stone-950">{dim.label}</p>
                                <span className={`text-[12px] font-bold ${dim.score >= 70 ? 'text-stone-950' : 'text-stone-500'}`}>
                                  {dim.score}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-stone-500">{dim.detail}</p>
                              <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-100">
                                <div className="h-full rounded-full bg-stone-950" style={{ width: `${dim.score}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        {wellness.insights && wellness.insights.length > 0 && (
                          <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Insights</p>
                            <div className="space-y-2">
                              {wellness.insights.map((insight, i) => (
                                <button
                                  key={`${insight.dimension}-${i}`}
                                  onClick={() => { closePanel(); sendMessage(insight.message); }}
                                  className="flex w-full items-start gap-2 rounded-xl border border-stone-200 bg-white p-3 text-left hover:border-stone-300 transition-all"
                                >
                                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                    insight.severity === 'high' ? 'bg-stone-950'
                                    : insight.severity === 'medium' ? 'bg-stone-600' : 'bg-stone-400'
                                  }`} />
                                  <p className="text-[12px] text-stone-700 flex-1">{insight.message}</p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Purchases */}
                {!panelLoading && !panelError && panelView === 'purchases' && (
                  <>
                    {!purchases || purchases.total_orders === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center text-center">
                        <BarChart3 className="h-8 w-8 text-stone-300" />
                        <p className="mt-3 text-[13px] text-stone-500">
                          {purchases?.message || 'No tienes compras registradas.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-stone-200 bg-white p-3">
                            <p className="text-[10px] uppercase tracking-wide text-stone-500">Gasto total</p>
                            <p className="mt-1 text-[18px] font-bold text-stone-950">{purchases.total_spend?.toFixed(0)}â‚¬</p>
                            <p className="mt-0.5 text-[11px] text-stone-500">{purchases.period_days}d</p>
                          </div>
                          <div className="rounded-xl border border-stone-200 bg-white p-3">
                            <p className="text-[10px] uppercase tracking-wide text-stone-500">Pedidos</p>
                            <p className="mt-1 text-[18px] font-bold text-stone-950">{purchases.total_orders}</p>
                            <p className="mt-0.5 text-[11px] text-stone-500">{purchases.avg_order?.toFixed(0)}â‚¬ medio</p>
                          </div>
                        </div>
                        {purchases.categories?.length > 0 && (
                          <div>
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Por categorÃ­a</p>
                            <div className="space-y-1.5">
                              {purchases.categories.slice(0, 6).map((cat, i) => (
                                <div key={`${cat.name}-${i}`} className="rounded-xl border border-stone-200 bg-white p-2.5">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[12px] font-medium text-stone-950 capitalize">{cat.name}</p>
                                    <p className="text-[12px] font-bold text-stone-950">{cat.spend?.toFixed(0)}â‚¬</p>
                                  </div>
                                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-100">
                                    <div className="h-full rounded-full bg-stone-950" style={{ width: `${cat.pct}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Messages Area â”€â”€ */}
        <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Mensajes de David AI">
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                <Sparkles className="h-8 w-8 text-stone-950" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-stone-950">{t('david.greeting', 'Hola, soy David')}</h3>
              <p className="mt-1 text-center text-sm text-stone-500">
                Estoy aquÃ­ para ayudarte a encontrar lo que necesitas
              </p>
              {/* Quick Suggestions */}
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {(suggestions || []).map((label) => (
                  <button
                    key={label}
                    onClick={() => sendMessage(label)}
                    className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 transition-all hover:bg-stone-50 hover:shadow-sm active:scale-95"
                  >
                    <Sparkles size={14} className="text-stone-500" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const productResults = (msg.toolCalls || [])
              .filter((tc) => tc.tool === 'search_products' && Array.isArray(tc.result))
              .flatMap((tc) => tc.result);
            const msgKey = `${msg.timestamp || 'nt'}-${msg.role}-${i}`;
            return (
              <React.Fragment key={msgKey}>
                <div className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-950">
                      <Sparkles className="h-3 w-3 text-white" />
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
                    {msg.failed && msg.originalText && (
                      <button
                        onClick={() => retryMessage(msg)}
                        disabled={isLoading}
                        aria-label="Reintentar envÃ­o"
                        className="mt-2 flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1 text-[12px] font-medium text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      >
                        <RotateCw className="h-3 w-3" />
                        <span>Reintentar</span>
                      </button>
                    )}
                    {msg.timestamp && !Number.isNaN(new Date(msg.timestamp).getTime()) && (
                      <p className="mt-1 text-[11px] text-stone-400">
                        {new Date(msg.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {productResults.length > 0 && (
                  <div className="mb-3 ml-8">
                    {productResults.map((product) => (
                      <ProductCardInChat
                        key={product.id}
                        product={product}
                        onAddToCart={handleAddToCart}
                        onViewProduct={(slugOrId) => window.open(`/products/${slugOrId}`, '_blank')}
                      />
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* â”€â”€ Input â”€â”€ */}
        <div className="border-t border-stone-100 p-4">
          <div className="flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('hispal_a_i.preguntaleADavid', 'PregÃºntale a David...')}
              maxLength={2000}
              aria-label="Mensaje para David"
              className="flex-1 border-none bg-transparent text-[15px] text-stone-950 placeholder-stone-400 outline-none"
            />
            <button
              className="p-1 text-stone-400 transition-colors"
              aria-label={t('hispal_a_i.microfono', 'MicrÃ³fono')}
              disabled
            >
              <Mic className="h-5 w-5" />
            </button>
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
    </FocusTrap>
  );
}
