import { useState, useCallback, useRef } from 'react';
import apiClient from '../services/api/client';

const RATE_LIMIT_FREE = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const SUGGESTIONS = [
  '¿Qué productos ecológicos tenéis?',
  'Busco algo sin gluten',
  '¿Qué me recomiendas para desayunar?',
  'Muéstrame productos veganos',
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

export default function useHispalAI() {
  const [messages, setMessages] = useState(() => getStoredMessages());
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef(null);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem('hispal_ai_messages');
    sessionStorage.removeItem('hispal_ai_rate');
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
      });

      const assistantMessage = {
        role: 'assistant',
        content: data.response || 'Lo siento, no he podido procesar tu mensaje.',
        timestamp: new Date().toISOString(),
        toolCalls: data.tool_calls || [],
      };

      setMessages((prev) => {
        const next = [...prev, assistantMessage];
        storeMessages(next);
        return next;
      });
    } catch {
      const errorMessage = {
        role: 'assistant',
        content: 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.',
        timestamp: new Date().toISOString(),
        toolCalls: [],
      };
      setMessages((prev) => {
        const next = [...prev, errorMessage];
        storeMessages(next);
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  return {
    messages,
    isLoading,
    isOpen,
    suggestions: SUGGESTIONS,
    sendMessage,
    toggleOpen,
    clearChat,
    addToCartFromChat,
  };
}
