import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, CheckCheck } from 'lucide-react';
import DOMPurify from 'dompurify';

const REACTIONS = ['❤️', '😂', '😮', '😢', '👏', '🔥'];

const parseMarkdown = (text) => {
  // Escape HTML entities first to neutralize any user-injected HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Apply markdown formatting on the escaped text
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/^[\s]*[-•]\s+(.+)$/gm, '<li class="ml-4">$1</li>');
  html = html.replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="my-2 space-y-1 list-none">$1</ul>');
  html = html.replace(/\n/g, '<br />');
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['strong', 'em', 'br', 'ul', 'li'], ALLOWED_ATTR: ['class'] });
};

function HAAvatar() {
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#232323_0%,#0d0d0d_72%)] shadow-[0_8px_18px_rgba(15,15,15,0.14)]">
      <span className="text-[10px] font-semibold tracking-tight text-white">HA</span>
    </div>
  );
}

function ReactionPicker({ isOwn, onReact, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 6 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`absolute z-50 bottom-full mb-2 bg-white border border-stone-100 rounded-full shadow-lg px-2 py-1 flex gap-1 ${isOwn ? 'right-0' : 'left-0'}`}
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          className="text-lg hover:scale-125 transition-transform p-0.5"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onReact(emoji);
            onClose();
          }}
          aria-label={`Reaccionar con ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </motion.div>
  );
}

function ReactionPills({ reactions }) {
  if (!reactions || reactions.length === 0) return null;

  // Aggregate: { emoji -> count }
  const counts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(counts).map(([emoji, count]) => (
        <span
          key={emoji}
          className="inline-flex items-center gap-0.5 bg-stone-100 border border-stone-200 rounded-full px-1.5 py-0.5 text-xs text-stone-700 select-none"
        >
          {emoji}
          {count > 1 && <span className="text-[10px] text-stone-500 ml-0.5">{count}</span>}
        </span>
      ))}
    </div>
  );
}

function MessageBubble({ message, isFirstInGroup, onReact, onSwipeRight }) {
  const isUser = message.role === 'user';
  const isOwn = isUser; // alias for clarity
  const isSystem = message.role === 'system';
  const [copied, setCopied] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Long-press detection
  const pressTimerRef = useRef(null);
  const swipeStartXRef = useRef(null);

  const startLongPress = useCallback(() => {
    pressTimerRef.current = setTimeout(() => {
      setShowPicker(true);
    }, 500);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback((e) => {
    swipeStartXRef.current = e.clientX;
    startLongPress();
  }, [startLongPress]);

  const handlePointerUp = useCallback((e) => {
    cancelLongPress();
    // Swipe-right detection (threshold 60px)
    if (swipeStartXRef.current !== null) {
      const delta = e.clientX - swipeStartXRef.current;
      if (delta > 60 && onSwipeRight) {
        onSwipeRight(message);
      }
      swipeStartXRef.current = null;
    }
  }, [cancelLongPress, onSwipeRight, message]);

  const handlePointerLeave = useCallback(() => {
    cancelLongPress();
    swipeStartXRef.current = null;
  }, [cancelLongPress]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setShowPicker(true);
  }, []);

  const handleReact = useCallback((emoji) => {
    if (onReact) onReact(message, emoji);
  }, [onReact, message]);

  if (isSystem) {
    return (
      <div className="my-3 flex justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-full bg-stone-100 px-4 py-1.5 text-xs text-stone-500"
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

  const isRead = Boolean(message.read_at);

  return (
    <>
      {/* Dismiss picker overlay */}
      {showPicker && (
        <div
          className="fixed inset-0 z-40"
          onPointerDown={() => setShowPicker(false)}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={`group flex ${isUser ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-1.5'}`}
      >
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-[92%] items-end gap-3 sm:max-w-[82%]`}>
          {!isUser ? (
            <div className="mb-1 flex-shrink-0">
              {isFirstInGroup ? <HAAvatar /> : <div className="w-9" />}
            </div>
          ) : null}

          <div className="flex flex-col">
            {/* Bubble with reaction picker */}
            <div className="relative">
              <AnimatePresence>
                {showPicker && (
                  <ReactionPicker
                    isOwn={isOwn}
                    onReact={handleReact}
                    onClose={() => setShowPicker(false)}
                  />
                )}
              </AnimatePresence>

              <div
                className={`px-5 py-4 cursor-pointer select-none ${
                  isUser
                    ? 'rounded-3xl rounded-br-lg bg-[linear-gradient(180deg,#1b1b1b_0%,#0e0e0e_100%)] text-white shadow-[0_16px_34px_rgba(15,15,15,0.18)]'
                    : 'rounded-3xl rounded-bl-lg border border-[#e6dece] bg-[linear-gradient(180deg,#fffdfa_0%,#fbf8f2_100%)] text-stone-950 shadow-[0_12px_28px_rgba(30,25,20,0.06)]'
                }`}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerLeave}
                onContextMenu={handleContextMenu}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap text-[16px] leading-7 tracking-[-0.01em] text-white">{message.content}</p>
                ) : (
                  <div
                    className="text-[17px] leading-8 tracking-[-0.01em] text-stone-900"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
                  />
                )}
              </div>
            </div>

            {/* Reactions display */}
            <ReactionPills reactions={message.reactions} />

            {/* Timestamp + read receipt + copy */}
            <div className={`mt-1.5 flex items-center gap-2 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <p className={`${isUser ? 'text-stone-500' : 'text-stone-400'} text-[11px] font-medium tracking-[0.02em]`}>
                {timestamp}
              </p>
              {isOwn && (
                <CheckCheck
                  size={12}
                  className={isRead ? 'text-stone-600' : 'text-stone-300'}
                  aria-label={isRead ? 'Leído' : 'Entregado'}
                />
              )}
              {!isUser ? (
                <button
                  onClick={handleCopy}
                  title="Copiar"
                  className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-white/80 hover:text-stone-700"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-stone-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

const areMessagePropsEqual = (prev, next) => {
  const pm = prev.message;
  const nm = next.message;
  return (
    pm?.id === nm?.id &&
    pm?.content === nm?.content &&
    pm?.role === nm?.role &&
    pm?.timestamp === nm?.timestamp &&
    pm?.read_at === nm?.read_at &&
    pm?.reactions === nm?.reactions &&
    prev.isFirstInGroup === next.isFirstInGroup
  );
};

export default React.memo(MessageBubble, areMessagePropsEqual);
