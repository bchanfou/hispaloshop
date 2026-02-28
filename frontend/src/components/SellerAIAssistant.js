import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { 
  Bot, Send, X, Loader2, TrendingUp, Package, 
  DollarSign, Target, Lightbulb, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { API } from '../utils/api';

function getQuickPrompts(t) {
  return [
    { icon: Package, label: t('sellerAI.suggestPacks', 'Sugerir packs'), prompt: t('sellerAI.suggestPacksPrompt', 'Que configuracion de packs me recomiendas para mis productos mas vendidos?') },
    { icon: TrendingUp, label: t('sellerAI.analyzeTrends', 'Analizar tendencias'), prompt: t('sellerAI.analyzeTrendsPrompt', 'Analiza las tendencias actuales del mercado y sugiere que productos deberia crear o destacar.') },
    { icon: DollarSign, label: t('sellerAI.optimizePricing', 'Optimizar precios'), prompt: t('sellerAI.optimizePricingPrompt', 'Revisa mis precios actuales y sugiere ajustes para ser mas competitivo.') },
    { icon: Target, label: t('sellerAI.salesStrategy', 'Estrategia de ventas'), prompt: t('sellerAI.salesStrategyPrompt', 'Dame una estrategia de ventas personalizada basada en mi catalogo actual.') },
    { icon: Lightbulb, label: t('sellerAI.productIdeas', 'Ideas de productos'), prompt: t('sellerAI.productIdeasPrompt', 'Basandote en mi tienda, que nuevos productos deberia anadir?') },
  ];
}

export default function SellerAIAssistant({ producerData, isEmbedded = false, onClose = null }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: t('sellerAI.welcome', 'Hola! Soy Hispalo, tu asistente de ventas. Puedo ayudarte a:\n\n- Crear mejores packs y ofertas\n- Analizar tendencias del mercado\n- Optimizar tus precios\n- Disenar estrategias de ventas\n- Sugerir nuevos productos\n\nEn que te puedo ayudar hoy?')
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowPrompts(false);

    try {
      const response = await axios.post(
        `${API}/ai/seller-assistant`,
        { message: text, producer_context: producerData },
        { withCredentials: true }
      );
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.detail || t('sellerAI.error', 'Error al procesar tu consulta.'));
      setMessages(prev => [...prev, { role: 'assistant', content: t('sellerAI.errorRetry', 'Lo siento, hubo un error. Puedes intentar de nuevo?') }]);
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
    <div className={`${isEmbedded ? 'h-full' : 'fixed bottom-24 right-6 z-50 w-96 max-h-[600px]'} flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden`} data-testid="seller-ai-assistant">
      {/* Header */}
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">{t('sellerAI.title', 'Hispalo Sales AI')}</h3>
            <p className="text-white/60 text-xs">{t('sellerAI.subtitle', 'Tu asistente de ventas')}</p>
          </div>
        </div>
        <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors" data-testid="seller-ai-close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: isEmbedded ? 'calc(100% - 140px)' : '380px' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === 'user'
                ? 'bg-stone-900 text-white rounded-br-md'
                : 'bg-stone-100 text-stone-800 rounded-bl-md'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 rounded-2xl px-4 py-3 rounded-bl-md">
              <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {showPrompts && (
        <div className="px-4 pb-2">
          <button onClick={() => setShowPrompts(!showPrompts)} className="flex items-center gap-1 text-xs text-stone-500 mb-2 hover:text-stone-700">
            {showPrompts ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {t('sellerAI.quickActions', 'Acciones rapidas')}
          </button>
          <div className="flex flex-wrap gap-1.5">
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
      <div className="p-3 border-t border-stone-100 shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('sellerAI.inputPlaceholder', 'Escribe tu consulta...')}
            className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-full text-sm focus:outline-none focus:border-stone-400 placeholder:text-stone-400"
            disabled={loading}
            data-testid="seller-ai-input"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-full bg-stone-900 hover:bg-stone-800 p-0 shrink-0"
            data-testid="seller-ai-send"
          >
            <Send className="w-4 h-4 text-white" />
          </Button>
        </div>
      </div>
    </div>
  );
}
