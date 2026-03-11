import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, MoreHorizontal, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHIChat, getTimeGreeting } from './useHIChat';
import MessageBubble from './MessageBubble';
import SuggestionChips from './SuggestionChips';
import ChatInput from './ChatInput';
import RoleSelector from './RoleSelector';
import { TypingIndicator } from './TypingIndicator';

function StatusDot({ active }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /> : null}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-stone-500'}`} />
    </span>
  );
}

function WelcomeScreen({ user, roleConfig, suggestions, onSuggestionClick }) {
  const greeting = getTimeGreeting();
  const firstName = user?.name?.split(' ')[0] || null;
  const roleName = roleConfig?.name || 'Hispal AI';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-start px-1 pb-6 pt-10"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 22 }}
        className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-stone-950 shadow-[0_12px_32px_rgba(15,15,15,0.14)]"
      >
        <span className="text-base font-semibold tracking-tight text-white">HA</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-7"
      >
        <p className="mb-2 text-sm font-medium text-stone-500">{roleName}</p>
        <h2 className="mb-2 text-[30px] font-semibold leading-[1.08] tracking-tight text-stone-950">
          {greeting}
          {firstName ? `, ${firstName}` : ''}.
        </h2>
        <p className="max-w-sm text-base leading-7 text-stone-500">¿Qué necesitas ahora?</p>
      </motion.div>

      {suggestions?.length ? (
        <SuggestionChips
          suggestions={suggestions}
          onSelect={onSuggestionClick}
          isEmpty
        />
      ) : null}
    </motion.div>
  );
}

function ClearConfirmModal({ onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="mx-4 mb-6 w-full max-w-sm rounded-[32px] bg-white p-6 shadow-[0_25px_60px_rgba(15,15,15,0.18)]"
      >
        <p className="mb-1 text-base font-semibold text-stone-950">¿Borrar conversación?</p>
        <p className="mb-6 text-sm text-stone-500">Se eliminarán todos los mensajes de esta sesión.</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-stone-200 py-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-stone-950 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-800"
          >
            Borrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ChatContainer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const {
    activeRole,
    roleConfig,
    messages,
    isLoading,
    suggestions,
    sendMessage,
    switchRole,
    clearChat,
    useSuggestion,
    availableRoles,
  } = useHIChat();

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const isWelcomeState = !hasUserMessages;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!showScrollDown) scrollToBottom();
  }, [messages, isLoading, showScrollDown, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distanceFromBottom > 100);
  }, []);

  const handleSuggestionClick = async (suggestion) => {
    await useSuggestion(suggestion);
  };

  const handleSwitchRole = (newRole) => {
    switchRole(newRole);
    setShowActions(false);
  };

  const enrichedMessages = messages.map((msg, i) => ({
    ...msg,
    isFirstInGroup: i === 0 || messages[i - 1].role !== msg.role,
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[linear-gradient(180deg,#f7f4ef_0%,#f3f0ea_100%)]">
      <div className="sticky top-0 z-20 border-b border-stone-200/80 bg-[rgba(247,244,239,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Volver"
              className="-ml-2 rounded-full p-2 transition-colors hover:bg-white/70"
            >
              <ArrowLeft className="h-5 w-5 text-stone-900" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-950 shadow-[0_10px_24px_rgba(15,15,15,0.12)]">
                <span className="text-[11px] font-semibold tracking-tight text-white">HA</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[15px] font-semibold text-stone-950">Hispal AI</h1>
                  <StatusDot active={!isLoading} />
                </div>
                <p className="text-xs text-stone-500">{roleConfig.name}</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowActions((value) => !value)}
              aria-label="Opciones del chat"
              className="rounded-full p-2 transition-colors hover:bg-white/70"
            >
              <MoreHorizontal className="h-5 w-5 text-stone-700" />
            </button>

            <AnimatePresence>
              {showActions ? (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-10"
                    onClick={() => setShowActions(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-[22px] border border-stone-200 bg-white shadow-[0_18px_40px_rgba(15,15,15,0.14)]"
                  >
                    <button
                      onClick={() => {
                        setShowRoleSelector(true);
                        setShowActions(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      Cambiar modo
                    </button>
                    <button
                      onClick={() => {
                        setShowClearConfirm(true);
                        setShowActions(false);
                      }}
                      className="flex w-full items-center gap-2 border-t border-stone-100 px-4 py-3 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Borrar chat
                    </button>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-4 pb-6 pt-2">
          <AnimatePresence mode="wait">
            {isWelcomeState ? (
              <WelcomeScreen
                key="welcome"
                user={user}
                roleConfig={roleConfig}
                suggestions={suggestions}
                onSuggestionClick={handleSuggestionClick}
              />
            ) : (
              <motion.div key="conversation" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-200/80" />
                  <span className="text-[11px] font-medium text-stone-400">Hoy</span>
                  <div className="h-px flex-1 bg-stone-200/80" />
                </div>

                {enrichedMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isFirstInGroup={message.isFirstInGroup}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {isLoading ? <TypingIndicator /> : null}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <AnimatePresence>
        {showScrollDown ? (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => {
              scrollToBottom();
              setShowScrollDown(false);
            }}
            className="absolute bottom-28 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-stone-950 shadow-[0_14px_28px_rgba(15,15,15,0.2)]"
            aria-label="Ir al final"
          >
            <ChevronDown className="h-5 w-5 text-white" />
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {suggestions.length > 0 && !isLoading && !isWelcomeState ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="border-t border-stone-200/80 bg-[rgba(247,244,239,0.82)] py-3 backdrop-blur-xl"
          >
            <div className="mx-auto max-w-3xl px-4">
              <SuggestionChips
                suggestions={suggestions}
                onSelect={handleSuggestionClick}
                isEmpty={false}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ChatInput onSend={sendMessage} isLoading={isLoading} />

      <AnimatePresence>
        {showRoleSelector ? (
          <RoleSelector
            activeRole={activeRole}
            onSwitch={handleSwitchRole}
            isOpen={showRoleSelector}
            onClose={() => setShowRoleSelector(false)}
            availableRoles={availableRoles}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showClearConfirm ? (
          <ClearConfirmModal
            onConfirm={() => {
              clearChat();
              setShowClearConfirm(false);
            }}
            onCancel={() => setShowClearConfirm(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default ChatContainer;
