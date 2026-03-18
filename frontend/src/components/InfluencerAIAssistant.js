import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../services/api/client';
import {
  Send, X,
  Video, FileText, Instagram, Megaphone, PenTool,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

// ── HA Avatar ────────────────────────────────────────────────────
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

const QUICK_PROMPTS = [
  { icon: Video,     label: 'Guión de video',      prompt: 'Crea un guión para un video corto de TikTok o Reels promocionando productos de Hispaloshop de forma natural y entretenida. Incluye mi código de descuento en el guión.' },
  { icon: Instagram, label: 'Caption para post',    prompt: 'Escribe un caption atractivo para Instagram que promocione mi código de descuento de forma auténtica. Incluye el código al final.' },
  { icon: FileText,  label: 'Historia promocional', prompt: 'Dame ideas para una serie de Stories de Instagram promocionando productos artesanales. Incluye slides con mi código de descuento.' },
  { icon: Megaphone, label: 'Estrategia contenido', prompt: 'Diseña una estrategia de contenido semanal para promocionar productos de alimentación saludable. Prioriza los productos que mejor me convierten.' },
  { icon: PenTool,   label: 'Texto para bio',       prompt: 'Ayúdame a crear un texto corto para mi bio que mencione que soy embajador de Hispaloshop e incluya mi código de descuento.' },
  { icon: Megaphone, label: 'Qué producto promocionar', prompt: 'Basándote en mis datos de rendimiento, ¿qué producto debería promocionar esta semana para maximizar mis comisiones?' },
];

export default function InfluencerAIAssistant({ influencerData, isEmbedded = false, onClose = null }) {
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente creativo en Hispaloshop.\n\nPuedo ayudarte con guiones para videos, captions y posts, ideas para Stories, estrategias de contenido y textos promocionales auténticos.\n\n¿Qué tipo de contenido necesitas crear hoy?'
    }
  ]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

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
      const enrichedContext = {
        ...influencerData,
        discount_code: influencerData?.discount_code || influencerData?.referral_code,
        top_products: influencerData?.top_products || [],
        tier: influencerData?.tier || influencerData?.current_tier,
      };
      const data = await apiClient.post('/ai/influencer-assistant', { message: text, influencer_context: enrichedContext });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.message || 'Error al procesar tu consulta. Intenta de nuevo.';
      toast.error(errorMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error. ¿Puedes intentarlo de nuevo?' }]);
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
      className={`${isEmbedded ? 'flex flex-col h-full' : 'fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)]'} bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col max-h-[600px] overflow-hidden`}
    >
      {/* Header */}
      <div className="bg-stone-950 px-4 py-3.5 flex items-center justify-between shrink-0 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <HAAvatar size={36} />
          <div>
            <h3 className="text-white font-semibold text-sm">Asistente Creativo</h3>
            <p className="text-white/50 text-xs">Asistente de contenido</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] bg-stone-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}>
            {msg.role === 'assistant' && <HAAvatar size={28} />}
            <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm ${
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
            Ideas rápidas
            {showPrompts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <div className="flex flex-wrap gap-2 pb-1">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-full text-xs text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-colors"
              >
                <prompt.icon className="w-3 h-3" />
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-stone-100 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe el contenido que necesitas..."
            className="flex-1 px-4 py-2 border border-stone-200 bg-stone-50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder:text-stone-400"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="rounded-full bg-stone-950 hover:bg-stone-800 disabled:bg-stone-300 w-10 h-10 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
