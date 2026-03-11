import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, ThumbsUp, ThumbsDown, Check } from 'lucide-react';

// Simple markdown parser — bold, italic, line breaks
const parseMarkdown = (text) => {
  let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  // Bullet lists
  html = html.replace(/^[\s]*[-•]\s+(.+)$/gm, '<li class="ml-3">$1</li>');
  html = html.replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="space-y-0.5 my-1 list-none">$1</ul>');
  html = html.replace(/\n/g, '<br />');
  return html;
};

function HAAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0">
      <span className="text-white font-semibold text-[9px] tracking-tight">HA</span>
    </div>
  );
}

function MessageBubble({ message, roleConfig, isFirstInGroup }) {
  const isUser   = message.role === 'user';
  const isSystem = message.role === 'system';
  const [copied, setCopied]     = useState(false);
  const [feedback, setFeedback] = useState(null); // 'up' | 'down' | null

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-4 py-1.5 bg-stone-100 text-stone-500 text-xs rounded-full"
        >
          {message.content}
        </motion.span>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-1'} group`}
    >
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[85%]`}>

        {/* AI Avatar — only on first message of each group */}
        {!isUser && (
          <div className="flex-shrink-0 mb-0.5">
            {isFirstInGroup ? (
              <HAAvatar />
            ) : (
              <div className="w-8" /> // spacer to keep alignment
            )}
          </div>
        )}

        <div className="flex flex-col">
          {/* Bubble */}
          <div
            className={`px-4 py-3 ${
              isUser
                ? 'bg-stone-950 text-white rounded-3xl rounded-br-md'
                : 'bg-white text-stone-950 border border-stone-100 shadow-sm rounded-3xl rounded-bl-md'
            }`}
          >
            {/* AI role label — only on first message of group */}
            {!isUser && isFirstInGroup && (
              <p className="text-[10px] font-semibold mb-1.5 text-stone-400 tracking-wide uppercase">
                {roleConfig?.name || 'Hispal AI'}
              </p>
            )}

            {/* Content */}
            {isUser ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div
                className="text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
              />
            )}

            {/* Timestamp */}
            <p className={`text-[10px] mt-2 ${isUser ? 'text-white/50 text-right' : 'text-stone-400'}`}>
              {timestamp}
            </p>
          </div>

          {/* Action row — only for AI messages, visible on group hover */}
          {!isUser && (
            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pl-1">
              <button
                onClick={handleCopy}
                title="Copiar"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-stone-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => setFeedback('up')}
                title="Útil"
                className={`p-1.5 rounded-lg transition-colors ${
                  feedback === 'up'
                    ? 'text-stone-950 bg-stone-100'
                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setFeedback('down')}
                title="No útil"
                className={`p-1.5 rounded-lg transition-colors ${
                  feedback === 'down'
                    ? 'text-stone-950 bg-stone-100'
                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default MessageBubble;
