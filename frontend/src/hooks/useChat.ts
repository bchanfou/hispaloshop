import { useState } from 'react';
import { api } from '../lib/api';

export function useChat() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const startSession = async (context?: Record<string, unknown>) => {
    const session = await api.createChatSession(context);
    setSessionId(session.id);
    return session;
  };

  const sendMessage = async (content: string) => {
    if (!sessionId) throw new Error('No active session');
    const response = await api.sendChatMessage(sessionId, content);
    setMessages((prev) => [...prev, response.message]);
    return response;
  };

  const loadHistory = async () => {
    if (!sessionId) return null;
    const response = await api.getChatHistory(sessionId);
    setMessages(response.messages || []);
    return response;
  };

  return { sessionId, messages, startSession, sendMessage, loadHistory };
}
