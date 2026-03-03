import React from 'react';

export default function MessageList({ messages }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((msg) => (
        <div key={msg.id} className="rounded-xl bg-slate-100 px-3 py-2">
          <p className="text-sm">{msg.content}</p>
        </div>
      ))}
    </div>
  );
}
