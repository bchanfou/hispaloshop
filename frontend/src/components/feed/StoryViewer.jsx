import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, ArrowRight, Eye, Volume2, VolumeX, ExternalLink, ChevronLeft, ChevronRight, Check, Search, Trash2 } from 'lucide-react';
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

export default function StoryViewer({ stories, initialIndex = 0, onClose, readOnly = false }) {
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
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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

  // Local copy of stories that can be enriched with full items as user navigates
  const [localStories, setLocalStories] = useState(stories);
  const fetchedUsersRef = useRef(new Set());

  // Invalidate stories query on close so ring colors refresh with updated has_unseen
  const handleClose = useCallback(() => {
    if (viewedRef.current.size > 0) {
      queryClient.invalidateQueries({ queryKey: ['feed-stories'] });
    }
    onClose();
  }, [onClose, queryClient]);

  const currentStory = localStories[currentUserIndex];
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
      // Land on last story of previous user (IG behavior)
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

  // 4.2: Timer — 60fps progress bar with requestAnimationFrame
  const pauseStartRef = useRef(0);
  const totalPausedRef = useRef(0);

  useEffect(() => {
    if (!items.length) return;
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
  }, [currentUserIndex, currentItemIndex, items.length, goNext, effectiveDuration, videoDuration, currentItem?.video_url]);

  // Fallback: if video metadata never loads (network error, unsupported format),
  // unblock the timer after 3 s so the user isn't stuck forever.
  useEffect(() => {
    if (!currentItem?.video_url || videoDuration) return;
    const timer = setTimeout(() => setVideoDuration(STORY_DURATION), 3000);
    return () => clearTimeout(timer);
  }, [currentItem?.video_url, videoDuration]);

  // Reset progress, liked and reply text on item/user change.
  // Seed liked from backend is_liked (populated by get_user_stories after auto-fetch).
  useEffect(() => {
    setProgress(0);
    setLiked(currentItem?.is_liked ?? false);
    setReplyText('');
  }, [currentUserIndex, currentItemIndex]); // currentItem is derived from these indices

  // Track story view when current item changes (skip for own stories — don't count self as viewer)
  useEffect(() => {
    const item = currentStory?.items?.[currentItemIndex];
    const storyId = item?.story_id || item?.id;
    const myId = currentUser?.user_id || currentUser?.id;
    const isOwn = myId && (currentStory?.user_id === myId || currentStory?.user?.id === myId);
    if (storyId && !isOwn && !viewedRef.current.has(storyId)) {
      viewedRef.current.add(storyId);
      apiClient.post(`/stories/${storyId}/view`).catch(() => {
        // Remove from Set so it retries on next visit
        viewedRef.current.delete(storyId);
      });
    }
  }, [currentStory, currentItemIndex, currentUser]);

  // Auto-fetch full story data when navigating to a user who only has a preview item.
  // StoriesBar only fetches full items for the initially-clicked user; all other users
  // in the list have a single preview item (id ends in "_preview"). Fetch on demand.
  useEffect(() => {
    const story = localStories[currentUserIndex];
    if (!story?.user_id) return;
    const isPreviewOnly = story.items?.length === 1 && story.items[0]?.id?.endsWith?.('_preview');
    if (!isPreviewOnly || fetchedUsersRef.current.has(story.user_id)) return;

    fetchedUsersRef.current.add(story.user_id);
    // Use queryClient.fetchQuery so preloaded cache from StoriesBar is hit before network
    queryClient.fetchQuery({
      queryKey: ['user-stories', story.user_id],
      queryFn: () => apiClient.get(`/stories/${story.user_id}`),
      staleTime: 30_000,
    }).then((res) => {
      const fullItems = Array.isArray(res) ? res : res?.items || res?.stories || [];
      if (fullItems.length > 0) {
        const targetUserId = story.user_id;
        setLocalStories(prev => prev.map((s) =>
          s.user_id === targetUserId ? {
            ...s,
            items: fullItems.map(item => ({
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
          } : s
        ));
        // Seed liked state only if still viewing the first item (user hasn't tapped forward)
        if (currentItemIndex === 0) {
          const firstItem = fullItems[0];
          if (firstItem?.is_liked !== undefined) {
            setLiked(firstItem.is_liked);
          }
        }
      }
    }).catch(() => {
      fetchedUsersRef.current.delete(story.user_id); // allow retry on failure
    });
  }, [currentUserIndex]); // intentionally omits localStories to avoid re-triggering after update

  // Lock body scroll while viewer is open + cleanup timers + pause/unload video on unmount
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(longPressRef.current);
      clearTimeout(tapHintTimerRef.current);
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

  const handleShareClose = useCallback(() => {
    setShareSheetOpen(false);
    setShareSearch('');
    isPaused.current = false;
    setPaused(false);
  }, []);

  // Keyboard: Escape to close panels first, then viewer; Arrow keys blocked while panels open
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (shareSheetOpen) { handleShareClose(); return; }
        if (showSeenBy) { setShowSeenBy(false); isPaused.current = false; setPaused(false); return; }
        handleClose();
      } else if (e.key === 'ArrowRight') {
        if (!shareSheetOpen && !showSeenBy && document.activeElement !== replyInputRef.current) {
          isPaused.current = false; setPaused(false); goNext();
        }
      } else if (e.key === 'ArrowLeft') {
        if (!shareSheetOpen && !showSeenBy && document.activeElement !== replyInputRef.current) {
          isPaused.current = false; setPaused(false); goPrev();
        }
      } else if (e.key === ' ') {
        if (shareSheetOpen || showSeenBy) return;
        // Don't steal space from the reply input
        if (document.activeElement === replyInputRef.current) return;
        e.preventDefault();
        isPaused.current = !isPaused.current;
        setPaused(isPaused.current);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose, goNext, goPrev, shareSheetOpen, showSeenBy, handleShareClose]);

  // Preload next story image
  useEffect(() => {
    let nextItem = null;
    if (currentItemIndex < items.length - 1) {
      nextItem = items[currentItemIndex + 1];
    } else if (currentUserIndex < localStories.length - 1) {
      const nextUserStory = localStories[currentUserIndex + 1];
      nextItem = nextUserStory?.items?.[0];
    }
    if (nextItem?.image_url && !nextItem.video_url) {
      const img = new Image();
      img.src = nextItem.image_url;
    }
  }, [currentItemIndex, currentUserIndex, items, localStories]);

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
    if (!e.isPrimary) return; // ignore non-primary pointers (multi-touch)
    // Block all gestures while panels that overlay the story are open.
    // The seen-by panel lives inside this container, so swipes on it would otherwise
    // trigger close/navigate. Share sheet is outside this container so no issue there.
    if (showSeenBy) return;
    // Don't start gesture tracking when the pointer originates on an overlay interactive
    // element (Eye, Delete, Product sticker, Mute, Link, seen-by panel buttons).
    // Without this guard, tapping any overlay button ALSO triggers tap navigation.
    if (e.target !== e.currentTarget && e.target.closest?.('button, [role="link"]')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    pointerStartTime.current = Date.now();
    longPressRef.current = setTimeout(() => {
      isPaused.current = true;
      setPaused(true);
    }, 120);
  };

  const handlePointerCancel = (e) => {
    if (!e.isPrimary) return;
    clearTimeout(longPressRef.current);
    isPaused.current = false;
    setPaused(false);
    swipingDown.current = false;
    setSwipeDownY(0);
    pointerStartX.current = null;
    pointerStartY.current = null;
  };

  const handlePointerMove = (e) => {
    if (!e.isPrimary) return;
    if (pointerStartY.current === null) return;
    const deltaY = e.clientY - pointerStartY.current;
    // Start tracking downward swipe once threshold is reached
    if (deltaY > 10 && Math.abs(e.clientX - pointerStartX.current) < 40) {
      swipingDown.current = true;
    }
    // Once swiping down, always track finger position (including back up)
    if (swipingDown.current) {
      setSwipeDownY(Math.max(0, deltaY));
    }
  };

  const handlePointerUp = (e) => {
    if (!e.isPrimary) return;
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
    if (elapsed < 200 && Math.abs(deltaX) < 25 && Math.abs(deltaY) < 25) {
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

  // J3: send reply as DM — uses /chat/story-reply which atomically creates/finds
  // the conversation and inserts the message with story context in one round-trip.
  const handleSendReply = useCallback(async () => {
    const text = replyText.trim();
    if (!text || sendingReply) return;
    setSendingReply(true);
    try {
      const storyId = currentItem?.story_id || currentItem?.id;
      const res = await apiClient.post('/chat/story-reply', {
        story_id: storyId,
        recipient_id: currentStory?.user_id || currentStory?.user?.id,
        message: text,
      });
      const conversationId = res?.conversation_id || res?.id || res?._id;
      setReplyText('');
      replyInputRef.current?.blur();
      // A-2: Brief checkmark animation before navigating
      setReplySent(true);
      setTimeout(() => { if (mountedRef.current) setReplySent(false); }, 200);
      if (conversationId) {
        setTimeout(() => {
          if (!mountedRef.current) return;
          handleClose();
          navigate(`/messages/${conversationId}`);
        }, 250);
      }
    } catch (err) {
      // fallback: legacy story reply endpoint
      try {
        await apiClient.post(`/stories/${currentItem?.story_id || currentItem?.id}/reply`, { text });
        setReplyText('');
        replyInputRef.current?.blur();
        setReplySent(true);
        setTimeout(() => { if (mountedRef.current) setReplySent(false); }, 200);
      } catch (err) { toast.error('Error al responder'); }
    } finally {
      setSendingReply(false);
    }
  }, [replyText, sendingReply, currentStory, currentItem, navigate, handleClose]);

  // A-1: Quick reaction with burst animation + API call simultaneously.
  // ❤️ → toggles like (same as heart button). Other emojis → sent as a quick DM reply
  // via /chat/story-reply so they don't accidentally toggle the liked state.
  const handleQuickReaction = useCallback(async (emoji) => {
    const burstId = Date.now() + Math.random();
    setEmojiBursts((prev) => [...prev, { id: burstId, emoji }]);
    const isHeart = emoji === '❤️';
    const storyId = currentItem?.story_id || currentItem?.id;
    if (isHeart) {
      if (liked) return; // already liked — show burst but skip API call to prevent accidental unlike
      setLiked(true);
      try {
        await apiClient.post(`/stories/${storyId}/like`);
      } catch (err) {
        setLiked(false); // rollback
      }
    } else {
      // Non-heart emoji: send as a quick DM reply (fire-and-forget, no UI state change)
      const recipientId = currentStory?.user_id || currentStory?.user?.id;
      if (recipientId) {
        apiClient.post('/chat/story-reply', {
          story_id: storyId,
          recipient_id: recipientId,
          message: emoji,
        }).catch(() => {}); // non-critical
      }
    }
  }, [currentItem, currentStory, liked]);

  const removeEmojiBurst = useCallback((id) => {
    setEmojiBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // A-3: Share story to DM — open user picker sheet
  const handleShareOpen = useCallback(async () => {
    // Try navigator.share first on mobile
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      isPaused.current = true;
      setPaused(true);
      try {
        const ownerHandle = currentStory?.user?.username || currentStory?.user_id || '';
        const storyUrl = `${window.location.origin}/${ownerHandle}`;
        await navigator.share({
          title: `Historia de ${currentStory?.user?.name || currentStory?.user?.username || ''}`,
          url: storyUrl,
        });
        isPaused.current = false;
        setPaused(false);
        return;
      } catch (err) {
        // non-critical: User cancelled or unsupported — fall through to DM picker
        // Keep paused so the DM sheet can open without a brief play flash
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
  }, [currentItem, currentStory]);

  const handleShareToUser = useCallback(async (conversation) => {
    const convId = conversation.id || conversation._id || conversation.conversation_id;
    if (!convId || shareSending) return;
    setShareSending(convId);
    try {
      const ownerHandle = currentStory?.user?.username || currentStory?.user_id || '';
      const profileUrl = `${window.location.origin}/${ownerHandle}`;
      await apiClient.post(`/chat/conversations/${convId}/messages`, {
        content: `Mira esta historia: ${profileUrl}`,
        message_type: 'story_share',
      });
      setShareSheetOpen(false);
      isPaused.current = false;
      setPaused(false);
      setShareSearch('');
    } catch (err) { toast.error('Error al compartir'); }
    setShareSending(null);
  }, [currentItem, currentStory, shareSending]);

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

  // Reset seen-by panel and close share sheet when story changes (swipe/tap navigation)
  useEffect(() => {
    setShowSeenBy(false);
    setViewers([]);
    setViewersLoading(false); // cancel in-flight fetch so next story can fetch fresh
    // Close share sheet if open so it doesn't bleed across stories
    setShareSheetOpen(false);
    setShareSearch('');
  }, [currentUserIndex, currentItemIndex]);

  if (!currentStory || !items.length) return null;

  const user = currentStory.user;
  const isOwnStory = currentStory.user_id === (currentUser?.user_id || currentUser?.id) || currentStory.user?.id === (currentUser?.user_id || currentUser?.id);

  // Merge products from image stories (currentItem.products) and video story overlay stickers (type=product)
  const overlayProductStickers = (currentItem?.overlays?.stickers || [])
    .filter(s => s.type === 'product')
    .map(s => ({
      product_id: s.productId,
      product_name: s.content,
      product_image: s.productImage,
      product_price: s.productPrice,
    }));
  // Deduplicate by product_id — legacy video stories may have products in BOTH overlays_json and products_json
  const mergedProducts = [...(currentItem?.products || []), ...overlayProductStickers];
  const seenProductIds = new Set();
  const effectiveProducts = mergedProducts.filter(p => {
    const pid = p.product_id || p.id;
    if (!pid || seenProductIds.has(pid)) return false;
    seenProductIds.add(pid);
    return true;
  });

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
        onPointerCancel={handlePointerCancel}
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
                  className="absolute top-16 right-4 z-10 w-11 h-11 rounded-full bg-black/40 flex items-center justify-center"
                >
                  {muted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
                </button>
                {/* Video text overlays — metadata stored on the story item */}
                {currentItem?.overlays?.texts?.map((t, i) => (
                  <div
                    key={i}
                    className="absolute pointer-events-none z-[3]"
                    style={{
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      transform: 'translate(-50%, -50%)',
                      color: t.color || '#fff',
                      fontSize: `${t.size || 20}px`,
                      fontFamily: t.font || 'sans-serif',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      whiteSpace: 'pre-wrap',
                      textShadow: t.style !== 'box' ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
                      WebkitTextStroke: t.style === 'outline' ? `1px ${t.color || '#fff'}` : undefined,
                      background: t.style === 'box' ? 'rgba(0,0,0,0.75)' : 'transparent',
                      padding: t.style === 'box' ? '4px 10px' : undefined,
                      borderRadius: t.style === 'box' ? 6 : undefined,
                    }}
                  >
                    {t.text}
                  </div>
                ))}
                {/* Video draw paths — SVG overlay */}
                {Array.isArray(currentItem?.overlays?.draws) && currentItem.overlays.draws.length > 0 && (
                  <svg
                    className="absolute inset-0 w-full h-full z-[2] pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {currentItem.overlays.draws.map((path, pi) => {
                      if (!path.points?.length || path.points.length < 2) return null;
                      const d = path.points.map((pt, j) =>
                        `${j === 0 ? 'M' : 'L'}${pt.x} ${pt.y}`
                      ).join(' ');
                      return (
                        <path
                          key={pi}
                          d={d}
                          stroke={path.color || '#fff'}
                          strokeWidth={(path.width || 3)}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}
                  </svg>
                )}
                {(currentItem?.overlays?.stickers || []).filter(s => s.type !== 'product').map((s, i) => {
                  const pos = {
                    position: 'absolute',
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 3,
                    pointerEvents: 'none',
                  };
                  if (s.type === 'emoji') {
                    return (
                      <div key={i} className="text-4xl" style={pos}>
                        {s.content}
                      </div>
                    );
                  }
                  if (s.type === 'poll') {
                    return (
                      <div key={i} style={{ ...pos, pointerEvents: 'none' }}>
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-lg w-[180px] text-center">
                          <p className="text-[9px] font-bold text-stone-950 mb-1">ENCUESTA</p>
                          <p className="text-[11px] font-bold text-stone-950 mb-2 leading-tight">{s.content}</p>
                          <div className="flex gap-1">
                            {(s.options || []).map((opt, oi) => (
                              <div key={oi} className="flex-1 bg-stone-100 rounded-full py-1 px-1.5 text-[10px] font-semibold text-stone-950 text-center truncate">{opt}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  if (s.type === 'question') {
                    return (
                      <div key={i} style={pos}>
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-3 shadow-lg w-[180px] text-center">
                          <p className="text-[9px] font-bold text-stone-950 mb-1">PREGUNTA</p>
                          <p className="text-[11px] font-bold text-stone-950 mb-2 leading-tight">{s.content}</p>
                          <div className="bg-stone-100 rounded-xl py-1.5 px-2 text-[10px] text-stone-400">Escribe tu respuesta...</div>
                        </div>
                      </div>
                    );
                  }
                  if (s.type === 'mention') {
                    const label = s.content.startsWith('@') ? s.content : `@${s.content}`;
                    return (
                      <div key={i} style={pos}>
                        <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                          <span className="text-white/70 text-[11px]">@</span>{label.replace(/^@/, '')}
                        </div>
                      </div>
                    );
                  }
                  if (s.type === 'link') {
                    const display = s.content.replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 28);
                    return (
                      <div key={i} style={pos}>
                        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl text-stone-950 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap max-w-[160px] overflow-hidden text-ellipsis">
                          🔗 {display}
                        </div>
                      </div>
                    );
                  }
                  if (s.type === 'location') {
                    return (
                      <div key={i} style={pos}>
                        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl text-stone-950 text-[12px] font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                          📍 {s.content}
                        </div>
                      </div>
                    );
                  }
                  // fallback: generic text pill
                  return (
                    <div key={i} style={pos}>
                      <div className="bg-black/60 text-white text-[12px] font-semibold px-3 py-1.5 rounded-full">{s.content}</div>
                    </div>
                  );
                })}
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

            {/* 7.1: Viewer count + delete — own active stories only (hidden for highlights/readOnly) */}
            {isOwnStory && !readOnly && (<>
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                  isPaused.current = true;
                  setPaused(true);
                }}
                className="absolute bottom-4 right-4 z-[2] flex items-center gap-1 bg-transparent border-none cursor-pointer"
                aria-label="Eliminar story"
              >
                <Trash2 size={14} className="text-white/60" />
              </button>
            </>)}

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
                          {(v.avatar_url || v.profile_image || v.avatar) ? (
                            <img
                              src={v.avatar_url || v.profile_image || v.avatar}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                              {(v.username || v.name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
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
            {(effectiveProducts.length > 0 || currentItem?.links?.length > 0) && (
              <div className="absolute bottom-16 left-4 right-4 z-[2] flex flex-col gap-2">
                {effectiveProducts.map((product, idx) => (
                  <div
                    key={product.id || product.product_id || idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                      const pid = product?.product_id || product?.id || product?.slug || product?.productId;
                      if (pid) navigate(`/products/${pid}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClose();
                        const pid = product?.product_id || product?.id || product?.slug || product?.productId;
                        if (pid) navigate(`/products/${pid}`);
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-full bg-white/15 backdrop-blur-xl cursor-pointer"
                    role="link"
                    tabIndex={0}
                    aria-label={`Ver producto: ${product?.name}`}
                  >
                    {(product?.thumbnail || product?.image || product?.product_image) && (
                      <img
                        src={product.thumbnail || product.image || product.product_image}
                        alt=""
                        className="w-8 h-8 rounded-2xl object-cover shrink-0"
                      />
                    )}
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[13px] text-white font-sans font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                        {product?.name || product?.product_name}
                      </span>
                      {(product?.price ?? product?.product_price) != null && (
                        <span className="text-[11px] text-white/70 font-semibold font-sans">
                          {priceFormatter.format(product.price ?? product.product_price)}
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

      {/* Quick emoji reactions with burst animations — hidden for own stories */}
      {!isOwnStory && <div className="flex items-center justify-center gap-1.5 px-3 py-1">
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
      </div>}

      {/* Bottom bar: like + reply input + send + share — hidden for own stories */}
      {!isOwnStory &&
      <div className="flex items-center gap-2 px-3 py-2 pb-[calc(env(safe-area-inset-bottom,8px)+8px)]">
        <button
          onClick={async () => {
            const newLiked = !liked;
            setLiked(newLiked);
            try {
              await apiClient.post(`/stories/${currentItem?.story_id || currentItem?.id}/like`);
            } catch (err) {
              setLiked(!newLiked); // rollback on failure
            }
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
          onBlur={() => { if (!shareSheetOpen) { isPaused.current = false; setPaused(false); } }}
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
      </div>}

      {/* Own-story spacer — keeps the bottom safe area consistent when reply bar is hidden */}
      {isOwnStory && <div className="h-[calc(env(safe-area-inset-bottom,8px)+8px)]" />}

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
                  placeholder="Buscar conversación..."
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

      {/* Delete story confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              key="del-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowDeleteConfirm(false); isPaused.current = false; setPaused(false); }}
              className="absolute inset-0 z-[110] bg-black/50"
            />
            <motion.div
              key="del-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-4 right-4 top-1/2 -translate-y-1/2 z-[111] bg-white rounded-2xl p-4 shadow-xl mx-auto max-w-[320px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-1 text-center text-[15px] font-semibold text-stone-950">¿Eliminar esta historia?</p>
              <p className="mb-4 text-center text-sm text-stone-500">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); isPaused.current = false; setPaused(false); }}
                  className="flex-1 rounded-full bg-stone-100 py-3 text-sm font-semibold text-stone-950"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setShowDeleteConfirm(false);
                    try {
                      const sid = currentItem?.story_id || currentItem?.id;
                      await apiClient.delete(`/stories/${sid}`);
                      toast.success('Historia eliminada');
                      queryClient.invalidateQueries({ queryKey: ['stories-mine'] });
                      queryClient.invalidateQueries({ queryKey: ['feed-stories'] });
                      queryClient.invalidateQueries({ queryKey: ['user-stories', currentStory?.user_id] });
                      handleClose();
                    } catch { toast.error('No se pudo eliminar'); }
                  }}
                  className="flex-1 rounded-full bg-stone-950 py-3 text-sm font-semibold text-white"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
