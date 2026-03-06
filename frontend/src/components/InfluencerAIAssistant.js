import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { 
  Sparkles, Send, X, Loader2, Video, FileText, 
  Instagram, Megaphone, PenTool, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';

import { API } from '../utils/api';

const QUICK_PROMPTS = [
  { icon: Video, label: 'Guión de video', prompt: 'Crea un guión para un video corto de TikTok o Reels promocionando productos de Hispaloshop de forma natural y entretenida.' },
  { icon: Instagram, label: 'Caption para post', prompt: 'Escribe un caption atractivo para Instagram que promocione mi código de descuento de forma auténtica.' },
  { icon: FileText, label: 'Historia promocional', prompt: 'Dame ideas para una serie de Stories de Instagram promocionando productos artesanales.' },
  { icon: Megaphone, label: 'Estrategia contenido', prompt: 'Diseña una estrategia de contenido semanal para promocionar productos de alimentación saludable.' },
  { icon: PenTool, label: 'Texto para bio', prompt: 'Ayúdame a crear un texto corto para mi bio que mencione que soy embajador de Hispaloshop.' },
];

export default function InfluencerAIAssistant({ influencerData, isEmbedded = false, onClose = null }) {
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy Hispalo AI Creativo, tu asistente para crear contenido. 🎨\n\nPuedo ayudarte con:\n\n• Guiones para videos (TikTok, Reels, YouTube)\n• Captions y textos para posts\n• Ideas para Stories\n• Estrategias de contenido\n• Textos promocionales auténticos\n\n¿Qué tipo de contenido necesitas crear hoy?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle close
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
        `${API}/ai/influencer-assistant`,
        { 
          message: text,
          influencer_context: influencerData
        },
        { withCredentials: true }
      );

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.response?.data?.detail || 'Error al procesar tu consulta. Intenta de nuevo.';
      toast.error(errorMessage);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error. ¿Puedes intentar de nuevo?' 
      }]);
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

  // If embedded mode and not open, return null
  if (isEmbedded && !isOpen) {
    return null;
  }

  // If not embedded, this component should NOT render its own floating button
  // The UnifiedFloatingIsland handles all floating buttons now
  if (!isOpen && !isEmbedded) {
    return null;
  }

  return (
    <div className={`${isEmbedded ? 'flex flex-col h-full' : 'fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-48px)]'} bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col max-h-[600px]`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[#1C1C1C]">Hispalo AI Creativo</h3>
            <p className="text-xs text-[#7A7A7A]">Asistente de Contenido</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-[#7A7A7A]" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-br-md'
                  : 'bg-stone-100 text-[#1C1C1C] rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-stone-100 rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {showPrompts && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowPrompts(!showPrompts)}
            className="flex items-center gap-1 text-xs text-[#7A7A7A] mb-2"
          >
            Ideas rápidas
            {showPrompts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(prompt.prompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-full text-xs text-purple-700 transition-colors"
              >
                <prompt.icon className="w-3 h-3" />
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-stone-200">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe what content you need..."
            className="flex-1 px-4 py-2 border border-stone-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            size="icon"
            className="rounded-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
