import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import apiClient from '../../services/api/client';

const STORY_DURATION = 5000;

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function StoryViewer({ stories, initialIndex = 0, onClose }) {
  const navigate = useNavigate();
  const [currentUserIndex, setCurrentUserIndex] = useState(initialIndex);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showReactions, setShowReactions] = useState(false);
  const [videoDuration, setVideoDuration] = useState(null);
  const longPressRef = useRef(null);
  const intervalRef = useRef(null);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null);
  const videoRef = useRef(null);
  const handledByTouch = useRef(false);

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

  const goNext = useCallback(() => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex((i) => i + 1);
      setProgress(0);
      setVideoDuration(null);
    } else if (currentUserIndex < stories.length - 1) {
      setCurrentUserIndex((u) => u + 1);
      setCurrentItemIndex(0);
      setProgress(0);
      setVideoDuration(null);
    } else {
      onClose();
    }
  }, [currentItemIndex, items.length, currentUserIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((i) => i - 1);
      setProgress(0);
      setVideoDuration(null);
    } else if (currentUserIndex > 0) {
      const prevUserItems = stories[currentUserIndex - 1]?.items || [];
      setCurrentUserIndex((u) => u - 1);
      // Land on last story of previous user (IG behavior)
      setCurrentItemIndex(Math.max(0, prevUserItems.length - 1));
      setProgress(0);
      setVideoDuration(null);
    }
  }, [currentItemIndex, currentUserIndex, stories]);

  const goNextUser = useCallback(() => {
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
    if (currentUserIndex > 0) {
      setCurrentUserIndex((u) => u - 1);
      setCurrentItemIndex(0);
      setProgress(0);
      setVideoDuration(null);
    }
  }, [currentUserIndex]);

  // Timer — progress bar
  useEffect(() => {
    if (paused || !items.length) return;
    // For video stories, wait until we know the duration
    if (currentItem?.video_url && !videoDuration) return;

    const tick = 100; // 10Hz — smooth enough, half the CPU
    let elapsed = 0;

    intervalRef.current = setInterval(() => {
      elapsed += tick;
      setProgress(Math.min(elapsed / effectiveDuration, 1));
      if (elapsed >= effectiveDuration) {
        clearInterval(intervalRef.current);
        goNext();
      }
    }, tick);

    return () => clearInterval(intervalRef.current);
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
      clearInterval(intervalRef.current);
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

  // Click handler for mouse-only (desktop). Skipped on touch to prevent double-fire.
  const handleClick = (e) => {
    if (handledByTouch.current) {
      handledByTouch.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const threshold = rect.width * 0.4;
    if (x < threshold) {
      goPrev();
    } else {
      goNext();
    }
  };

  // Touch handlers — horizontal swipe between users, vertical swipe to close, long-press to pause
  const handleTouchStart = (e) => {
    handledByTouch.current = true;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    longPressRef.current = setTimeout(() => setPaused(true), 120);
  };

  const handleTouchEnd = (e) => {
    clearTimeout(longPressRef.current);
    setPaused(false);

    if (touchStartX.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    const elapsed = Date.now() - (touchStartTime.current || 0);

    // Swipe down to close
    if (deltaY > 100 && Math.abs(deltaX) < 80) {
      onClose();
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    // Horizontal swipe between users (fast, >60px)
    if (Math.abs(deltaX) > 60 && elapsed < 400 && Math.abs(deltaY) < 80) {
      if (deltaX < 0) {
        goNextUser();
      } else {
        goPrevUser();
      }
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    // If no significant swipe, treat as tap (only for quick taps)
    if (elapsed < 200 && Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.changedTouches[0].clientX - rect.left;
      const threshold = rect.width * 0.4;
      if (x < threshold) {
        goPrev();
      } else {
        goNext();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleMouseDown = () => {
    longPressRef.current = setTimeout(() => setPaused(true), 120);
  };

  const handleMouseUp = () => {
    clearTimeout(longPressRef.current);
    setPaused(false);
  };

  if (!currentStory || !items.length) return null;

  const user = currentStory.user;

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
            <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-white text-xs font-semibold">
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
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        {/* Bottom gradient for text legibility */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 to-transparent z-[1] pointer-events-none" />

        {currentItem?.video_url ? (
          <video
            ref={videoRef}
            key={currentItem.video_url}
            src={currentItem.video_url}
            autoPlay
            muted
            playsInline
            onLoadedMetadata={handleVideoLoaded}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            key={currentItem?.image_url}
            src={currentItem?.image_url}
            alt={currentItem?.caption || 'Contenido de la historia'}
            className="w-full h-full object-cover"
            draggable={false}
          />
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
                    className="w-8 h-8 rounded-xl object-cover shrink-0"
                  />
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13px] text-white font-sans font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                    {product?.name}
                  </span>
                  {product?.price != null && (
                    <span className="text-[11px] text-white/70 font-semibold font-sans">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(product.price)}
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

        {/* Reaction bar */}
        {showReactions && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[5] flex gap-3 bg-black/60 backdrop-blur-xl rounded-full px-4 py-2.5">
            {['\u2764\uFE0F', '\uD83D\uDD25', '\uD83D\uDE0D', '\uD83E\uDD24', '\uD83D\uDC4F', '\uD83D\uDE2E'].map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  const el = e.currentTarget;
                  el.style.transform = 'scale(1.5) translateY(-20px)';
                  el.style.opacity = '0';
                  setTimeout(() => { el.style.transform = ''; el.style.opacity = ''; }, 600);
                  setShowReactions(false);
                  try { apiClient.post(`/stories/${currentItem?.story_id}/react`, { emoji }); } catch {}
                }}
                className="text-2xl bg-transparent border-none cursor-pointer p-0 transition-all duration-300"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reaction trigger */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowReactions(r => !r); }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[3] bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 border-none cursor-pointer"
        >
          <span className="text-[11px] text-white/60 font-sans">{'\u2191'} Reaccionar</span>
        </button>
      </div>
    </div>
  );
}
