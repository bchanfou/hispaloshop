import { useCallback, useMemo } from 'react';
import { useChatContext } from '@/context/chat/ChatProvider';

export default function useChatMessages(conversationId) {
  const {
    messages,
    loadMessages,
    sendMessage,
    sendTyping,
    markAsRead,
    typingUsers,
    attachProduct,
    attachDocument,
    sendImage,
  } = useChatContext();

  // Load messages when conversationId changes
  // (caller should useEffect with this)
  const load = useCallback(() => {
    if (conversationId) loadMessages(conversationId);
  }, [conversationId, loadMessages]);

  const send = useCallback((content) => {
    return sendMessage(conversationId, content);
  }, [conversationId, sendMessage]);

  const setTyping = useCallback((isTyping) => {
    sendTyping(conversationId, isTyping);
  }, [conversationId, sendTyping]);

  const markRead = useCallback((messageIds) => {
    markAsRead(conversationId, messageIds);
  }, [conversationId, markAsRead]);

  const attachProductMsg = useCallback((productId) => {
    attachProduct(conversationId, productId);
  }, [conversationId, attachProduct]);

  const attachDoc = useCallback((file) => {
    return attachDocument(conversationId, file);
  }, [conversationId, attachDocument]);

  const sendImg = useCallback((file) => {
    return sendImage(conversationId, file);
  }, [conversationId, sendImage]);

  const isTyping = useMemo(() => {
    return !!typingUsers[conversationId];
  }, [typingUsers, conversationId]);

  return {
    messages,
    load,
    send,
    setTyping,
    markRead,
    attachProduct: attachProductMsg,
    attachDocument: attachDoc,
    sendImage: sendImg,
    isTyping,
  };
}
