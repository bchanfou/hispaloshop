import React, { useState, useRef } from 'react';
import { X, Mic, Plus, Image, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MessageInput({ 
  onSend, 
  onTyping, 
  replyingTo, 
  onClearReply,
  onStartRecording,
  onImageClick,
  onFileClick
}) {
  const [value, setValue] = useState('');
  const [showActions, setShowActions] = useState(false);
  const inputRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim(), replyingTo?.id || null);
    setValue('');
    if (onClearReply) onClearReply();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(e);
    }
  };

  return (
    <div className="border-t border-stone-200 bg-white">
      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-0.5 self-stretch bg-stone-950 rounded-full flex-shrink-0" />
            <p className="text-xs text-stone-600 truncate">
              <span className="font-medium text-stone-900">
                {replyingTo.sender_name || 'Mensaje'}
              </span>
              {' · '}
              {replyingTo.content?.slice(0, 80) || replyingTo.preview || ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="flex-shrink-0 rounded-full p-1 text-stone-400 hover:text-stone-700 transition-colors"
            aria-label="Cancelar respuesta"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Action buttons row (expandable) */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-stone-100"
          >
            <div className="flex gap-4 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  onImageClick?.();
                  setShowActions(false);
                }}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                  <Image size={20} className="text-stone-600" />
                </div>
                <span className="text-[10px] text-stone-500">Imagen</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  onFileClick?.();
                  setShowActions(false);
                }}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-200 transition-colors">
                  <FileText size={20} className="text-stone-600" />
                </div>
                <span className="text-[10px] text-stone-500">Archivo</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input row */}
      <div className="p-3 flex items-center gap-2">
        {/* Plus/Actions button */}
        <button
          type="button"
          onClick={() => setShowActions(!showActions)}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
            showActions ? 'bg-stone-200 text-stone-900' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
          aria-label="Adjuntos"
        >
          <Plus size={18} className={`transition-transform ${showActions ? 'rotate-45' : ''}`} />
        </button>

        {/* Text input */}
        <form onSubmit={submit} className="flex-1 flex gap-2">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              onTyping?.(Boolean(e.target.value));
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-stone-100 border-0 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-300 placeholder:text-stone-400"
            placeholder={replyingTo ? 'Responder...' : 'Escribe un mensaje...'}
          />
        </form>

        {/* Mic/Record button (when empty) or Send button (when text) */}
        {value.trim() ? (
          <button
            onClick={submit}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-950 text-stone-50 hover:bg-stone-800 transition-colors"
            aria-label="Enviar mensaje"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartRecording}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition-colors"
            aria-label="Grabar audio"
          >
            <Mic size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
