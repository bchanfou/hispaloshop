import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, ArrowRight, Eye, Volume2, VolumeX } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { timeAgo } from '../../utils/time';

const STORY_DURATION = 5000;

// 4.4: Hoisted price formatter — avoids re-creating Intl instance every render
const priceFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

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
  const { user: currentUser } = useAuth();
  const [currentUserIndex, setCurrentUserIndex] = useState(initialIndex);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [videoDuration, setVideoDuration] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [muted, setMuted] = useState(true);
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

  const currentStory = stories[currentUserIndex];
  const items = currentStory?.items || [];
  const currentItem = items[currentItemIndex];

  // Respect prefers-reduced-motion: auto-advance still works but without smooth progress
  const prefersReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Determine effective duration: video real duration or default 5s for images
  const effectiveDuration = currentItem?.video_url
    ? (videoDuration || STORY_DURATION)
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
      onClose();
    }
  }, [currentItemIndex, items.length, currentUserIndex, stories.length, onClose]);

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
      onClose();
    }
  }, [currentUserIndex, stories.length, onClose]);

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
  useEffect(() => {
    if (paused || !items.length) return;
    // For video stories, wait until we know the duration
    if (currentItem?.video_url && !videoDuration) return;

    const startTime = performance.now();

    const tick = (now) => {
      if (isPaused.current) {
        // Ref gate: skip update during brief hold before React re-renders
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - startTime;
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

  // Reset progress on item change
  useEffect(() => {
    setProgress(0);
  }, [currentUserIndex, currentItemIndex]);

  // Lock body scroll while viewer is open + cleanup timers on unmount
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(longPressRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Keyboard: Escape to close, Arrow keys to navigate
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

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

  const handlePointerUp = (e) => {
    clearTimeout(longPressRef.current);
    isPaused.current = false;
    setPaused(false);

    if (pointerStartX.current === null) return;

    const deltaX = e.clientX - pointerStartX.current;
    const deltaY = e.clientY - pointerStartY.current;
    const elapsed = Date.now() - (pointerStartTime.current || 0);

    // Swipe down to close
    if (deltaY > 100 && Math.abs(deltaX) < 80) {
      onClose();
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
        goPrev();
      } else {
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
      const conversationId = res?.conversation_id || res?.id || res?._id;
      if (conversationId) {
        onClose();
        navigate(`/chat/${conversationId}`);
      }
    } catch {
      // fallback: legacy story reply endpoint
      try {
        await apiClient.post(`/stories/${currentItem?.story_id}/reply`, { text });
        setReplyText('');
        replyInputRef.current?.blur();
      } catch {}
    } finally {
      setSendingReply(false);
    }
  }, [replyText, sendingReply, currentStory, currentItem, navigate, onClose]);

  if (!currentStory || !items.length) return null;

  const user = currentStory.user;
  const isOwnStory = currentStory.user_id === currentUser?.id || currentStory.user?.id === currentUser?.id;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black"
      role="dialog"
      aria-label={`Historia de ${user?.name || user?.username || 'usuario'}`}
      aria-modal="true"
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
          onClick={(e) => { e.stopPropagation(); onClose(); navigate(`/${user?.username || user?.id || user?.user_id}`); }}
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
          onClick={onClose}
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

            {/* J5: Viewer count — own stories only */}
            {isOwnStory && (
              <div className="absolute bottom-4 left-4 z-[2] flex items-center gap-1 pointer-events-none">
                <Eye size={14} className="text-white/60" />
                <span className="text-xs text-white/60 font-sans">
                  {currentItem?.view_count ?? currentStory?.view_count ?? 0} vistas
                </span>
              </div>
            )}

            {/* Product pills */}
            {currentItem?.products?.length > 0 && (
              <div className="absolute bottom-10 left-4 right-4 z-[2] flex flex-col gap-2">
                {currentItem.products.map((product, idx) => (
                  <div
                    key={product.id || product.product_id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                      if (product?.slug || product?.id) {
                        navigate(`/product/${product.slug || product.id}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose();
                        if (product?.slug || product?.id) {
                          navigate(`/product/${product.slug || product.id}`);
                        }
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
                    </div>
                    <span className="text-[12px] text-white font-semibold font-sans shrink-0 bg-white/20 rounded-full px-2.5 py-1">
                      Ver →
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Bottom bar: like + reply input + send */}
      <div className="flex items-center gap-2 px-3 py-2 pb-[calc(env(safe-area-inset-bottom,8px)+8px)]">
        <button
          onClick={() => {
            const newLiked = !liked;
            setLiked(newLiked);
            try {
              if (newLiked) {
                apiClient.post(`/stories/${currentItem?.story_id}/react`, { emoji: 'heart' });
              }
            } catch {}
          }}
          className="shrink-0 w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer"
          aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
        >
          <Heart
            size={24}
            className={liked ? 'text-[#FF3040] fill-[#FF3040]' : 'text-white'}
            strokeWidth={liked ? 0 : 1.5}
          />
        </button>
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
          placeholder={`Responder a ${user?.name || user?.username || 'usuario'}...`}
          className="flex-1 h-10 rounded-full bg-white/10 border border-white/20 px-4 text-sm text-white placeholder-white/40 outline-none focus:border-white/40 font-sans"
        />
        {/* J3: ArrowRight send button — visible when input has text */}
        {replyText.trim() ? (
          <button
            onClick={handleSendReply}
            disabled={sendingReply}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full border-none cursor-pointer disabled:opacity-50"
            aria-label="Enviar respuesta como mensaje directo"
          >
            <ArrowRight size={18} className="text-stone-950" />
          </button>
        ) : (
          <button
            onClick={() => {}}
            disabled
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-transparent border-none cursor-pointer opacity-30"
            aria-label="Enviar mensaje"
          >
            <Send size={20} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
