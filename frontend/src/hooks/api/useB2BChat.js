/**
 * Hooks para Chat B2B (importador ↔ productor)
 * Endpoints: GET/POST /b2b/chat/conversations, GET/POST /b2b/chat/conversations/{id}/messages
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const CHAT_KEYS = {
  conversations: ['b2b', 'chat', 'conversations'],
  messages: (id) => ['b2b', 'chat', 'messages', id],
  unread: ['b2b', 'chat', 'unread'],
};

export function useB2BConversations() {
  return useQuery({
    queryKey: CHAT_KEYS.conversations,
    queryFn: () => api.get('/b2b/chat/conversations'),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useB2BMessages(conversationId) {
  return useQuery({
    queryKey: CHAT_KEYS.messages(conversationId),
    queryFn: () => api.get(`/b2b/chat/conversations/${conversationId}`),
    enabled: !!conversationId,
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useB2BUnreadCount() {
  return useQuery({
    queryKey: CHAT_KEYS.unread,
    queryFn: () => api.get('/b2b/chat/unread-count'),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useCreateB2BConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ producerId, productId }) => {
      const qs = `producer_id=${encodeURIComponent(producerId)}${productId ? `&product_id=${encodeURIComponent(productId)}` : ''}`;
      return api.request(`/b2b/chat/conversations?${qs}`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.conversations });
    },
  });
}

export function useSendB2BMessage(conversationId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content) =>
      api.request(`/b2b/chat/conversations/${conversationId}/messages?content=${encodeURIComponent(content)}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: CHAT_KEYS.conversations });
    },
  });
}
