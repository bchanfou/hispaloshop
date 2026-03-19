import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function MessageInput({ onSend, onTyping, replyingTo, onClearReply }) {
  const [value, setValue] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim(), replyingTo?.id || null);
    setValue('');
    if (onClearReply) onClearReply();
  };

  return (
    <div className="border-t border-stone-200">
      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-stone-50 border-b border-stone-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-0.5 self-stretch bg-stone-950 rounded-full flex-shrink-0" />
            <p className="text-xs text-stone-600 truncate">
              <span className="font-medium text-stone-900">
                {replyingTo.role === 'user' ? 'Tú' : 'HA'}
              </span>
              {' · '}
              {replyingTo.content?.slice(0, 80) || ''}
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

      <form onSubmit={submit} className="p-3 flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onTyping?.(Boolean(e.target.value));
          }}
          className="flex-1 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-300"
          placeholder={replyingTo ? 'Responder...' : 'Escribe un mensaje...'}
        />
        <button
          className="bg-stone-950 hover:bg-stone-800 text-white px-4 rounded-xl transition-colors"
          type="submit"
          aria-label="Enviar mensaje"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
