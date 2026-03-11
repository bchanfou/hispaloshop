import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

const MAX_CHARS = 2000;
const SHOW_COUNTER_AT = 200;

function ChatInput({ onSend, isLoading }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [message]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!message.trim() || isLoading) return;
    onSend(message.trim());
    setMessage('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasContent   = message.trim().length > 0;
  const charsLeft    = MAX_CHARS - message.length;
  const showCounter  = message.length >= SHOW_COUNTER_AT;
  const isOverLimit  = message.length > MAX_CHARS;

  return (
    <div className="bg-white/80 backdrop-blur-sm border-t border-stone-100 px-4 py-3 pb-safe">
      <div className="flex items-end gap-2">
        {/* Input pill */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe algo a Hispal AI..."
            rows={1}
            maxLength={MAX_CHARS + 50}
            className={`w-full bg-stone-100 rounded-2xl px-4 py-3 pr-4 text-sm text-stone-950 placeholder:text-stone-400 outline-none focus:ring-2 resize-none transition-all ${
              isOverLimit ? 'ring-2 ring-red-300' : 'focus:ring-stone-200'
            }`}
            style={{ minHeight: '44px', maxHeight: '128px' }}
          />

          {/* Character counter */}
          <AnimatePresence>
            {showCounter && (
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className={`absolute -bottom-5 right-1 text-[10px] tabular-nums ${
                  isOverLimit ? 'text-red-400' : 'text-stone-400'
                }`}
              >
                {charsLeft}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Send button */}
        <AnimatePresence mode="wait">
          {hasContent ? (
            <motion.button
              key="send"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || isOverLimit}
              className="w-10 h-10 rounded-full bg-stone-950 hover:bg-stone-800 disabled:bg-stone-300 flex items-center justify-center flex-shrink-0 transition-colors shadow-sm"
              aria-label="Enviar mensaje"
            >
              <ArrowUp className="w-4 h-4 text-white" />
            </motion.button>
          ) : (
            <div key="placeholder" className="w-10 h-10 flex-shrink-0" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ChatInput;
