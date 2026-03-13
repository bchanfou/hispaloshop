import { useState, useCallback, useEffect } from 'react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

// ── Time-based greeting ────────────────────────────────────────────
export function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

// ── Role configuration ─────────────────────────────────────────────
export const ROLE_CONFIG = {
  consumer: {
    name: 'Hispal AI',
    mode: 'Hispal AI',
    description: 'Tu asistente personal de alimentación y soporte',
    welcomeMessage:
      '¡Hola! Soy Hispal AI, tu asistente personal de Hispaloshop. ¿En qué puedo ayudarte hoy?',
    suggestions: [
      { id: 'meal_plan',     label: 'Planificar comidas',      action: 'meal_plan',     emoji: '🗓' },
      { id: 'find_products', label: 'Buscar productos',         action: 'find_products', emoji: '🛍' },
      { id: 'recipe',        label: '¿Qué cocinar hoy?',        action: 'recipe',        emoji: '👨‍🍳' },
      { id: 'support',       label: 'Ayuda con mi pedido',      action: 'support',       emoji: '📦' },
    ],
  },
  producer: {
    name: 'Hispal Ventas',
    mode: 'Hispal Ventas',
    description: 'Asistente de negocio premium para productores',
    welcomeMessage:
      '¡Hola! Soy Hispal Ventas, tu asistente de negocio. ¿Qué quieres analizar hoy?',
    suggestions: [
      { id: 'sales',    label: 'Analizar ventas',          action: 'sales_analysis',  emoji: '📊' },
      { id: 'pricing',  label: 'Optimizar precios',         action: 'pricing',         emoji: '💰' },
      { id: 'listing',  label: 'Mejorar ficha',             action: 'listing',         emoji: '✏️' },
      { id: 'strategy', label: 'Estrategia de exportación', action: 'export_strategy', emoji: '🌍' },
    ],
  },
  influencer: {
    name: 'Hispal Creativo',
    mode: 'Hispal Creativo',
    description: 'Asistente creativo para contenido y campañas',
    welcomeMessage:
      '¡Hola! Soy Hispal Creativo, tu asistente de contenido. ¿Qué vamos a crear hoy?',
    suggestions: [
      { id: 'caption',      label: 'Escribir un caption',   action: 'caption',       emoji: '✍️' },
      { id: 'reel',         label: 'Ideas para reels',       action: 'reel_ideas',    emoji: '🎬' },
      { id: 'campaign',     label: 'Diseñar una campaña',    action: 'campaign',      emoji: '🎯' },
      { id: 'storytelling', label: 'Storytelling de marca',  action: 'product_story', emoji: '📖' },
    ],
  },
  importer: {
    name: 'Hispal Ventas',
    mode: 'Hispal Ventas',
    description: 'Análisis de mercado internacional para importadores',
    welcomeMessage:
      '¡Hola! Soy Hispal Ventas, tu analista de mercado internacional. ¿Cómo puedo ayudarte?',
    suggestions: [
      { id: 'find_producers', label: 'Encontrar productores',  action: 'find_producers', emoji: '🏭' },
      { id: 'margins',        label: 'Análisis de márgenes',   action: 'margins',         emoji: '📈' },
      { id: 'trends',         label: 'Tendencias de mercado',  action: 'trends',          emoji: '🔍' },
      { id: 'b2b',            label: 'Estrategia B2B',         action: 'b2b',             emoji: '🤝' },
    ],
  },
};

// ── Access control ─────────────────────────────────────────────────
export function getAvailableRoles(user) {
  if (!user) return ['consumer'];

  const role = (user.role || 'consumer').toLowerCase();
  const plan = ((user.subscription || {}).plan || 'FREE').toUpperCase();
  const isPremium = plan === 'PRO' || plan === 'ELITE';

  switch (role) {
    case 'influencer':
      return ['consumer', 'influencer'];
    case 'producer':
      return isPremium ? ['consumer', 'producer', 'influencer'] : ['consumer'];
    case 'importer':
      return isPremium ? ['consumer', 'importer', 'influencer'] : ['consumer'];
    default:
      return ['consumer'];
  }
}

function getDefaultRole(user) {
  const available = getAvailableRoles(user);
  const saved = localStorage.getItem('hiActiveRole');
  if (saved && available.includes(saved)) return saved;
  if (user?.role === 'producer'  && available.includes('producer'))  return 'producer';
  if (user?.role === 'importer'  && available.includes('importer'))  return 'importer';
  if (user?.role === 'influencer' && available.includes('influencer')) return 'influencer';
  return 'consumer';
}

// ── Hook ──────────────────────────────────────────────────────────
export function useHIChat() {
  const { user } = useAuth();
  const availableRoles = getAvailableRoles(user);

  const [activeRole, setActiveRole] = useState(() => getDefaultRole(user));

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`hiChat_${activeRole}`);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    const config = ROLE_CONFIG[activeRole] || ROLE_CONFIG.consumer;
    return [
      { id: 'welcome', role: 'assistant', content: config.welcomeMessage, timestamp: Date.now() },
    ];
  });

  const [isLoading, setIsLoading]   = useState(false);
  const [suggestions, setSuggestions] = useState(
    () => (ROLE_CONFIG[activeRole] || ROLE_CONFIG.consumer).suggestions,
  );

  useEffect(() => {
    try {
      localStorage.setItem(`hiChat_${activeRole}`, JSON.stringify(messages));
    } catch { /* storage may be full */ }
  }, [messages, activeRole]);

  useEffect(() => {
    localStorage.setItem('hiActiveRole', activeRole);
  }, [activeRole]);

  const switchRole = useCallback(
    (newRole) => {
      if (!availableRoles.includes(newRole)) return;
      setActiveRole(newRole);
      const saved = localStorage.getItem(`hiChat_${newRole}`);
      if (saved) {
        try { setMessages(JSON.parse(saved)); } catch { setMessages([]); }
      } else {
        const config = ROLE_CONFIG[newRole] || ROLE_CONFIG.consumer;
        setMessages([{
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: config.welcomeMessage,
          timestamp: Date.now(),
        }]);
      }
      setSuggestions((ROLE_CONFIG[newRole] || ROLE_CONFIG.consumer).suggestions);
    },
    [availableRoles],
  );

  const sendMessage = useCallback(
    async (content) => {
      const userMessage = { id: `user-${Date.now()}`, role: 'user', content, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setSuggestions([]);

      try {
        const history = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-18)
          .map((m) => ({ role: m.role, content: m.content }));

        const data = await apiClient.post(
          `/ai/chat`,
          { messages: [...history, { role: 'user', content }], assistant_role: activeRole },
        );

        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        return assistantMessage;
      } catch (error) {
        const detail = error?.message;
        if (error?.status === 403) {
          toast.error(detail || 'No tienes acceso a este modo. Actualiza tu plan.');
        } else {
          toast.error('El asistente no está disponible ahora. Inténtalo de nuevo.');
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [activeRole, messages],
  );

  const clearChat = useCallback(() => {
    const config = ROLE_CONFIG[activeRole] || ROLE_CONFIG.consumer;
    const initial = [{
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: config.welcomeMessage,
      timestamp: Date.now(),
    }];
    setMessages(initial);
    setSuggestions(config.suggestions);
    try {
      localStorage.setItem(`hiChat_${activeRole}`, JSON.stringify(initial));
    } catch { /* ignore */ }
  }, [activeRole]);

  const useSuggestion = useCallback(
    async (suggestion) => { await sendMessage(suggestion.label); },
    [sendMessage],
  );

  return {
    activeRole,
    roleConfig: ROLE_CONFIG[activeRole] || ROLE_CONFIG.consumer,
    messages,
    isLoading,
    suggestions,
    sendMessage,
    switchRole,
    clearChat,
    useSuggestion,
    availableRoles,
  };
}

export default useHIChat;
