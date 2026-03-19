import React from 'react';

export default function ConversationItem({ conversation, active, onClick }) {
  const unreadCount = conversation.unread_count || 0;
  const hasUnread = unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left border-b border-stone-200 transition-colors focus-visible:bg-stone-50 ${active ? 'bg-stone-50' : 'bg-white hover:bg-stone-50'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <strong className={`text-sm truncate ${hasUnread ? 'text-stone-950' : 'text-stone-700'}`}>
          {conversation.other_user_name || conversation.type || 'Conversación'}
        </strong>
        {hasUnread && (
          <span className="min-w-[20px] h-5 rounded-full bg-stone-950 text-white text-xs flex items-center justify-center px-1 flex-shrink-0">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <p className={`text-xs truncate ${hasUnread ? 'font-medium text-stone-900' : 'text-stone-500'}`}>
          {conversation.last_message?.content || 'Sin mensajes aún'}
        </p>
        {conversation.last_message_at && (
          <span className={`text-[10px] flex-shrink-0 ${hasUnread ? 'font-semibold text-stone-900' : 'text-stone-400'}`}>
            {new Date(conversation.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </button>
  );
}
