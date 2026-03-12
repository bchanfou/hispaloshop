import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const hiChatKeys = {
  conversations: ['hi', 'conversations'],
  conversation: (id) => ['hi', 'conversation', id],
  suggestions: (context) => ['hi', 'suggestions', context],
  insights: ['hi', 'insights'],
};

function getNextCursor(page) {
  return page?.nextCursor ?? page?.next_cursor ?? null;
}

export function useHIConversations() {
  return useQuery({
    queryKey: hiChatKeys.conversations,
    queryFn: () => apiClient.get('/chat/conversations'),
    staleTime: 60 * 1000,
  });
}

export function useHIConversation(conversationId) {
  return useInfiniteQuery({
    queryKey: hiChatKeys.conversation(conversationId),
    queryFn: ({ pageParam = null }) =>
      apiClient.get(`/chat/conversations/${conversationId}/messages`, {
        params: { cursor: pageParam },
      }),
    initialPageParam: null,
    getNextPageParam: getNextCursor,
    enabled: Boolean(conversationId),
    staleTime: 30 * 1000,
  });
}

export function useHISendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ message, conversationId, context }) =>
      apiClient.post(`/chat/conversations/${conversationId}/messages`, {
        message,
        content: message,
        context,
      }),
    onSuccess: (data, variables) => {
      if (variables.conversationId) {
        queryClient.invalidateQueries({
          queryKey: hiChatKeys.conversation(variables.conversationId),
        });
      }

      queryClient.invalidateQueries({
        queryKey: hiChatKeys.conversations,
      });
    },
  });
}

export function useHIDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId) =>
      apiClient.delete(`/hi/conversations/${conversationId}`).catch(() => ({ success: false })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hiChatKeys.conversations });
    },
  });
}

export function useHISuggestions(context = {}) {
  const contextKey = JSON.stringify(context);

  return useQuery({
    queryKey: hiChatKeys.suggestions(contextKey),
    queryFn: () =>
      apiClient
        .get('/hi/suggestions', {
          params: {
            context: context.currentPage,
            product_id: context.productId,
            cart_items: context.cartItems?.join(','),
          },
        })
        .catch(() => []),
    enabled: Boolean(context.currentPage),
    staleTime: 2 * 60 * 1000,
  });
}

export function useHIInsights() {
  return useQuery({
    queryKey: hiChatKeys.insights,
    queryFn: () => apiClient.get('/hi/insights').catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
}

export function useHIFeedback() {
  return useMutation({
    mutationFn: ({ messageId, helpful }) =>
      apiClient.post('/hi/feedback', {
        message_id: messageId,
        helpful,
      }).catch(() => ({ success: false })),
  });
}

export function useHICreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ otherUserId }) => {
      if (!otherUserId) {
        return Promise.resolve({ success: false, reason: 'missing_other_user_id' });
      }
      return apiClient.post('/chat/conversations', { other_user_id: otherUserId }).catch(() => ({ success: false }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hiChatKeys.conversations });
    },
  });
}
