import { useAuth } from '../../../context/AuthContext';
import {
  useInternalChatConversations,
  useInternalChatDeleteConversation,
  useInternalChatInfluencerProfile,
  useInternalChatInfluencers,
  useInternalChatMessages,
  useInternalChatProducerProfile,
  useInternalChatProducers,
  useInternalChatSendMessage,
  useInternalChatStartConversation,
  useInternalChatUploadImage,
} from '../queries/useInternalChatQueries';

export function useInternalChatData() {
  const { user } = useAuth();
  const enabled = Boolean(user);
  const conversationsQuery = useInternalChatConversations(enabled);
  const influencersQuery = useInternalChatInfluencers(enabled);
  const producersQuery = useInternalChatProducers(enabled);
  const messagesMutation = useInternalChatMessages();
  const uploadImageMutation = useInternalChatUploadImage();
  const sendMessageMutation = useInternalChatSendMessage();
  const startConversationMutation = useInternalChatStartConversation();
  const deleteConversationMutation = useInternalChatDeleteConversation();
  const influencerProfileMutation = useInternalChatInfluencerProfile();
  const producerProfileMutation = useInternalChatProducerProfile();

  return {
    conversations: conversationsQuery.data ?? [],
    influencers: influencersQuery.data ?? [],
    producers: producersQuery.data ?? [],
    loadingDirectory: influencersQuery.isLoading || producersQuery.isLoading,
    reloadConversations: conversationsQuery.refetch,
    fetchMessages: (conversationId) => messagesMutation.mutateAsync(conversationId),
    uploadImage: ({ file, conversationId }) => uploadImageMutation.mutateAsync({ file, conversationId }),
    sendHttpMessage: (payload) => sendMessageMutation.mutateAsync(payload),
    startConversation: (userId) => startConversationMutation.mutateAsync(userId),
    deleteConversation: (conversationId) => deleteConversationMutation.mutateAsync(conversationId),
    loadInfluencerProfile: (id) => influencerProfileMutation.mutateAsync(id),
    loadProducerProfile: (id) => producerProfileMutation.mutateAsync(id),
    deletingConversation: deleteConversationMutation.isPending ? deleteConversationMutation.variables : null,
    uploadingImage: uploadImageMutation.isPending,
    sendingMessage: sendMessageMutation.isPending,
  };
}

export default useInternalChatData;
