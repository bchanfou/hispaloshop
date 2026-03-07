/**
 * Hooks para HI AI Chat
 * Conversaciones, mensajes y sugerencias contextuales
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const HI_KEYS = {
  conversations: ['hi', 'conversations'],
  conversation: (id) => ['hi', 'conversation', id],
  suggestions: (context) => ['hi', 'suggestions', context],
  insights: ['hi', 'insights'],
};

/**
 * Hook para historial de conversaciones
 */
export function useHIConversations() {
  return useQuery({
    queryKey: HI_KEYS.conversations,
    queryFn: () => api.get('/hi/conversations'),
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para detalle de conversación con mensajes
 */
export function useHIConversation(conversationId) {
  return useInfiniteQuery({
    queryKey: HI_KEYS.conversation(conversationId),
    queryFn: ({ pageParam }) => 
      api.get(`/hi/conversations/${conversationId}`, { 
        cursor: pageParam 
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook para enviar mensaje a HI
 */
export function useHISendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ message, conversationId, context }) => 
      api.post('/hi/chat', { 
        message, 
        conversation_id: conversationId,
        context 
      }),
    
    onSuccess: (data, variables) => {
      // Actualizar conversación
      if (variables.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: HI_KEYS.conversation(variables.conversationId) 
        });
      }
      // Actualizar lista de conversaciones
      queryClient.invalidateQueries({ 
        queryKey: HI_KEYS.conversations 
      });
    },
  });
}

/**
 * Hook para eliminar conversación
 */
export function useHIDeleteConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (conversationId) => 
      api.delete(`/hi/conversations/${conversationId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HI_KEYS.conversations });
    },
  });
}

/**
 * Hook para sugerencias contextuales de HI
 */
export function useHISuggestions(context = {}) {
  const contextKey = JSON.stringify(context);
  
  return useQuery({
    queryKey: HI_KEYS.suggestions(contextKey),
    queryFn: () => api.get('/hi/suggestions', { 
      context: context.currentPage,
      product_id: context.productId,
      cart_items: context.cartItems?.join(','),
    }),
    enabled: !!context.currentPage,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para insights personalizados por rol
 */
export function useHIInsights() {
  return useQuery({
    queryKey: HI_KEYS.insights,
    queryFn: () => api.get('/hi/insights'),
    staleTime: 10 * 60 * 1000, // 10 min - no cambian mucho
  });
}

/**
 * Hook para dar feedback (thumbs up/down)
 */
export function useHIFeedback() {
  return useMutation({
    mutationFn: ({ messageId, helpful }) => 
      api.post('/hi/feedback', { message_id: messageId, helpful }),
  });
}

/**
 * Hook para crear nueva conversación
 */
export function useHICreateConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => api.post('/hi/conversations'),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HI_KEYS.conversations });
    },
  });
}
