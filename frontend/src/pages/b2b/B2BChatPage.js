import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Send, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  useB2BConversations,
  useB2BMessages,
  useSendB2BMessage,
  useCreateB2BConversation,
} from '../../hooks/api/useB2BChat';
import { api } from '../../lib/api';

function Avatar({ name, size = 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  return (
    <div className={`${cls} rounded-full bg-[#2D5A3D]/10 flex items-center justify-center font-bold text-[#2D5A3D] flex-shrink-0`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

function ConvRow({ conv, active, onClick }) {
  const other = conv.other_participant;
  const name = other?.company || other?.name || 'Desconocido';
  const preview = conv.last_message_preview || 'Sin mensajes aun';
  const date = conv.last_message_at
    ? new Date(conv.last_message_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    : '';
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 flex items-start gap-3 border-b border-stone-100 text-left transition-colors ${active ? 'bg-[#2D5A3D]/5' : 'hover:bg-stone-50'}`}
    >
      <Avatar name={name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-stone-800 text-sm truncate">{name}</p>
          <span className="text-[10px] text-stone-400 flex-shrink-0">{date}</span>
        </div>
        <p className="text-xs text-stone-500 truncate mt-0.5">{preview}</p>
      </div>
      {conv.unread_count > 0 && (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#2D5A3D] text-white text-[10px] flex items-center justify-center">
          {conv.unread_count}
        </span>
      )}
    </button>
  );
}

function Bubble({ msg, myId }) {
  const isMine = msg.sender_id === myId;
  const isSystem = msg.is_system_message;
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="px-3 py-1 bg-stone-100 text-stone-400 text-xs rounded-full">{msg.content}</span>
      </div>
    );
  }
  const time = msg.created_at
    ? new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '';
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-[#2D5A3D] text-white rounded-br-sm' : 'bg-stone-100 text-stone-800 rounded-bl-sm'}`}>
        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-stone-400'}`}>{time}</p>
      </div>
    </div>
  );
}

function MessageThread({ convId, myId }) {
  const messagesQuery = useB2BMessages(convId);
  const sendMutation = useSendB2BMessage(convId);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const messages = messagesQuery.data?.data?.messages || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
    setText('');
  };

  if (messagesQuery.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-stone-400 text-sm mt-8">Inicia la conversacion enviando un mensaje</p>
        ) : (
          messages.map((msg) => (
            <Bubble key={msg.message_id || msg.id} msg={msg} myId={myId} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="border-t border-stone-200 p-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
          rows={1}
          placeholder="Escribe un mensaje..."
          className="flex-1 resize-none border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/30 max-h-32"
        />
        <button
          type="submit"
          disabled={!text.trim() || sendMutation.isPending}
          className="w-10 h-10 rounded-xl bg-[#2D5A3D] text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
        >
          {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </>
  );
}

export default function B2BChatPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const convsQuery = useB2BConversations();
  const createConv = useCreateB2BConversation();

  const conversations = convsQuery.data?.data || [];

  const targetProducerId = searchParams.get('producer');
  const [activeConvId, setActiveConvId] = useState(searchParams.get('conv') || null);

  // Auto-start conversation if ?producer= is set
  useEffect(() => {
    if (!targetProducerId || createConv.isPending) return;
    const existing = conversations.find(
      (c) => c.producer_id === targetProducerId || c.importer_id === targetProducerId
    );
    if (existing) {
      setActiveConvId(existing.conversation_id);
      setSearchParams({ conv: existing.conversation_id }, { replace: true });
    } else if (conversations !== undefined && !createConv.data) {
      createConv.mutate(
        { producerId: targetProducerId },
        {
          onSuccess: (res) => {
            const newId = res?.data?.conversation_id;
            if (newId) {
              setActiveConvId(newId);
              setSearchParams({ conv: newId }, { replace: true });
            }
          },
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProducerId, conversations]);

  const activeConv = conversations.find((c) => c.conversation_id === activeConvId);
  const otherName = activeConv?.other_participant?.company || activeConv?.other_participant?.name || '';

  // Mobile: show list or thread
  const [mobileView, setMobileView] = useState('list');

  const handleSelectConv = (conv) => {
    setActiveConvId(conv.conversation_id);
    setSearchParams({ conv: conv.conversation_id }, { replace: true });
    setMobileView('thread');
  };

  const sidebar = (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 border-b border-stone-200">
        <h2 className="font-bold text-stone-800">Conversaciones B2B</h2>
        <p className="text-xs text-stone-500 mt-0.5">{conversations.length} conversaciones</p>
      </div>
      {convsQuery.isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <MessageSquare className="w-10 h-10 text-stone-200 mb-3" />
          <p className="text-sm text-stone-500 font-medium">Sin conversaciones</p>
          <p className="text-xs text-stone-400 mt-1">
            Inicia desde el Marketplace B2B
          </p>
          <button
            onClick={() => navigate('/b2b/marketplace')}
            className="mt-4 px-4 py-2 bg-[#2D5A3D] text-white rounded-xl text-sm"
          >
            Ir al Marketplace
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <ConvRow
              key={conv.conversation_id}
              conv={conv}
              active={conv.conversation_id === activeConvId}
              onClick={() => handleSelectConv(conv)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const thread = activeConvId ? (
    <>
      <div className="px-4 py-3 border-b border-stone-200 flex items-center gap-3">
        <button
          className="md:hidden p-1.5 rounded-lg hover:bg-stone-100"
          onClick={() => setMobileView('list')}
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </button>
        {otherName && <Avatar name={otherName} size="sm" />}
        <div>
          <p className="font-semibold text-stone-800 text-sm">{otherName || 'Conversacion'}</p>
          <p className="text-xs text-stone-400">B2B</p>
        </div>
        <button
          className="ml-auto p-1.5 rounded-lg hover:bg-stone-100"
          onClick={() => convsQuery.refetch()}
        >
          <RefreshCw className="w-4 h-4 text-stone-400" />
        </button>
      </div>
      <MessageThread convId={activeConvId} myId={user?.user_id || user?.id} />
    </>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
      <MessageSquare className="w-12 h-12 mb-3 text-stone-200" />
      <p className="text-sm">Selecciona una conversacion</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 p-0 md:p-4">
      {/* Mobile */}
      <div className="md:hidden h-screen bg-white flex flex-col">
        {mobileView === 'list' ? sidebar : <div className="flex flex-col flex-1 min-h-0">{thread}</div>}
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[300px_1fr] h-[calc(100vh-96px)] bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <aside className="border-r border-stone-200">{sidebar}</aside>
          <main className="flex flex-col min-h-0">{thread}</main>
        </div>
      </div>
    </div>
  );
}
