// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';

import StoryProgressBar from './story/StoryProgressBar';
import StoryHeader from './story/StoryHeader';
import StoryMedia from './story/StoryMedia';
import StorySeenBy from './story/StorySeenBy';
import StoryReactions from './story/StoryReactions';
import StoryShareSheet from './story/StoryShareSheet';
import StoryDeleteConfirm from './story/StoryDeleteConfirm';

const STORY_DURATION = 5000;

// Transition variants — crossfade within same user, slide between different users
const storyVariants = {
  enter: (ctx: any) =>
    ctx.isUserChange
      ? { x: ctx.direction > 0 ? '100%' : '-100%', opacity: 1 }
      : { opacity: 0, x: 0 },
  center: { x: 0, opacity: 1 },
  exit: (ctx: any) =>
    ctx.isUserChange
      ? { x: ctx.direction > 0 ? '-100%' : '100%', opacity: 1 }
      : { opacity: 0, x: 0 },
};

interface StoryViewerProps {
  stories: any[];
  initialIndex?: number;
  /** Start on a specific item within the first user's stories (e.g. profile card tap) */
  initialItemIndex?: number;
  onClose: () => void;
  readOnly?: boolean;
  /** layoutId from the StoryCard that was tapped — enables expand animation */
  originLayoutId?: string;
}

export default function StoryViewer({
  stories,
  initialIndex = 0,
  initialItemIndex = 0,
  onClose,
  readOnly = false,
  originLayoutId,
}: StoryViewerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // ── Core navigation state ────────────────────────────────
  const [currentUserIndex, setCurrentUserIndex] = useState(initialIndex);
  const [currentItemIndex, setCurrentItemIndex] = useState(initialItemIndex);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);

  // ── Seen-by state ────────────────────────────────────────
  const [showSeenBy, setShowSeenBy] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);

  // ── Share state ──────────────────────────────────────────
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareSearch, setShareSearch] = useState('');
  const [shareConversations, setShareConversations] = useState<any[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSending, setShareSending] = useState<string | null>(null);

  // ── Delete state ─────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Gesture state ────────────────────────────────────────
  const [swipeDownY, setSwipeDownY] = useState(0);
  const swipingDown = useRef(false);
  const [tapHintShown, setTapHintShown] = useState(() => {
    try {
      return localStorage.getItem('hsp_story_tap_hint') === '1';
    } catch {
      return false;
    }
  });
  const [tapHintSide, setTapHintSide] = useState<'left' | 'right' | null>(
    null,
  );

  // ── Refs ─────────────────────────────────────────────────
  const mountedRef = useRef(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tapHintTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout>>(null);
  const rafRef = useRef<number>(null);
  const isPaused = useRef(false);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const pointerStartTime = useRef<number | null>(null);
  const directionRef = useRef(1);
  const isUserChangeRef = useRef(false);
  const viewedRef = useRef(new Set<string>());
  const fetchedUsersRef = useRef(new Set<string>());

  // Local stories that can be enriched with full items
  const [localStories, setLocalStories] = useState(stories);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // ── Derived state ────────────────────────────────────────
  const currentStory = localStories[currentUserIndex];
  const items = currentStory?.items || [];
  const currentItem = items[currentItemIndex];
  const user = currentStory?.user;
  const isOwnStory =
    currentStory?.user_id ===
      (currentUser?.user_id || currentUser?.id) ||
    currentStory?.user?.id ===
      (currentUser?.user_id || currentUser?.id);

  const MAX_VIDEO_DURATION = 30000;
  const effectiveDuration = currentItem?.video_url
    ? videoDuration && isFinite(videoDuration)
      ? Math.min(videoDuration, MAX_VIDEO_DURATION)
      : STORY_DURATION
    : STORY_DURATION;

  const transitionCtx = {
    direction: directionRef.current,
    isUserChange: isUserChangeRef.current,
  };

  // ── Close with cache invalidation ────────────────────────
  const handleClose = useCallback(() => {
    if (viewedRef.current.size > 0) {
      queryClient.invalidateQueries({ queryKey: ['feed-stories'] });
    }
    onClose();
  }, [onClose, queryClient]);

  // ── Navigation ───────────────────────────────────────────
  const goNext = useCallback(() => {
    directionRef.current = 1;
    if (currentItemIndex < items.length - 1) {
      isUserChangeRef.current = false;
      setCurrentItemIndex((i) => i + 1);
      setProgress(0);
      setVideoDuration(null);
    } else if (currentUserIndex < localStories.length - 1) {
      isUserChangeRef.current = true;
      setCurrentUserIndex((u) => u + 1);
      setCurrentItemIndex(0);
      setProgress(0);
      setVideoDuration(null);
    } else {
      handleClose();
    }
  }, [currentItemIndex, items.length, currentUserIndex, localStories.length, handleClose]);

  const goPrev = useCallback(() => {
    directionRef.current = -1;
    if (currentItemIndex > 0) {
      isUserChangeRef.current = false;
      setCurrentItemIndex((i) => i - 1);
      setProgress(0);
      setVideoDuration(null);
    } else if (currentUserIndex > 0) {
      isUserChangeRef.current = true;
      const prevUserItems = localStories[currentUserIndex - 1]?.items || [];
      setCurrentUserIndex((u) => u - 1);
      setCurrentItemIndex(Math.max(0, prevUserItems.length - 1));
      setProgress(0);
      setVideoDuration(null);
    }
  }, [currentItemIndex, currentUserIndex, localStories]);

  const goNextUser = useCallback(() => {
    directionRef.current = 1;
    isUserChangeRef.current = true;
    if (currentUserIndex < localStories.length - 1) {
      setCurrentUserIndex((u) => u + 1);
      setCurrentItemIndex(0);
      setProgress(0);
      setVideoDuration(null);
    } else {
      handleClose();
    }
  }, [currentUserIndex, localStories.length, handleClose]);

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

  // ── RAF progress timer ───────────────────────────────────
  const pauseStartRef = useRef(0);
  const totalPausedRef = useRef(0);

  useEffect(() => {
    if (!items.length) return;
    if (currentItem?.video_url && !videoDuration) return;
    const startTime = performance.now();
    pauseStartRef.current = 0;
    totalPausedRef.current = 0;

    const tick = (now: number) => {
      if (!mountedRef.current) return;
      if (isPaused.current) {
        if (pauseStartRef.current === 0) pauseStartRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
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
  }, [currentUserIndex, currentItemIndex, items.length, goNext, effectiveDuration, videoDuration, currentItem?.video_url]);

  // Video fallback: unblock timer if metadata never loads
  useEffect(() => {
    if (!currentItem?.video_url || videoDuration) return;
    const timer = setTimeout(() => setVideoDuration(STORY_DURATION), 3000);
    return () => clearTimeout(timer);
  }, [currentItem?.video_url, videoDuration]);

  // Reset on item change
  useEffect(() => {
    setProgress(0);
    setLiked(currentItem?.is_liked ?? false);
  }, [currentUserIndex, currentItemIndex]);

  // ── Track story view ─────────────────────────────────────
  useEffect(() => {
    const item = currentStory?.items?.[currentItemIndex];
    const storyId = item?.story_id || item?.id;
    const myId = currentUser?.user_id || currentUser?.id;
    const isOwn =
      myId &&
      (currentStory?.user_id === myId || currentStory?.user?.id === myId);
    if (storyId && !isOwn && !viewedRef.current.has(storyId)) {
      viewedRef.current.add(storyId);
      apiClient.post(`/stories/${storyId}/view`).catch(() => {
        viewedRef.current.delete(storyId);
      });
    }
  }, [currentStory, currentItemIndex, currentUser]);

  // ── Auto-fetch full items on navigate ────────────────────
  useEffect(() => {
    const story = localStories[currentUserIndex];
    if (!story?.user_id) return;
    const isPreviewOnly =
      story.items?.length === 1 &&
      story.items[0]?.id?.endsWith?.('_preview');
    if (!isPreviewOnly || fetchedUsersRef.current.has(story.user_id))
      return;
    fetchedUsersRef.current.add(story.user_id);

    queryClient
      .fetchQuery({
        queryKey: ['user-stories', story.user_id],
        queryFn: () => apiClient.get(`/stories/${story.user_id}`),
        staleTime: 30_000,
      })
      .then((res) => {
        const fullItems = Array.isArray(res)
          ? res
          : (res as any)?.items || (res as any)?.stories || [];
        if (fullItems.length > 0) {
          const targetUserId = story.user_id;
          setLocalStories((prev) =>
            prev.map((s) =>
              s.user_id === targetUserId
                ? {
                    ...s,
                    items: fullItems.map((item: any) => ({
                      id: item.id || item.story_id,
                      story_id: item.story_id || item.id,
                      image_url: item.image_url || item.media_url,
                      video_url: item.video_url,
                      caption: item.caption || item.text,
                      created_at: item.created_at,
                      products: item.products,
                      view_count: item.view_count ?? 0,
                      is_liked: item.is_liked ?? false,
                      overlays: item.overlays,
                    })),
                  }
                : s,
            ),
          );
          if (currentItemIndex === 0) {
            const firstItem = fullItems[0];
            if (firstItem?.is_liked !== undefined) {
              setLiked(firstItem.is_liked);
            }
          }
        }
      })
      .catch(() => {
        fetchedUsersRef.current.delete(story.user_id);
      });
  }, [currentUserIndex]);

  // ── Lock body scroll + cleanup ───────────────────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(longPressRef.current);
      clearTimeout(tapHintTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, []);

  // ── Keyboard ─────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (shareSheetOpen) {
          handleShareClose();
          return;
        }
        if (showSeenBy) {
          setShowSeenBy(false);
          isPaused.current = false;
          setPaused(false);
          return;
        }
        handleClose();
      } else if (e.key === 'ArrowRight') {
        if (!shareSheetOpen && !showSeenBy) {
          isPaused.current = false;
          setPaused(false);
          goNext();
        }
      } else if (e.key === 'ArrowLeft') {
        if (!shareSheetOpen && !showSeenBy) {
          isPaused.current = false;
          setPaused(false);
          goPrev();
        }
      } else if (e.key === ' ') {
        if (shareSheetOpen || showSeenBy) return;
        e.preventDefault();
        isPaused.current = !isPaused.current;
        setPaused(isPaused.current);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose, goNext, goPrev, shareSheetOpen, showSeenBy]);

  // ── Preload next image ───────────────────────────────────
  useEffect(() => {
    let nextItem = null;
    if (currentItemIndex < items.length - 1) {
      nextItem = items[currentItemIndex + 1];
    } else if (currentUserIndex < localStories.length - 1) {
      nextItem = localStories[currentUserIndex + 1]?.items?.[0];
    }
    if (nextItem?.image_url && !nextItem.video_url) {
      const img = new Image();
      img.src = nextItem.image_url;
    }
  }, [currentItemIndex, currentUserIndex, items, localStories]);

  // ── Video metadata handler ───────────────────────────────
  const handleVideoLoaded = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const dur = (e.target as HTMLVideoElement).duration;
      if (dur && isFinite(dur)) setVideoDuration(dur * 1000);
    },
    [],
  );

  // ── Pointer handlers (tap/swipe/long-press) ──────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    if (showSeenBy) return;
    if (
      e.target !== e.currentTarget &&
      (e.target as HTMLElement).closest?.('button, [role="link"]')
    )
      return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    pointerStartTime.current = Date.now();
    longPressRef.current = setTimeout(() => {
      isPaused.current = true;
      setPaused(true);
    }, 120);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    clearTimeout(longPressRef.current);
    isPaused.current = false;
    setPaused(false);
    swipingDown.current = false;
    setSwipeDownY(0);
    pointerStartX.current = null;
    pointerStartY.current = null;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!e.isPrimary || pointerStartY.current === null) return;
    const deltaY = e.clientY - pointerStartY.current;
    if (deltaY > 10 && Math.abs(e.clientX - pointerStartX.current!) < 40) {
      swipingDown.current = true;
    }
    if (swipingDown.current) {
      setSwipeDownY(Math.max(0, deltaY));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    clearTimeout(longPressRef.current);
    isPaused.current = false;
    setPaused(false);
    const wasSwipingDown = swipingDown.current;
    swipingDown.current = false;
    setSwipeDownY(0);
    if (pointerStartX.current === null) return;
    const deltaX = e.clientX - pointerStartX.current;
    const deltaY = e.clientY - pointerStartY.current!;
    const elapsed = Date.now() - (pointerStartTime.current || 0);

    // Swipe down to close
    if (deltaY > 100 && Math.abs(deltaX) < 80) {
      handleClose();
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }
    if (wasSwipingDown) {
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }
    // Horizontal swipe between users
    if (Math.abs(deltaX) > 60 && elapsed < 400 && Math.abs(deltaY) < 80) {
      if (deltaX < 0) goNextUser();
      else goPrevUser();
      pointerStartX.current = null;
      pointerStartY.current = null;
      return;
    }
    // Tap
    if (elapsed < 200 && Math.abs(deltaX) < 25 && Math.abs(deltaY) < 25) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
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

  // ── Tap hint ─────────────────────────────────────────────
  const showTapHint = useCallback(
    (side: 'left' | 'right') => {
      if (tapHintShown) return;
      setTapHintSide(side);
      clearTimeout(tapHintTimerRef.current);
      tapHintTimerRef.current = setTimeout(() => {
        setTapHintSide(null);
        setTapHintShown(true);
        try {
          localStorage.setItem('hsp_story_tap_hint', '1');
        } catch {}
      }, 600);
    },
    [tapHintShown],
  );

  // ── Seen-by ──────────────────────────────────────────────
  const fetchViewers = useCallback(async () => {
    const storyId = currentItem?.story_id || currentItem?.id || currentItem?._id;
    if (!storyId || viewersLoading) return;
    setViewersLoading(true);
    try {
      const res = await apiClient.get(`/stories/${storyId}/viewers`);
      setViewers(
        Array.isArray(res) ? res : (res as any)?.viewers || (res as any)?.data || [],
      );
    } catch {
      setViewers([]);
    } finally {
      setViewersLoading(false);
    }
  }, [currentItem, viewersLoading]);

  const handleToggleSeenBy = useCallback(() => {
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
  }, [showSeenBy, fetchViewers]);

  const handleCloseSeenBy = useCallback(() => {
    setShowSeenBy(false);
    isPaused.current = false;
    setPaused(false);
  }, []);

  // Reset panels on story change
  useEffect(() => {
    setShowSeenBy(false);
    setViewers([]);
    setViewersLoading(false);
    setShareSheetOpen(false);
    setShareSearch('');
  }, [currentUserIndex, currentItemIndex]);

  // ── Share ────────────────────────────────────────────────
  const handleShareClose = useCallback(() => {
    setShareSheetOpen(false);
    setShareSearch('');
    isPaused.current = false;
    setPaused(false);
  }, []);

  const handleShareOpen = useCallback(async () => {
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      isPaused.current = true;
      setPaused(true);
      try {
        const ownerHandle = user?.username || currentStory?.user_id || '';
        await navigator.share({
          title: `Historia de ${user?.name || user?.username || ''}`,
          url: `${window.location.origin}/${ownerHandle}`,
        });
        isPaused.current = false;
        setPaused(false);
        return;
      } catch {}
    }
    setShareSheetOpen(true);
    setShareLoading(true);
    isPaused.current = true;
    setPaused(true);
    try {
      const res = await apiClient.get('/chat/conversations');
      setShareConversations(
        Array.isArray(res) ? res : (res as any)?.conversations || (res as any)?.data || [],
      );
    } catch {
      setShareConversations([]);
    } finally {
      setShareLoading(false);
    }
  }, [currentStory, user]);

  const handleShareToUser = useCallback(
    async (conversation: any) => {
      const convId =
        conversation.id || conversation._id || conversation.conversation_id;
      if (!convId || shareSending) return;
      setShareSending(convId);
      try {
        const ownerHandle = user?.username || currentStory?.user_id || '';
        await apiClient.post(`/chat/conversations/${convId}/messages`, {
          content: `Mira esta historia: ${window.location.origin}/${ownerHandle}`,
          message_type: 'story_share',
        });
        setShareSheetOpen(false);
        isPaused.current = false;
        setPaused(false);
        setShareSearch('');
      } catch {
        toast.error('Error al compartir');
      }
      setShareSending(null);
    },
    [currentStory, user, shareSending],
  );

  // ── Delete ───────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    try {
      const sid = currentItem?.story_id || currentItem?.id;
      await apiClient.delete(`/stories/${sid}`);
      toast.success('Historia eliminada');
      queryClient.invalidateQueries({ queryKey: ['stories-mine'] });
      queryClient.invalidateQueries({ queryKey: ['feed-stories'] });
      queryClient.invalidateQueries({
        queryKey: ['user-stories', currentStory?.user_id],
      });
      handleClose();
    } catch {
      toast.error('No se pudo eliminar');
    }
  }, [currentItem, currentStory, queryClient, handleClose]);

  // ── Render guard ─────────────────────────────────────────
  if (!currentStory || !items.length) return null;

  return (
    <motion.div
      layoutId={originLayoutId}
      className="fixed inset-0 z-[9999] flex flex-col bg-black"
      role="dialog"
      aria-label={`Historia de ${user?.name || user?.username || 'usuario'}`}
      aria-modal="true"
      initial={
        originLayoutId
          ? undefined
          : { scale: 0.85, opacity: 0 }
      }
      animate={{ scale: 1, opacity: 1 }}
      exit={
        originLayoutId
          ? undefined
          : { scale: 0.85, opacity: 0 }
      }
      transition={
        originLayoutId
          ? { type: 'spring', stiffness: 350, damping: 30, duration: 0.35 }
          : { type: 'spring', stiffness: 400, damping: 30 }
      }
      style={
        swipeDownY > 0
          ? {
              transform: `translateY(${swipeDownY}px) scale(${1 - Math.abs(swipeDownY) / 2000})`,
              borderRadius: `${Math.min(Math.abs(swipeDownY) / 5, 20)}px`,
              overflow: 'hidden',
            }
          : undefined
      }
    >
      {/* Progress bars */}
      <StoryProgressBar
        items={items}
        currentItemIndex={currentItemIndex}
        progress={progress}
        prefersReducedMotion={prefersReducedMotion}
      />

      {/* Header */}
      <StoryHeader
        user={user}
        createdAt={currentItem?.created_at}
        paused={paused}
        onAvatarClick={() => {
          handleClose();
          navigate(
            `/${user?.username || user?.id || user?.user_id}`,
          );
        }}
        onClose={handleClose}
      />

      {/* Story content + tap/swipe zones */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/60 to-transparent z-[1] pointer-events-none" />

        {/* Content with transitions */}
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
            <StoryMedia
              currentItem={currentItem}
              muted={muted}
              onMuteToggle={() => setMuted((m) => !m)}
              onVideoLoaded={handleVideoLoaded}
              videoRef={videoRef}
              paused={paused}
              onClose={handleClose}
            />

            {/* Seen-by + delete (owner only) */}
            <StorySeenBy
              isOwnStory={isOwnStory}
              readOnly={readOnly}
              viewCount={
                currentItem?.view_count ??
                currentStory?.view_count ??
                0
              }
              showSeenBy={showSeenBy}
              viewers={viewers}
              viewersLoading={viewersLoading}
              onToggleSeenBy={handleToggleSeenBy}
              onCloseSeenBy={handleCloseSeenBy}
              onDeleteClick={() => {
                setShowDeleteConfirm(true);
                isPaused.current = true;
                setPaused(true);
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Tap zone hints */}
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

      {/* Reactions bar (hidden for own stories) */}
      {!isOwnStory && (
        <StoryReactions
          currentItem={currentItem}
          currentStory={currentStory}
          liked={liked}
          onLikedChange={setLiked}
          onClose={handleClose}
          onNavigateToChat={(id) => navigate(`/messages/${id}`)}
          onPause={() => {
            isPaused.current = true;
            setPaused(true);
          }}
          onResume={() => {
            if (!shareSheetOpen) {
              isPaused.current = false;
              setPaused(false);
            }
          }}
          onShareOpen={handleShareOpen}
        />
      )}

      {/* Own-story spacer */}
      {isOwnStory && (
        <div className="h-[calc(env(safe-area-inset-bottom,8px)+8px)]" />
      )}

      {/* Share sheet */}
      <StoryShareSheet
        open={shareSheetOpen}
        loading={shareLoading}
        conversations={shareConversations}
        search={shareSearch}
        sendingId={shareSending}
        onSearchChange={setShareSearch}
        onClose={handleShareClose}
        onShareToUser={handleShareToUser}
      />

      {/* Delete confirmation */}
      <StoryDeleteConfirm
        open={showDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          isPaused.current = false;
          setPaused(false);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </motion.div>
  );
}
