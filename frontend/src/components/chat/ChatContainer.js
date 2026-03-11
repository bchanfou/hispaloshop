import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronDown, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useHIChat, getTimeGreeting } from './useHIChat';
import MessageBubble from './MessageBubble';
import SuggestionChips from './SuggestionChips';
import ChatInput from './ChatInput';
import RoleSelector from './RoleSelector';
import { TypingIndicator } from './TypingIndicator';

// ── Status dot ───────────────────────────────────────────────────
function StatusDot({ active }) {
  return (
    <span className="relative flex h-2 w-2">
      {active && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-emerald-400' : 'bg-stone-500'}`} />
    </span>
  );
}

// ── Welcome screen ───────────────────────────────────────────────
function WelcomeScreen({ user, roleConfig, suggestions, onSuggestionClick }) {
  const greeting   = getTimeGreeting();
  const firstName  = user?.name?.split(' ')[0] || null;
  const roleName   = roleConfig?.name || 'Hispal AI';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center px-6 pt-12 pb-6"
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 22 }}
        className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center mb-5 shadow-md"
      >
        <span className="text-white font-bold text-lg tracking-tight">HA</span>
      </motion.div>

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-semibold text-stone-950 mb-2">
          {greeting}{firstName ? `, ${firstName}` : ''}.
        </h2>
        <p className="text-stone-500 text-sm leading-relaxed max-w-xs">
          Soy <span className="font-semibold text-stone-800">{roleName}</span>.
          {' '}¿En qué puedo ayudarte hoy?
        </p>
      </motion.div>

      {/* 2×2 suggestion grid */}
      {suggestions && suggestions.length > 0 && (
        <SuggestionChips
          suggestions={suggestions}
          onSelect={onSuggestionClick}
          isEmpty
        />
      )}
    </motion.div>
  );
}

// ── Clear confirmation modal ─────────────────────────────────────
function ClearConfirmModal({ onConfirm, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] flex items-end justify-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm mx-4 mb-6 bg-white rounded-3xl p-6 shadow-xl"
      >
        <p className="text-base font-semibold text-stone-950 mb-1">¿Borrar conversación?</p>
        <p className="text-sm text-stone-500 mb-6">
          Se eliminarán todos los mensajes de esta sesión. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-full border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full bg-stone-950 text-sm font-medium text-white hover:bg-stone-800 transition-colors"
          >
            Borrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main container ───────────────────────────────────────────────
function ChatContainer() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const messagesEndRef    = useRef(null);
  const scrollContainerRef = useRef(null);

  const [showRoleSelector,   setShowRoleSelector]   = useState(false);
  const [showClearConfirm,   setShowClearConfirm]   = useState(false);
  const [showScrollDown,     setShowScrollDown]     = useState(false);
  const [roleConfirmMsg,     setRoleConfirmMsg]      = useState(null);

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

  // Detect welcome state — only the initial assistant message, no user messages yet
  const hasUserMessages = messages.some((m) => m.role === 'user');
  const isWelcomeState  = !hasUserMessages;

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (!showScrollDown) scrollToBottom();
  }, [messages, isLoading, showScrollDown, scrollToBottom]);

  // Detect scroll position for the scroll-down button
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distanceFromBottom > 100);
  }, []);

  const handleSend = async (content) => {
    await sendMessage(content);
  };

  const handleSuggestionClick = async (suggestion) => {
    await useSuggestion(suggestion);
  };

  const handleSwitchRole = (newRole) => {
    switchRole(newRole);
    const config = { consumer: 'Hispal AI', producer: 'Hispal Ventas', influencer: 'Hispal Creativo', importer: 'Hispal Ventas' };
    const name = config[newRole] || 'Hispal AI';
    setRoleConfirmMsg(`Ahora hablas con ${name}`);
    setTimeout(() => setRoleConfirmMsg(null), 2800);
  };

  const handleClearConfirm = () => {
    clearChat();
    setShowClearConfirm(false);
  };

  // Compute isFirstInGroup for each message
  const enrichedMessages = messages.map((msg, i) => ({
    ...msg,
    isFirstInGroup: i === 0 || messages[i - 1].role !== msg.role,
  }));

  return (
    <div className="flex flex-col h-screen bg-stone-50 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-950 sticky top-0 z-10">
        {/* Left: back + identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="p-2 -ml-2 hover:bg-stone-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-2.5">
            {/* HA Avatar small */}
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white font-semibold text-[11px] tracking-tight">HA</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-semibold text-white text-sm">Hispal AI</h1>
                <StatusDot active={!isLoading} />
              </div>
              <p className="text-[11px] text-white/50">{roleConfig.name}</p>
            </div>
          </div>
        </div>

        {/* Right: role pill + options */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRoleSelector(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors"
          >
            Cambiar modo
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            aria-label="Borrar conversación"
            className="p-2 hover:bg-stone-800 rounded-full transition-colors"
          >
            <Trash2 className="w-4 h-4 text-white/60 hover:text-white/90" />
          </button>
        </div>
      </div>

      {/* ── Role switch confirmation chip ───────────────────────── */}
      <AnimatePresence>
        {roleConfirmMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex justify-center pt-2 px-4 absolute top-16 left-0 right-0 z-20"
          >
            <span className="px-4 py-1.5 bg-stone-950 text-white text-xs rounded-full shadow-lg">
              {roleConfirmMsg}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages area ───────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto px-4 pb-4">

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
                {/* Date separator — simple "Hoy" */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-stone-200" />
                  <span className="text-[11px] text-stone-400 font-medium">Hoy</span>
                  <div className="flex-1 h-px bg-stone-200" />
                </div>

                {enrichedMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    roleConfig={roleConfig}
                    isFirstInGroup={message.isFirstInGroup}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && <TypingIndicator roleConfig={roleConfig} />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Scroll-to-bottom button ─────────────────────────────── */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => { scrollToBottom(); setShowScrollDown(false); }}
            className="absolute bottom-32 right-4 z-20 w-9 h-9 rounded-full bg-stone-950 shadow-lg flex items-center justify-center"
            aria-label="Ir al final"
          >
            <ChevronDown className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Suggestion chips (conversation mode) ────────────────── */}
      <AnimatePresence>
        {suggestions.length > 0 && !isLoading && !isWelcomeState && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-white border-t border-stone-100 py-2.5"
          >
            <SuggestionChips
              suggestions={suggestions}
              onSelect={handleSuggestionClick}
              isEmpty={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input ───────────────────────────────────────────────── */}
      <ChatInput onSend={handleSend} isLoading={isLoading} />

      {/* ── Role Selector bottom sheet ──────────────────────────── */}
      <AnimatePresence>
        {showRoleSelector && (
          <RoleSelector
            activeRole={activeRole}
            onSwitch={handleSwitchRole}
            isOpen={showRoleSelector}
            onClose={() => setShowRoleSelector(false)}
            availableRoles={availableRoles}
          />
        )}
      </AnimatePresence>

      {/* ── Clear confirmation ──────────────────────────────────── */}
      <AnimatePresence>
        {showClearConfirm && (
          <ClearConfirmModal
            onConfirm={handleClearConfirm}
            onCancel={() => setShowClearConfirm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatContainer;
