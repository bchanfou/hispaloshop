import { useCallback, useMemo, useState } from 'react';
import apiClient from '@/services/api/client';
import { useChatContext } from '@/context/chat/ChatProvider';

export function useChatRealtime() {
  const { ws, reload, connected } = useChatContext();
  const [typingUsers, setTypingUsers] = useState({});

  const sendMessage = useCallback((conversationId, content, extra = {}) => {
    if (connected && ws) {
      ws.send(JSON.stringify({ type: 'message', conversation_id: conversationId, content, ...extra }));
      return Promise.resolve();
    }
    return apiClient.post(`/chat/conversations/${conversationId}/messages`, { content, ...extra }).then(() => reload());
  }, [connected, ws, reload]);

  const setTyping = useCallback((conversationId, isTyping) => {
    if (!ws || !connected) return;
    ws.send(JSON.stringify({ type: 'typing', conversation_id: conversationId, is_typing: isTyping }));
    setTypingUsers((prev) => ({ ...prev, [conversationId]: isTyping }));
  }, [ws, connected]);

  const joinConversation = useCallback((conversationId) => {
    if (!ws || !connected) return;
    ws.send(JSON.stringify({ type: 'join_conversation', conversation_id: conversationId }));
  }, [ws, connected]);

  return useMemo(() => ({ connected, sendMessage, setTyping, joinConversation, typingUsers }), [connected, sendMessage, setTyping, joinConversation, typingUsers]);
}
