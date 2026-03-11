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

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 148)}px`;
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

  const hasContent = message.trim().length > 0;
  const charsLeft = MAX_CHARS - message.length;
  const showCounter = message.length >= SHOW_COUNTER_AT;
  const isOverLimit = message.length > MAX_CHARS;

  return (
    <div className="border-t border-stone-200/80 bg-[rgba(246,243,238,0.94)] px-4 pb-safe pt-3 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-3 rounded-[28px] border border-stone-300/90 bg-white px-3 py-3 shadow-[0_12px_32px_rgba(30,25,20,0.08)]">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje"
              rows={1}
              maxLength={MAX_CHARS + 50}
              className={`w-full resize-none bg-transparent px-2 py-2 text-[16px] leading-7 text-stone-950 outline-none transition-all placeholder:text-stone-400 ${
                isOverLimit ? 'ring-2 ring-red-300' : ''
              }`}
              style={{ minHeight: '52px', maxHeight: '148px' }}
            />

            <AnimatePresence>
              {showCounter ? (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className={`absolute -bottom-5 right-2 text-[10px] tabular-nums ${
                    isOverLimit ? 'text-red-400' : 'text-stone-400'
                  }`}
                >
                  {charsLeft}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </div>

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
                className="mb-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-stone-950 shadow-[0_10px_24px_rgba(20,20,20,0.18)] transition-colors hover:bg-stone-800 disabled:bg-stone-300"
                aria-label="Enviar mensaje"
              >
                <ArrowUp className="h-[18px] w-[18px] text-white" />
              </motion.button>
            ) : (
              <div key="placeholder" className="mb-1 h-12 w-12 flex-shrink-0 rounded-full bg-stone-100" />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default ChatInput;
