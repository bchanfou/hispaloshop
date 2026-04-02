import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { X, Send, Sparkles, Mic, Trash2, ChefHat, BarChart3, Wheat, ShoppingCart } from 'lucide-react';
import DOMPurify from 'dompurify';
import useHispalAI from '../../hooks/useHispalAI';
import { useAuth } from '../../context/AuthContext';
import ProductCardInChat from './ProductCardInChat';
import { useTranslation } from 'react-i18next';

const QUICK_SUGGESTIONS = [
  { label: '¿Qué me recomiendas hoy?', Icon: Sparkles },
  { label: t('hispal_a_i.hazmeUnaRecetaRapida', 'Hazme una receta rápida'), Icon: ChefHat },
  { label: t('hispal_a_i.ayudameConMiDieta', 'Ayúdame con mi dieta'), Icon: BarChart3 },
  { label: 'Productos halal', emoji: '☪️' },
  { label: 'Opciones sin gluten', Icon: Wheat },
  { label: '¿Qué llevo en el carrito?', Icon: ShoppingCart },
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
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'br'],
  });
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

export default function HispalAI() {
  const { user } = useAuth();
  const {
    messages,
    isLoading,
    isOpen,
    suggestions,
    sendMessage,
    toggleOpen,
    clearChat,
    addToCartFromChat,
  } = useHispalAI();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Don't render for unauthenticated users (after all hooks)
  if (!user) return null;

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (label) => {
    sendMessage(label);
  };

  const handleAddToCart = async (productId, quantity) => {
    await addToCartFromChat(productId, quantity);
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
            onClick={toggleOpen}
            className="fixed bottom-[88px] right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-stone-950 shadow-[0_4px_24px_rgba(0,0,0,0.20)] transition-transform hover:scale-105 active:scale-95"
            aria-label="Abrir David"
          >
            <Sparkles className="h-6 w-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden"
              onClick={toggleOpen}
            />

            {/* Panel */}
            <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
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
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-semibold text-stone-950">David</span>
                      <span className="h-2 w-2 rounded-full bg-stone-950" />
                    </div>
                    <p className="text-[12px] text-stone-500">{t('hispal_a_i.tuCompaneroDeCompras', 'Tu compañero de compras')}</p>
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
                    onClick={toggleOpen}
                    className="rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                    aria-label="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Mensajes de David AI">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center pt-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
                      <Sparkles className="h-8 w-8 text-stone-950" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-stone-950">Hola, soy David</h3>
                    <p className="mt-1 text-center text-sm text-stone-500">
                      Estoy aquí para ayudarte a encontrar lo que necesitas
                    </p>

                    {/* Quick Suggestions */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {QUICK_SUGGESTIONS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => handleSuggestion(s.label)}
                          className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 transition-all hover:bg-stone-50 hover:shadow-sm active:scale-95"
                        >
                          {s.Icon ? <s.Icon size={14} className="text-stone-500" /> : <span>{s.emoji}</span>}
                          <span>{s.label}</span>
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

                  return (
                    <React.Fragment key={i}>
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
                          {msg.timestamp && !Number.isNaN(new Date(msg.timestamp).getTime()) && (
                            <p className={`mt-1 text-[11px] ${isUser ? 'text-stone-400' : 'text-stone-400'}`}>
                              {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Per-message product cards */}
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

              {/* Input */}
              <div className="border-t border-stone-100 p-4">
                <div className="flex items-center gap-2 rounded-full bg-stone-100 px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('hispal_a_i.preguntaleADavid', 'Pregúntale a David...')}
                    className="flex-1 border-none bg-transparent text-[15px] text-stone-950 placeholder-stone-400 outline-none"
                  />
                  <button
                    className="p-1 text-stone-400 transition-colors"
                    aria-label={t('hispal_a_i.microfono', 'Micrófono')}
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
          </>
        )}
      </AnimatePresence>
    </>
  );
}
