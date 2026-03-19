import React from 'react';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, onReact, onSwipeRight }) {
  // Group consecutive messages by role for avatar display
  const grouped = React.useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const isFirstInGroup = !prev || prev.role !== msg.role;
      return { msg, isFirstInGroup };
    });
  }, [messages]);

  return (
    <div
      className="flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto px-3 py-4"
      style={{ overflowX: 'hidden' }}
    >
      {grouped.map(({ msg, isFirstInGroup }) => (
        <MessageBubble
          key={msg.id ?? msg._id ?? msg.timestamp}
          message={msg}
          isFirstInGroup={isFirstInGroup}
          onReact={onReact}
          onSwipeRight={onSwipeRight}
        />
      ))}
    </div>
  );
}
