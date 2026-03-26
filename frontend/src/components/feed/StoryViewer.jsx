import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, ArrowRight, Eye, Volume2, VolumeX, ExternalLink, ChevronLeft, ChevronRight, Check, Search } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const STORY_DURATION = 5000;

// 4.4: Hoisted price formatter — avoids re-creating Intl instance every render
const priceFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

const QUICK_REACTIONS = ['❤️', '🔥', '😍', '👏', '😮', '😂'];

// A-1: Emoji burst animation component for quick reactions
const EmojiBurst = ({ emoji, id, onComplete }) => (
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

const isInternalUrl = (url) => {
  try {
    const u = new URL(url, window.location.origin);
    return u.hostname === window.location.hostname || u.hostname.endsWith('hispaloshop.com');
  } catch (err) { /* invalid URL */ return false; }
};

// 4.1: Transition variants — crossfade within same user, slide between different users
const storyVariants = {
  enter: (ctx) => ctx.isUserChange
    ? { x: ctx.direction > 0 ? '100%' : '-100%', opacity: 1 }
    : { opacity: 0, x: 0 },
  center: { x: 0, opacity: 1 },
  exit: (ctx) => ctx.isUserChange
    ? { x: ctx.direction > 0 ? '-100%' : '100%', opacity: 1 }
    : { opacity: 0, x: 0 },
};

export default function StoryViewer({ stories, initialIndex = 0, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [currentUserIndex, setCurrentUserIndex] = useState(initialIndex);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [videoDuration, setVideoDuration] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [muted, setMuted] = useState(true);
  const [emojiBursts, setEmojiBursts] = useState([]);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [shareConversations, setShareConversations] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSending, setShareSending] = useState(null);
  const [showSeenBy, setShowSeenBy] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [swipeDownY, setSwipeDownY] = useState(0);
  const swipingDown = useRef(false);
  const [tapHintShown, setTapHintShown] = useState(() => {
    try { return localStorage.getItem('hsp_story_tap_hint') === '1'; } catch (err) { /* storage unavailable */ return false; }
  });
  const [tapHintSide, setTapHintSide] = useState(null); // 'left' | 'right' | null
  const tapHintTimerRef = useRef(null);
  const longPressRef = useRef(null);
  const rafRef = useRef(null);
  const isPaused = useRef(false);
  const pointerStartX = useRef(null);
  const pointerStartY = useRef(null);
  const pointerStartTime = useRef(null);
  const videoRef = useRef(null);
  const replyInputRef = useRef(null);
  const directionRef = useRef(1);
  const isUserChangeRef = useRef(false);

  const viewedRef = useRef(new Set());

  // Invalidate stories query on close so ring colors refresh with updated has_unseen
  const handleClose = useCallback(() => {
    if (viewedRef.current.size > 0) {
      queryClient.invalidateQueries({ queryKey: ['feed-stories'] });
    }
    onClose();
  }, [onClose, queryClient]);

  const currentStory = stories[currentUserIndex];
  const items = currentStory?.items || [];
  const currentItem = items[currentItemIndex];

  // Respect prefers-reduced-motion: auto-advance still works but without smooth progress
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Determine effective duration: video real duration (capped at 30s) or default 5s for images
  const MAX_VIDEO_DURATION = 30000;
  const effectiveDuration = currentItem?.video_url
    ? (videoDuration && isFinite(videoDuration) ? Math.min(videoDuration, MAX_VIDEO_DURATION) : STORY_DURATION)
    : STORY_DURATION;

  // 4.1: Transition context read from refs during render
  const transitionCtx = { direction: directionRef.current, isUserChange: isUserChangeRef.current };

  const goNext = useCallback(() => {
    directionRef.current = 1;
    if (currentItemIndex < items.length - 1) {
      isUserChangeRef.current = false;
      setCurrentItemIndex((i) => i + 1);
      setProgress(0);
      setVideoDuration(null);
    } else if (currentUserIndex < stories.length - 1) {
      isUserChangeRef.current = true;
      setCurrentUserIndex((u) => u + 1);
      setCurrentItemIndex(0);
      setProgress(0);
      setVideoDuration(null);
    } else {
      handleClose();
    }
  }, [currentItemIndex, items.length, currentUserIndex, stories.length, handleClose]);

  const goPrev = useCallback(() => {
    directionRef.current = -1;
    if (currentItemIndex > 0) {
      isUserChangeRef.current = false;
      setCurrentItemIndex((i) => i - 1);
      setProgress(0);
      setVideoDuration(null);
    } else if (currentUserIndex > 0) {
      isUserChangeRef.current = true;
      const prevUserItems = stories[currentUserIndex - 1]?.items || [];
      setCurrentUserIndex((u) => u - 1);
      // Land on last story of previous user (IG behavior)
      setCurrentItemIndex(Math.max(0, prevUserItems.length - 1));
      setProgress(0);
      setVideoDuration(null);
    }
  }, [currentItemIndex, currentUserIndex, stories]);

  const goNextUser = useCallback(() => {
    directionRef.current = 1;
    isUserChangeRef.current = true;
    if (currentUserIndex < stories.length - 1) {
      setCurrentUserIndex((u) => u + 1);
      setCurrentItemIndex(0);
      setProgress(0);
      setVideoDuration(null);
    } else {
      handleClose();
    }
  }, [currentUserIndex, stories.length, handleClose]);

  const goPrevUser = useCallback(() => {
    directionRef.current = -1;
    isUserChangeRef.current = true;
    if (currentUserIndex > 0) {
      setCurrentUserIndex((u) => u - 1);
      setCurrentItemIndex(0);
      setProgress(0);
      setVideoDuration(null);
    }
  }, [currentUserIndex]);

  // 4.2: Timer — 60fps progress bar with requestAnimationFrame
  const pauseStartRef = useRef(0);
  const totalPausedRef = useRef(0);

  useEffect(() => {
    if (paused || !items.length) return;
    // For video stories, wait until we know the duration
    if (currentItem?.video_url && !videoDuration) return;

    const startTime = performance.now();
    pauseStartRef.current = 0;
    totalPausedRef.current = 0;

    const tick = (now) => {
      if (isPaused.current) {
        // Track when pause started
        if (pauseStartRef.current === 0) {
          pauseStartRef.current = now;
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      // Accumulate pause duration when unpausing
      if (pauseStartRef.current > 0) {
        totalPausedRef.current += now - pauseStartRef.current;
        pauseStartRef.current = 0;
      }
      const elapsed = now - startTime - totalPausedRef.current;
      const p = Math.min(elapsed / effectiveDuration, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        goNext();
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentUserIndex, currentItemIndex, paused, items.length, goNext, effectiveDuration, videoDuration, currentItem?.video_url]);

  // Reset progress and liked state on item change
  useEffect(() => {
    setProgress(0);
    setLiked(false);
  }, [currentUserIndex, currentItemIndex]);

  // Track story view when current item changes
  useEffect(() => {
    const item = currentStory?.items?.[currentItemIndex];
    const storyId = item?.story_id || item?.id;
    if (storyId && !viewedRef.current.has(storyId)) {
      viewedRef.current.add(storyId);
      apiClient.post(`/stories/${storyId}/view`).catch(() => {
        // Remove from Set so it retries on next visit
        viewedRef.current.delete(storyId);
      });
    }
  }, [currentStory, currentItemIndex]);

  // Lock body scroll while viewer is open + cleanup timers + pause/unload video on unmount
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(longPressRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // B-3: Explicitly pause and unload video on close to free resources
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, []);

  // Keyboard: Escape to close, Arrow keys to navigate
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleClose();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose, goNext, goPrev]);

  // Preload next story image
  useEffect(() => {
    let nextItem = null;
    if (currentItemIndex < items.length - 1) {
      nextItem = items[currentItemIndex + 1];
    } else if (currentUserIndex < stories.length - 1) {
      const nextUserStory = stories[currentUserIndex + 1];
      nextItem = nextUserStory?.items?.[0];
    }
    if (nextItem?.image_url && !nextItem.video_url) {
      const img = new Image();
      img.src = nextItem.image_url;
    }
  }, [currentItemIndex, currentUserIndex, items, stories]);

  // Sync video play/pause with paused state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [paused]);

  // Video metadata handler
  const handleVideoLoaded = useCallback((e) => {
    const dur = e.target.duration;
    if (dur && isFinite(dur)) {
      setVideoDuration(dur * 1000); // convert to ms
    }
  }, []);

  // 4.3: Unified pointer handlers — replaces separate touch/mouse/click handlers
  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    pointerStartTime.current = Date.now();
    longPressRef.current = setTimeout(() => {
      isPaused.current = true;
      setPaused(true);
    }, 120);
  };

  const handlePointerMove = (e) => {
    if (pointerStartY.current === null) return;
    const deltaY = e.clientY - pointerStartY.current;
    if (deltaY > 10 && Math.abs(e.clientX - pointerStartX.current) < 40) {
      swipingDown.current = true;
      setSwipeDownY(Math.max(0, deltaY));
    } else if (!swipingDown.current) {
      setSwipeDownY(0);
    }
  };

  const handlePointerUp = (e) => {
    clearTimeout(longPressRef.current);
    isPaused.current = false;
    setPaused(false);

    const wasSwipingDown = swipingDown.current;
    swipingDown.current = false;
    setSwipeDownY(0);

    if (pointerStartX.current === null) return;

    const deltaX = e.clientX - pointerStartX.current;
    const deltaY = e.clientY - pointerStartY.current;
    const elapsed = Date.now() - (pointerStartTime.current || 0);

    // Swipe down to close
    if (deltaY > 100 && Math.abs(deltaX) < 80) {
      handleClose();
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }

    // If was swiping down but not enough to close, already reset above
    if (wasSwipingDown) {
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }

    // Horizontal swipe between users (fast, >60px)
    if (Math.abs(deltaX) > 60 && elapsed < 400 && Math.abs(deltaY) < 80) {
      if (deltaX < 0) {
        goNextUser();
      } else {
        goPrevUser();
      }
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }

    // Tap — no significant swipe, quick press
    if (elapsed < 200 && Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const threshold = rect.width * 0.4;
      if (x < threshold) {
        showTapHint('left');
        goPrev();
      } else {
        showTapHint('right');
        goNext();
      }
    }

    pointerStartX.current = null;
    pointerStartY.current = null;
  };

  // J3: send reply as DM — open/create conversation then navigate to chat
  const handleSendReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await apiClient.post('/chat/conversations', {
        other_user_id: currentStory?.user_id || currentStory?.user?.id,
        message: text,
      });
      setReplyText('');
      replyInputRef.current?.blur();
      // A-2: Brief checkmark animation before navigating
      setReplySent(true);
      setTimeout(() => setReplySent(false), 200);
      const conversationId = res?.conversation_id || res?.id || res?._id;
      if (conversationId) {
        setTimeout(() => {
          handleClose();
          navigate(`/messages/${conversationId}`);
        }, 250);
      }
    } catch (err) {
      // fallback: legacy story reply endpoint
      try {
        await apiClient.post(`/stories/${currentItem?.story_id}/reply`, { text });
        setReplyText('');
        replyInputRef.current?.blur();
        setReplySent(true);
        setTimeout(() => setReplySent(false), 200);
      } catch (err) { toast.error('Error al responder'); }
    } finally {
      setSendingReply(false);
    }
  }, [replyText, sendingReply, currentStory, currentItem, navigate, handleClose]);

  // A-1: Quick reaction with burst animation + API call simultaneously
  const handleQuickReaction = useCallback(async (emoji) => {
    const burstId = Date.now() + Math.random();
    setEmojiBursts((prev) => [...prev, { id: burstId, emoji }]);
    try {
      await apiClient.post(`/stories/${currentItem?.story_id}/like`);
    } catch (err) { /* reaction best-effort */ }
  }, [currentItem]);

  const removeEmojiBurst = useCallback((id) => {
    setEmojiBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // A-3: Share story to DM — open user picker sheet
  const handleShareOpen = useCallback(async () => {
    // Try navigator.share first on mobile
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        const storyUrl = `${window.location.origin}/stories/${currentItem?.story_id || ''}`;
        await navigator.share({
          title: `Historia de ${user?.name || user?.username || ''}`,
          url: storyUrl,
        });
        return;
      } catch (err) {
        // non-critical: User cancelled or unsupported — fall through to DM picker
      }
    }
    setShareSheetOpen(true);
    setShareLoading(true);
    isPaused.current = true;
    setPaused(true);
    try {
      const res = await apiClient.get('/chat/conversations');
      const convs = Array.isArray(res) ? res : res?.conversations || res?.data || [];
      setShareConversations(convs);
    } catch (err) { /* non-critical: conversations fetch failed, show empty */
      setShareConversations([]);
    } finally {
      setShareLoading(false);
    }
  }, [currentItem, user]);

  const handleShareToUser = useCallback(async (conversation) => {
    const convId = conversation.id || conversation._id || conversation.conversation_id;
    if (!convId || shareSending) return;
    setShareSending(convId);
    try {
      const storyUrl = `${window.location.origin}/stories/${currentItem?.story_id || ''}`;
      await apiClient.post(`/chat/conversations/${convId}/messages`, {
        text: `Mira esta historia: ${storyUrl}`,
        type: 'story_share',
        story_id: currentItem?.story_id,
      });
      setShareSheetOpen(false);
      isPaused.current = false;
      setPaused(false);
      setShareSearch('');
    } catch (err) { toast.error('Error al compartir'); }
    setShareSending(null);
  }, [currentItem, shareSending]);

  const handleShareClose = useCallback(() => {
    setShareSheetOpen(false);
    setShareSearch('');
    isPaused.current = false;
    setPaused(false);
  }, []);

  const filteredShareConversations = shareConversations.filter((c) => {
    if (!shareSearch.trim()) return true;
    const q = shareSearch.toLowerCase();
    const name = (c.other_user?.name || c.other_user?.username || c.name || '').toLowerCase();
    return name.includes(q);
  });

  // Show tap zone hint arrow briefly on first tap (once per session)
  const showTapHint = useCallback((side) => {
    if (tapHintShown) return;
    setTapHintSide(side);
    clearTimeout(tapHintTimerRef.current);
    tapHintTimerRef.current = setTimeout(() => {
      setTapHintSide(null);
      setTapHintShown(true);
      try { localStorage.setItem('hsp_story_tap_hint', '1'); } catch (err) { /* storage unavailable */ }
    }, 600);
  }, [tapHintShown]);

  // Fetch viewers list for seen-by expansion
  const fetchViewers = useCallback(async () => {
    const storyId = currentItem?.story_id || currentItem?.id || currentItem?._id;
    if (!storyId || viewersLoading) return;
    setViewersLoading(true);
    try {
      const res = await apiClient.get(`/stories/${storyId}/viewers`);
      setViewers(Array.isArray(res) ? res : res?.viewers || res?.data || []);
    } catch (err) { /* viewers fetch failed, show empty */
      setViewers([]);
    } finally {
      setViewersLoading(false);
    }
  }, [currentItem, viewersLoading]);

  // Reset seen-by panel when story changes
  useEffect(() => {
    setShowSeenBy(false);
    setViewers([]);
  }, [currentUserIndex, currentItemIndex]);

  if (!currentStory || !items.length) return null;

  const user = currentStory.user;
  const isOwnStory = currentStory.user_id === (currentUser?.user_id || currentUser?.id) || currentStory.user?.id === (currentUser?.user_id || currentUser?.id);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col bg-black"
      role="dialog"
      aria-label={`Historia de ${user?.name || user?.username || 'usuario'}`}
      aria-modal="true"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={swipeDownY > 0 ? {
        transform: `translateY(${swipeDownY}px) scale(${1 - Math.abs(swipeDownY) / 2000})`,
        borderRadius: `${Math.min(Math.abs(swipeDownY) / 5, 20)}px`,
        overflow: 'hidden',
      } : undefined}
    >
      {/* Progress bars */}
      <div
        className="flex gap-1 px-2 pt-[calc(env(safe-area-inset-top,8px)+8px)]"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {items.map((item, i) => {
          let fillWidth;
          if (i < currentItemIndex) fillWidth = '100%';
          else if (i === currentItemIndex) fillWidth = `${progress * 100}%`;
          else fillWidth = '0%';

          return (
            <div
              key={item.id || item._id || `story-seg-${i}`}
              className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/30"
            >
              <div
                className="h-full bg-white"
                style={{
                  width: fillWidth,
                  transition: prefersReducedMotion ? 'none' : (i === currentItemIndex ? 'none' : 'width 0.1s'),
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2">
        <div
          onClick={(e) => { e.stopPropagation(); handleClose(); navigate(`/${user?.username || user?.id || user?.user_id}`); }}
          className="flex items-center gap-2 cursor-pointer"
          role="link"
          aria-label={`Ver perfil de ${user?.name || user?.username}`}
        >
          {(user?.avatar_url || user?.avatar || user?.profile_image) ? (
            <img
              src={user.avatar_url || user.avatar || user.profile_image}
              alt={`Avatar de ${user?.name || user?.username || 'usuario'}`}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold">
              {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-sm font-semibold text-white font-sans">
            {user?.name || user?.username}
          </span>
        </div>
        <span className="text-xs text-white/60 font-sans">
          {timeAgo(currentItem?.created_at)}
        </span>
        <div className="flex-1" />
        {/* Paused indicator */}
        {paused && (
          <span className="text-[10px] text-white/40 font-sans mr-1">En pausa</span>
        )}
        <button
          onClick={handleClose}
          className="w-11 h-11 bg-transparent border-none cursor-pointer flex items-center justify-center"
          aria-label="Cerrar historia"
        >
          <X size={24} className="text-white" />
        </button>
      </div>

      {/* Story content + tap/swipe zones */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Bottom gradient for text legibility */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 to-transparent z-[1] pointer-events-none" />

        {/* 4.1: AnimatePresence — crossfade within user, slide between users */}
        <AnimatePresence mode="wait" initial={false} custom={transitionCtx}>
          <motion.div
            key={`${currentUserIndex}-${currentItemIndex}`}
            custom={transitionCtx}
            variants={prefersReducedMotion ? undefined : storyVariants}
            initial={prefersReducedMotion ? false : 'enter'}
            animate="center"
            exit={prefersReducedMotion ? undefined : 'exit'}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {currentItem?.video_url ? (
              <>
                <video
                  ref={videoRef}
                  key={currentItem.video_url}
                  src={currentItem.video_url}
                  autoPlay
                  muted={muted}
                  playsInline
                  onLoadedMetadata={handleVideoLoaded}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                  aria-label={muted ? 'Activar sonido' : 'Silenciar'}
                  className="absolute top-16 right-4 z-10 w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
                >
                  {muted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
                </button>
              </>
            ) : (
              <img
                key={currentItem?.image_url}
                src={currentItem?.image_url}
                alt={currentItem?.caption || 'Contenido de la historia'}
                className="w-full h-full object-cover"
                draggable={false}
              />
            )}

            {/* 7.1: Viewer count — own stories only (tappable to expand seen-by) */}
            {isOwnStory && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!showSeenBy) {
                    setShowSeenBy(true);
                    fetchViewers();
                    isPaused.current = true;
                    setPaused(true);
                  } else {
                    setShowSeenBy(false);
                    isPaused.current = false;
                    setPaused(false);
                  }
                }}
                className="absolute bottom-4 left-4 z-[2] flex items-center gap-1 bg-transparent border-none cursor-pointer"
                aria-label="Ver quien ha visto esta historia"
              >
                <Eye size={14} className="text-white/60" />
                <span className="text-xs text-white/60 font-sans">
                  {currentItem?.view_count ?? currentStory?.view_count ?? 0} vistas
                </span>
              </button>
            )}

            {/* 7.3: Seen-by expandable list */}
            <AnimatePresence>
              {showSeenBy && isOwnStory && (
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  className="absolute bottom-0 left-0 right-0 z-[3] bg-black/80 rounded-t-2xl max-h-[50%] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <span className="text-sm font-semibold text-white font-sans">
                      {currentItem?.view_count ?? currentStory?.view_count ?? 0} vistas
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSeenBy(false);
                        isPaused.current = false;
                        setPaused(false);
                      }}
                      className="text-white/60 bg-transparent border-none cursor-pointer p-1"
                      aria-label="Cerrar lista de vistas"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-2">
                    {viewersLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    ) : viewers.length > 0 ? (
                      viewers.map((v, vi) => (
                        <div key={v.user_id || v.id || vi} className="flex items-center gap-3 py-2">
                          <img
                            src={v.avatar_url || v.profile_image || v.avatar || '/default-avatar.png'}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm text-white font-sans font-medium truncate">
                              {v.username || v.name || 'Usuario'}
                            </span>
                            {v.name && v.username && (
                              <span className="text-xs text-white/50 font-sans truncate">{v.name}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-sm text-white/40 font-sans py-6">Sin datos de vistas disponibles</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 7.1: Product stickers + Link stickers — unified stack above reply bar */}
            {(currentItem?.products?.length > 0 || currentItem?.links?.length > 0) && (
              <div className="absolute bottom-16 left-4 right-4 z-[2] flex flex-col gap-2">
                {currentItem?.products?.map((product, idx) => (
                  <div
                    key={product.id || product.product_id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                      const pid = product?.product_id || product?.id || product?.slug;
                      if (pid) navigate(`/products/${pid}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClose();
                        const pid = product?.product_id || product?.id || product?.slug;
                        if (pid) navigate(`/products/${pid}`);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-full bg-white/15 backdrop-blur-xl cursor-pointer"
                    role="link"
                    tabIndex={0}
                    aria-label={`Ver producto: ${product?.name}`}
                  >
                    {(product?.thumbnail || product?.image) && (
                      <img
                        src={product.thumbnail || product.image}
                        alt=""
                        className="w-8 h-8 rounded-2xl object-cover shrink-0"
                      />
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[13px] text-white font-sans font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                        {product?.name}
                      </span>
                      {product?.price != null && (
                        <span className="text-[11px] text-white/70 font-semibold font-sans">
                          {priceFormatter.format(product.price)}
                        </span>
                      )}
                      <span className="text-[10px] text-white/50 font-sans">Ver producto</span>
                    </div>
                    <span className="text-[12px] text-white font-semibold font-sans shrink-0 bg-white/20 rounded-full px-2.5 py-1">
                      Ver &rarr;
                    </span>
                  </div>
                ))}
                {currentItem?.links?.map((link, idx) => (
                  <div
                    key={link.url || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!link?.url) return;
                      if (isInternalUrl(link.url)) {
                        handleClose();
                        try {
                          const u = new URL(link.url, window.location.origin);
                          navigate(u.pathname + u.search);
                        } catch (err) { /* invalid URL, navigate raw */
                          navigate(link.url);
                        }
                      } else {
                        window.open(link.url, '_blank', 'noopener');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!link?.url) return;
                        if (isInternalUrl(link.url)) {
                          handleClose();
                          try {
                            const u = new URL(link.url, window.location.origin);
                            navigate(u.pathname + u.search);
                          } catch (err) { /* non-critical: invalid URL, navigate raw */
                            navigate(link.url);
                          }
                        } else {
                          window.open(link.url, '_blank', 'noopener');
                        }
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-full bg-white/15 backdrop-blur-xl cursor-pointer"
                    role="link"
                    tabIndex={0}
                    aria-label={link.label || link.url}
                  >
                    <ExternalLink size={16} className="text-white shrink-0" />
                    <span className="text-[13px] text-white font-sans font-medium overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                      {link.label || link.title || link.url}
                    </span>
                    <span className="text-[12px] text-white font-semibold font-sans shrink-0 bg-white/20 rounded-full px-2.5 py-1">
                      Abrir &rarr;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 7.2: Tap zone hint indicators */}
        <AnimatePresence>
          {tapHintSide === 'left' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-[4] pointer-events-none"
            >
              <ChevronLeft className="w-6 h-6 text-white/40" />
            </motion.div>
          )}
          {tapHintSide === 'right' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-[4] pointer-events-none"
            >
              <ChevronRight className="w-6 h-6 text-white/40" />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Quick emoji reactions with burst animations */}
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
            {/* A-1: Burst animations above the emoji button */}
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

      {/* Bottom bar: like + reply input + send + share */}
      <div className="flex items-center gap-2 px-3 py-2 pb-[calc(env(safe-area-inset-bottom,8px)+8px)]">
        <button
          onClick={async () => {
            const newLiked = !liked;
            setLiked(newLiked);
            try {
              if (newLiked) {
                await apiClient.post(`/stories/${currentItem?.story_id}/like`);
              }
            } catch (err) { /* like best-effort */ }
          }}
          className="shrink-0 w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer"
          aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
        >
          <Heart
            size={24}
            className={liked ? 'text-white fill-white' : 'text-white'}
            strokeWidth={liked ? 0 : 1.5}
          />
        </button>
        {/* A-2: Taller reply input with @username placeholder */}
        <input
          ref={replyInputRef}
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onFocus={() => { isPaused.current = true; setPaused(true); }}
          onBlur={() => { isPaused.current = false; setPaused(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && replyText.trim()) {
              e.preventDefault();
              handleSendReply();
            }
          }}
          placeholder={`Responder a @${user?.username || user?.name || 'usuario'}...`}
          className="flex-1 min-h-[44px] rounded-full bg-white/10 border border-white/20 px-4 text-sm text-white placeholder-white/40 outline-none focus:border-white/40 font-sans"
        />
        {/* J3: Send button — checkmark briefly on success, arrow when text present */}
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
          /* A-3: Share button (when no reply text) */
          <button
            onClick={handleShareOpen}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer"
            aria-label="Compartir historia"
          >
            <Send size={20} className="text-white" />
          </button>
        )}
      </div>

      {/* A-3: Share to DM sheet */}
      <AnimatePresence>
        {shareSheetOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 z-[100] bg-stone-950 rounded-t-3xl max-h-[60vh] flex flex-col"
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-base font-semibold text-white">Compartir historia</span>
              <button
                onClick={handleShareClose}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border-none cursor-pointer"
                aria-label="Cerrar panel de compartir"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
            {/* Search */}
            <div className="px-4 pb-2">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
                <Search size={16} className="text-white/40 shrink-0" />
                <input
                  value={shareSearch}
                  onChange={(e) => setShareSearch(e.target.value)}
                  placeholder="Buscar conversacion..."
                  className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
                  autoFocus
                />
              </div>
            </div>
            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,8px)+8px)]">
              {shareLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : filteredShareConversations.length === 0 ? (
                <p className="text-center text-white/40 text-sm py-6">
                  {shareSearch ? 'Sin resultados' : 'No hay conversaciones recientes'}
                </p>
              ) : (
                filteredShareConversations.slice(0, 20).map((conv) => {
                  const convId = conv.id || conv._id || conv.conversation_id;
                  const otherUser = conv.other_user || conv.participants?.[0] || {};
                  const name = otherUser.name || otherUser.username || conv.name || 'Usuario';
                  const avatar = otherUser.avatar_url || otherUser.avatar || otherUser.profile_image;
                  return (
                    <button
                      key={convId}
                      onClick={() => handleShareToUser(conv)}
                      disabled={shareSending === convId}
                      className="flex items-center gap-3 w-full px-2 py-3 bg-transparent border-none cursor-pointer rounded-2xl hover:bg-white/10 transition-colors text-left disabled:opacity-50"
                    >
                      {avatar ? (
                        <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 text-sm text-white font-medium truncate">{name}</span>
                      {shareSending === convId ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                      ) : (
                        <Send size={16} className="text-white/40 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
