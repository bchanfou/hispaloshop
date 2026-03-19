import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, Send, Trash2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { timeAgo } from '../../utils/time';

/* ── Single comment row (memoized) ── */
const CommentRow = memo(function CommentRow({ comment, isOwner, onDelete, onLike, liked, onReply }) {
  const avatar = comment.user_profile_image || comment.avatar;
  const name = comment.user_name || comment.username || 'Usuario';
  const text = comment.text || comment.content || '';

  return (
    <div className="flex gap-3 py-2.5 group">
      <Link to={`/${comment.username || comment.user_id}`} className="flex-shrink-0">
        {avatar ? (
          <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">
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
            className="bg-transparent border-none cursor-pointer p-0 flex items-center gap-1"
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
            className="bg-transparent border-none cursor-pointer p-0 text-[11px] text-stone-400 font-semibold hover:text-stone-600"
          >
            Responder
          </button>
          {isOwner && (
            <button
              onClick={() => onDelete(comment.comment_id || comment.id)}
              className="bg-transparent border-none cursor-pointer p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
function renderCaptionModal(text, navigate, onCloseModal) {
  if (!text) return null;
  const parts = text.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span
          key={i}
          className="text-[#2E7D52] font-medium cursor-pointer hover:underline"
          onClick={() => { onCloseModal?.(); navigate?.(`/explore?tag=${encodeURIComponent(part.slice(1))}`); }}
        >{part}</span>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="text-[#2E7D52] font-medium cursor-pointer hover:underline"
          onClick={() => { onCloseModal?.(); navigate?.(`/${part.slice(1)}`); }}
        >{part}</span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/* ── Image carousel for modal ── */
const ModalCarousel = memo(function ModalCarousel({ images, userName }) {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef(null);
  const hasMultiple = images.length > 1;

  const goTo = useCallback((i) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    setIdx(i);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const newIdx = Math.round(el.scrollLeft / el.clientWidth);
    setIdx(newIdx);
  }, []);

  if (!images.length) return <div className="flex-shrink-0 bg-stone-100" style={{ width: '55%', minHeight: 400 }} />;

  return (
    <div className="flex-shrink-0 relative bg-black flex items-center justify-center" style={{ width: '55%', minHeight: 400 }}>
      <div
        ref={scrollRef}
        className={`w-full h-full scrollbar-hide flex ${hasMultiple ? 'snap-x snap-mandatory overflow-x-auto' : 'overflow-hidden'}`}
        onScroll={handleScroll}
        style={{ maxHeight: 'min(700px, 85vh)' }}
      >
        {images.map((src, i) => (
          <div key={typeof src === 'string' ? src : i} className="min-w-full snap-start flex items-center justify-center h-full">
            <img
              src={src}
              alt={`${userName} imagen ${i + 1}`}
              className="w-full h-full object-contain"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      {hasMultiple && idx > 0 && (
        <button
          onClick={() => goTo(idx - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border-none cursor-pointer flex items-center justify-center shadow-sm z-[2] hover:bg-white transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft size={18} className="text-stone-950" />
        </button>
      )}
      {hasMultiple && idx < images.length - 1 && (
        <button
          onClick={() => goTo(idx + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 border-none cursor-pointer flex items-center justify-center shadow-sm z-[2] hover:bg-white transition-colors"
          aria-label="Siguiente"
        >
          <ChevronRight size={18} className="text-stone-950" />
        </button>
      )}
      {hasMultiple && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-[2]">
          {images.map((_, i) => (
            <span
              key={i}
              className="block rounded-full transition-all duration-200"
              style={{
                width: i === idx ? 7 : 5,
                height: i === idx ? 7 : 5,
                background: i === idx ? '#ffffff' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

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
  const [replyTo, setReplyTo] = useState(null); // { commentId, username }
  const inputRef = useRef(null);

  // Fetch post if not provided
  useEffect(() => {
    if (initialPost) return;
    let active = true;
    apiClient.get(`/posts/${postId}`)
      .then((data) => { if (active) setPost(data?.post || data); })
      .catch(() => { if (active) { toast.error('Post no encontrado'); onClose(); } });
    return () => { active = false; };
  }, [postId, initialPost, onClose]);

  // Fetch comments
  const fetchComments = useCallback(() => {
    if (!postId) return;
    setCommentsLoading(true);
    apiClient.get(`/posts/${postId}/comments?limit=50`)
      .then((data) => setComments(Array.isArray(data) ? data : data?.comments || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [postId]);

  // Only fetch comments once we have a post (avoid fetching for undefined postId)
  useEffect(() => { if (post) fetchComments(); }, [post, fetchComments]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    try {
      await apiClient.post(`/comments/${commentId}/like`);
    } catch { /* optimistic, ignore */ }
  };

  const handleReply = useCallback((commentId, username) => {
    setReplyTo({ commentId, username });
    setNewComment(`@${username} `);
    inputRef.current?.focus();
  }, []);

  // Image(s) from post
  const images = (() => {
    if (Array.isArray(post?.media) && post.media.length > 0) return post.media.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
    if (Array.isArray(post?.images) && post.images.length > 0) return post.images;
    if (post?.image_url) return [post.image_url];
    return [];
  })();

  const userObj = post?.user || {};
  const avatarUrl = userObj.avatar_url || userObj.avatar || userObj.profile_image || post?.user_profile_image;
  const userName = userObj.name || post?.user_name || 'Usuario';

  // Swipe-to-close on mobile
  const [swipeY, setSwipeY] = useState(0);
  const touchStartRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = { y: e.touches[0].clientY, time: Date.now() };
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartRef.current) return;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    if (dy > 0) setSwipeY(dy);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeY > 120) {
      onClose();
    }
    setSwipeY(0);
    touchStartRef.current = null;
  }, [swipeY, onClose]);

  if (!post) return null;

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

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[101] flex items-center justify-center w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 transition-colors border-none cursor-pointer"
          aria-label="Cerrar"
        >
          <X size={20} className="text-white" />
        </button>

        {/* Modal content — Instagram Web style: image left, comments right */}
        <motion.div
          className="relative z-[101] flex bg-white rounded-xl overflow-hidden shadow-2xl"
          style={{ maxWidth: 'min(960px, 90vw)', maxHeight: 'min(700px, 85vh)', width: '100%', transform: swipeY > 0 ? `translateY(${swipeY}px)` : undefined, opacity: swipeY > 0 ? Math.max(0.5, 1 - swipeY / 300) : 1 }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Left: Image carousel */}
          <ModalCarousel images={images} userName={userName} />

          {/* Right: Header + Comments + Input */}
          <div className="flex flex-col flex-1 min-w-0" style={{ width: '45%' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
              <Link to={`/${userObj.username || userObj.id || post.user_id}`} onClick={onClose} className="flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="min-w-0">
                <Link
                  to={`/${userObj.username || userObj.id || post.user_id}`}
                  onClick={onClose}
                  className="text-[13px] font-semibold text-stone-950 no-underline hover:underline"
                >
                  {userName}
                </Link>
                {post.location && (
                  <p className="text-[11px] text-stone-400 truncate">{post.location}</p>
                )}
              </div>
            </div>

            {/* Caption + Comments */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              {/* Caption as first "comment" */}
              {(post.caption || post.content) && (
                <div className="flex gap-3 py-2 mb-2">
                  <Link to={`/${userObj.username || userObj.id || post.user_id}`} onClick={onClose} className="flex-shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-stone-200" />
                    )}
                  </Link>
                  <div>
                    <p className="text-[13px] leading-relaxed text-stone-950">
                      <span className="font-semibold mr-1.5">{userName}</span>
                      {renderCaptionModal(post.caption || post.content, navigate, onClose)}
                    </p>
                    <span className="text-[11px] text-stone-400">{timeAgo(post.created_at)}</span>
                  </div>
                </div>
              )}

              {/* Comments */}
              {commentsLoading ? (
                <div className="space-y-3 py-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="h-8 w-8 rounded-full bg-stone-100 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-24 bg-stone-100 rounded" />
                        <div className="h-3 w-full bg-stone-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-[14px] font-semibold text-stone-950">Sin comentarios aún</p>
                  <p className="text-[12px] text-stone-400 mt-1">Sé el primero en comentar</p>
                </div>
              ) : (
                comments.map(comment => (
                  <CommentRow
                    key={comment.comment_id || comment.id || comment._id}
                    comment={comment}
                    isOwner={user?.user_id === comment.user_id}
                    onDelete={handleDelete}
                    onLike={handleLikeComment}
                    liked={likedComments.has(comment.comment_id || comment.id)}
                    onReply={handleReply}
                  />
                ))
              )}
            </div>

            {/* Engagement stats */}
            <div className="px-4 py-2 border-t border-stone-100">
              <p className="text-[13px] font-semibold text-stone-950">
                {(post.likes_count || 0).toLocaleString()} Me gusta
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">{timeAgo(post.created_at)}</p>
            </div>

            {/* Comment input */}
            {isAuthenticated && (
              <div className="border-t border-stone-100">
                {replyTo && (
                  <div className="flex items-center justify-between px-4 py-1.5 bg-stone-50 text-[12px] text-stone-500">
                    <span>Respondiendo a <span className="font-semibold text-stone-700">@{replyTo.username}</span></span>
                    <button onClick={() => { setReplyTo(null); setNewComment(''); }} className="bg-transparent border-none cursor-pointer p-0">
                      <X size={14} className="text-stone-400" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Current user avatar */}
                  {(user?.avatar_url || user?.avatar || user?.profile_image) ? (
                    <img src={user.avatar_url || user.avatar || user.profile_image} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500 flex-shrink-0">
                      {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <input
                    ref={inputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Añade un comentario..."
                    className="flex-1 bg-transparent border-none outline-none text-[13px] text-stone-950 placeholder:text-stone-400 font-sans"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newComment.trim() || sending}
                    className="flex items-center justify-center w-8 h-8 rounded-full bg-transparent border-none cursor-pointer disabled:opacity-30 transition-opacity"
                  >
                    {sending ? (
                      <Loader2 size={16} className="text-stone-400 animate-spin" />
                    ) : (
                      <Send size={16} className="text-[#2E7D52]" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
