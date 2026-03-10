import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const b2bKeys = {
  conversations: ['b2b', 'chat', 'conversations'],
  messages: (conversationId) => ['b2b', 'chat', 'messages', conversationId],
  unread: ['b2b', 'chat', 'unread'],
  catalog: (filters = {}) => ['b2b', 'catalog', filters],
  producers: (filters = {}) => ['b2b', 'producers', filters],
  inquiries: ['b2b', 'inquiries'],
  producerInquiries: ['b2b', 'producer', 'rfq', 'received'],
};

export function useB2BConversations(enabled = true) {
  return useQuery({
    queryKey: b2bKeys.conversations,
    queryFn: () => apiClient.get('/b2b/chat/conversations'),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useB2BMessages(conversationId, enabled = true) {
  return useQuery({
    queryKey: b2bKeys.messages(conversationId),
    queryFn: () => apiClient.get(`/b2b/chat/conversations/${conversationId}`),
    enabled: Boolean(conversationId) && enabled,
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });
}

export function useB2BUnreadCount(enabled = true) {
  return useQuery({
    queryKey: b2bKeys.unread,
    queryFn: () => apiClient.get('/b2b/chat/unread-count'),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useCreateB2BConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ producerId, productId }) =>
      apiClient.post('/b2b/chat/conversations', {
        producer_id: producerId,
        ...(productId ? { product_id: productId } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.conversations });
    },
  });
}

export function useSendB2BMessage(conversationId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content) =>
      apiClient.post(`/b2b/chat/conversations/${conversationId}/messages`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: b2bKeys.conversations });
    },
  });
}

export function useB2BCatalog(filters = {}, enabled = true) {
  return useQuery({
    queryKey: b2bKeys.catalog(filters),
    queryFn: () => apiClient.get('/b2b/catalog', { params: filters }),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useB2BProducers(filters = {}, enabled = true) {
  return useQuery({
    queryKey: b2bKeys.producers(filters),
    queryFn: () => apiClient.get('/b2b/producers', { params: filters }),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ producerId, productIds, message, targetCountry }) =>
      apiClient.post('/rfq/contact', {
        producer_id: producerId,
        product_ids: productIds,
        message,
        target_country: targetCountry,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: b2bKeys.inquiries });
      queryClient.invalidateQueries({ queryKey: b2bKeys.producerInquiries });
    },
  });
}

export function useInquiries(enabled = true) {
  return useQuery({
    queryKey: b2bKeys.inquiries,
    queryFn: () => apiClient.get('/rfq/mine'),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useReceivedRFQs(enabled = true) {
  return useQuery({
    queryKey: b2bKeys.producerInquiries,
    queryFn: () => apiClient.get('/rfq/received'),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}
