// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, ArrowRight, Check } from 'lucide-react';
import apiClient from '../../../services/api/client';
import { toast } from 'sonner';

const QUICK_REACTIONS = ['❤️', '🔥', '😍', '👏', '😮', '😂'];

const EmojiBurst = ({
  emoji,
  id,
  onComplete,
}: {
  emoji: string;
  id: number;
  onComplete: () => void;
}) => (
  <motion.span
    key={id}
    initial={{ y: 0, scale: 1, opacity: 1 }}
    animate={{ y: -60, scale: [1, 1.5, 0], opacity: [1, 1, 0] }}
    transition={{ duration: 0.8, ease: 'easeOut' }}
    onAnimationComplete={onComplete}
    className="absolute bottom-0 left-1/2 -translate-x-1/2 text-3xl pointer-events-none"
  >
    {emoji}
  </motion.span>
);

interface StoryReactionsProps {
  currentItem: any;
  currentStory: any;
  liked: boolean;
  onLikedChange: (liked: boolean) => void;
  onClose: () => void;
  onNavigateToChat: (conversationId: string) => void;
  onPause: () => void;
  onResume: () => void;
  onShareOpen: () => void;
}

export default function StoryReactions({
  currentItem,
  currentStory,
  liked,
  onLikedChange,
  onClose,
  onNavigateToChat,
  onPause,
  onResume,
  onShareOpen,
}: StoryReactionsProps) {
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [emojiBursts, setEmojiBursts] = useState<
    Array<{ id: number; emoji: string }>
  >([]);
  const replyInputRef = React.useRef<HTMLInputElement>(null);

  const user = currentStory?.user;
  const storyId = currentItem?.story_id || currentItem?.id;

  // ── Send reply as DM ──────────────────────────────────────
  const handleSendReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await apiClient.post('/chat/story-reply', {
        story_id: storyId,
        recipient_id: currentStory?.user_id || currentStory?.user?.id,
        message: text,
      });
      const conversationId =
        res?.conversation_id || res?.id || res?._id;
      setReplyText('');
      replyInputRef.current?.blur();
      setReplySent(true);
      setTimeout(() => setReplySent(false), 200);
      if (conversationId) {
        setTimeout(() => {
          onClose();
          onNavigateToChat(conversationId);
        }, 250);
      }
    } catch {
      // fallback: legacy story reply endpoint
      try {
        await apiClient.post(`/stories/${storyId}/reply`, {
          text: replyText.trim(),
        });
        setReplyText('');
        replyInputRef.current?.blur();
        setReplySent(true);
        setTimeout(() => setReplySent(false), 200);
      } catch {
        toast.error('Error al responder');
      }
    } finally {
      setSendingReply(false);
    }
  }, [replyText, sendingReply, currentStory, storyId, onClose, onNavigateToChat]);

  // ── Quick reaction ────────────────────────────────────────
  const handleQuickReaction = useCallback(
    async (emoji: string) => {
      const burstId = Date.now() + Math.random();
      setEmojiBursts((prev) => [...prev, { id: burstId, emoji }]);

      const isHeart = emoji === '❤️';
      if (isHeart) {
        if (liked) return;
        onLikedChange(true);
        try {
          await apiClient.post(`/stories/${storyId}/like`);
        } catch {
          onLikedChange(false);
        }
      } else {
        const recipientId =
          currentStory?.user_id || currentStory?.user?.id;
        if (recipientId) {
          apiClient
            .post('/chat/story-reply', {
              story_id: storyId,
              recipient_id: recipientId,
              message: emoji,
            })
            .catch(() => {});
        }
      }
    },
    [currentStory, storyId, liked, onLikedChange],
  );

  const removeEmojiBurst = useCallback((id: number) => {
    setEmojiBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ── Like toggle ───────────────────────────────────────────
  const handleLikeToggle = useCallback(async () => {
    const newLiked = !liked;
    onLikedChange(newLiked);
    try {
      await apiClient.post(`/stories/${storyId}/like`);
    } catch {
      onLikedChange(!newLiked);
    }
  }, [liked, storyId, onLikedChange]);

  return (
    <>
      {/* Quick emoji reactions */}
      <div className="flex items-center justify-center gap-1.5 px-3 py-1">
        {QUICK_REACTIONS.map((emoji) => (
          <div key={emoji} className="relative">
            <button
              onClick={() => handleQuickReaction(emoji)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl bg-transparent border-none cursor-pointer hover:bg-white/10 transition-colors"
              aria-label={`Reaccionar con ${emoji}`}
            >
              {emoji}
            </button>
            <AnimatePresence>
              {emojiBursts
                .filter((b) => b.emoji === emoji)
                .map((b) => (
                  <EmojiBurst
                    key={b.id}
                    id={b.id}
                    emoji={b.emoji}
                    onComplete={() => removeEmojiBurst(b.id)}
                  />
                ))}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Bottom bar: like + reply input + send/share */}
      <div className="flex items-center gap-2 px-3 py-2 pb-[calc(env(safe-area-inset-bottom,8px)+8px)]">
        <button
          onClick={handleLikeToggle}
          className="shrink-0 w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer"
          aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
        >
          <Heart
            size={24}
            className={liked ? 'text-white fill-white' : 'text-white'}
            strokeWidth={liked ? 0 : 1.5}
          />
        </button>
        <input
          ref={replyInputRef}
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onFocus={onPause}
          onBlur={onResume}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && replyText.trim()) {
              e.preventDefault();
              handleSendReply();
            }
          }}
          placeholder={`Responder a @${user?.username || user?.name || 'usuario'}...`}
          className="flex-1 min-h-[44px] rounded-full bg-white/10 border border-white/20 px-4 text-sm text-white placeholder-white/40 outline-none focus:border-white/40 font-sans"
        />
        {replyText.trim() ? (
          <button
            onClick={handleSendReply}
            disabled={sendingReply}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full border-none cursor-pointer disabled:opacity-50"
            aria-label="Enviar respuesta como mensaje directo"
          >
            {replySent ? (
              <Check size={18} className="text-stone-950" />
            ) : (
              <ArrowRight size={18} className="text-stone-950" />
            )}
          </button>
        ) : (
          <button
            onClick={onShareOpen}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer"
            aria-label="Compartir historia"
          >
            <Send size={20} className="text-white" />
          </button>
        )}
      </div>
    </>
  );
}
