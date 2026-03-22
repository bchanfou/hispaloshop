import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const internalChatKeys = {
  conversations: ['internal-chat', 'conversations'],
  directoryInfluencers: ['internal-chat', 'directory', 'influencers'],
  directoryProducers: ['internal-chat', 'directory', 'producers'],
  influencer: (id) => ['internal-chat', 'influencer', id],
  producer: (id) => ['internal-chat', 'producer', id],
};

export function buildInternalChatStartConversationPayload(userId) {
  return {
    recipient_id: userId,
    other_user_id: userId,
  };
}

export function useInternalChatConversations(enabled = true) {
  return useQuery({
    queryKey: internalChatKeys.conversations,
    queryFn: () => apiClient.get('/internal-chat/conversations'),
    enabled,
  });
}

export function useInternalChatInfluencers(enabled = true) {
  return useQuery({
    queryKey: internalChatKeys.directoryInfluencers,
    queryFn: () => apiClient.get('/directory/influencers'),
    select: (data) => Array.isArray(data) ? data : (data?.items ?? []),
    enabled,
  });
}

export function useInternalChatProducers(enabled = true) {
  return useQuery({
    queryKey: internalChatKeys.directoryProducers,
    queryFn: () => apiClient.get('/directory/producers'),
    enabled,
  });
}

export function useInternalChatInfluencerProfile() {
  return useMutation({
    mutationFn: (influencerId) => apiClient.get(`/directory/influencers/${influencerId}`),
  });
}

export function useInternalChatProducerProfile() {
  return useMutation({
    mutationFn: (storeId) => apiClient.get(`/directory/producers/${storeId}`),
  });
}

export function useInternalChatMessages() {
  return useMutation({
    mutationFn: (conversationId) => apiClient.get(`/internal-chat/conversations/${conversationId}/messages`),
  });
}

export function useInternalChatUploadImage() {
  return useMutation({
    mutationFn: async ({ file, conversationId }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', conversationId);
      return apiClient.post('/internal-chat/upload-image', formData);
    },
  });
}

export function useInternalChatSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => apiClient.post('/internal-chat/messages', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internalChatKeys.conversations });
    },
  });
}

export function useInternalChatStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) =>
      apiClient.post('/internal-chat/start-conversation', buildInternalChatStartConversationPayload(userId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internalChatKeys.conversations });
    },
  });
}

export function useInternalChatDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId) => apiClient.delete(`/internal-chat/conversations/${conversationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: internalChatKeys.conversations });
    },
  });
}
