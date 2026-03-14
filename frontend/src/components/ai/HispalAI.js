import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FocusTrap from 'focus-trap-react';
import { X, Send, Sparkles, Mic } from 'lucide-react';
import DOMPurify from 'dompurify';
import useHispalAI from '../../hooks/useHispalAI';
import ProductCardInChat from './ProductCardInChat';

const QUICK_SUGGESTIONS = [
  { label: '¿Qué hay de nuevo?', icon: '🆕' },
  { label: 'Receta de hoy', icon: '🍳' },
  { label: 'Mi dieta', icon: '📊' },
  { label: 'Productos halal', icon: '☪️' },
  { label: 'Sin gluten', icon: '🌾' },
  { label: 'Ver mi carrito', icon: '🛒' },
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
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-hs-black">
        <Sparkles className="h-3 w-3 text-white" />
      </div>
      <div className="flex gap-1 rounded-[18px] rounded-bl-[4px] bg-[#F5F5F7] px-4 py-3">
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
  const {
    messages,
    isLoading,
    isOpen,
    toolCalls,
    sendMessage,
    toggleOpen,
    clearChat,
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

  // Extract product cards from tool calls
  const productResults = toolCalls
    .filter((tc) => tc.tool === 'search_products' && Array.isArray(tc.result))
    .flatMap((tc) => tc.result);

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
            className="fixed bottom-[88px] right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-hs-black shadow-[0_4px_24px_rgba(0,0,0,0.20)] transition-transform hover:scale-105 active:scale-95"
            aria-label="Abrir Hispal AI"
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
              className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-[20px] bg-white shadow-apple-lg md:inset-x-auto md:bottom-4 md:right-4 md:h-[600px] md:w-[380px] md:rounded-apple-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-hs-black">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] font-semibold text-hs-text">Hispal AI</span>
                      <span className="h-2 w-2 rounded-full bg-hs-green" />
                    </div>
                    <p className="text-[12px] text-hs-muted">Tu asistente de alimentación</p>
                  </div>
                </div>
                <button
                  onClick={toggleOpen}
                  className="rounded-full p-2 text-hs-muted transition-colors hover:bg-stone-100 hover:text-hs-text"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center pt-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-hs-bg">
                      <Sparkles className="h-8 w-8 text-hs-text" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-hs-text">Hola, soy Hispal AI</h3>
                    <p className="mt-1 text-center text-sm text-hs-muted">
                      Pregúntame sobre productos, recetas o recomendaciones
                    </p>

                    {/* Quick Suggestions */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {QUICK_SUGGESTIONS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => handleSuggestion(s.label)}
                          className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-[13px] text-hs-text transition-all hover:bg-hs-bg hover:shadow-sm active:scale-95"
                        >
                          <span>{s.icon}</span>
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={i}
                      className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="mr-2 mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-hs-black">
                          <Sparkles className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[${isUser ? '75' : '85'}%] ${
                          isUser
                            ? 'rounded-[18px] rounded-br-[4px] bg-hs-black px-4 py-3 text-white'
                            : 'rounded-[18px] rounded-bl-[4px] bg-[#F5F5F7] px-4 py-3 text-hs-text'
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
                        {msg.timestamp && (
                          <p className={`mt-1 text-[11px] ${isUser ? 'text-stone-400' : 'text-hs-muted'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Product Cards after search results */}
                {productResults.length > 0 && (
                  <div className="mb-3 ml-8">
                    {productResults.map((product) => (
                      <ProductCardInChat
                        key={product.id}
                        product={product}
                        onAddToCart={(id, qty) => sendMessage(`Añade ${qty} unidad(es) del producto ${id}`)}
                        onViewProduct={(id) => window.open(`/products/${id}`, '_blank')}
                      />
                    ))}
                  </div>
                )}

                {isLoading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-stone-100 p-4">
                <div className="flex items-center gap-2 rounded-full bg-[#F5F5F7] px-4 py-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pregunta a Hispal AI..."
                    className="flex-1 border-none bg-transparent text-[15px] text-hs-text placeholder-hs-muted outline-none"
                  />
                  <button
                    className="p-1 text-hs-muted transition-colors"
                    aria-label="Micrófono"
                    disabled
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                      input.trim()
                        ? 'bg-hs-black text-white hover:scale-105'
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
