import React from 'react';

export default function ConversationItem({ conversation, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full p-3 text-left border-b ${active ? 'bg-stone-50' : 'bg-white'}`}>
      <div className="flex items-center justify-between">
        <strong className="text-sm">{conversation.type}</strong>
        {!!conversation.unread_count && <span className="text-xs bg-stone-950 text-white rounded-full px-2">{conversation.unread_count}</span>}
      </div>
      <p className="text-xs text-stone-500 truncate">{conversation.last_message?.content || 'Sin mensajes aún'}</p>
    </button>
  );
}
