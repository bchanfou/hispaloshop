import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../services/api/client';
import {
  Send, X, TrendingUp, Package,
  DollarSign, Target, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// HA Avatar
function HAAvatar({ size = 36 }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0"
    >
      <span className="text-white font-semibold" style={{ fontSize: size * 0.28 }}>HA</span>
    </div>
  );
}

// Typing dots
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function getQuickPrompts(t) {
  return [
    { icon: Package,   label: t('sellerAI.suggestPacks',   'Sugerir packs'),       prompt: t('sellerAI.suggestPacksPrompt',   'Qué configuración de packs me recomiendas para mis productos más vendidos?') },
    { icon: TrendingUp,label: t('sellerAI.analyzeTrends',  'Analizar tendencias'), prompt: t('sellerAI.analyzeTrendsPrompt',  'Analiza las tendencias actuales del mercado y sugiere qué productos debería crear o destacar.') },
    { icon: DollarSign,label: t('sellerAI.optimizePricing','Optimizar precios'),   prompt: t('sellerAI.optimizePricingPrompt','Revisa mis precios actuales y sugiere ajustes para ser más competitivo.') },
    { icon: Target,    label: t('sellerAI.salesStrategy',  'Estrategia ventas'),   prompt: t('sellerAI.salesStrategyPrompt',  'Dame una estrategia de ventas personalizada basada en mi catálogo actual.') },
    { icon: Lightbulb, label: t('sellerAI.productIdeas',   'Ideas de productos'),  prompt: t('sellerAI.productIdeasPrompt',   'Basándote en mi tienda, qué nuevos productos debería añadir?') },
  ];
}

export default function SellerAIAssistant({ producerData, isEmbedded = false, onClose = null }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: t('sellerAI.welcome', 'Hola, soy Pedro — tu socio comercial en Hispaloshop. He trabajado con productores como tú para mejorar ventas, optimizar precios y detectar oportunidades de mercado. ¿Por dónde empezamos?')
    }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  const QUICK_PROMPTS = getQuickPrompts(t);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const sendMessage = async (messageText) => {
    const text = messageText || input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setShowPrompts(false);

    try {
      const data = await apiClient.post('/ai/seller-assistant', { message: text, producer_context: producerData });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || t('sellerAI.error', 'Error al procesar tu consulta.'));
      setMessages(prev => [...prev, { role: 'assistant', content: t('sellerAI.errorRetry', 'Lo siento, hubo un error. Â¿Puedes intentarlo de nuevo?') }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isEmbedded && !isOpen) return null;
  if (!isOpen && !isEmbedded) return null;

  return (
    <div
      className={`${isEmbedded ? 'h-full' : 'fixed bottom-24 right-6 z-50 w-96 max-h-[600px]'} flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden`}
      data-testid="seller-ai-assistant"
    >
      {/* Header */}
      <div className="bg-stone-950 px-4 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <HAAvatar size={36} />
          <div>
            <h3 className="text-white font-semibold text-sm">{t('sellerAI.title', 'Pedro AI')}</h3>
            <p className="text-white/50 text-xs">{t('sellerAI.subtitle', 'Tu socio comercial')}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-white/60 hover:text-white transition-colors p-1"
          data-testid="seller-ai-close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-stone-50"
        style={{ maxHeight: isEmbedded ? 'calc(100% - 140px)' : '380px' }}
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {msg.role === 'assistant' && (
              <HAAvatar size={28} />
            )}
            <div className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-stone-950 text-white rounded-br-md'
                : 'bg-white text-stone-900 border border-stone-100 shadow-sm rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start items-end gap-2">
            <HAAvatar size={28} />
            <div className="bg-white border border-stone-100 rounded-3xl rounded-bl-md px-4 py-3 shadow-sm">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {showPrompts && (
        <div className="px-4 pb-2 bg-white border-t border-stone-100">
          <button
            onClick={() => setShowPrompts(!showPrompts)}
            className="flex items-center gap-1 text-xs text-stone-500 my-2 hover:text-stone-700"
          >
            {showPrompts ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {t('sellerAI.quickActions', 'Acciones rÃ¡pidas')}
          </button>
          <div className="flex flex-wrap gap-1.5 pb-1">
            {QUICK_PROMPTS.map((p, i) => {
              const Icon = p.icon;
              return (
                <button
                  key={i}
                  onClick={() => sendMessage(p.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-full text-xs text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-colors"
                  data-testid={`seller-ai-prompt-${i}`}
                >
                  <Icon className="w-3 h-3" />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-stone-100 bg-white shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('sellerAI.inputPlaceholder', 'Escribe tu consulta...')}
            className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400"
            disabled={loading}
            data-testid="seller-ai-input"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-stone-950 hover:bg-stone-800 disabled:bg-stone-300 p-0 shrink-0 flex items-center justify-center"
            data-testid="seller-ai-send"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

