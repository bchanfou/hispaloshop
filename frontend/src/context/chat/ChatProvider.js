import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001/api/v1';
const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const loadConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/chat/conversations`, { withCredentials: true });
      setConversations(res.data || []);
      setUnreadTotal((res.data || []).reduce((sum, conv) => sum + (conv.unread_count || 0), 0));
    } catch (e) {
      console.warn('Failed to load conversations', e);
    }
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const wsBase = API.replace(/^http/, 'ws').replace('/api/v1', '');
    const ws = new WebSocket(`${wsBase}/api/v1/chat/ws/chat?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      loadConversations();
    };
    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 1500);
    };
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'message_received') {
        loadConversations();
      }
    };
  }, [loadConversations]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const value = useMemo(() => ({ connected, conversations, unreadTotal, ws: wsRef.current, reload: loadConversations }), [connected, conversations, unreadTotal, loadConversations]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
  return ctx;
}
