import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreVertical, Sparkles, Trash2, X } from 'lucide-react';
import { useHIChat } from './useHIChat';
import MessageBubble from './MessageBubble';
import SuggestionChips from './SuggestionChips';
import ChatInput from './ChatInput';
import RoleSelector from './RoleSelector';
import { TypingIndicator } from './TypingIndicator';

function ChatContainer() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

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
  } = useHIChat();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (content) => {
    await sendMessage(content);
  };

  const handleSuggestionClick = async (suggestion) => {
    await useSuggestion(suggestion);
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-stone-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-stone-950" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-stone-950 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-stone-950">{roleConfig.name}</h1>
              <p className="text-xs text-stone-500">Tu asistente personal</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRoleSelector(true)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
          >
            Cambiar modo
          </button>

          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-stone-500" />
            </button>

            {/* Options dropdown */}
            <AnimatePresence>
              {showOptions && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowOptions(false)}
                    className="fixed inset-0 z-40"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-stone-100 py-2 z-50"
                  >
                    <button
                      onClick={() => {
                        clearChat();
                        setShowOptions(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      Borrar conversación
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-50">
        <div className="max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              roleConfig={roleConfig}
            />
          ))}
          
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-stone-100 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <TypingIndicator color="var(--color-accent)" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <div className="bg-white border-t border-stone-100 py-3">
          <SuggestionChips
            suggestions={suggestions}
            onSelect={handleSuggestionClick}
          />
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isLoading={isLoading}
      />

      {/* Role Selector Modal */}
      <AnimatePresence>
        {showRoleSelector && (
          <RoleSelector
            activeRole={activeRole}
            onSwitch={switchRole}
            isOpen={showRoleSelector}
            onClose={() => setShowRoleSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ChatContainer;
