/**
 * EscalationChat
 *
 * Canal privado y cifrado entre Admins y SuperAdmins.
 * - Admin: abre/ve su única conversación de escalación
 * - SuperAdmin: ve todas las conversaciones de escalación activas
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { Send, ShieldAlert, Lock, RefreshCw, User, ChevronLeft } from 'lucide-react';

const WS_URL = typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  : '';

export default function EscalationChat() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [escalations, setEscalations] = useState([]);  // for super_admin: list of all
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialMessage, setInitialMessage] = useState('');
  const wsRef = useRef(null);
  const bottomRef = useRef(null);

  // ── load escalations ──────────────────────────────────────
  const fetchEscalations = useCallback(async () => {
    try {
      const data = await apiClient.get('/internal-chat/escalations');
      setEscalations(data);
      // Admins auto-select their single conversation if it exists
      if (!isSuperAdmin && data.length > 0) {
        setActiveConvId(data[0].conversation_id);
      }
    } catch {
      // no escalation yet for this admin — that's fine
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => { fetchEscalations(); }, [fetchEscalations]);

  // ── load messages when conversation selected ──────────────
  useEffect(() => {
    if (!activeConvId) return;
    const load = async () => {
      try {
        const data = await apiClient.get(
          `/internal-chat/conversations/${activeConvId}/messages?limit=100`
        );
        setMessages(data);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      } catch {
        toast.error('No se pudieron cargar los mensajes');
      }
    };
    load();
  }, [activeConvId]);

  // ── WebSocket real-time ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const ws = new WebSocket(`${WS_URL}/ws/chat/${user.user_id}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'new_message' && payload.conv_type === 'escalation') {
          if (payload.conversation_id === activeConvId) {
            setMessages(prev => [...prev, payload.message]);
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
          }
          fetchEscalations();
        }
      } catch {
        // Ignore malformed websocket payloads and keep stream alive.
      }
    };
    return () => ws.close();
  }, [user, activeConvId, fetchEscalations]);

  // ── open escalation (admin only) ─────────────────────────
  const openEscalation = async () => {
    if (!initialMessage.trim()) {
      toast.error('Describe el problema antes de escalar');
      return;
    }
    try {
      const data = await apiClient.post(
        '/internal-chat/escalate',
        { message: initialMessage }
      );
      setInitialMessage('');
      setActiveConvId(data.conversation_id);
      fetchEscalations();
      toast.success('Canal de escalación abierto. Un superadmin recibirá tu mensaje.');
    } catch (err) {
      toast.error(err.message || 'Error al abrir escalación');
    }
  };

  // ── send message ─────────────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() || !activeConvId) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const msg = await apiClient.post(
        '/internal-chat/messages',
        { conversation_id: activeConvId, content }
      );
      setMessages(prev => [...prev, msg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err) {
      toast.error(err.message || 'Error al enviar');
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-0 bg-stone-50">
      {/* ── SIDEBAR: super admin sees all escalations ──────── */}
      {isSuperAdmin && (
        <aside className="w-full md:w-72 border-r border-stone-200 bg-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-stone-700" />
              <h2 className="font-semibold text-stone-950">Escalaciones</h2>
              <span className="ml-auto text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium">
                {escalations.filter(e => (e.unread_count || 0) > 0).length} sin leer
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {escalations.length === 0 ? (
              <p className="p-6 text-sm text-stone-500 text-center">Sin escalaciones activas</p>
            ) : escalations.map(conv => {
              const other = conv.participants?.find(p => p.role !== 'super_admin') || conv.participants?.[0];
              return (
                <button
                  key={conv.conversation_id}
                  onClick={() => setActiveConvId(conv.conversation_id)}
                  className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition-colors ${activeConvId === conv.conversation_id ? 'bg-stone-100 border-l-2 border-stone-950' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-stone-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-950 truncate">{other?.name || 'Admin'}</p>
                      <p className="text-xs text-stone-500 truncate">
                        {conv.last_message?.content || 'Sin mensajes'}
                      </p>
                    </div>
                    {(conv.unread_count || 0) > 0 && (
                      <span className="w-5 h-5 bg-stone-950 text-white text-xs rounded-full flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      )}

      {/* ── MAIN CHAT AREA ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3">
          {isSuperAdmin && activeConvId && (
            <button onClick={() => setActiveConvId(null)} className="md:hidden p-1 text-stone-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <ShieldAlert className="w-5 h-5 text-stone-700 shrink-0" />
          <div>
            <h1 className="font-semibold text-stone-950 text-sm">Canal de Escalación Privado</h1>
            <p className="text-xs text-stone-500 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Cifrado AES-256 · Solo visible para admins y superadmins
            </p>
          </div>
        </div>

        {/* No conv selected (super admin) */}
        {!activeConvId && isSuperAdmin && (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <ShieldAlert className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500">Selecciona una escalación para ver los mensajes</p>
            </div>
          </div>
        )}

        {/* Admin: no escalation yet — show compose form */}
        {!activeConvId && !isSuperAdmin && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-6 h-6 text-stone-700" />
                <h2 className="font-semibold text-stone-950">Escalar a SuperAdmin</h2>
              </div>
              <p className="text-sm text-stone-500 mb-4">
                Usa este canal para reportar problemas críticos, disputas no resueltas o situaciones que requieren intervención de nivel superior.
                El mensaje está cifrado de extremo a extremo en base de datos.
              </p>
              <textarea
                className="w-full border border-stone-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 mb-3"
                rows={4}
                placeholder="Describe el problema o situación a escalar..."
                value={initialMessage}
                onChange={e => setInitialMessage(e.target.value)}
              />
              <button
                onClick={openEscalation}
                disabled={!initialMessage.trim()}
                className="w-full bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                Abrir Canal de Escalación
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {activeConvId && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-stone-500 mt-8">Sin mensajes todavía</p>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_id === user?.user_id;
                return (
                  <div key={msg.message_id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-stone-950 text-white rounded-br-sm'
                        : 'bg-white border border-stone-200 text-stone-950 rounded-bl-sm'
                    }`}>
                      {!isMe && (
                        <p className="text-xs font-medium mb-1 text-stone-700">{msg.sender_name} · {msg.sender_role}</p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-stone-300' : 'text-stone-500'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-stone-200 px-4 py-3">
              <div className="flex gap-2 items-end">
                <textarea
                  className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-200 max-h-32"
                  rows={1}
                  placeholder="Escribe un mensaje cifrado..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKey}
                />
                <button
                  onClick={sendMessage}
                  disabled={!text.trim() || sending}
                  className="p-2.5 bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-1.5 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Cifrado AES-256-GCM en base de datos
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
