import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

// Simple markdown parser
const parseMarkdown = (text) => {
  // Bold: **text** or __text__
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br />');
  
  return html;
};

function MessageBubble({ message, roleConfig }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <span className="px-3 py-1 bg-state-amber/15 text-state-amber text-xs rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-2 max-w-[85%]`}>
        {/* Avatar */}
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl ${
            isUser
              ? 'bg-stone-950 text-white rounded-br-md'
              : 'bg-white text-stone-950 border border-stone-100 shadow-sm rounded-bl-md'
          }`}
        >
          {/* Sender name for assistant */}
          {!isUser && (
            <p className="text-xs font-semibold mb-1 text-stone-500">
              {roleConfig.name}
            </p>
          )}

          {/* Content */}
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />

          {/* Timestamp */}
          <p className={`text-[10px] mt-1 ${isUser ? 'text-white/60' : 'text-stone-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default MessageBubble;
