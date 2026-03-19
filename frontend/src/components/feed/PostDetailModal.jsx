import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, Share2, Bookmark, Send, Trash2, Loader2, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { timeAgo } from '../../utils/time';

/* ── Single comment row (memoized) ── */
const CommentRow = memo(function CommentRow({ comment, isOwner, onDelete, onLike, liked, onReply }) {
  const avatar = comment.user_profile_image || comment.avatar || comment.avatar_url;
  const name = comment.user_name || comment.username || 'Usuario';
  const text = comment.text || comment.content || '';

  return (
    <div className="flex gap-3 py-2.5 group">
      <Link to={`/${comment.username || comment.user_id}`} className="shrink-0">
        {avatar ? (
          <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] leading-relaxed text-stone-950">
          <Link to={`/${comment.username || comment.user_id}`} className="font-semibold no-underline text-stone-950 hover:underline mr-1.5">
            {name}
          </Link>
          {text}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[11px] text-stone-400">{timeAgo(comment.created_at)}</span>
          <button
            onClick={() => onLike(comment.comment_id || comment.id)}
            className="bg-transparent border-none cursor-pointer p-0 flex items-center gap-1 min-h-[32px]"
          >
            <Heart
              size={12}
              className={liked ? 'text-[#FF3040] fill-[#FF3040]' : 'text-stone-400'}
              strokeWidth={1.8}
            />
            {(comment.likes_count || 0) > 0 && (
              <span className="text-[11px] text-stone-400">{comment.likes_count}</span>
            )}
          </button>
          <button
            onClick={() => onReply?.(comment.comment_id || comment.id, comment.username || comment.user_name || name)}
            className="bg-transparent border-none cursor-pointer p-0 text-[11px] text-stone-400 font-semibold hover:text-stone-600 min-h-[32px] flex items-center"
          >
            Responder
          </button>
          {isOwner && (
            <button
              onClick={() => onDelete(comment.comment_id || comment.id)}
              className="bg-transparent border-none cursor-pointer p-0 min-h-[32px] flex items-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={12} className="text-stone-400 hover:text-stone-700" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

/* ── Render caption with clickable hashtags and @mentions ── */
function renderCaption(text, navigate, onClose) {
  if (!text) return null;
  const parts = text.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span key={i} className="text-stone-500 font-medium cursor-pointer hover:underline"
          onClick={() => { onClose?.(); navigate?.(`/explore?tag=${encodeURIComponent(part.slice(1))}`); }}
        >{part}</span>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-stone-500 font-medium cursor-pointer hover:underline"
          onClick={() => { onClose?.(); navigate?.(`/${part.slice(1)}`); }}
        >{part}</span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/* ── Image carousel — exposes currentIndex via onIndexChange ── */
const ModalCarousel = memo(function ModalCarousel({ images, userName, className, style, onDoubleTap, onIndexChange }) {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef(null);
  const hasMultiple = images.length > 1;

  const goTo = useCallback((i) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    setIdx(i);
    onIndexChange?.(i);
  }, [onIndexChange]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    setIdx(next);
    onIndexChange?.(next);
  }, [onIndexChange]);

  if (!images.length) return <div className={`bg-stone-100 ${className || ''}`} style={style} />;

  return (
    <div
      className={`relative bg-black flex items-center justify-center overflow-hidden ${className || ''}`}
      style={style}
      onDoubleClick={onDoubleTap}
    >
      <div
        ref={scrollRef}
        className={`w-full h-full scrollbar-hide flex ${hasMultiple ? 'snap-x snap-mandatory overflow-x-auto' : 'overflow-hidden'}`}
        onScroll={handleScroll}
      >
        {images.map((src, i) => (
          <div key={typeof src === 'string' ? src : i} className="min-w-full snap-start flex items-center justify-center h-full">
            <img
              src={src}
              alt={`${userName} imagen ${i + 1}`}
              className="w-full h-full object-contain"
              loading={i === 0 ? 'eager' : 'lazy'}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Arrows — desktop only, show on hover via group */}
      {hasMultiple && idx > 0 && (
        <button onClick={() => goTo(idx - 1)} className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white border-none cursor-pointer items-center justify-center shadow-sm z-[2] transition-colors" aria-label="Anterior">
          <ChevronLeft size={18} className="text-stone-950" />
        </button>
      )}
      {hasMultiple && idx < images.length - 1 && (
        <button onClick={() => goTo(idx + 1)} className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 hover:bg-white border-none cursor-pointer items-center justify-center shadow-sm z-[2] transition-colors" aria-label="Siguiente">
          <ChevronRight size={18} className="text-stone-950" />
        </button>
      )}

      {/* Counter badge — mobile only */}
      {hasMultiple && (
        <div className="md:hidden absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-0.5 z-[3]">
          <span className="text-[11px] text-white font-semibold tabular-nums">{idx + 1}/{images.length}</span>
        </div>
      )}

      {/* Dot indicators — desktop, stone palette per spec I5 */}
      {hasMultiple && (
        <div className="hidden md:flex absolute bottom-3 left-1/2 -translate-x-1/2 gap-1 z-[2]">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Imagen ${i + 1}`}
              className="border-none cursor-pointer p-0 rounded-full transition-all duration-200"
              style={{
                width: i === idx ? 7 : 6,
                height: i === idx ? 7 : 6,
                background: i === idx ? '#0c0a09' : 'rgba(255,255,255,0.55)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

/* ── Comments panel (shared between desktop and mobile) ── */
function CommentsPanel({ post, comments, commentsLoading, user, onDelete, onLike, likedComments, onReply, onClose, navigate }) {
  const userObj = post?.user || {};
  const avatarUrl = userObj.avatar_url || userObj.avatar || userObj.profile_image || post?.user_profile_image;
  const userName = userObj.name || post?.user_name || 'Usuario';

  return (
    <>
      {/* Caption as first "comment" */}
      {(post.caption || post.content) && (
        <div className="flex gap-3 py-2.5">
          <Link to={`/${userObj.username || userObj.id || post.user_id}`} onClick={onClose} className="shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-stone-100" />
            )}
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-relaxed text-stone-950">
              <Link to={`/${userObj.username || userObj.id || post.user_id}`} onClick={onClose} className="font-semibold no-underline text-stone-950 hover:underline mr-1.5">
                {userName}
              </Link>
              {renderCaption(post.caption || post.content, navigate, onClose)}
            </p>
            <span className="text-[11px] text-stone-400 mt-0.5 block">{timeAgo(post.created_at)}</span>
          </div>
        </div>
      )}

      {/* Comments */}
      {commentsLoading ? (
        <div className="space-y-3 py-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-stone-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 bg-stone-100 rounded" />
                <div className="h-3 w-full bg-stone-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[14px] font-semibold text-stone-950">Sin comentarios aún</p>
          <p className="text-[12px] text-stone-400 mt-1">Sé el primero en comentar</p>
        </div>
      ) : (
        comments.map(comment => (
          <CommentRow
            key={comment.comment_id || comment.id || comment._id}
            comment={comment}
            isOwner={user?.user_id === comment.user_id}
            onDelete={onDelete}
            onLike={onLike}
            liked={likedComments.has(comment.comment_id || comment.id)}
            onReply={onReply}
          />
        ))
      )}
    </>
  );
}

/* ── Comment input bar ── */
function CommentInput({ isAuthenticated, user, replyTo, setReplyTo, newComment, setNewComment, sending, onSend, inputRef }) {
  if (!isAuthenticated) return null;
  return (
    <div className="border-t border-stone-100 bg-white">
      {replyTo && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-stone-50 text-[12px] text-stone-500">
          <span>Respondiendo a <span className="font-semibold text-stone-700">@{replyTo.username}</span></span>
          <button onClick={() => { setReplyTo(null); setNewComment(''); }} className="bg-transparent border-none cursor-pointer p-0">
            <X size={14} className="text-stone-400" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-3">
        {(user?.avatar_url || user?.avatar || user?.profile_image) ? (
          <img src={user.avatar_url || user.avatar || user.profile_image} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500 shrink-0">
            {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <input
          ref={inputRef}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Añade un comentario..."
          className="flex-1 bg-transparent border-none outline-none text-[13px] text-stone-950 placeholder:text-stone-400 font-sans min-h-[36px]"
          disabled={sending}
        />
        <button
          onClick={onSend}
          disabled={!newComment.trim() || sending}
          className="flex items-center justify-center bg-transparent border-none cursor-pointer disabled:opacity-30 transition-opacity px-1"
        >
          {sending ? (
            <Loader2 size={16} className="text-stone-400 animate-spin" />
          ) : (
            <span className="text-[13px] font-semibold text-stone-950">Enviar</span>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Double-tap heart overlay (I4) ── */
function DoubleTapHeart({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 1.3, 1.1], opacity: [1, 1, 0] }}
            transition={{ duration: 0.6, times: [0, 0.5, 1] }}
          >
            <Heart size={90} className="text-white fill-white drop-shadow-xl" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Main Modal ── */
export default function PostDetailModal({ postId, post: initialPost, onClose }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [post, setPost] = useState(initialPost || null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [likedComments, setLikedComments] = useState(new Set());
  const [replyTo, setReplyTo] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // I4 — double-tap heart
  const [showHeart, setShowHeart] = useState(false);
  const lastTapRef = useRef(0);
  const heartTimerRef = useRef(null);

  const inputRef = useRef(null);

  useEffect(() => {
    if (initialPost) return;
    let active = true;
    apiClient.get(`/posts/${postId}`)
      .then((data) => { if (active) setPost(data?.post || data); })
      .catch(() => { if (active) { toast.error('Post no encontrado'); onClose(); } });
    return () => { active = false; };
  }, [postId, initialPost, onClose]);

  useEffect(() => {
    if (!post) return;
    setLiked(post.liked ?? post.is_liked ?? false);
    setLikesCount(post.likes ?? post.likes_count ?? 0);
    setSaved(post.saved ?? post.is_saved ?? false);
  }, [post]);

  const fetchComments = useCallback(() => {
    if (!postId) return;
    setCommentsLoading(true);
    apiClient.get(`/posts/${postId}/comments?limit=50`)
      .then((data) => setComments(Array.isArray(data) ? data : data?.comments || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [postId]);

  useEffect(() => { if (post) fetchComments(); }, [post, fetchComments]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Cleanup heart timer on unmount
  useEffect(() => {
    return () => { if (heartTimerRef.current) clearTimeout(heartTimerRef.current); };
  }, []);

  const handleSend = async () => {
    const text = newComment.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const payload = { text };
      if (replyTo) payload.reply_to = replyTo.commentId;
      const comment = await apiClient.post(`/posts/${postId}/comments`, payload);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setReplyTo(null);
      setPost(prev => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
    } catch {
      toast.error('Error al enviar');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await apiClient.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => (c.comment_id || c.id) !== commentId));
      setPost(prev => prev ? { ...prev, comments_count: Math.max(0, (prev.comments_count || 1) - 1) } : prev);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleLikeComment = async (commentId) => {
    setLikedComments(prev => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    try { await apiClient.post(`/comments/${commentId}/like`); } catch {}
  };

  const handleReply = useCallback((commentId, username) => {
    setReplyTo({ commentId, username });
    setNewComment(`@${username} `);
    inputRef.current?.focus();
  }, []);

  const handleLikePost = useCallback(async () => {
    setLiked(l => !l);
    setLikesCount(c => liked ? Math.max(0, c - 1) : c + 1);
    try { await apiClient.post(`/posts/${postId}/like`); } catch {
      setLiked(l => !l);
      setLikesCount(c => liked ? c + 1 : Math.max(0, c - 1));
    }
  }, [liked, postId]);

  // I4 — double-tap handler: fire like + show heart overlay
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double-tap detected
      if (!liked) {
        // Only fire like if not already liked
        handleLikePost();
      }
      // Always show heart overlay
      setShowHeart(true);
      if (heartTimerRef.current) clearTimeout(heartTimerRef.current);
      heartTimerRef.current = setTimeout(() => setShowHeart(false), 700);
    }
    lastTapRef.current = now;
  }, [liked, handleLikePost]);

  const handleSavePost = async () => {
    setSaved(s => !s);
    try { await apiClient.post(`/posts/${postId}/save`); } catch { setSaved(s => !s); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${postId}`;
    try {
      if (navigator.share) await navigator.share({ title: 'HispaloShop', url });
      else { await navigator.clipboard?.writeText(url); toast.success('Enlace copiado'); }
    } catch {}
  };

  const images = (() => {
    if (Array.isArray(post?.media) && post.media.length > 0) return post.media.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
    if (Array.isArray(post?.images) && post.images.length > 0) return post.images;
    if (post?.image_url) return [post.image_url];
    return [];
  })();

  const userObj = post?.user || {};
  const avatarUrl = userObj.avatar_url || userObj.avatar || userObj.profile_image || post?.user_profile_image;
  const userName = userObj.name || post?.user_name || 'Usuario';
  const commentsCount = post?.comments_count ?? comments.length;

  // Swipe-to-close on mobile
  const [swipeY, setSwipeY] = useState(0);
  const touchStartRef = useRef(null);
  const handleTouchStart = useCallback((e) => { touchStartRef.current = { y: e.touches[0].clientY }; }, []);
  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (dy > 0) setSwipeY(dy);
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (swipeY > 120) onClose();
    setSwipeY(0);
    touchStartRef.current = null;
  }, [swipeY, onClose]);

  if (!post) return null;

  const commentInputProps = {
    isAuthenticated, user, replyTo, setReplyTo, newComment, setNewComment, sending, onSend: handleSend, inputRef
  };

  // Carousel props shared between mobile + desktop
  const carouselProps = {
    images,
    userName,
    onDoubleTap: handleDoubleTap,
    onIndexChange: setCurrentImageIndex,
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Close — desktop */}
        <button
          onClick={onClose}
          className="hidden md:flex absolute top-4 right-4 z-[102] items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 transition-colors border-none cursor-pointer"
          aria-label="Cerrar"
        >
          <X size={20} className="text-white" />
        </button>

        {/* ═══ MOBILE LAYOUT (<768px) — Full screen like Instagram app ═══ */}
        <motion.div
          className="md:hidden relative z-[101] flex flex-col bg-white w-full h-full"
          style={{ transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined, opacity: swipeY > 0 ? Math.max(0.5, 1 - swipeY / 300) : 1 }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 shrink-0 border-b border-stone-100 h-12" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1 flex items-center -ml-1" aria-label="Volver">
              <ChevronLeft size={24} className="text-stone-950" />
            </button>
            <span className="text-[15px] font-semibold text-stone-950 tracking-tight">Publicación</span>
            <button className="bg-transparent border-none cursor-pointer p-1 -mr-1" aria-label="Más opciones">
              <MoreHorizontal size={22} className="text-stone-950" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-y-contain">
            {/* Post header */}
            <div className="flex items-center gap-2.5 px-4 py-3">
              <Link to={`/${userObj.username || userObj.id || post.user_id}`} onClick={onClose} className="shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/${userObj.username || userObj.id || post.user_id}`} onClick={onClose} className="text-[13px] font-semibold text-stone-950 no-underline hover:underline">
                  {userName}
                </Link>
                {post.location && <p className="text-[11px] text-stone-400 truncate">{post.location}</p>}
              </div>
            </div>

            {/* Image — with double-tap heart overlay */}
            <div className="relative w-full aspect-square">
              <ModalCarousel {...carouselProps} className="w-full h-full" />
              <DoubleTapHeart visible={showHeart} />
            </div>

            {/* Dot indicators — mobile, stone palette (I5) */}
            {images.length > 1 && (
              <div className="flex items-center justify-center gap-1 py-2">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`block rounded-full transition-all duration-200 ${i === currentImageIndex ? 'w-1.5 h-1.5 bg-stone-950' : 'w-1.5 h-1.5 bg-stone-300'}`}
                  />
                ))}
              </div>
            )}

            {/* Actions row */}
            <div className="flex items-center px-3 py-2">
              <div className="flex items-center gap-3">
                <button onClick={handleLikePost} className={`bg-transparent border-none cursor-pointer p-1.5 active:scale-110 transition-transform ${liked ? 'text-[#FF3040]' : 'text-stone-950'}`} aria-label="Me gusta">
                  <Heart size={24} fill={liked ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => inputRef.current?.focus()} className="bg-transparent border-none cursor-pointer p-1.5 text-stone-950" aria-label="Comentar">
                  <MessageCircle size={24} />
                </button>
                <button onClick={handleShare} className="bg-transparent border-none cursor-pointer p-1.5 text-stone-950" aria-label="Compartir">
                  <Share2 size={24} />
                </button>
              </div>
              <button onClick={handleSavePost} className="ml-auto bg-transparent border-none cursor-pointer p-1.5 text-stone-950" aria-label={saved ? 'Quitar guardado' : 'Guardar'}>
                <Bookmark size={24} fill={saved ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Likes count */}
            {likesCount > 0 && (
              <p className="px-4 pb-1 text-[13px] font-semibold text-stone-950">
                {likesCount.toLocaleString()} Me gusta
              </p>
            )}

            {/* Caption + Comments inline */}
            <div className="px-4 pb-4">
              <CommentsPanel
                post={post} comments={comments} commentsLoading={commentsLoading}
                user={user} onDelete={handleDelete} onLike={handleLikeComment}
                likedComments={likedComments} onReply={handleReply}
                onClose={onClose} navigate={navigate}
              />
            </div>
          </div>

          {/* Sticky comment input */}
          <div className="shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <CommentInput {...commentInputProps} />
          </div>
        </motion.div>

        {/* ═══ DESKTOP LAYOUT (>=768px / md) — Instagram Web side-by-side ═══ */}
        {/* I1: split layout ~55% left / ~45% right, max-w-4xl, 85vh */}
        <motion.div
          className="hidden md:flex relative z-[101] bg-white rounded-xl overflow-hidden shadow-2xl w-full"
          style={{ maxWidth: 'min(960px, 90vw)', maxHeight: '85vh', height: '85vh' }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* I1 Left pane: media, black bg, object-contain, ~55% */}
          <div className="relative bg-stone-950 flex items-center justify-center" style={{ width: '55%', flexShrink: 0 }}>
            <ModalCarousel {...carouselProps} className="w-full h-full" />
            {/* I4 — Double-tap heart overlay on desktop too */}
            <DoubleTapHeart visible={showHeart} />
          </div>

          {/* I1 Right pane: white, ~45%, flex-col */}
          <div className="flex flex-col" style={{ width: '45%' }}>
            {/* I2 — Header in right pane at TOP (desktop) */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100 shrink-0">
              <Link to={`/${userObj.username || userObj.id || post.user_id}`} onClick={onClose} className="shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-600">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/${userObj.username || userObj.id || post.user_id}`} onClick={onClose} className="text-[13px] font-semibold text-stone-950 no-underline hover:underline">
                  {userName}
                </Link>
                {post.location && <p className="text-[11px] text-stone-400 truncate">{post.location}</p>}
              </div>
              <button className="bg-transparent border-none cursor-pointer p-1" aria-label="Más opciones">
                <MoreHorizontal size={20} className="text-stone-950" />
              </button>
            </div>

            {/* I3 — Comments area: flex-1 + overflow-y-auto so it scrolls independently */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              <CommentsPanel
                post={post} comments={comments} commentsLoading={commentsLoading}
                user={user} onDelete={handleDelete} onLike={handleLikeComment}
                likedComments={likedComments} onReply={handleReply}
                onClose={onClose} navigate={navigate}
              />
            </div>

            {/* Actions + engagement */}
            <div className="border-t border-stone-100 shrink-0">
              <div className="flex items-center px-3 py-2">
                <div className="flex items-center gap-3">
                  <button onClick={handleLikePost} className={`bg-transparent border-none cursor-pointer p-1.5 active:scale-110 transition-transform ${liked ? 'text-[#FF3040]' : 'text-stone-950'}`}>
                    <Heart size={22} fill={liked ? 'currentColor' : 'none'} />
                  </button>
                  <button onClick={() => inputRef.current?.focus()} className="bg-transparent border-none cursor-pointer p-1.5 text-stone-950">
                    <MessageCircle size={22} />
                  </button>
                  <button onClick={handleShare} className="bg-transparent border-none cursor-pointer p-1.5 text-stone-950">
                    <Share2 size={22} />
                  </button>
                </div>
                <button onClick={handleSavePost} className="ml-auto bg-transparent border-none cursor-pointer p-1.5 text-stone-950">
                  <Bookmark size={22} fill={saved ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="px-4 pb-2">
                <p className="text-[13px] font-semibold text-stone-950">{likesCount.toLocaleString()} Me gusta</p>
                <p className="text-[11px] text-stone-400 mt-0.5">{timeAgo(post.created_at)}</p>
              </div>
            </div>

            {/* I3 — Comment input pinned to bottom of right pane */}
            <div className="shrink-0">
              <CommentInput {...commentInputProps} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
