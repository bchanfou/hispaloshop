import React, { useState, useEffect } from 'react';

function ConversationAvatar({ src, name, size = 'h-[52px] w-[52px]' }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={`Avatar de ${name || 'usuario'}`}
        loading="lazy"
        onError={() => setHasError(true)}
        className={`${size} rounded-full object-cover`}
      />
    );
  }

  const initial = (name || 'U').trim().charAt(0).toUpperCase();
  return (
    <div className={`${size} flex items-center justify-center rounded-full bg-stone-100 text-sm font-medium text-stone-700`}>
      {initial}
    </div>
  );
}

function formatConvTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function ConversationItem({ conversation, active, onClick }) {
  const unreadCount = conversation.unread_count || 0;
  const hasUnread = unreadCount > 0;
  const timestamp = conversation.last_message_at || conversation.last_message?.created_at || conversation.updated_at;
  const previewText = conversation.last_message?.content || 'Sin mensajes';

  return (
    <button
      onClick={onClick}
      className={`flex w-full min-h-[72px] items-center gap-3 px-4 py-3 text-left transition-colors active:bg-stone-50 ${
        active ? 'bg-stone-50' : 'bg-white hover:bg-stone-50'
      }`}
    >
      {/* Avatar */}
      <div className="shrink-0">
        <ConversationAvatar
          src={conversation.other_user_avatar || conversation.avatar}
          name={conversation.other_user_name || conversation.type || 'Usuario'}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Row 1: name + time + unread dot */}
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-[14px] text-stone-950 ${hasUnread ? 'font-semibold' : 'font-normal'}`}>
            {conversation.other_user_name || conversation.type || 'Conversacion'}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className={`text-[12px] ${hasUnread ? 'font-medium text-stone-950' : 'text-stone-400'}`}>
              {formatConvTime(timestamp)}
            </span>
            {hasUnread && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-stone-950" />
            )}
          </div>
        </div>

        {/* Row 2: preview text */}
        <p className={`mt-0.5 truncate text-[13px] leading-snug ${hasUnread ? 'font-medium text-stone-800' : 'text-stone-400'}`}>
          {previewText}
        </p>
      </div>
    </button>
  );
}
