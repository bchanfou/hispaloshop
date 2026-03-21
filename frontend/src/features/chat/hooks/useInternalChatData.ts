// @ts-nocheck
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

interface InternalChatDataReturn {
  conversations: any[];
  influencers: any[];
  producers: any[];
  loadingDirectory: boolean;
  reloadConversations: () => void;
  fetchMessages: (conversationId: string) => Promise<any>;
  uploadImage: (params: { file: File; conversationId: string }) => Promise<any>;
  sendHttpMessage: (payload: any) => Promise<any>;
  startConversation: (userId: string) => Promise<any>;
  deleteConversation: (conversationId: string) => Promise<any>;
  loadInfluencerProfile: (id: string) => Promise<any>;
  loadProducerProfile: (id: string) => Promise<any>;
  deletingConversation: string | null;
  uploadingImage: boolean;
  sendingMessage: boolean;
}

export function useInternalChatData(): InternalChatDataReturn {
  const { user } = useAuth() as any;
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
    fetchMessages: (conversationId: string) => (messagesMutation as any).mutateAsync(conversationId),
    uploadImage: ({ file, conversationId }: { file: File; conversationId: string }) => (uploadImageMutation as any).mutateAsync({ file, conversationId }),
    sendHttpMessage: (payload: any) => (sendMessageMutation as any).mutateAsync(payload),
    startConversation: (userId: string) => (startConversationMutation as any).mutateAsync(userId),
    deleteConversation: (conversationId: string) => (deleteConversationMutation as any).mutateAsync(conversationId),
    loadInfluencerProfile: (id: string) => (influencerProfileMutation as any).mutateAsync(id),
    loadProducerProfile: (id: string) => (producerProfileMutation as any).mutateAsync(id),
    deletingConversation: deleteConversationMutation.isPending ? (deleteConversationMutation.variables as any) : null,
    uploadingImage: uploadImageMutation.isPending,
    sendingMessage: sendMessageMutation.isPending,
  };
}

export default useInternalChatData;
