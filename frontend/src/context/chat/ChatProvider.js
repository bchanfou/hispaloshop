import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '@/services/api/client';
import { useAuth } from '@/context/AuthContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const convs = await apiClient.get(`/chat/conversations`) || [];
      setConversations(convs);
      setUnreadTotal(convs.reduce((sum, conv) => sum + (conv.unread_count || 0), 0));
    } catch (e) {
      console.warn('[Chat] Failed to load conversations:', e.message);
    }
  }, [isAuthenticated]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId || !isAuthenticated) return;
    try {
      const msgs = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
      setMessages(msgs || []);
      setCurrentConversation(conversationId);
      
      // Join conversation via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'join_conversation',
          conversation_id: conversationId
        }));
      }
    } catch (e) {
      console.warn('[Chat] Failed to load messages:', e.message);
    }
  }, [isAuthenticated]);

  // Send message via WebSocket
  const sendMessage = useCallback((conversationId, content) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[Chat] WebSocket not connected');
      return false;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'message',
      conversation_id: conversationId,
      content: content
    }));
    return true;
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((conversationId, isTyping) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'typing',
      conversation_id: conversationId,
      is_typing: isTyping
    }));
  }, []);

  // Mark messages as read
  const markAsRead = useCallback((conversationId, messageIds) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (!messageIds || messageIds.length === 0) return;
    
    wsRef.current.send(JSON.stringify({
      type: 'read_receipt',
      conversation_id: conversationId,
      message_ids: messageIds
    }));
  }, []);

  // Create new conversation
  const createConversation = useCallback(async (otherUserId) => {
    if (!isAuthenticated) return null;
    try {
      const data = await apiClient.post(`/chat/conversations`, { other_user_id: otherUserId });
      await loadConversations();
      return data;
    } catch (e) {
      console.warn('[Chat] Failed to create conversation:', e.message);
      return null;
    }
  }, [isAuthenticated, loadConversations]);

  // WebSocket connection
  const connect = useCallback(() => {
    if (!isAuthenticated || !user) return;
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Build WebSocket URL - use same host as API
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws/chat`;
    
    console.log('[Chat] Connecting to WebSocket:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Chat] WebSocket connected');
        setConnected(true);
        loadConversations();
        
        // Send ping every 30s to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000);
      };

      ws.onclose = (event) => {
        console.log('[Chat] WebSocket closed:', event.code, event.reason);
        setConnected(false);
        // Reconnect after 3 seconds
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('[Chat] WebSocket error:', error);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          switch (payload.type) {
            case 'connected':
              console.log('[Chat] Server confirmed connection');
              break;
              
            case 'pong':
              // Heartbeat response
              break;
              
            case 'new_message':
              // Add new message to current conversation if matches
              if (payload.conversation_id === currentConversation) {
                setMessages(prev => [...prev, payload.message]);
                // Mark as read immediately
                markAsRead(payload.conversation_id, [payload.message.message_id]);
              }
              // Refresh conversations list
              loadConversations();
              break;
              
            case 'message_sent':
              // Message confirmed sent
              break;
              
            case 'typing':
              // Update typing status
              if (payload.conversation_id) {
                setTypingUsers(prev => ({
                  ...prev,
                  [payload.conversation_id]: payload.is_typing ? payload.user_id : null
                }));
                
                // Clear typing after 3 seconds
                if (payload.is_typing) {
                  setTimeout(() => {
                    setTypingUsers(prev => ({
                      ...prev,
                      [payload.conversation_id]: null
                    }));
                  }, 3000);
                }
              }
              break;
              
            case 'read_receipt':
              // Update read status in messages
              if (payload.conversation_id === currentConversation) {
                setMessages(prev => prev.map(msg => 
                  payload.message_ids.includes(msg.message_id)
                    ? { ...msg, read: true }
                    : msg
                ));
              }
              break;
              
            case 'error':
              console.error('[Chat] Server error:', payload.message);
              break;
              
            default:
              console.log('[Chat] Unknown message type:', payload.type);
          }
        } catch (e) {
          console.error('[Chat] Failed to parse message:', e);
        }
      };
    } catch (error) {
      console.error('[Chat] Failed to create WebSocket:', error);
      reconnectRef.current = setTimeout(connect, 5000);
    }
  }, [isAuthenticated, user, currentConversation, loadConversations, markAsRead]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      // Close connection when logged out
      if (wsRef.current) {
        wsRef.current.close();
      }
      setConnected(false);
      setConversations([]);
      setUnreadTotal(0);
    }
    
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isAuthenticated, connect]);

  const value = useMemo(() => ({
    // Connection state
    connected,
    
    // Conversations
    conversations,
    unreadTotal,
    reloadConversations: loadConversations,
    
    // Current conversation
    currentConversation,
    messages,
    loadMessages,
    
    // Actions
    sendMessage,
    sendTyping,
    markAsRead,
    createConversation,
    
    // Typing indicators
    typingUsers,
    
    // WebSocket reference for advanced usage
    ws: wsRef.current
  }), [
    connected,
    conversations,
    unreadTotal,
    loadConversations,
    currentConversation,
    messages,
    loadMessages,
    sendMessage,
    sendTyping,
    markAsRead,
    createConversation,
    typingUsers
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}

export default ChatContext;
