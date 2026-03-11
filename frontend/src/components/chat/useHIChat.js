import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../utils/api';

// ── Role configuration ─────────────────────────────────────────────
// Colors use only stone palette identifiers — no hex or CSS vars.
export const ROLE_CONFIG = {
  consumer: {
    name: 'HI',
    mode: 'HI AI',
    description: 'Tu asistente personal de alimentación y soporte',
    welcomeMessage:
      '¡Hola! Soy HI, tu asistente personal de Hispaloshop. ¿En qué puedo ayudarte hoy?',
    suggestions: [
      { id: 'meal_plan', label: 'Planificar comidas', action: 'meal_plan' },
      { id: 'find_products', label: 'Buscar productos', action: 'find_products' },
      { id: 'recipe', label: '¿Qué cocinar hoy?', action: 'recipe' },
      { id: 'support', label: 'Tengo un problema con mi pedido', action: 'support' },
    ],
  },
  producer: {
    name: 'HI Ventas',
    mode: 'HI Ventas',
    description: 'Asistente de negocio premium para productores',
    welcomeMessage:
      '¡Hola! Soy HI Ventas, tu asistente de negocio. ¿Qué quieres analizar hoy?',
    suggestions: [
      { id: 'sales', label: 'Analizar ventas', action: 'sales_analysis' },
      { id: 'pricing', label: 'Optimizar precios', action: 'pricing' },
      { id: 'listing', label: 'Mejorar ficha de producto', action: 'listing' },
      { id: 'strategy', label: 'Estrategia de exportación', action: 'export_strategy' },
    ],
  },
  influencer: {
    name: 'HI Creativo',
    mode: 'HI Creativo',
    description: 'Asistente creativo para contenido y campañas',
    welcomeMessage:
      '¡Hola! Soy HI Creativo, tu asistente de contenido. ¿Qué vamos a crear hoy?',
    suggestions: [
      { id: 'caption', label: 'Escribir un caption', action: 'caption' },
      { id: 'reel', label: 'Ideas para reels', action: 'reel_ideas' },
      { id: 'campaign', label: 'Diseñar una campaña', action: 'campaign' },
      { id: 'storytelling', label: 'Storytelling de producto', action: 'product_story' },
    ],
  },
  importer: {
    name: 'HI Ventas',
    mode: 'HI Ventas',
    description: 'Análisis de mercado internacional para importadores',
    welcomeMessage:
      '¡Hola! Soy HI Ventas, tu analista de mercado internacional. ¿Cómo puedo ayudarte?',
    suggestions: [
      { id: 'find_producers', label: 'Encontrar productores', action: 'find_producers' },
      { id: 'margins', label: 'Análisis de márgenes', action: 'margins' },
      { id: 'trends', label: 'Tendencias de mercado', action: 'trends' },
      { id: 'b2b', label: 'Estrategia de negociación B2B', action: 'b2b' },
    ],
  },
};

// ── Access control ─────────────────────────────────────────────────
// Must stay in sync with backend _HI_BASE_ACCESS + _HI_PREMIUM_ROLES.
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
  if (user?.role === 'producer' && available.includes('producer')) return 'producer';
  if (user?.role === 'importer' && available.includes('importer')) return 'importer';
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
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    const config = ROLE_CONFIG[activeRole] || ROLE_CONFIG.consumer;
    return [
      { id: 'welcome', role: 'assistant', content: config.welcomeMessage, timestamp: Date.now() },
    ];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(
    () => (ROLE_CONFIG[activeRole] || ROLE_CONFIG.consumer).suggestions,
  );

  useEffect(() => {
    try {
      localStorage.setItem(`hiChat_${activeRole}`, JSON.stringify(messages));
    } catch {
      // storage may be full — ignore
    }
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
        try {
          setMessages(JSON.parse(saved));
        } catch {
          setMessages([]);
        }
      } else {
        const config = ROLE_CONFIG[newRole] || ROLE_CONFIG.consumer;
        setMessages([
          {
            id: `welcome-${Date.now()}`,
            role: 'assistant',
            content: config.welcomeMessage,
            timestamp: Date.now(),
          },
        ]);
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

        const response = await axios.post(
          `${API}/ai/chat`,
          {
            messages: [...history, { role: 'user', content }],
            assistant_role: activeRole,
          },
          { withCredentials: true },
        );

        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.content,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        return assistantMessage;
      } catch (error) {
        const detail = error?.response?.data?.detail;
        if (error?.response?.status === 403) {
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
    const initial = [
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: config.welcomeMessage,
        timestamp: Date.now(),
      },
    ];
    setMessages(initial);
    setSuggestions(config.suggestions);
    try {
      localStorage.setItem(`hiChat_${activeRole}`, JSON.stringify(initial));
    } catch {
      // ignore
    }
  }, [activeRole]);

  const useSuggestion = useCallback(
    async (suggestion) => {
      await sendMessage(suggestion.label);
    },
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
