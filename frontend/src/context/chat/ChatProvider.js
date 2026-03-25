import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import apiClient, { getWSUrl } from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const ChatContext = createContext(null);

export function normalizeChatConversation(conversation) {
  if (!conversation || typeof conversation !== 'object') return conversation;

  const normalizedId = conversation.id || conversation.conversation_id || null;

  return {
    ...conversation,
    id: normalizedId,
    conversation_id: conversation.conversation_id || normalizedId,
  };
}

export function ChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const reconnectDelayRef = useRef(1000);
  const pingIntervalRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [notifConnected, setNotifConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const currentConversationRef = useRef(currentConversation);
  useEffect(() => { currentConversationRef.current = currentConversation; }, [currentConversation]);
  const [polling, setPolling] = useState(false);
  const pollingRef = useRef(null);
  const wsFailCountRef = useRef(0);
  const typingTimersRef = useRef({});
  const POLLING_INTERVAL = 5000;
  const MAX_WS_RETRIES = 3;

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const convs = await apiClient.get(`/chat/conversations`) || [];
      const normalizedConversations = (Array.isArray(convs) ? convs : []).map(normalizeChatConversation);
      setConversations(normalizedConversations);
      setUnreadTotal(normalizedConversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0));
    } catch (e) {
      // silently handled
    }
  }, [isAuthenticated]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId || !isAuthenticated) return;
    try {
      const data = await apiClient.get(`/chat/conversations/${conversationId}/messages`);
      const msgs = data?.messages ?? (Array.isArray(data) ? data : []);
      setMessages(msgs);
      setHasMoreMessages(data?.has_more ?? false);
      setCurrentConversation(conversationId);
      
      // Join conversation via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'join_conversation',
          conversation_id: conversationId
        }));
      }
    } catch (e) {
      // silently handled
    }
  }, [isAuthenticated]);

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async (conversationId) => {
    if (!conversationId || !isAuthenticated || loadingMore || !hasMoreMessages) return;
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const before = oldest.created_at || oldest.timestamp;
      const data = await apiClient.get(`/chat/conversations/${conversationId}/messages?before=${encodeURIComponent(before)}`);
      const older = data?.messages ?? (Array.isArray(data) ? data : []);
      if (older.length > 0) {
        setMessages(prev => [...older, ...prev]);
      }
      setHasMoreMessages(data?.has_more ?? false);
    } catch (e) {
      // silently handled
    }
    setLoadingMore(false);
  }, [isAuthenticated, loadingMore, hasMoreMessages, messages]);

  // --- HTTP polling fallback when WebSocket is unavailable ---
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setPolling(true);

    pollingRef.current = setInterval(async () => {
      if (!currentConversation || !isAuthenticated) return;
      try {
        const data = await apiClient.get(`/chat/conversations/${currentConversation}/messages`);
        const msgs = data?.messages ?? (Array.isArray(data) ? data : []);
        if (msgs.length > 0) {
          setMessages(msgs);
        }
      } catch {
        // polling error — will retry next interval
      }
      // Also refresh conversation list for unread badges
      loadConversations().catch(() => {});
    }, POLLING_INTERVAL);
  }, [currentConversation, isAuthenticated, loadConversations]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPolling(false);
  }, []);

  // Send message via WebSocket, with HTTP fallback
  const sendMessage = useCallback(async (conversationId, content, extra = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        conversation_id: conversationId,
        content: content,
        ...extra,
      }));
      return true;
    }

    // HTTP fallback when WS is down
    try {
      const data = await apiClient.post(`/chat/conversations/${conversationId}/messages`, {
        content,
        ...extra,
      });
      // Add to local messages immediately
      if (data) {
        setMessages(prev => [...prev, data]);
      }
      return true;
    } catch {
      return false;
    }
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
    if (!messageIds || messageIds.length === 0) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'read_receipt',
        conversation_id: conversationId,
        message_ids: messageIds
      }));
    } else {
      apiClient.post(`/chat/conversations/${conversationId}/read`, {}).catch(() => {});
    }

    setMessages((prev) => prev.map((msg) =>
      messageIds.includes(msg.message_id || msg.id)
        ? { ...msg, read: true }
        : msg
    ));
    setUnreadTotal((prev) => Math.max(0, prev - messageIds.length));
  }, []);

  // Create new conversation
  const createConversation = useCallback(async (otherUserId) => {
    if (!isAuthenticated) return null;
    const currentUserId = user?.user_id || user?.id;
    if (currentUserId && String(otherUserId) === String(currentUserId)) {
      toast.error('No puedes enviarte mensajes a ti mismo');
      return null;
    }
    try {
      const data = await apiClient.post(`/chat/conversations`, { other_user_id: otherUserId });
      await loadConversations();
      return normalizeChatConversation(data);
    } catch (e) {
      return null;
    }
  }, [isAuthenticated, loadConversations, user]);

  // Open or find existing conversation with a user of a given type
  const openConversation = useCallback(async (userId, type) => {
    if (!isAuthenticated) return null;
    const currentUserId = user?.user_id || user?.id;
    if (currentUserId && String(userId) === String(currentUserId)) {
      toast.error('No puedes enviarte mensajes a ti mismo');
      return null;
    }
    try {
      const data = await apiClient.post(`/chat/conversations`, { other_user_id: userId, type });
      await loadConversations();
      return normalizeChatConversation(data);
    } catch (e) {
      return null;
    }
  }, [isAuthenticated, loadConversations, user]);

  // Send a product card message via WebSocket
  const attachProduct = useCallback((conversationId, productId) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false;

    wsRef.current.send(JSON.stringify({
      type: 'message',
      conversation_id: conversationId,
      content: '',
      message_type: 'product_card',
      product_id: productId,
    }));
    return true;
  }, []);

  // Upload a document file to a conversation
  const attachDocument = useCallback(async (conversationId, file) => {
    if (!isAuthenticated) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.post(
        `/chat/conversations/${conversationId}/upload-document`,
        formData,
      );
      return data;
    } catch (e) {
      return null;
    }
  }, [isAuthenticated]);

  // Upload an image to a conversation
  const sendImage = useCallback(async (conversationId, file) => {
    if (!isAuthenticated) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('message_type', 'image');
      const data = await apiClient.post(
        `/chat/conversations/${conversationId}/upload-image`,
        formData,
      );
      return data;
    } catch (e) {
      return null;
    }
  }, [isAuthenticated]);

  // Get conversations filtered by type (memoized)
  const getConversationsByType = useCallback((type) => {
    return conversations.filter((c) => c.type === type);
  }, [conversations]);

  // Send reaction via WS
  const sendReaction = useCallback((conversationId, messageId, emoji) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'reaction',
      conversation_id: conversationId,
      message_id: messageId,
      emoji,
    }));
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId) => {
    if (!isAuthenticated) return false;
    try {
      await apiClient.delete(`/chat/conversations/${conversationId}`);
      setConversations(prev => prev.filter(c => String(c.id || c.conversation_id) !== String(conversationId)));
      return true;
    } catch (e) {
      return false;
    }
  }, [isAuthenticated]);

  // Clear notification unread count
  const clearNotifUnreadCount = useCallback(() => {
    setNotifUnreadCount(0);
  }, []);

  // Notification events are handled in the main WS onmessage handler.
  // connectNotifications is kept as a no-op for backward compatibility.
  const connectNotifications = useCallback(() => {}, []);

  // Chat WebSocket connection
  const connect = useCallback(() => {
    if (!isAuthenticated || !user) return;
    
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Build WebSocket URL - point to backend origin
    const wsUrl = getWSUrl('/ws/chat');
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectDelayRef.current = 1000; // Reset backoff on successful connection
        wsFailCountRef.current = 0;
        stopPolling(); // WS recovered — stop HTTP polling
        loadConversations();
        
        // Send ping every 30s to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          } else {
            clearInterval(pingIntervalRef.current);
          }
        }, 30000);
      };

      ws.onclose = () => {
        clearInterval(pingIntervalRef.current);
        setConnected(false);
        wsFailCountRef.current += 1;

        if (wsFailCountRef.current >= MAX_WS_RETRIES) {
          // After repeated failures, fall back to HTTP polling
          startPolling();
          // Keep trying to reconnect in background at slow rate
          reconnectRef.current = setTimeout(connect, 30000);
        } else {
          // Exponential backoff reconnection: 1s → 2s → 4s → … → 30s max
          const delay = reconnectDelayRef.current;
          reconnectRef.current = setTimeout(connect, delay);
          reconnectDelayRef.current = Math.min(delay * 2, 30000);
        }
      };

      ws.onerror = () => {
        // silently handled
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          switch (payload.type) {
            case 'connected':
              break;
              
            case 'pong':
              // Heartbeat response
              break;
              
            case 'new_message':
              // Add new message to current conversation if matches
              if (payload.conversation_id === currentConversationRef.current) {
                setMessages(prev => [...prev, payload.message]);
                // Mark as read immediately
                markAsRead(payload.conversation_id, [payload.message.message_id]);
              }
              // Refresh conversations list
              loadConversations();
              break;
              
            case 'message_sent':
              // Update pending message with server-confirmed id
              if (payload.temp_id) {
                setMessages(prev => prev.map(msg =>
                  (msg.id === payload.temp_id || msg.message_id === payload.temp_id)
                    ? { ...msg, message_id: payload.message_id, id: payload.message_id, status: 'sent' }
                    : msg
                ));
              }
              break;
              
            case 'typing':
              // Update typing status
              if (payload.conversation_id) {
                const convKey = payload.conversation_id;
                setTypingUsers(prev => ({
                  ...prev,
                  [convKey]: payload.is_typing ? payload.user_id : null
                }));

                // Cancel previous timer for this conversation
                if (typingTimersRef.current[convKey]) {
                  clearTimeout(typingTimersRef.current[convKey]);
                  delete typingTimersRef.current[convKey];
                }

                // Auto-clear typing after 3 seconds
                if (payload.is_typing) {
                  typingTimersRef.current[convKey] = setTimeout(() => {
                    setTypingUsers(prev => ({ ...prev, [convKey]: null }));
                    delete typingTimersRef.current[convKey];
                  }, 3000);
                }
              }
              break;
              
            case 'read_receipt':
              // Update read status in messages
              if (payload.conversation_id === currentConversationRef.current) {
                const readIds = Array.isArray(payload.message_ids)
                  ? payload.message_ids
                  : (payload.message_id ? [payload.message_id] : []);

                setMessages(prev => prev.map(msg => 
                  readIds.includes(msg.message_id || msg.id)
                    ? { ...msg, read: true }
                    : msg
                ));
              }
              break;

            case 'reaction':
              // Update reactions on a message
              if (payload.message_id) {
                setMessages(prev => prev.map(msg =>
                  (msg.message_id === payload.message_id || msg.id === payload.message_id)
                    ? { ...msg, reactions: payload.reactions }
                    : msg
                ));
              }
              break;
              
            case 'auth_failed':
            case 'auth_error':
              // Auth failed — close silently
              ws.close();
              break;

            // Notification events (merged from connectNotifications)
            case 'notification':
              toast(payload.title || payload.payload?.title, { description: payload.body || payload.payload?.body, duration: 5000 });
              if (!(payload.read || payload.read_at || payload.payload?.read || payload.payload?.read_at)) {
                setNotifUnreadCount(prev => prev + 1);
              }
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
              queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
              break;
            case 'order_update': {
              const op = payload.payload || payload;
              queryClient.invalidateQueries({ queryKey: ['order', op.orderId] });
              queryClient.invalidateQueries({ queryKey: ['orders'] });
              toast.success(`Pedido #${op.orderId}: ${op.status}`);
              break;
            }
            case 'new_follower': {
              const fp = payload.payload || payload;
              queryClient.invalidateQueries({ queryKey: ['user'] });
              toast.success(`${fp.followerName} ahora te sigue`);
              break;
            }
            case 'story_view': {
              const sp = payload.payload || payload;
              queryClient.invalidateQueries({ queryKey: ['story', sp.storyId, 'views'] });
              break;
            }
            case 'price_drop': {
              const pp = payload.payload || payload;
              toast(`${pp.productName} bajó de precio`, {
                description: `Antes: €${pp.oldPrice} → Ahora: €${pp.newPrice}`,
                action: {
                  label: 'Ver',
                  onClick: () => { window.location.href = `/products/${pp.productId}`; },
                },
              });
              break;
            }

            case 'error':
              break;

            default:
              break;
          }
        } catch (e) {
          // silently handled
        }
      };
    } catch {
      // WebSocket constructor failed (e.g. blocked by network/firewall)
      wsFailCountRef.current += 1;
      if (wsFailCountRef.current >= MAX_WS_RETRIES) {
        startPolling();
        reconnectRef.current = setTimeout(connect, 30000);
      } else {
        const delay = reconnectDelayRef.current;
        reconnectRef.current = setTimeout(connect, delay);
        reconnectDelayRef.current = Math.min(delay * 2, 30000);
      }
    }
  }, [isAuthenticated, user, loadConversations, markAsRead, startPolling, stopPolling, queryClient]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
      // Notification events are handled in the main WS onmessage handler below.
      // Do NOT call connectNotifications() — it opens a duplicate connection.
    } else {
      // Close connections when logged out
      if (wsRef.current) wsRef.current.close();
      setConnected(false);
      setNotifConnected(false);
      setConversations([]);
      setUnreadTotal(0);
      setNotifUnreadCount(0);
    }

    return () => {
      clearInterval(pingIntervalRef.current);
      stopPolling();
      // Clear all typing indicator timers
      Object.values(typingTimersRef.current).forEach(clearTimeout);
      typingTimersRef.current = {};
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
    openConversation,
    attachProduct,
    attachDocument,
    sendImage,
    getConversationsByType,
    sendReaction,
    deleteConversation,
    loadOlderMessages,
    hasMoreMessages,
    loadingMore,

    // Typing indicators
    typingUsers,

    // Notifications (migrated from RealtimeProvider)
    notifConnected,
    notifUnreadCount,
    clearNotifUnreadCount,

    // Connection mode
    polling,

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
    openConversation,
    attachProduct,
    attachDocument,
    sendImage,
    getConversationsByType,
    sendReaction,
    deleteConversation,
    loadOlderMessages,
    hasMoreMessages,
    loadingMore,
    typingUsers,
    notifConnected,
    notifUnreadCount,
    clearNotifUnreadCount,
    polling
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}

export default ChatContext;
