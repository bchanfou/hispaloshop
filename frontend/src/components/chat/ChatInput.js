import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

function ChatInput({ onSend, isLoading }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    onSend(message);
    setMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white border-t border-stone-100 p-3 pb-safe">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="w-full bg-stone-100 rounded-2xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-stone-300 resize-none max-h-32"
            style={{ minHeight: '44px' }}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full disabled:opacity-30 transition-colors ${
              message.trim() ? 'bg-stone-950 text-white hover:bg-stone-800' : 'text-stone-400'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatInput;
