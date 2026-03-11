import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../utils/api';

const ROLE_CONFIG = {
  consumer: {
    name: 'HI Nutrición',
    color: 'var(--color-accent)',
    welcomeMessage: '¡Hola! Soy HI, tu nutricionista personal. ¿En qué puedo ayudarte hoy?',
    suggestions: [
      { id: 'meal_plan', label: '🍽️ Planificar comidas', action: 'meal_plan' },
      { id: 'analyze_cart', label: '📊 Analizar mi cesta', action: 'analyze_cart' },
      { id: 'find_products', label: '🏪 Encontrar productos', action: 'find_products' },
      { id: 'recipe', label: '👨‍🍳 ¿Qué cocinar hoy?', action: 'recipe' },
    ],
  },
  producer: {
    name: 'HI Ventas',
    color: 'var(--color-warning)',
    welcomeMessage: '¡Hola! Soy HI, tu asistente de ventas. ¿Qué quieres analizar hoy?',
    suggestions: [
      { id: 'sales', label: '📈 Analizar ventas', action: 'sales_analysis' },
      { id: 'pricing', label: '💰 Optimizar precios', action: 'pricing' },
      { id: 'content', label: '📅 Calendario contenido', action: 'content_calendar' },
      { id: 'stock', label: '📦 Gestión stock', action: 'stock' },
    ],
  },
  importer: {
    name: 'HI Import',
    color: '#2563EB',
    welcomeMessage: '¡Hola! Soy HI, tu analista de mercado internacional.',
    suggestions: [
      { id: 'find_producers', label: '🔍 Encontrar productores', action: 'find_producers' },
      { id: 'margins', label: '📊 Análisis de márgenes', action: 'margins' },
      { id: 'trends', label: '📈 Tendencias 2024', action: 'trends' },
      { id: 'b2b', label: '🤝 Negociaciones B2B', action: 'b2b' },
    ],
  },
  influencer: {
    name: 'HI Creator',
    color: '#9333EA',
    welcomeMessage: '¡Hola! Soy HI, tu creativo de contenido. ¿Qué vamos a crear hoy?',
    suggestions: [
      { id: 'caption', label: '✍️ Generar caption', action: 'caption' },
      { id: 'reel', label: '🎬 Ideas para reels', action: 'reel_ideas' },
      { id: 'analytics', label: '📊 Analizar posts', action: 'analytics' },
      { id: 'products', label: '🏷️ Productos para promocionar', action: 'promote_products' },
    ],
  },
};

export function useHIChat() {
  const { user } = useAuth();

  const [activeRole, setActiveRole] = useState(() => {
    const savedRole = localStorage.getItem('hiActiveRole');
    if (savedRole) return savedRole;
    if (user?.role === 'producer' || user?.role === 'importer') return user.role;
    if (user?.role === 'influencer') return 'influencer';
    return 'consumer';
  });

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`hiChat_${activeRole}`);
    if (saved) return JSON.parse(saved);
    const config = ROLE_CONFIG[activeRole];
    return [{ id: 'welcome', role: 'assistant', content: config.welcomeMessage, timestamp: Date.now() }];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(() => ROLE_CONFIG[activeRole].suggestions);

  useEffect(() => {
    localStorage.setItem(`hiChat_${activeRole}`, JSON.stringify(messages));
  }, [messages, activeRole]);

  useEffect(() => {
    localStorage.setItem('hiActiveRole', activeRole);
  }, [activeRole]);

  const switchRole = useCallback((newRole) => {
    setActiveRole(newRole);
    const saved = localStorage.getItem(`hiChat_${newRole}`);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      const config = ROLE_CONFIG[newRole];
      setMessages([{ id: `welcome-${Date.now()}`, role: 'assistant', content: config.welcomeMessage, timestamp: Date.now() }]);
    }
    setSuggestions(ROLE_CONFIG[newRole].suggestions);
  }, []);

  const sendMessage = useCallback(async (content, context = {}) => {
    const userMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await axios.post(
        `${API}/ai/chat`,
        {
          messages: [...conversationHistory, { role: 'user', content }],
          assistant_role: activeRole,
        },
        { withCredentials: true }
      );

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.data.content,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      return assistantMessage;
    } catch {
      toast.error('El asistente no está disponible ahora');
    } finally {
      setIsLoading(false);
    }
  }, [activeRole, messages]);

  const clearChat = useCallback(() => {
    const config = ROLE_CONFIG[activeRole];
    const newMessages = [{ id: `welcome-${Date.now()}`, role: 'assistant', content: config.welcomeMessage, timestamp: Date.now() }];
    setMessages(newMessages);
    localStorage.setItem(`hiChat_${activeRole}`, JSON.stringify(newMessages));
  }, [activeRole]);

  const useSuggestion = useCallback(async (suggestion) => {
    await sendMessage(suggestion.label, { action: suggestion.action });
  }, [sendMessage]);

  return {
    activeRole,
    roleConfig: ROLE_CONFIG[activeRole],
    messages,
    isLoading,
    suggestions,
    sendMessage,
    switchRole,
    clearChat,
    useSuggestion,
    availableRoles: Object.keys(ROLE_CONFIG),
  };
}

export default useHIChat;
