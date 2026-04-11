import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { abbreviateCount } from '../../utils/helpers';
import { timeAgo } from '../../utils/time';
import { Eye, Heart, MessageCircle, Bookmark, Play, Pause, Plus, Check, Volume2, VolumeX, Send, X as XIcon, Trash2, ShoppingBag, MoreHorizontal, Pencil, UserMinus, Flag } from 'lucide-react';
import ReportButton from '../moderation/ReportButton';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import BottomSheet from '../motion/BottomSheet';
import { useDwellTime } from '../../hooks/useDwellTime';
import { useHaptics } from '../../hooks/useHaptics';
import { useAutocomplete } from '../../hooks/useAutocomplete';
import MentionDropdown from './MentionDropdown';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
const priceFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR'
});
const formatPrice = price => priceFormatter.format(price);

// ---------------------------------------------------------------------------
// Reaction picker
// ---------------------------------------------------------------------------

const REACTIONS = ['❤️', '🔥', '👏', '😍', '😮', '😢'];
function ReelReactionPicker({
  show,
  onSelect,
  onClose
}) {
  const pickerRef = useRef(null);
  const [bouncingIdx, setBouncingIdx] = useState(null);
  useEffect(() => {
    if (!show) return;
    const handler = e => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [show, onClose]);
  return <AnimatePresence>
      {show && <motion.div ref={pickerRef} className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-50 bg-white rounded-full shadow-lg border border-stone-100 px-2 py-1.5 flex gap-1" initial={{
      scale: 0.5,
      opacity: 0
    }} animate={{
      scale: 1,
      opacity: 1
    }} exit={{
      scale: 0.5,
      opacity: 0
    }} transition={{
      type: 'spring',
      stiffness: 500,
      damping: 30
    }}>
          {REACTIONS.map((emoji, i) => <motion.button key={emoji} className="w-11 h-11 rounded-full bg-transparent border-none cursor-pointer flex items-center justify-center text-xl" whileHover={{
        scale: 1.3
      }} animate={bouncingIdx === i ? {
        scale: [1, 1.5, 1],
        transition: {
          duration: 0.35
        }
      } : {}} onClick={e => {
        e.stopPropagation();
        setBouncingIdx(i);
        setTimeout(() => onSelect(emoji), 300);
      }} aria-label={`Reaccionar con ${emoji}`}>
              {emoji}
            </motion.button>)}
        </motion.div>}
    </AnimatePresence>;
}
function ReelCardInner({
  reel,
  isActive,
  onLike,
  onComment,
  onShare,
  embedded = false,
  priority = false,
  nextVideoUrl,
  onExpand
}) {
  const isBlockedMediaUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return false;
    return /samplelib\.com/i.test(url);
  }, []);

  const navigate = useNavigate();
  const {
    user: currentUser
  } = useAuth();
  const {
    addToCart
  } = useCart();
  const {
    trigger
  } = useHaptics();
  const dwellRef = useDwellTime(reel.id || reel.reel_id || reel.post_id, 'reel');
  const [addingToCart, setAddingToCart] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [showProductSheet, setShowProductSheet] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsPage, setCommentsPage] = useState(1);
  const COMMENTS_PER_PAGE = 20;
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [likedComments, setLikedComments] = useState(new Set());
  const [replyTo, setReplyTo] = useState(null);
  const [isFollowing, setIsFollowing] = useState(reel.is_following ?? reel.user?.is_followed_by_me ?? false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const commentInputRef = useRef(null);
  const playIconTimer = useRef(null);
  const lastTapRef = useRef(0);
  const singleTapTimer = useRef(null);
  const wasPlayingBeforeTap = useRef(null);
  const [liked, setLiked] = useState(reel.liked ?? reel.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(reel.likes ?? reel.likes_count ?? 0);
  const [saved, setSaved] = useState(reel.saved ?? reel.is_saved ?? false);
  const [playing, setPlaying] = useState(false);
  const reelAutocomplete = useAutocomplete(newComment, v => setNewComment(v.slice(0, 500)), commentInputRef);

  // Intentionally disable next-video prefetch in production:
  // cross-origin video prefetch can trigger CSP noise and cache-operation errors.

  // Sync local state when props change (e.g. from React Query cache update)
  useEffect(() => {
    setLiked(reel.liked ?? reel.is_liked ?? false);
    setLikesCount(reel.likes ?? reel.likes_count ?? 0);
  }, [reel.liked, reel.is_liked, reel.likes, reel.likes_count]);
  const [localCommentsCount, setLocalCommentsCount] = useState(reel.comments_count ?? reel.comments ?? 0);
  useEffect(() => {
    setLocalCommentsCount(reel.comments_count ?? reel.comments ?? 0);
  }, [reel.comments_count, reel.comments]);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem('hsp_reel_muted') !== 'false';
    } catch (err) {
      /* storage unavailable */return true;
    }
  });
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [showOwnerMenu, setShowOwnerMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);
  const [localCaption, setLocalCaption] = useState(null);
  const [deleted, setDeleted] = useState(false);
  const undoTimerRef = useRef(null);
  const doubleTapHeartTimer = useRef(null);

  // Reaction system
  const [showReactions, setShowReactions] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const reactionLongPressRef = useRef(null);
  const isOwner = currentUser && (currentUser.user_id || currentUser.id) === (reel.user?.id || reel.user?.user_id || reel.user_id);
  const reelId = reel.id || reel.reel_id || reel.post_id;

  // Clean up timers on unmount
  const deletedRef = useRef(false);
  useEffect(() => {
    deletedRef.current = deleted;
  }, [deleted]);
  useEffect(() => {
    const playTimer = playIconTimer.current;
    const tapTimer = singleTapTimer.current;
    const doubleTapTimer = doubleTapHeartTimer.current;
    const reactionTimer = reactionLongPressRef.current;
    const undoTimer = undoTimerRef.current;

    return () => {
      clearTimeout(playTimer);
      clearTimeout(tapTimer);
      clearTimeout(doubleTapTimer);
      clearTimeout(reactionTimer);
      // If reel was marked for deletion and user scrolled away, execute delete now
      if (deletedRef.current && undoTimer) {
        clearTimeout(undoTimer);
        if (reelId) apiClient.delete(`/reels/${reelId}`).catch(() => {});
      }
    };
  }, [reelId]);

  // Track view (fire once per mount)
  const viewTrackedRef = useRef(false);

  // IntersectionObserver auto play/pause
  const isVisibleRef = useRef(false);
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      isVisibleRef.current = visible;
      if (visible && !document.hidden) {
        // Track view once when reel becomes visible
        if (!viewTrackedRef.current) {
          viewTrackedRef.current = true;
          if (reelId) apiClient.post(`/reels/${reelId}/view`).catch(() => {});
        }
        // In embedded mode, IO controls playback directly.
        // In non-embedded (ReelsPage), parent's isActive prop controls playback.
        if (embedded) {
          video.play().catch(() => {
            setPlaying(false);
          });
          setPlaying(true);
        }
      } else if (embedded) {
        video.pause();
        setPlaying(false);
      }
    }, {
      threshold: [0, 0.5, 1.0]
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [reel.id, reel.reel_id, reel.post_id, reelId, embedded]);

  // Pause on tab switch (visibilitychange) — resume only if in viewport
  useEffect(() => {
    const handleVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
        setPlaying(false);
      } else if (isVisibleRef.current || isActive) {
        video.play().catch(() => {
          setPlaying(false);
        });
        setPlaying(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isActive]);

  // Track video progress — throttled to avoid excess re-renders
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let lastUpdate = 0;
    const onTime = () => {
      const now = performance.now();
      if (now - lastUpdate < 250) return; // max 4 updates/sec
      lastUpdate = now;
      if (video.duration > 0) setProgress(video.currentTime / video.duration);
    };
    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
  }, []);

  // External isActive control
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive === true) {
      video.play().catch(() => {
        setPlaying(false);
      });
      setPlaying(true);
    } else if (isActive === false) {
      video.pause();
      setPlaying(false);
    }
  }, [isActive]);
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {
        setPlaying(false);
      });
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
    setShowPlayIcon(true);
    clearTimeout(playIconTimer.current);
    playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 600);
  }, []);

  // Comment handlers
  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    setCommentsPage(1);
    try {
      const reelId = reel.id || reel.reel_id || reel.post_id;
      const res = await apiClient.get(`/reels/${reelId}/comments?limit=60`);
      const items = Array.isArray(res) ? res : res?.data || res?.comments || [];
      setComments(items);
      setLikedComments(new Set(items.filter(c => c.is_liked && c.comment_id).map(c => c.comment_id)));
    } catch (err) {
      /* non-critical: comments fetch failed */setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [reel.id, reel.reel_id, reel.post_id]);
  const submitComment = useCallback(async () => {
    if (!newComment.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const reelId = reel.id || reel.reel_id || reel.post_id;
      const payload = {
        text: newComment.trim()
      };
      if (replyTo) payload.reply_to = replyTo.commentId;
      await apiClient.post(`/reels/${reelId}/comments`, payload);
      setNewComment('');
      setReplyTo(null);
      setLocalCommentsCount(c => c + 1);
      fetchComments();
    } catch (err) {
      toast.error('Error al comentar');
    } finally {
      setSendingComment(false);
    }
  }, [newComment, sendingComment, reel, replyTo, fetchComments]);
  const openComments = useCallback(() => {
    setShowComments(true);
    videoRef.current?.pause();
    setPlaying(false);
    fetchComments();
  }, [fetchComments]);
  const closeComments = useCallback(() => {
    setShowComments(false);
    setReplyTo(null);
    setNewComment('');
    // Resume video playback when closing comments
    const video = videoRef.current;
    if (video && (isActive || embedded)) {
      video.play().catch(() => {});
      setPlaying(true);
    }
  }, [isActive, embedded]);
  const likingCommentRef = useRef(false);
  const handleLikeComment = useCallback(async commentId => {
    if (likingCommentRef.current) return;
    likingCommentRef.current = true;
    const wasLiked = likedComments.has(commentId);
    setLikedComments(prev => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    // Optimistic count update
    setComments(prev => prev.map(c => {
      const cId = c.comment_id || c.id || c._id;
      if (cId !== commentId) return c;
      return {
        ...c,
        likes_count: Math.max(0, (c.likes_count || 0) + (wasLiked ? -1 : 1))
      };
    }));
    const reelId = reel.id || reel.reel_id || reel.post_id;
    try {
      await apiClient.post(`/reels/${reelId}/comments/${commentId}/like`);
    } catch (err) {
      // Rollback optimistic updates
      setLikedComments(prev => {
        const next = new Set(prev);
        wasLiked ? next.add(commentId) : next.delete(commentId);
        return next;
      });
      setComments(prev => prev.map(c => {
        const cId = c.comment_id || c.id || c._id;
        if (cId !== commentId) return c;
        return {
          ...c,
          likes_count: Math.max(0, (c.likes_count || 0) + (wasLiked ? 1 : -1))
        };
      }));
    }
    likingCommentRef.current = false;
  }, [likedComments, reel.id, reel.reel_id, reel.post_id]);
  const handleDeleteComment = useCallback(async commentId => {
    try {
      const reelId = reel.id || reel.reel_id || reel.post_id;
      await apiClient.delete(`/reels/${reelId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => (c.comment_id || c.id || c._id) !== commentId));
      setLocalCommentsCount(c => Math.max(0, c - 1));
    } catch (err) {
      toast.error('Error al eliminar');
    }
  }, [reel.id, reel.reel_id, reel.post_id]);
  const handleReplyComment = useCallback((commentId, username) => {
    setReplyTo({
      commentId,
      username
    });
    setNewComment(`@${username} `);
  }, []);
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    try {
      localStorage.setItem('hsp_reel_muted', String(video.muted));
    } catch (err) {/* storage unavailable */}
  }, []);
  const handleEditSave = useCallback(async () => {
    const reelId = reel.id || reel.reel_id || reel.post_id;
    setSavingCaption(true);
    try {
      await apiClient.patch(`/reels/${reelId}`, {
        caption: editCaption
      });
      setLocalCaption(editCaption);
      setShowEditCaption(false);
      toast.success('Reel editado');
    } catch (err) {
      toast.error('Error al editar');
    } finally {
      setSavingCaption(false);
    }
  }, [editCaption, reel.id, reel.reel_id, reel.post_id]);
  const handleDeleteReel = useCallback(() => {
    trigger('error');
    setDeleted(true);
    setShowDeleteConfirm(false);
    toast('Reel eliminado', {
      action: {
        label: 'Deshacer',
        onClick: () => {
          clearTimeout(undoTimerRef.current);
          undoTimerRef.current = null;
          setDeleted(false);
        }
      },
      duration: 5000
    });
    undoTimerRef.current = setTimeout(async () => {
      undoTimerRef.current = null; // prevent double-delete if component unmounts after timer fires
      const reelId = reel.id || reel.reel_id || reel.post_id;
      try {
        await apiClient.delete(`/reels/${reelId}`);
      } catch (err) {
        setDeleted(false);
        toast.error('Error al eliminar');
      }
    }, 5500);
  }, [reel.id, reel.reel_id, reel.post_id, trigger]);
  const likingRef = useRef(false);
  const handleLike = useCallback(async () => {
    if (likingRef.current) return;
    likingRef.current = true;
    const prev = liked;
    const next = !liked;
    setLiked(next);
    setLikesCount(c => next ? c + 1 : c - 1);
    // Milestone haptic every 10 likes
    const newCount = liked ? likesCount - 1 : likesCount + 1;
    if (newCount > 0 && newCount % 10 === 0) {
      trigger('success');
    }
    const reelId = reel.id || reel.reel_id || reel.post_id;
    try {
      if (onLike) {
        // Embedded: parent (React Query) owns the API call and cache update.
        // Do NOT also call /reels/{id}/like — that would double-increment likes_count.
        await onLike(reelId, next);
      } else {
        await apiClient.post(`/reels/${reelId}/like`);
      }
    } catch (err) {
      // Rollback on failure
      setLiked(prev);
      setLikesCount(c => prev ? c + 1 : c - 1);
      toast.error('Error al dar me gusta');
    }
    likingRef.current = false;
  }, [liked, likesCount, reel.id, reel.reel_id, reel.post_id, onLike, trigger]);

  // Long press handlers for reaction picker
  const handleReactionLongPressStart = useCallback(() => {
    reactionLongPressRef.current = setTimeout(() => {
      setShowReactions(true);
    }, 500);
  }, []);
  const handleReactionLongPressEnd = useCallback(() => {
    clearTimeout(reactionLongPressRef.current);
  }, []);
  const handleReaction = useCallback(async emoji => {
    setSelectedReaction(emoji);
    setShowReactions(false);
    // Reactions ensure the reel is liked (never unlike)
    const wasLiked = liked;
    if (!wasLiked) {
      setLiked(true);
      setLikesCount(c => c + 1);
      const reelId = reel.id || reel.reel_id || reel.post_id;
      try {
        const res = await apiClient.post(`/reels/${reelId}/like`);
        // Server toggled to unlike (was already liked) — rollback optimistic update
        if (res?.liked === false) {
          setLiked(false);
          setLikesCount(c => Math.max(0, c - 1));
        }
      } catch (err) {
        setSelectedReaction(null);
        setLiked(false);
        setLikesCount(c => Math.max(0, c - 1));
        toast.error('Error al reaccionar');
      }
    }
    // If already liked, reaction is just a visual emoji change — no API call needed
  }, [liked, reel.id, reel.reel_id, reel.post_id]);

  // Single tap = play/pause (immediate), double-tap = like (reverses play toggle)
  const handleVideoTap = useCallback(() => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;
    if (isDoubleTap) {
      clearTimeout(singleTapTimer.current);
      // Cancel the single tap toggle that already happened
      if (wasPlayingBeforeTap.current !== null) {
        const video = videoRef.current;
        if (video) {
          if (wasPlayingBeforeTap.current) {
            video.play().catch(() => {});
            setPlaying(true);
          } else {
            video.pause();
            setPlaying(false);
          }
        }
        wasPlayingBeforeTap.current = null;
      }
      // Like
      if (!liked) {
        handleLike();
      }
      setShowDoubleTapHeart(true);
      clearTimeout(doubleTapHeartTimer.current);
      doubleTapHeartTimer.current = setTimeout(() => setShowDoubleTapHeart(false), 800);
    } else {
      // Immediately toggle play/pause
      const video = videoRef.current;
      if (embedded) {
        // Single tap on embedded reel → open fullscreen reel viewer (Instagram behavior)
        if (onExpand) {
          videoRef.current?.pause();
          onExpand();
          return;
        }
        // Fallback: toggle play/pause if no onExpand handler
        wasPlayingBeforeTap.current = !videoRef.current?.paused;
        if (videoRef.current?.paused) {
          videoRef.current.play().catch(() => {});
          setPlaying(true);
        } else {
          videoRef.current?.pause();
          setPlaying(false);
        }
        return;
      }
      wasPlayingBeforeTap.current = !video?.paused;
      togglePlay();
    }
  }, [liked, handleLike, togglePlay, embedded, onExpand]);
  const rawVideoUrl = reel.video_url || reel.videoUrl;
  const videoUrl = isBlockedMediaUrl(rawVideoUrl) ? null : rawVideoUrl;
  const rawThumbnailUrl = reel.thumbnail_url || reel.thumbnail;
  const thumbnailUrl = isBlockedMediaUrl(rawThumbnailUrl) ? null : rawThumbnailUrl;
  const avatarUrl = reel.user?.avatar_url || reel.user?.avatar || reel.user?.profile_image || reel.user_profile_image;
  const reelCommentsCount = localCommentsCount;
  const allProducts = [...(reel.products || []), ...(reel.tagged_products || [])].filter(Boolean);
  const product = allProducts[0] || reel.tagged_product || reel.productTag || null;
  const hasMultipleProducts = allProducts.length > 1;
  const handleAddToCart = useCallback(async p => {
    const productId = p?.product_id || p?.id;
    if (!productId) return;
    setAddingToCart(productId);
    try {
      await addToCart(productId, 1);
      toast.success(i18n.t('ai.addedToCart', 'Añadido al carrito'), {
        duration: 1500
      });
    } catch (err) {
      toast.error(i18n.t('recipe_detail.errorAlAnadir', 'Error al añadir'));
    } finally {
      setAddingToCart(null);
    }
  }, [addToCart]);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  if (deleted) return null;

  // ─── EMBEDDED MODE: PostCard-unified layout ────────────────────────────
  // Caption expansion for embedded mode (declared outside early return for hook rules)
  if (embedded) {
    const userName = reel.user?.name || reel.user?.full_name || 'Usuario';
    const userTarget = reel.user?.username || reel.user?.id || reel.user?.user_id;
    const createdAt = reel.created_at || (reel.timestamp ? new Date(reel.timestamp).toISOString() : null);
    const captionText = localCaption ?? reel.caption;
    const shouldClampCaption = captionText && captionText.length > 120 && !captionExpanded;
    const normalizedProducts = allProducts.length > 0 ? allProducts : product ? [product] : [];
    return <article ref={node => {
      containerRef.current = node;
      dwellRef.current = node;
    }} className="bg-white rounded-2xl shadow-sm mx-3 mb-3 overflow-hidden">
        {/* ─ Header (P-01, P-07) ─ */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div onClick={() => {
          if (userTarget) navigate(`/${userTarget}`);
        }} className="flex shrink-0 items-center justify-center rounded-full cursor-pointer h-9 w-9" role="link" aria-label={`Ver perfil de ${userName}`}>
            {avatarUrl ? <img src={avatarUrl} alt={userName} loading="lazy" className="h-9 w-9 rounded-full object-cover" /> : <div className="h-9 w-9 rounded-full bg-stone-200 flex items-center justify-center text-sm font-bold text-stone-500">
                {userName[0]?.toUpperCase()}
              </div>}
          </div>
          <div className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
            <span onClick={() => {
            if (userTarget) navigate(`/${userTarget}`);
          }} className="text-sm font-semibold text-stone-950 truncate max-w-[140px] cursor-pointer" role="link">
              {userName}
            </span>
            {reel.user?.username && <span className="text-xs text-stone-500 whitespace-nowrap">@{reel.user.username}</span>}
            {createdAt && <>
                <span className="text-[11px] text-stone-500">&middot;</span>
                <span className="text-[11px] text-stone-500 whitespace-nowrap">{timeAgo(createdAt)}</span>
              </>}
          </div>
          {/* Follow button (P-07) */}
          {!isOwner && !isFollowing && (reel.user?.id || reel.user?.user_id) && <button onClick={async () => {
          trigger('medium');
          const reelUserId = reel.user?.id || reel.user?.user_id;
          try {
            const res = await apiClient.post(`/users/${reelUserId}/follow`, {});
            if (res?.status === 'pending') {
              toast.success('Solicitud enviada');
            } else {
              setIsFollowing(true);
            }
          } catch {
            toast.error(i18n.t('reel.noSePudoSeguirAlUsuario', 'No se pudo seguir al usuario'));
          }
        }} className="text-[13px] font-semibold text-stone-950 bg-transparent border border-stone-200 rounded-full px-3.5 py-1.5 cursor-pointer hover:bg-stone-50 transition-colors shrink-0">
              Seguir
            </button>}
          <button className="flex shrink-0 items-center justify-center min-w-[44px] min-h-[44px] p-3 bg-transparent border-none cursor-pointer text-stone-500" aria-label="Opciones" onClick={() => setShowOwnerMenu(v => !v)}>
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Owner menu dropdown */}
        {showOwnerMenu && <>
            <div className="fixed inset-0 z-40" onClick={() => setShowOwnerMenu(false)} />
            <div className="relative z-50 mx-3 -mt-1 mb-1">
              <div className="absolute right-0 top-0 bg-white rounded-2xl shadow-lg border border-stone-100 py-1 min-w-[170px] z-50">
                {isOwner ? <>
                    <button className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 active:bg-stone-100 text-left" onClick={() => {
                setEditCaption(localCaption ?? reel.caption ?? '');
                setShowEditCaption(true);
                setShowOwnerMenu(false);
              }}>
                      <Pencil size={16} /> Editar
                    </button>
                    <button className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 active:bg-stone-100 text-left" onClick={() => {
                setShowDeleteConfirm(true);
                setShowOwnerMenu(false);
              }}>
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </> : <>
                    <button className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 active:bg-stone-100 text-left" onClick={async () => {
                const reelId = reel.id || reel.reel_id || reel.post_id;
                const url = `${window.location.origin}/posts/${reelId}`;
                try {
                  await navigator.clipboard?.writeText(url);
                  toast.success('Enlace copiado');
                } catch {/* */}
                setShowOwnerMenu(false);
              }}>
                      <Send size={16} /> Copiar enlace
                    </button>
                    {isFollowing && (reel.user?.id || reel.user?.user_id) && <button className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 active:bg-stone-100 text-left" onClick={async () => {
                const reelUserId = reel.user?.id || reel.user?.user_id;
                try {
                  await apiClient.delete(`/users/${reelUserId}/follow`);
                  setIsFollowing(false);
                  toast.success(`Has dejado de seguir a ${userName}`);
                } catch {
                  toast.error(i18n.t('followers.errorAlDejarDeSeguir', 'Error al dejar de seguir'));
                }
                setShowOwnerMenu(false);
              }}>
                        <UserMinus size={16} /> Dejar de seguir
                      </button>}
                    {/* Section 3.5b — Report this reel */}
                    <div className="px-4 py-2">
                      <ReportButton
                        contentType="reel"
                        contentId={reel.id || reel.reel_id || reel.post_id}
                        contentOwnerId={reel.user?.id || reel.user?.user_id}
                      />
                    </div>
                  </>}
              </div>
            </div>
          </>}

        {/* ─ Video area ─ */}
        <div className="relative aspect-[4/5] bg-black overflow-hidden cursor-pointer" onClick={handleVideoTap}>
          {videoUrl ? <video ref={videoRef} src={videoUrl} poster={thumbnailUrl || undefined} className="absolute inset-0 w-full h-full object-cover" loop playsInline muted={muted} preload={priority ? 'metadata' : 'none'} onLoadedMetadata={() => {
          if (videoRef.current) setVideoDuration(videoRef.current.duration);
        }} aria-label={playing ? i18n.t('create_reel.pausarVideo', 'Pausar vídeo') : 'Reproducir vídeo'} /> : thumbnailUrl ? <img src={thumbnailUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center bg-stone-900">
              <Play size={48} className="text-white/30" />
            </div>}

          {/* Play/Pause center icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]">
            <AnimatePresence mode="wait">
              {!playing && !showDoubleTapHeart ? <motion.div key="play" initial={{
              scale: 0.5,
              opacity: 0
            }} animate={{
              scale: 1,
              opacity: 1
            }} exit={{
              scale: 0.5,
              opacity: 0
            }} transition={{
              duration: 0.15
            }}>
                  <div className="bg-black/30 rounded-full p-4"><Play size={48} className="text-white/80 fill-white/80" /></div>
                </motion.div> : showPlayIcon ? <motion.div key="pause" initial={{
              scale: 1.2,
              opacity: 0
            }} animate={{
              scale: 1,
              opacity: 0.6
            }} exit={{
              scale: 0.5,
              opacity: 0
            }} transition={{
              duration: 0.2
            }}>
                  <div className="bg-black/30 rounded-full p-4"><Pause size={48} className="text-white/80 fill-white/80" /></div>
                </motion.div> : null}
            </AnimatePresence>
          </div>

          {/* Double-tap heart */}
          {showDoubleTapHeart && <motion.div initial={{
          scale: 0,
          opacity: 1
        }} animate={{
          scale: [0, 1.3, 0.95, 1],
          opacity: [1, 1, 1, 0]
        }} transition={{
          duration: 0.8,
          ease: 'easeOut'
        }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
              <Heart size={80} className="text-white fill-white" />
            </motion.div>}

          {/* Mute toggle */}
          <button onClick={e => {
          e.stopPropagation();
          toggleMute();
        }} className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border-none cursor-pointer" aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
            {muted ? <VolumeX size={14} className="text-white" /> : <Volume2 size={14} className="text-white" />}
          </button>

          {/* Reel badge */}
          <div className="absolute top-3 left-3 z-[2] bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
            <Play size={10} className="text-white fill-white" />
            <span className="text-[11px] text-white font-semibold">Reel</span>
          </div>

          {/* Duration badge */}
          {videoDuration > 0 && !playing && <div className="absolute top-3 right-3 z-[2] bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[11px] text-white font-semibold tabular-nums">
                {Math.floor(videoDuration / 60)}:{String(Math.floor(videoDuration % 60)).padStart(2, '0')}
              </span>
            </div>}

          {/* Gradient at bottom for views */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

          {/* Views badge */}
          {reel.views || reel.view_count || reel.views_count ? <div className="absolute bottom-3 left-3 flex items-center gap-1 text-xs text-white/80 z-[2]">
              <Eye size={12} className="shrink-0" />
              <span>{abbreviateCount(reel.views || reel.view_count || reel.views_count || 0)}</span>
            </div> : null}
        </div>

        {/* ─ Progress bar (P-08) ─ */}
        <div className="h-[2px] bg-stone-100 cursor-pointer relative" onClick={e => {
        const video = videoRef.current;
        if (!video || !video.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        video.currentTime = ratio * video.duration;
        setProgress(ratio);
      }}>
          <div className="h-full bg-stone-950 origin-left transition-transform duration-150" style={{
          transform: `scaleX(${Math.min(1, progress)})`
        }} />
        </div>

        {/* ─ Action bar (P-02) ─ */}
        <div className="flex items-center gap-4 px-3 py-2">
          {/* Like */}
          <div className="relative">
            <ReelReactionPicker show={showReactions} onSelect={handleReaction} onClose={() => setShowReactions(false)} />
            <motion.button whileTap={{
            scale: 0.85
          }} transition={{
            type: 'spring',
            damping: 20,
            stiffness: 400
          }} className="flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer text-stone-950" onClick={handleLike} onPointerDown={handleReactionLongPressStart} onPointerUp={handleReactionLongPressEnd} onPointerLeave={handleReactionLongPressEnd} aria-label={liked ? `Quitar me gusta · ${likesCount}` : `Me gusta · ${likesCount}`} aria-pressed={liked}>
              {selectedReaction && selectedReaction !== '❤️' ? <span className="text-[22px] leading-none">{selectedReaction}</span> : <Heart size={24} fill={liked ? 'currentColor' : 'none'} />}
              {likesCount > 0 && <motion.span key={likesCount} initial={{
              scale: 1.15
            }} animate={{
              scale: 1
            }} transition={{
              type: 'spring',
              stiffness: 400,
              damping: 15,
              duration: 0.3
            }} className="text-[13px] font-semibold text-stone-950">
                  {abbreviateCount(likesCount)}
                </motion.span>}
            </motion.button>
          </div>

          {/* Comment */}
          <motion.button whileTap={{
          scale: 0.85
        }} transition={{
          type: 'spring',
          damping: 20,
          stiffness: 400
        }} className="flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer text-stone-950" onClick={openComments} aria-label={`Comentar · ${reelCommentsCount}`}>
            <MessageCircle size={24} />
            {reelCommentsCount > 0 && <span className="text-[13px] font-semibold text-stone-950">{abbreviateCount(reelCommentsCount)}</span>}
          </motion.button>

          {/* Share */}
          <motion.button whileTap={{
          scale: 0.85
        }} transition={{
          type: 'spring',
          damping: 20,
          stiffness: 400
        }} className="flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer text-stone-950" onClick={async () => {
          trigger('light');
          const reelId = reel.id || reel.reel_id || reel.post_id;
          const url = `${window.location.origin}/posts/${reelId}`;
          try {
            if (navigator.share) {
              await navigator.share({
                title: reel.caption || 'Reel',
                url
              });
            } else {
              await navigator.clipboard?.writeText(url);
              toast.success('Enlace copiado');
            }
          } catch {/* cancelled */}
          onShare?.(reelId);
        }} aria-label="Compartir">
            <Send size={24} />
          </motion.button>

          {/* Save — right-aligned */}
          <motion.button whileTap={{
          scale: 0.85
        }} className="ml-auto flex min-h-[44px] items-center bg-transparent border-none py-2.5 cursor-pointer text-stone-950" onClick={async () => {
          const next = !saved;
          setSaved(next);
          try {
            const reelId = reel.id || reel.reel_id || reel.post_id;
            await apiClient.post(`/reels/${reelId}/save`);
          } catch {
            setSaved(!next);
            toast.error('Error al guardar');
          }
        }} aria-label={saved ? 'Quitar guardado' : 'Guardar'}>
            <motion.div animate={{
            scale: saved ? [1, 1.3, 1] : 1
          }} transition={{
            duration: 0.3,
            type: 'spring',
            stiffness: 500
          }}>
              <Bookmark size={22} fill={saved ? 'currentColor' : 'none'} className="transition-colors duration-200" />
            </motion.div>
          </motion.button>
        </div>

        {/* ─ Social proof (P-06) ─ */}
        {likesCount > 0 && (() => {
        const likedByArr = reel.liked_by_sample || reel.liked_by || reel.liked_by_users;
        const firstUser = likedByArr?.[0];
        if (firstUser) {
          return <div className="px-3 pb-1">
                <p className="text-xs text-stone-500">
                  Le gusta a{' '}
                  <button onClick={() => navigate(`/${firstUser.username || firstUser.id || firstUser.user_id}`)} className="font-semibold text-stone-950 bg-transparent border-none cursor-pointer p-0">
                    {firstUser.username || firstUser.name}
                  </button>
                  {likesCount > 1 && <> y <span className="font-semibold text-stone-950">{abbreviateCount(likesCount - 1)} más</span></>}
                </p>
              </div>;
        }
        return <div className="px-3 pb-1">
              <p className="text-xs text-stone-500">
                <span className="font-semibold text-stone-950">{abbreviateCount(likesCount)} me gusta</span>
              </p>
            </div>;
      })()}

        {/* ─ "Ver los X comentarios" link ─ */}
        {reelCommentsCount > 0 && <button className="block w-full px-3 bg-transparent border-none p-0 pb-1 text-left text-[13px] text-stone-500 cursor-pointer font-[inherit]" onClick={openComments}>
            Ver {reelCommentsCount === 1 ? 'el comentario' : `los ${reelCommentsCount} comentarios`}
          </button>}

        {/* ─ Caption (P-04) ─ */}
        {captionText && <div className="px-3 pb-3 text-sm leading-[1.45] text-stone-950 break-words">
            <motion.div layout transition={{
          duration: 0.2,
          ease: 'easeOut'
        }}>
              <div className={shouldClampCaption ? 'line-clamp-3' : ''}>
                <span className="mr-1 font-semibold">{userName}</span>
                {captionText}
              </div>
              {shouldClampCaption && <button className="min-h-[44px] bg-transparent border-none p-0 py-1 text-sm text-stone-500 cursor-pointer font-[inherit]" onClick={() => setCaptionExpanded(true)}>
                  ... Ver más
                </button>}
            </motion.div>
          </div>}

        {/* ─ Product pills (P-05) ─ */}
        {normalizedProducts.length > 0 && <div className="bg-stone-50 rounded-xl p-2 mx-3 mb-3">
            <div className="scrollbar-hide flex gap-2 overflow-x-auto">
              {normalizedProducts.slice(0, 3).map((p, idx) => {
            const img = p.image || p.thumbnail || p.images?.[0];
            const pid = p.product_id || p.id;
            const pName = p.name || p.title;
            const isLast = idx === Math.min(normalizedProducts.length, 3) - 1;
            return <div key={pid || idx} role="button" tabIndex={0} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-2.5 border border-stone-200 cursor-pointer shadow-sm" onClick={() => {
              if (pid) navigate(`/products/${pid}`);
            }} onKeyDown={e => {
              if ((e.key === 'Enter' || e.key === ' ') && pid) navigate(`/products/${pid}`);
            }} aria-label={`Ver producto ${pName}`}>
                    {img && <img src={img} alt={pName} loading="lazy" className="h-7 w-7 rounded-xl object-cover" />}
                    <span className="max-w-[80px] truncate text-[11px] font-medium text-stone-950">{pName}</span>
                    {p.price > 0 && <span className="whitespace-nowrap text-[11px] font-semibold text-stone-950">{formatPrice(p.price)}</span>}
                    {isLast && normalizedProducts.length > 1 && <span className="text-[10px] font-semibold text-stone-500 whitespace-nowrap">Comprar</span>}
                    <button onClick={e => {
                e.stopPropagation();
                handleAddToCart(p);
              }} className="flex items-center justify-center w-8 h-8 min-w-[44px] min-h-[44px] rounded-full bg-stone-950 border-none cursor-pointer shrink-0 ml-0.5" aria-label={`Añadir ${pName} al carrito`}>
                      <ShoppingBag size={12} className="text-white" />
                    </button>
                  </div>;
          })}
              {normalizedProducts.length > 3 && <span className="flex shrink-0 items-center text-[11px] font-medium text-stone-500">+{normalizedProducts.length - 3} más</span>}
            </div>
          </div>}

        {/* ─ Inline caption edit overlay ─ */}
        <AnimatePresence>
          {showEditCaption && isOwner && <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} className="px-3 pb-3">
              <div className="bg-stone-50 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-xs font-semibold text-stone-500">{i18n.t('post_detail.editarDescripcion', 'Editar descripción')}</span>
                <textarea value={editCaption} onChange={e => setEditCaption(e.target.value.slice(0, 2200))} className="w-full bg-white text-stone-950 border border-stone-200 rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:border-stone-400 min-h-[60px] box-border" autoFocus />
                <div className="flex gap-2">
                  <button onClick={() => setShowEditCaption(false)} className="flex-1 bg-transparent text-stone-500 border border-stone-200 rounded-full py-2 text-[13px] cursor-pointer">Cancelar</button>
                  <button onClick={handleEditSave} disabled={savingCaption} className="flex-1 bg-stone-950 text-white border-none rounded-full py-2 text-[13px] font-semibold cursor-pointer disabled:opacity-50">
                    {savingCaption ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </motion.div>}
        </AnimatePresence>

        {/* ─ Delete confirmation ─ */}
        <BottomSheet isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} maxHeight="50vh">
          <div className="p-5 flex flex-col gap-3 text-center">
            <p className="text-base font-semibold text-stone-950">¿Eliminar este reel?</p>
            <p className="text-sm text-stone-500">{i18n.t('reel.seEliminaraPermanentementeJuntoConS', 'Se eliminará permanentemente junto con sus comentarios y likes.')}</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-stone-100 text-stone-950 border-none rounded-full py-3 text-sm font-semibold cursor-pointer">Cancelar</button>
              <button onClick={handleDeleteReel} className="flex-1 bg-stone-950 text-white border-none rounded-full py-3 text-sm font-semibold cursor-pointer">Eliminar</button>
            </div>
          </div>
        </BottomSheet>

        {/* ─ Comments bottom sheet ─ */}
        <BottomSheet isOpen={showComments} onClose={closeComments} maxHeight="60vh">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0">
              <span className="text-sm font-semibold text-stone-950">Comentarios</span>
              <button onClick={closeComments} className="bg-transparent border-none cursor-pointer p-1 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Cerrar">
                <XIcon size={18} className="text-stone-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[100px]">
              {commentsLoading ? <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-stone-200 border-t-stone-950 rounded-full animate-spin" /></div> : comments.length === 0 ? <p className="text-center text-stone-400 text-sm py-8">{i18n.t('post_detail.seElPrimeroEnComentar', 'Sé el primero en comentar')}</p> : comments.slice(0, commentsPage * COMMENTS_PER_PAGE).map((c, i) => {
              const cId = c.comment_id || c.id || c._id;
              const cName = c.user?.name || c.user_name || c.username || 'Usuario';
              const isOwn = currentUser?.user_id === c.user_id;
              return <div key={cId || i} className="flex gap-2.5 py-2.5 group">
                      <div className="w-8 h-8 rounded-full bg-stone-100 shrink-0 flex items-center justify-center text-stone-500 text-[10px] font-semibold overflow-hidden">
                        {c.user?.avatar_url || c.user_profile_image || c.avatar_url ? <img src={c.user?.avatar_url || c.user_profile_image || c.avatar_url} alt="" className="w-full h-full object-cover" /> : cName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-stone-950 leading-[1.4]">
                          <span className="font-semibold mr-1.5">{cName}</span>
                          {c.text || c.content}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-stone-400">{c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short'
                      }) : ''}</span>
                          <button onClick={() => handleReplyComment(cId, cName)} className="bg-transparent border-none cursor-pointer px-2 py-1 text-[10px] text-stone-400 font-semibold hover:text-stone-600 min-h-[44px] flex items-center">Responder</button>
                          {!isOwn && cId && (
                            <ReportButton contentType="comment" contentId={cId} contentOwnerId={c.user_id} />
                          )}
                          {isOwn && <button onClick={() => handleDeleteComment(cId)} className="bg-transparent border-none cursor-pointer p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                              <Trash2 size={12} className="text-stone-300 hover:text-stone-500" />
                            </button>}
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-start pt-1 shrink-0">
                        <button onClick={() => handleLikeComment(cId)} className="bg-transparent border-none cursor-pointer p-0 flex flex-col items-center gap-0.5" aria-label={likedComments.has(cId) ? 'Quitar me gusta del comentario' : 'Me gusta en comentario'}>
                          <Heart size={14} fill={likedComments.has(cId) ? 'currentColor' : 'none'} className={likedComments.has(cId) ? 'text-stone-950' : 'text-stone-300'} strokeWidth={1.8} />
                          {(c.likes_count || 0) > 0 && <span className="text-[10px] text-stone-400 leading-none">{c.likes_count}</span>}
                        </button>
                      </div>
                    </div>;
            })}
              {!commentsLoading && comments.length > commentsPage * COMMENTS_PER_PAGE && <button onClick={() => setCommentsPage(p => p + 1)} className="w-full py-2.5 text-center text-xs font-semibold text-stone-400 hover:text-stone-600 bg-transparent border-none cursor-pointer">
                  Ver más comentarios ({comments.length - commentsPage * COMMENTS_PER_PAGE} restantes)
                </button>}
            </div>
            {/* Emoji quick-react */}
            <div className="flex items-center justify-between px-6 py-2.5 border-t border-stone-100 shrink-0">
              {['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'].map(emoji => <button key={emoji} onClick={() => setNewComment(prev => prev + emoji)} className="text-[24px] leading-none bg-transparent border-none cursor-pointer p-1 active:scale-125 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={`Añadir ${emoji}`}>
                  {emoji}
                </button>)}
            </div>
            {/* Reply context */}
            {replyTo && <div className="mx-4 mt-2 mb-1 shrink-0">
                <div className="flex items-center justify-between bg-stone-50 rounded-xl px-3 py-2">
                  <span className="text-xs text-stone-500">Respondiendo a <span className="font-semibold text-stone-700">@{replyTo.username}</span></span>
                  <button onClick={() => {
                setReplyTo(null);
                setNewComment('');
              }} className="w-6 h-6 rounded-full bg-transparent hover:bg-stone-100 border-none cursor-pointer flex items-center justify-center" aria-label="Cancelar respuesta">
                    <XIcon size={12} className="text-stone-400" />
                  </button>
                </div>
              </div>}
            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-stone-100 shrink-0">
              {currentUser?.avatar_url && <img src={currentUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />}
              <div className="relative flex-1">
                {reelAutocomplete.isOpen && reelAutocomplete.trigger?.trigger === '@' && <MentionDropdown suggestions={reelAutocomplete.suggestions} activeIndex={reelAutocomplete.activeIndex} onSelect={u => reelAutocomplete.selectSuggestion(u)} />}
                <input ref={commentInputRef} value={newComment} onChange={e => reelAutocomplete.handleChange(e)} onSelect={e => reelAutocomplete.handleSelect(e)} onKeyDown={e => {
                if (reelAutocomplete.isOpen) {
                  reelAutocomplete.handleKeyDown(e);
                  if (e.defaultPrevented) return;
                }
                if (e.key === 'Enter') submitComment();
              }} placeholder={i18n.t('feed.addComment', 'Añade un comentario...')} className="w-full bg-stone-50 text-stone-950 border-none rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-stone-400" aria-label="Escribir comentario" />
              </div>
              <button onClick={submitComment} disabled={!newComment.trim() || sendingComment} className={`w-11 h-11 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors ${newComment.trim() ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-400'}`} aria-label="Enviar comentario">
                <Send size={16} />
              </button>
            </div>
          </div>
        </BottomSheet>
      </article>;
  }

  // ─── FULLSCREEN MODE (ReelsPage / non-embedded) ──────────────────────────
  return <div ref={node => {
    containerRef.current = node;
    dwellRef.current = node;
  }} className="relative w-full bg-black overflow-hidden snap-start h-dvh">
      {/* Video */}
      {videoUrl ? <video ref={videoRef} src={videoUrl} poster={thumbnailUrl || undefined} className="absolute inset-0 w-full h-full object-cover" loop playsInline muted={muted} preload={priority ? 'metadata' : 'none'} onClick={handleVideoTap} onLoadedMetadata={() => {
      if (videoRef.current) setVideoDuration(videoRef.current.duration);
    }} aria-label={playing ? i18n.t('create_reel.pausarVideo', 'Pausar vídeo') : 'Reproducir vídeo'} /> : <div className="absolute inset-0 w-full h-full bg-stone-900 flex items-center justify-center" onClick={handleVideoTap}>
          {thumbnailUrl ? <img src={thumbnailUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : <Play size={48} className="text-white/30" />}
        </div>}

      {/* Duration badge */}
      {videoDuration > 0 && !playing && <div className="absolute top-4 right-4 z-[2] bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
          <span className="text-[11px] text-white font-semibold font-sans tabular-nums">
            {Math.floor(videoDuration / 60)}:{String(Math.floor(videoDuration % 60)).padStart(2, '0')}
          </span>
        </div>}

      {/* Owner menu button */}
      {isOwner && <button onClick={() => setShowOwnerMenu(v => !v)} className="absolute top-4 left-4 z-[6] w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center" aria-label="Opciones del reel">
          <MoreHorizontal size={18} className="text-white" />
        </button>}

      {/* Owner dropdown menu */}
      {showOwnerMenu && <>
          <div className="fixed inset-0 z-[6]" onClick={() => setShowOwnerMenu(false)} />
          <div className="absolute top-14 left-4 z-[7] bg-white rounded-2xl shadow-lg border border-stone-200 py-1 min-w-[170px]">
            <button className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 active:bg-stone-100 text-left" onClick={() => {
          setEditCaption(localCaption ?? reel.caption ?? '');
          setShowEditCaption(true);
          setShowOwnerMenu(false);
        }}>
              <Pencil size={16} /> Editar
            </button>
            <button className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-stone-950 bg-transparent border-none cursor-pointer hover:bg-stone-50 active:bg-stone-100 text-left" onClick={() => {
          setShowDeleteConfirm(true);
          setShowOwnerMenu(false);
        }}>
              <Trash2 size={16} /> Eliminar
            </button>
          </div>
        </>}

      {/* Inline caption edit overlay */}
      <AnimatePresence>
        {showEditCaption && <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} exit={{
        opacity: 0
      }} transition={{
        duration: 0.2
      }} className="absolute bottom-20 left-3 right-20 z-[8] bg-black/80 rounded-xl p-3 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/70">{i18n.t('post_detail.editarDescripcion', 'Editar descripción')}</span>
              <button className="bg-transparent border-none cursor-pointer p-1 min-w-[36px] min-h-[36px] flex items-center justify-center" onClick={() => setShowEditCaption(false)} aria-label="Cerrar">
                <XIcon size={14} className="text-white/50" />
              </button>
            </div>
            <textarea value={editCaption} onChange={e => setEditCaption(e.target.value.slice(0, 2200))} className="w-full bg-white/10 text-white border border-white/20 rounded-xl px-3 py-2.5 text-sm font-sans resize-none outline-none focus:border-white/40 min-h-[60px] box-border placeholder:text-white/30" aria-label={i18n.t('post_detail.editarDescripcion', 'Editar descripción')} autoFocus />
            <button onClick={handleEditSave} disabled={savingCaption} className="w-full bg-white text-stone-950 border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-white/90 active:bg-white/80 transition-colors disabled:opacity-50">
              {savingCaption ? 'Guardando...' : 'Guardar'}
            </button>
          </motion.div>}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <BottomSheet isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} maxHeight="50vh">
        <div className="p-5 flex flex-col gap-3 text-center">
          <p className="text-base font-semibold text-stone-950">¿Eliminar este reel?</p>
          <p className="text-sm text-stone-500">{i18n.t('reel.seEliminaraPermanentementeJuntoConS', 'Se eliminará permanentemente junto con sus comentarios y likes.')}</p>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-stone-100 text-stone-950 border-none rounded-full py-3 text-sm font-semibold cursor-pointer">
              Cancelar
            </button>
            <button onClick={handleDeleteReel} className="flex-1 bg-stone-950 text-white border-none rounded-full py-3 text-sm font-semibold cursor-pointer">
              Eliminar
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Play/Pause icon — animated with AnimatePresence */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none motion-reduce:hidden z-[3]">
        <AnimatePresence mode="wait">
          {!playing && !showDoubleTapHeart ? <motion.div key="play" initial={{
          scale: 0.5,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} exit={{
          scale: 0.5,
          opacity: 0
        }} transition={{
          duration: 0.15
        }}>
              <div className="bg-black/30 rounded-full p-4">
                <Play size={48} className="text-white/80 fill-white/80" />
              </div>
            </motion.div> : showPlayIcon ? <motion.div key="pause" initial={{
          scale: 1.2,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 0.6
        }} exit={{
          scale: 0.5,
          opacity: 0
        }} transition={{
          duration: 0.2
        }}>
              <div className="bg-black/30 rounded-full p-4">
                <Pause size={48} className="text-white/80 fill-white/80" />
              </div>
            </motion.div> : null}
        </AnimatePresence>
      </div>


      {/* Double-tap heart */}
      {showDoubleTapHeart && <motion.div initial={{
      scale: 0,
      opacity: 1
    }} animate={{
      scale: [0, 1.3, 0.95, 1],
      opacity: [1, 1, 1, 0]
    }} transition={{
      duration: 0.8,
      ease: 'easeOut'
    }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
          <Heart size={80} className="text-white fill-white" />
        </motion.div>}

      {/* Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

      {/* Mute toggle — top-right to avoid overlap with product card + actions */}
      <button onClick={toggleMute} className="absolute right-4 top-4 z-10 w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center" aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
        <AnimatePresence mode="wait">
          <motion.div key={muted ? 'muted' : 'unmuted'} initial={{
          rotate: -90,
          opacity: 0
        }} animate={{
          rotate: 0,
          opacity: 1
        }} exit={{
          rotate: 90,
          opacity: 0
        }} transition={{
          duration: 0.15
        }}>
            {muted ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Actions column */}
      <div className="absolute right-3 flex flex-col gap-5 items-center z-[2] bottom-[100px]">
        {/* Avatar + follow */}
        <div className="relative flex flex-col items-center">
          <div onClick={e => {
          e.stopPropagation();
          const target = reel.user?.username || reel.user?.id || reel.user?.user_id;
          if (target) navigate(`/${target}`);
        }} className="cursor-pointer" role="link" aria-label={`Ver perfil de ${reel.user?.name || reel.user?.full_name || 'usuario'}`}>
            {avatarUrl ? <img src={avatarUrl} alt={reel.user?.name || reel.user?.full_name || 'Usuario'} className="w-10 h-10 rounded-full object-cover border-2 border-white bg-white/20" onError={e => {
            e.currentTarget.style.display = 'none';
          }} /> : <div className="w-10 h-10 rounded-full border-2 border-white bg-white/20 flex items-center justify-center text-sm font-bold text-white">
                {(reel.user?.name || reel.user?.full_name || '?')[0].toUpperCase()}
              </div>}
          </div>
          {(() => {
          const reelUserId = reel.user?.id || reel.user?.user_id;
          const isOwnReel = currentUser && reelUserId && (currentUser.id === reelUserId || currentUser.user_id === reelUserId);
          if (isOwnReel) return null;
          return <button className="absolute -bottom-3 w-11 h-11 rounded-full bg-transparent border-none flex items-center justify-center" aria-label={isFollowing ? 'Dejar de seguir' : 'Seguir'} onClick={async e => {
            e.stopPropagation();
            trigger('medium');
            try {
              if (isFollowing) {
                await apiClient.delete(`/users/${reelUserId}/follow`);
                setIsFollowing(false);
              } else {
                const res = await apiClient.post(`/users/${reelUserId}/follow`, {});
                if (res?.status === 'pending') {
                  toast.success('Solicitud enviada');
                } else {
                  setIsFollowing(true);
                }
              }
            } catch (err) {
              toast.error(isFollowing ? i18n.t('reel.noSePudoDejarDeSeguir', 'No se pudo dejar de seguir') : 'No se pudo seguir al usuario');
            }
          }}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${isFollowing ? 'bg-white' : 'bg-black'}`}>
                  {isFollowing ? <Check size={12} className="text-black" strokeWidth={3} /> : <Plus size={12} className="text-white" strokeWidth={3} />}
                </span>
              </button>;
        })()}
        </div>

        {/* Like */}
        <div className="relative">
          <ReelReactionPicker show={showReactions} onSelect={handleReaction} onClose={() => setShowReactions(false)} />
          <button className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform" onClick={handleLike} onPointerDown={handleReactionLongPressStart} onPointerUp={handleReactionLongPressEnd} onPointerLeave={handleReactionLongPressEnd} aria-label={liked ? `Quitar me gusta · ${likesCount}` : `Me gusta · ${likesCount}`} aria-pressed={liked}>
            {selectedReaction && selectedReaction !== '❤️' ? <span className="text-[26px] leading-none drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">{selectedReaction}</span> : <Heart size={28} fill={liked || selectedReaction === '❤️' ? 'white' : 'none'} className="text-white" />}
            {!reel.hide_likes && <motion.span key={likesCount} initial={{
            scale: 1.15
          }} animate={{
            scale: 1
          }} transition={{
            type: 'spring',
            stiffness: 400,
            damping: 15,
            duration: 0.3
          }} className="text-xs text-white font-sans leading-none">
            {abbreviateCount(likesCount)}
          </motion.span>}
          </button>
        </div>

        {/* Comment */}
        <button className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform" onClick={openComments} aria-label="Comentar">
          <MessageCircle size={28} className="text-white" />
          <span className="text-xs text-white/70 font-sans leading-none">{abbreviateCount(reelCommentsCount)}</span>
        </button>

        {/* Share */}
        <button className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform" onClick={async () => {
        trigger('light');
        const reelId = reel.id || reel.reel_id || reel.post_id;
        const url = `${window.location.origin}/posts/${reelId}`;
        try {
          if (navigator.share) {
            await navigator.share({
              title: reel.caption || 'Reel',
              url
            });
          } else {
            await navigator.clipboard?.writeText(url);
            toast.success('Enlace copiado');
          }
        } catch (err) {
          // User cancelled share dialog
        }
        onShare?.(reelId);
      }} aria-label="Compartir">
          <Send size={28} className="text-white" />
        </button>

        {/* Bookmark */}
        <motion.button whileTap={{
        scale: 0.85
      }} className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-transform" aria-label={saved ? 'Quitar guardado' : 'Guardar'} aria-pressed={saved} onClick={async () => {
        const next = !saved;
        setSaved(next);
        try {
          const reelId = reel.id || reel.reel_id || reel.post_id;
          await apiClient.post(`/reels/${reelId}/save`);
        } catch (err) {
          setSaved(!next); // rollback
          toast.error('Error al guardar');
        }
      }}>
          <motion.div animate={saved ? {
          scale: [1, 1.3, 1]
        } : {
          scale: 1
        }} transition={{
          type: 'spring',
          stiffness: 400,
          damping: 15,
          duration: 0.4
        }}>
            <Bookmark size={28} fill={saved ? 'currentColor' : 'none'} className="text-white" />
          </motion.div>
        </motion.button>
      </div>

      {/* Info bottom-left */}
      <motion.div initial={{
      y: 20,
      opacity: 0
    }} animate={{
      y: 0,
      opacity: 1
    }} transition={{
      duration: 0.4,
      delay: 0.2,
      ease: [0.25, 0.1, 0.25, 1]
    }} className={`absolute left-4 right-20 z-[2] ${product ? 'bottom-[76px]' : 'bottom-20'}`}>
        <button className="text-[15px] font-semibold text-white font-sans mb-1.5 bg-transparent border-none p-0 cursor-pointer text-left" onClick={() => {
        const target = reel.user?.username || reel.user?.id || reel.user?.user_id;
        if (target) navigate(`/${target}`);
      }} aria-label={`Ver perfil de ${reel.user?.name || reel.user?.full_name || 'usuario'}`}>
          {reel.user?.name || reel.user?.full_name || 'Usuario'}
        </button>
        {(localCaption ?? reel.caption) && <div className="text-[13px] text-white/85 font-sans line-clamp-2 leading-[1.4] mb-1.5">
            {localCaption ?? reel.caption}
          </div>}
        {reel.music_name && <div className="text-xs text-white/60 font-sans">
            🎵 {reel.music_name}
          </div>}
        {reel.views || reel.view_count || reel.views_count ? <div className="flex items-center gap-1 text-xs text-white/70 font-sans mt-0.5">
            <Eye size={12} className="shrink-0" />
            <span>{abbreviateCount(reel.views || reel.view_count || reel.views_count || 0)}</span>
          </div> : null}
      </motion.div>

      {/* "Comprar" pill — shown when there are tagged products */}
      {(allProducts.length > 0 || reel.tagged_product || reel.productTag) && <button className="absolute bottom-16 left-4 z-[3] flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-stone-950 text-xs font-semibold px-3.5 py-2 rounded-full border-none cursor-pointer shadow-lg hover:bg-white active:bg-stone-100 transition-colors" onClick={e => {
      e.stopPropagation();
      if (hasMultipleProducts) {
        setShowProductSheet(true);
      } else {
        const p = product;
        if (p) navigate(`/products/${p.id || p.product_id}`);
      }
    }} aria-label={hasMultipleProducts ? `Comprar ${allProducts.length} productos` : 'Comprar producto'}>
          <ShoppingBag size={13} className="shrink-0" />
          <span>Comprar{hasMultipleProducts ? ` (${allProducts.length})` : ''}</span>
        </button>}

      {/* Product mini-card — adds to cart without leaving reel */}
      {product && <div className="absolute bottom-4 left-4 right-4 bg-white/15 backdrop-blur-xl rounded-2xl p-2.5 flex items-center gap-2.5 z-[2]">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/20 shrink-0 cursor-pointer" onClick={e => {
        e.stopPropagation();
        const pid = product.id || product.product_id;
        if (pid) navigate(`/products/${pid}`);
      }}>
            {product.image || product.thumbnail || product.images?.[0] ? <img src={product.image || product.thumbnail || product.images?.[0]} alt={product.name || product.title} className="w-full h-full object-cover" onError={e => {
          e.currentTarget.src = '';
          e.currentTarget.className = 'w-full h-full bg-white/20';
        }} /> : <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag size={16} className="text-white/50" />
              </div>}
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={e => {
        e.stopPropagation();
        const pid = product.id || product.product_id;
        if (pid) navigate(`/products/${pid}`);
      }}>
            <div className="text-[13px] font-semibold text-white font-sans truncate">
              {product.name || product.title}
            </div>
            {product.price != null && <div className="text-[12px] text-white/80 font-semibold font-sans">
                {formatPrice(product.price)}
              </div>}
          </div>
          <button className="bg-white text-stone-950 text-[12px] font-bold font-sans py-2 px-4 rounded-full border-none cursor-pointer shrink-0 hover:bg-stone-100 active:bg-stone-200 transition-colors disabled:opacity-50 flex items-center gap-1.5" onClick={e => {
        e.stopPropagation();
        handleAddToCart(product);
      }} disabled={addingToCart === (product.product_id || product.id)} aria-label={`Añadir ${product.name || product.title || 'producto'} al carrito`}>
            <Plus size={14} strokeWidth={2.5} />
            {addingToCart === (product.product_id || product.id) ? 'Añadiendo…' : i18n.t('common.add', 'Añadir')}
          </button>
        </div>}

      {/* Comments bottom sheet */}
      <BottomSheet isOpen={showComments} onClose={closeComments} maxHeight="60vh" className="!bg-stone-950/95 backdrop-blur-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
            <span className="text-sm font-semibold text-white">Comentarios</span>
            <button onClick={closeComments} className="bg-transparent border-none cursor-pointer p-1 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Cerrar">
              <XIcon size={18} className="text-white/60" />
            </button>
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[100px]">
            {commentsLoading ? <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div> : comments.length === 0 ? <p className="text-center text-white/40 text-sm py-8">{i18n.t('post_detail.seElPrimeroEnComentar', 'Sé el primero en comentar')}</p> : comments.slice(0, commentsPage * COMMENTS_PER_PAGE).map((c, i) => {
            const cId = c.comment_id || c.id || c._id;
            const cName = c.user?.name || c.user_name || c.username || 'Usuario';
            const isOwn = currentUser?.user_id === c.user_id;
            return <div key={cId || i} className="flex gap-2.5 py-2.5 group">
                    <div className="w-8 h-8 rounded-full bg-white/20 shrink-0 flex items-center justify-center text-white text-[10px] font-semibold overflow-hidden">
                      {c.user?.avatar_url || c.user_profile_image || c.avatar_url ? <img src={c.user?.avatar_url || c.user_profile_image || c.avatar_url} alt="" className="w-full h-full object-cover" /> : cName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white/90 leading-[1.4]">
                        <span className="font-semibold text-white mr-1.5">{cName}</span>
                        {c.text || c.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-white/30">{c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short'
                    }) : ''}</span>
                        <button onClick={() => handleReplyComment(cId, cName)} className="bg-transparent border-none cursor-pointer px-2 py-1 text-[10px] text-white/40 font-semibold hover:text-white/70 min-h-[44px] flex items-center" aria-label="Responder comentario">
                          Responder
                        </button>
                        {isOwn && <button onClick={() => handleDeleteComment(cId)} className="bg-transparent border-none cursor-pointer p-1 min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Eliminar comentario">
                            <Trash2 size={12} className="text-white/30 hover:text-white/60" />
                          </button>}
                      </div>
                    </div>
                    {/* Comment like — right side */}
                    <div className="flex flex-col items-center justify-start pt-1 shrink-0">
                      <button onClick={() => handleLikeComment(cId)} className="bg-transparent border-none cursor-pointer p-0 flex flex-col items-center gap-0.5" aria-label={likedComments.has(cId) ? 'Quitar me gusta del comentario' : 'Me gusta en comentario'}>
                        <Heart size={14} fill={likedComments.has(cId) ? 'white' : 'none'} className={likedComments.has(cId) ? 'text-white' : 'text-white/40'} strokeWidth={1.8} />
                        {(c.likes_count || 0) > 0 && <span className="text-[10px] text-white/40 leading-none">{c.likes_count}</span>}
                      </button>
                    </div>
                  </div>;
          })}
            {!commentsLoading && comments.length > commentsPage * COMMENTS_PER_PAGE && <button onClick={() => setCommentsPage(p => p + 1)} className="w-full py-2.5 text-center text-xs font-semibold text-white/50 hover:text-white/80 bg-transparent border-none cursor-pointer transition-colors">
                Ver más comentarios ({comments.length - commentsPage * COMMENTS_PER_PAGE} restantes)
              </button>}
          </div>
          {/* Emoji quick-react row — Instagram style */}
          <div className="flex items-center justify-between px-6 py-2.5 border-t border-white/10 shrink-0">
            {['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'].map(emoji => <button key={emoji} onClick={() => {
            setNewComment(prev => prev + emoji);
          }} className="text-[24px] leading-none bg-transparent border-none cursor-pointer p-1 active:scale-125 transition-transform min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={`Añadir ${emoji}`}>
                {emoji}
              </button>)}
          </div>
          {/* Reply-to context banner */}
          {replyTo && <div className="mx-4 mt-2 mb-1 shrink-0">
              <div className="flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
                <span className="text-xs text-white/60">Respondiendo a <span className="font-semibold text-white/80">@{replyTo.username}</span></span>
                <button onClick={() => {
              setReplyTo(null);
              setNewComment('');
            }} className="w-6 h-6 rounded-full bg-transparent hover:bg-white/10 border-none cursor-pointer flex items-center justify-center transition-colors" aria-label="Cancelar respuesta">
                  <XIcon size={12} className="text-white/50" />
                </button>
              </div>
            </div>}
          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 shrink-0">
            {/* Current user avatar */}
            {currentUser?.avatar_url && <img src={currentUser.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />}
            <div className="relative flex-1">
              {reelAutocomplete.isOpen && reelAutocomplete.trigger?.trigger === '@' && <MentionDropdown suggestions={reelAutocomplete.suggestions} activeIndex={reelAutocomplete.activeIndex} onSelect={u => reelAutocomplete.selectSuggestion(u)} />}
              <input ref={commentInputRef} value={newComment} onChange={e => reelAutocomplete.handleChange(e)} onSelect={e => reelAutocomplete.handleSelect(e)} onKeyDown={e => {
              if (reelAutocomplete.isOpen) {
                reelAutocomplete.handleKeyDown(e);
                if (e.defaultPrevented) return;
              }
              if (e.key === 'Enter') submitComment();
            }} placeholder={i18n.t('reel.uneteALaConversacion', 'Únete a la conversación...')} className="w-full bg-white/10 text-white border-none rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-white/30 font-sans" aria-label="Escribir comentario" />
            </div>
            <button onClick={submitComment} disabled={!newComment.trim() || sendingComment} className={`w-11 h-11 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors ${newComment.trim() ? 'bg-white text-stone-950' : 'bg-white/10 text-white/30'}`} aria-label="Enviar comentario">
              <Send size={16} />
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Multi-product expandable sheet */}
      <AnimatePresence>
        {showProductSheet && <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: 20
      }} transition={{
        type: 'spring',
        damping: 25,
        stiffness: 300
      }} className="absolute bottom-20 left-3 right-3 z-[4] bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg max-h-[40vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-stone-950">Productos ({allProducts.length})</span>
              <button onClick={() => setShowProductSheet(false)} className="bg-transparent border-none cursor-pointer p-1 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Cerrar">
                <XIcon size={16} className="text-stone-400" />
              </button>
            </div>
            {allProducts.map((p, i) => {
          const pid = p.product_id || p.id;
          const pImg = p.image || p.thumbnail || p.images?.[0];
          return <div key={pid || i} className="flex items-center gap-2.5 py-2 border-b border-stone-200/50 last:border-b-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 shrink-0 cursor-pointer" onClick={() => {
              setShowProductSheet(false);
              if (pid) navigate(`/products/${pid}`);
            }}>
                    {pImg ? <img src={pImg} alt={p.name || p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={16} className="text-stone-300" />
                      </div>}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => {
              setShowProductSheet(false);
              if (pid) navigate(`/products/${pid}`);
            }}>
                    <p className="text-sm font-semibold text-stone-950 truncate max-w-[140px]">{p.name || p.title}</p>
                    {p.price != null && <p className="text-base font-bold text-stone-950 mt-0.5">{formatPrice(p.price)}</p>}
                  </div>
                  <button className="flex items-center gap-1.5 bg-stone-950 text-white text-sm font-bold py-2 px-4 rounded-full border-none cursor-pointer shrink-0 hover:bg-stone-800 active:bg-stone-700 transition-colors disabled:opacity-50" onClick={e => {
              e.stopPropagation();
              handleAddToCart(p);
            }} disabled={addingToCart === pid} aria-label={`Añadir ${p.name || p.title || 'producto'} al carrito`}>
                    <Plus size={14} strokeWidth={2.5} />
                    {addingToCart === pid ? '…' : i18n.t('common.add', 'Añadir')}
                  </button>
                </div>;
        })}
          </motion.div>}
      </AnimatePresence>

      {/* Progress bar — thin Instagram-style with touch scrubbing */}
      <div className={`group absolute bottom-0 left-0 right-0 bg-white/20 z-[3] cursor-pointer transition-[height] duration-150 ${scrubbing ? 'h-[6px]' : 'h-[3px]'}`} onClick={e => {
      const video = videoRef.current;
      if (!video || !video.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      video.currentTime = ratio * video.duration;
      setProgress(ratio);
    }} onTouchStart={e => {
      setScrubbing(true);
      const video = videoRef.current;
      if (!video || !video.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
      video.currentTime = ratio * video.duration;
      setProgress(ratio);
    }} onTouchMove={e => {
      const video = videoRef.current;
      if (!video || !video.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
      video.currentTime = ratio * video.duration;
      setProgress(ratio);
    }} onTouchEnd={() => setScrubbing(false)} role="slider" aria-label={i18n.t('reel.progresoDelVideo', 'Progreso del vídeo')} aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full w-full bg-white/90 origin-left" style={{
        transform: `scaleX(${Math.min(1, progress)})`
      }} />
        {/* Progress thumb — shows on interaction */}
        <div className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-sm transition-opacity ${scrubbing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} style={{
        left: `${progress * 100}%`
      }} />
      </div>
    </div>;
}
const areReelPropsEqual = (prev, next) => {
  return prev.reel?.id === next.reel?.id && prev.isActive === next.isActive && prev.reel?.liked === next.reel?.liked && prev.reel?.is_liked === next.reel?.is_liked && prev.reel?.likes_count === next.reel?.likes_count && prev.reel?.comments_count === next.reel?.comments_count && prev.reel?.saved === next.reel?.saved && prev.reel?.is_saved === next.reel?.is_saved && prev.embedded === next.embedded && prev.priority === next.priority && prev.onLike === next.onLike && prev.onComment === next.onComment && prev.onShare === next.onShare && prev.onExpand === next.onExpand && prev.nextVideoUrl === next.nextVideoUrl;
};
export default React.memo(ReelCardInner, areReelPropsEqual);