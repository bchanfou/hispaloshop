import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Mic, Paperclip, Image, ShoppingBag, Bookmark } from 'lucide-react';

function ChatInput({ onSend, isLoading, roleColor }) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef(null);

  // Auto-focus on mount
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

  // Simulated voice input
  const toggleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      // Simulate voice transcription
      setTimeout(() => {
        setMessage('¿Qué me recomiendas para cenar hoy?');
      }, 500);
    } else {
      setIsRecording(true);
      // Auto-stop after 5 seconds
      setTimeout(() => {
        setIsRecording(false);
        setMessage('¿Qué me recomiendas para cenar hoy?');
      }, 3000);
    }
  };

  return (
    <div className="bg-white border-t border-stone-100 p-3 pb-safe">
      {/* Quick actions */}
      <div className="flex gap-3 mb-2 px-1">
        <button className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors">
          <Paperclip className="w-4 h-4" />
          <span>Adjuntar</span>
        </button>
        <button className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors">
          <Image className="w-4 h-4" />
          <span>Foto</span>
        </button>
        <button className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors">
          <ShoppingBag className="w-4 h-4" />
          <span>Producto</span>
        </button>
        <button className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors">
          <Bookmark className="w-4 h-4" />
          <span>Guardado</span>
        </button>
      </div>

      {/* Input field */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Voice button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={toggleVoice}
          className={`p-3 rounded-full transition-colors ${
            isRecording 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-stone-100 text-text-muted hover:bg-stone-200'
          }`}
        >
          <Mic className="w-5 h-5" />
        </motion.button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="w-full bg-stone-100 rounded-2xl px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-accent/20 resize-none max-h-32"
            style={{ minHeight: '44px' }}
          />
          
          {/* Send button inside input */}
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full disabled:opacity-30 transition-colors"
            style={{ 
              backgroundColor: message.trim() ? roleColor : 'transparent',
              color: message.trim() ? 'white' : '#6B7280',
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Recording indicator */}
      {isRecording && (
        <div className="text-center mt-2">
          <span className="text-xs text-red-500 animate-pulse">
            Escuchando... (habla ahora)
          </span>
        </div>
      )}
    </div>
  );
}

export default ChatInput;
