import { useState, useCallback, useRef, useEffect } from 'react';
import apiClient from '../services/api/client';

const RATE_LIMIT_FREE = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const DEFAULT_SUGGESTIONS = [
  '¿Qué me recomiendas hoy?',
  'Busco algo sin gluten para merendar',
  '¿Qué desayuno sano me propones?',
  'Enséñame productos veganos buenos',
];

function getRateLimitState() {
  try {
    const raw = sessionStorage.getItem('hispal_ai_rate');
    if (!raw) return { count: 0, windowStart: Date.now() };
    const state = JSON.parse(raw);
    if (Date.now() - state.windowStart > RATE_LIMIT_WINDOW_MS) {
      return { count: 0, windowStart: Date.now() };
    }
    return state;
  } catch {
    return { count: 0, windowStart: Date.now() };
  }
}

function incrementRateLimit() {
  const state = getRateLimitState();
  state.count += 1;
  sessionStorage.setItem('hispal_ai_rate', JSON.stringify(state));
  return state.count;
}

function getStoredMessages() {
  try {
    const raw = sessionStorage.getItem('hispal_ai_messages');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeMessages(messages) {
  try {
    sessionStorage.setItem('hispal_ai_messages', JSON.stringify(messages.slice(-50)));
  } catch {
    // silently handled
  }
}

function getStoredSessionMemory() {
  try {
    const raw = sessionStorage.getItem('hispal_ai_session_memory');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeSessionMemory(products) {
  try {
    sessionStorage.setItem('hispal_ai_session_memory', JSON.stringify(products.slice(-20)));
  } catch {
    // silently handled
  }
}

function getStoredSessionId() {
  try {
    return sessionStorage.getItem('hispal_ai_session_id') || null;
  } catch {
    return null;
  }
}

function storeSessionId(id) {
  try {
    sessionStorage.setItem('hispal_ai_session_id', id);
  } catch {
    // silently handled
  }
}

/** Build contextual suggestions based on AI profile */
function buildSuggestions(profile) {
  if (!profile) return DEFAULT_SUGGESTIONS;
  const suggestions = [];

  if (profile.diet?.includes('vegan')) {
    suggestions.push('Productos veganos nuevos');
  }
  if (profile.diet?.includes('keto')) {
    suggestions.push('Snacks keto para hoy');
  }
  if (profile.allergies?.length) {
    suggestions.push('Opciones seguras para mí');
  }
  if (profile.goals?.includes('weight_loss')) {
    suggestions.push('Opciones bajas en calorías');
  }

  // Fill remaining with defaults
  for (const s of DEFAULT_SUGGESTIONS) {
    if (suggestions.length >= 4) break;
    if (!suggestions.includes(s)) suggestions.push(s);
  }

  return suggestions.slice(0, 4);
}

export default function useHispalAI() {
  const [messages, setMessages] = useState(() => getStoredMessages());
  const [isLoading, setIsLoading] = useState(false);
  const [aiProfile, setAiProfile] = useState(null);
  const [sessionMemory, setSessionMemory] = useState(() => getStoredSessionMemory());
  const [sessionId, setSessionId] = useState(() => getStoredSessionId());
  const profileLoadedRef = useRef(false);

  const [proactiveMessage, setProactiveMessage] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [wellness, setWellness] = useState(null);
  const [purchases, setPurchases] = useState(null);

  // Load AI profile + alerts on mount (eagerly, since button is always visible)
  useEffect(() => {
    if (profileLoadedRef.current) return;
    profileLoadedRef.current = true;
    apiClient.get('/v1/hispal-ai/profile').then(setAiProfile).catch(() => {});
    apiClient.get('/v1/hispal-ai/proactive').then((data) => {
      if (data?.message) setProactiveMessage(data.message);
    }).catch(() => {});
    apiClient.get('/v1/hispal-ai/alerts').then((data) => {
      if (data?.alerts) setAlerts(data.alerts);
    }).catch(() => {});
  }, []);

  const loadWellness = useCallback(async () => {
    try {
      const data = await apiClient.get('/v1/hispal-ai/wellness');
      setWellness(data);
      return data;
    } catch {
      setWellness(null);
      return null;
    }
  }, []);

  const loadPurchases = useCallback(async () => {
    try {
      const data = await apiClient.get('/v1/hispal-ai/analyze-purchases');
      setPurchases(data);
      return data;
    } catch {
      setPurchases(null);
      return null;
    }
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setSessionMemory([]);
    setSessionId(null);
    sessionStorage.removeItem('hispal_ai_messages');
    sessionStorage.removeItem('hispal_ai_rate');
    sessionStorage.removeItem('hispal_ai_session_memory');
    sessionStorage.removeItem('hispal_ai_session_id');
  }, []);

  const addToCartFromChat = useCallback(async (productId, quantity = 1) => {
    try {
      await apiClient.post('/v1/hispal-ai/chat', {
        messages: [
          { role: 'user', content: `Añade el producto ${productId} al carrito (${quantity} ud.)` },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    // Rate limiting
    const currentCount = getRateLimitState().count;
    if (currentCount >= RATE_LIMIT_FREE) {
      const errorMsg = {
        role: 'assistant',
        content: 'Has alcanzado el límite de mensajes por hora. Actualiza tu plan para más consultas.',
        timestamp: new Date().toISOString(),
        toolCalls: [],
      };
      setMessages((prev) => {
        const next = [...prev, errorMsg];
        storeMessages(next);
        return next;
      });
      return;
    }

    const userMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      toolCalls: [],
    };

    setMessages((prev) => {
      const next = [...prev, userMessage];
      storeMessages(next);
      return next;
    });
    setIsLoading(true);

    try {
      incrementRateLimit();
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const data = await apiClient.post('/v1/hispal-ai/chat', {
        messages: allMessages,
        session_id: sessionId,
        session_memory: sessionMemory,
        language: aiProfile?.language || undefined,
      });

      // Track session ID
      if (data.session_id) {
        setSessionId(data.session_id);
        storeSessionId(data.session_id);
      }

      // Extract recommended products from tool calls and update session memory
      const newProducts = [];
      for (const tc of (data.tool_calls || [])) {
        if (tc.tool === 'search_products' && Array.isArray(tc.result)) {
          for (const p of tc.result) {
            if (p.id && !sessionMemory.some((sp) => sp.product_id === p.id)) {
              newProducts.push({
                product_id: p.id,
                name: p.name,
                variant_id: null,
                pack_id: null,
              });
            }
          }
        }
      }
      if (newProducts.length > 0) {
        setSessionMemory((prev) => {
          const next = [...prev, ...newProducts];
          storeSessionMemory(next);
          return next;
        });
      }

      // Update profile if preferences were detected
      if (data.preference_updates && Object.keys(data.preference_updates).length > 0) {
        setAiProfile((prev) => (prev ? { ...prev, ...data.preference_updates } : prev));
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.response || 'Lo siento, no he podido procesar tu mensaje.',
        timestamp: new Date().toISOString(),
        toolCalls: data.tool_calls || [],
        cartAction: data.cart_action || null,
        memoryAction: data.memory_action || null,
      };

      setMessages((prev) => {
        const next = [...prev, assistantMessage];
        storeMessages(next);
        return next;
      });
    } catch (err) {
      const status = err?.response?.status ?? err?.status;
      const is429 = status === 429;
      const is403 = status === 403;
      const isNetwork = !status;
      const is5xx = status >= 500 && status < 600;
      const isRetryable = is429 || isNetwork || is5xx;
      const errorMessage = {
        role: 'assistant',
        content: is429
          ? 'Demasiadas solicitudes. Espera un momento antes de volver a preguntar.'
          : is403
          ? 'Acceso denegado.'
          : isNetwork
          ? 'Sin conexión. Comprueba tu red.'
          : 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.',
        timestamp: new Date().toISOString(),
        toolCalls: [],
        failed: isRetryable,
        originalText: isRetryable ? text : undefined,
      };
      setMessages((prev) => {
        const next = [...prev, errorMessage];
        storeMessages(next);
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, sessionId, sessionMemory, aiProfile]);

  const retryMessage = useCallback((failedMessage) => {
    if (!failedMessage?.originalText) return;
    setMessages((prev) => {
      const next = prev.filter((m) => m !== failedMessage);
      storeMessages(next);
      return next;
    });
    sendMessage(failedMessage.originalText);
  }, [sendMessage]);

  const consumeProactiveMessage = useCallback(() => {
    const msg = proactiveMessage;
    setProactiveMessage(null);
    return msg;
  }, [proactiveMessage]);

  return {
    messages,
    isLoading,
    aiProfile,
    proactiveMessage,
    consumeProactiveMessage,
    alerts,
    wellness,
    purchases,
    loadWellness,
    loadPurchases,
    retryMessage,
    suggestions: buildSuggestions(aiProfile),
    sendMessage,
    clearChat,
    addToCartFromChat,
  };
}
