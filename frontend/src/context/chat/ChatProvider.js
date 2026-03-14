import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import apiClient, { getWSUrl } from '@/services/api/client';
import { useAuth } from '@/context/AuthContext';
import { getToken } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef(null);
  const notifWsRef = useRef(null);
  const reconnectRef = useRef(null);
  const notifReconnectRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [notifConnected, setNotifConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);
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
      // silently handled
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
      // silently handled
    }
  }, [isAuthenticated]);

  // Send message via WebSocket
  const sendMessage = useCallback((conversationId, content) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
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
      return null;
    }
  }, [isAuthenticated, loadConversations]);

  // Clear notification unread count
  const clearNotifUnreadCount = useCallback(() => {
    setNotifUnreadCount(0);
  }, []);

  // Notification WebSocket connection (migrated from RealtimeProvider)
  const connectNotifications = useCallback(() => {
    if (!isAuthenticated) return;

    if (notifWsRef.current) {
      notifWsRef.current.close();
    }

    const wsUrl = getWSUrl('');
    try {
      const ws = new WebSocket(wsUrl);
      notifWsRef.current = ws;

      ws.onopen = () => {
        setNotifConnected(true);
        const token = getToken();
        if (token) {
          ws.send(JSON.stringify({ type: 'auth', token }));
        }
      };

      ws.onclose = () => {
        setNotifConnected(false);
        notifReconnectRef.current = setTimeout(connectNotifications, 3000);
      };

      ws.onerror = () => {};

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data.type ? data : { type: data.event, payload: data };

          switch (type) {
            case 'notification':
              toast(payload.title, { description: payload.body, duration: 5000 });
              if (!payload.read) setNotifUnreadCount(prev => prev + 1);
              queryClient.invalidateQueries({ queryKey: ['notifications'] });
              break;
            case 'message':
              queryClient.invalidateQueries({ queryKey: ['hi', 'conversations'] });
              queryClient.invalidateQueries({ queryKey: ['hi', 'conversation'] });
              break;
            case 'order_update':
              queryClient.invalidateQueries({ queryKey: ['order', payload.orderId] });
              queryClient.invalidateQueries({ queryKey: ['orders'] });
              toast.success(`Pedido #${payload.orderId}: ${payload.status}`);
              break;
            case 'new_follower':
              queryClient.invalidateQueries({ queryKey: ['user'] });
              toast.success(`${payload.followerName} ahora te sigue`);
              break;
            case 'story_view':
              queryClient.invalidateQueries({ queryKey: ['story', payload.storyId, 'views'] });
              break;
            case 'price_drop':
              toast(`${payload.productName} bajó de precio`, {
                description: `Antes: €${payload.oldPrice} → Ahora: €${payload.newPrice}`,
                action: {
                  label: 'Ver',
                  onClick: () => { window.location.href = `/products/${payload.productId}`; },
                },
              });
              break;
            default:
              break;
          }
        } catch (e) {
          // silently handled
        }
      };
    } catch (error) {
      notifReconnectRef.current = setTimeout(connectNotifications, 5000);
    }
  }, [isAuthenticated, queryClient]);

  // Chat WebSocket connection
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
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
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
        setConnected(false);
        // Reconnect after 3 seconds
        reconnectRef.current = setTimeout(connect, 3000);
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
              break;

            default:
              break;
          }
        } catch (e) {
          // silently handled
        }
      };
    } catch (error) {
      reconnectRef.current = setTimeout(connect, 5000);
    }
  }, [isAuthenticated, user, currentConversation, loadConversations, markAsRead]);

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
      connectNotifications();
    } else {
      // Close connections when logged out
      if (wsRef.current) wsRef.current.close();
      if (notifWsRef.current) notifWsRef.current.close();
      setConnected(false);
      setNotifConnected(false);
      setConversations([]);
      setUnreadTotal(0);
      setNotifUnreadCount(0);
    }

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (notifReconnectRef.current) clearTimeout(notifReconnectRef.current);
      if (wsRef.current) wsRef.current.close();
      if (notifWsRef.current) notifWsRef.current.close();
    };
  }, [isAuthenticated, connect, connectNotifications]);

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

    // Notifications (migrated from RealtimeProvider)
    notifConnected,
    notifUnreadCount,
    clearNotifUnreadCount,

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
    typingUsers,
    notifConnected,
    notifUnreadCount,
    clearNotifUnreadCount
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}

export default ChatContext;
