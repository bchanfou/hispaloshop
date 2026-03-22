// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { MessageSquare, Send, ArrowLeft, Loader2, RefreshCw, Search, X, Sparkles, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  useB2BConversations,
  useB2BMessages,
  useSendB2BMessage,
  useCreateB2BConversation,
} from '../../features/b2b/queries';

function Avatar({ name, size = 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base';
  return (
    <div className={`${cls} rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-950 flex-shrink-0`}>
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
      className={`w-full px-4 py-3 flex items-start gap-3 border-b border-stone-100 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-300 ${active ? 'bg-stone-50' : 'hover:bg-stone-50'}`}
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
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-950 text-white text-[10px] flex items-center justify-center">
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
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2 md:mb-1.5`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm md:rounded-xl md:py-2 md:text-[13px] ${isMine ? 'bg-stone-950 text-white rounded-br-sm' : 'bg-stone-100 text-stone-800 rounded-bl-sm'}`}>
        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-stone-400'}`}>{time}</p>
      </div>
    </div>
  );
}

function MessageThread({ convId, myId, operationId, searchFilter = '' }) {
  const messagesQuery = useB2BMessages(convId);
  const sendMutation = useSendB2BMessage(convId);
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const allMessages = messagesQuery.data?.data?.messages || [];

  const activeFilter = (searchFilter || '').trim().toLowerCase();
  const messages = activeFilter
    ? allMessages.filter((msg) =>
        (msg.content || '').toLowerCase().includes(activeFilter)
      )
    : allMessages;

  useEffect(() => {
    if (!activeFilter) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length, activeFilter]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
    setText('');
  };

  const handleAskPedro = () => {
    window.dispatchEvent(
      new CustomEvent('open-hispal-ai', {
        detail: { type: 'b2b', operation_id: operationId || convId },
      })
    );
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
      <div className="flex-1 overflow-y-auto px-4 py-4 md:py-3">
        {messages.length === 0 ? (
          <p className="text-center text-stone-400 text-sm mt-8">
            {activeFilter ? 'Sin resultados' : 'Inicia la conversacion enviando un mensaje'}
          </p>
        ) : (
          messages.map((msg) => (
            <Bubble key={msg.message_id || msg.id} msg={msg} myId={myId} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="border-t border-stone-200 p-3 md:p-2.5 flex flex-col gap-2">
        {/* Pedro AI quick action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAskPedro}
            aria-label="Preguntar a Pedro AI"
            className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 border-none cursor-pointer flex items-center gap-1.5 hover:bg-stone-200 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-300"
          >
            <Sparkles size={12} />
            Preguntar a Pedro
          </button>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
            rows={1}
            placeholder="Escribe un mensaje..."
            className="flex-1 resize-none border border-stone-200 rounded-2xl md:rounded-xl px-3 py-2.5 md:py-2 text-sm focus:outline-none focus:border-stone-950 max-h-32"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendMutation.isPending}
            aria-label="Enviar mensaje"
            className="w-10 h-10 rounded-2xl md:rounded-xl bg-stone-950 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0 transition-opacity duration-150 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-300"
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </>
  );
}

export default function B2BChatPage() {
  const { user } = useAuth();
  const { conversationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const convsQuery = useB2BConversations(Boolean(user));
  const createConv = useCreateB2BConversation();

  const conversations = convsQuery.data?.data || convsQuery.data || [];

  const targetProducerId = searchParams.get('producer');
  const [activeConvId, setActiveConvId] = useState(conversationId || searchParams.get('conv') || null);

  useEffect(() => {
    setActiveConvId(conversationId || searchParams.get('conv') || null);
  }, [conversationId, searchParams]);

  // Auto-start conversation if ?producer= is set
  useEffect(() => {
    if (!targetProducerId || createConv.isPending) return;
    const existing = conversations.find(
      (c) => c.producer_id === targetProducerId || c.importer_id === targetProducerId
    );
    if (existing) {
      const nextId = existing.conversation_id;
      setActiveConvId(nextId);
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete('conv');
        return params;
      }, { replace: true });
      navigate(`/b2b/chat/${nextId}`, { replace: true });
    } else if (conversations !== undefined && !createConv.data) {
      createConv.mutate(
        { producerId: targetProducerId },
        {
          onSuccess: (res) => {
            const newId = res?.conversation_id || res?.data?.conversation_id;
            if (newId) {
              setActiveConvId(newId);
              setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                params.delete('conv');
                return params;
              }, { replace: true });
              navigate(`/b2b/chat/${newId}`, { replace: true });
            }
          },
        }
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProducerId, conversations]);

  const activeConv = conversations.find((c) => c.conversation_id === activeConvId);
  const otherName = activeConv?.other_participant?.company || activeConv?.other_participant?.name || '';
  const currentOpId = activeConv?.operation_id || activeConv?.b2b_operation_id || null;

  // Mobile: show list or thread
  const [mobileView, setMobileView] = useState('list');
  const [showSearch, setShowSearch] = useState(false);
  const [threadSearchQuery, setThreadSearchQuery] = useState('');

  const handleSelectConv = (conv) => {
    const nextId = conv.conversation_id;
    setActiveConvId(nextId);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.delete('conv');
      return params;
    }, { replace: true });
    navigate(`/b2b/chat/${nextId}`);
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
            className="mt-4 px-4 py-2 bg-stone-950 text-white rounded-2xl text-sm"
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
          className="md:hidden p-1.5 rounded-2xl hover:bg-stone-100"
          aria-label="Volver a lista de conversaciones"
          onClick={() => setMobileView('list')}
        >
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </button>
        {otherName && <Avatar name={otherName} size="sm" />}
        <div>
          <p className="font-semibold text-stone-800 text-sm">{otherName || 'Conversacion'}</p>
          <p className="text-xs text-stone-400">B2B</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            className="p-1.5 rounded-2xl hover:bg-stone-100 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-300"
            aria-label={showSearch ? 'Cerrar búsqueda' : 'Buscar en mensajes'}
            onClick={() => {
              setShowSearch((prev) => !prev);
              if (showSearch) setThreadSearchQuery('');
            }}
          >
            {showSearch ? <X className="w-4 h-4 text-stone-400" /> : <Search className="w-4 h-4 text-stone-400" />}
          </button>
          <button
            className="p-1.5 rounded-2xl hover:bg-stone-100 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-stone-300"
            aria-label="Actualizar conversaciones"
            onClick={() => convsQuery.refetch()}
          >
            <RefreshCw className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      </div>
      {showSearch && (
        <div className="px-4 py-2 border-b border-stone-100 flex items-center gap-2">
          <Search size={14} className="text-stone-400 flex-shrink-0" />
          <input
            type="text"
            value={threadSearchQuery}
            onChange={(e) => setThreadSearchQuery(e.target.value)}
            placeholder="Buscar mensajes..."
            autoFocus
            className="flex-1 text-sm bg-transparent border-none outline-none text-stone-950 placeholder:text-stone-400"
          />
          {threadSearchQuery && (
            <button onClick={() => setThreadSearchQuery('')} className="p-1 bg-transparent border-none cursor-pointer">
              <X size={14} className="text-stone-400" />
            </button>
          )}
        </div>
      )}
      <MessageThread convId={activeConvId} myId={user?.user_id || user?.id} operationId={currentOpId} searchFilter={threadSearchQuery} />
    </>
  ) : (
    <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
      <MessageSquare className="w-12 h-12 mb-3 text-stone-200" />
      <p className="text-sm">Selecciona una conversacion</p>
    </div>
  );

  /* Role guard */
  if (user && user.role !== 'producer' && user.role !== 'importer') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <ShieldAlert size={36} className="text-stone-400" />
        <p className="text-stone-950 text-[15px] font-semibold">No tienes acceso a esta sección</p>
        <p className="text-stone-500 text-[13px]">Necesitas un perfil de productor o importador para acceder al chat B2B.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold border-none cursor-pointer mt-2"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

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
