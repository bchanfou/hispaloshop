// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Heart, MessageCircle, Share2, Bookmark, Send, Loader2, Trash2, MoreHorizontal, X, Pencil, Flag, UserMinus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { toast } from 'sonner';
import { timeAgo } from '../utils/time';
import BottomSheet from '../components/motion/BottomSheet';

/* ── Render caption with hashtags/mentions ── */
function renderCaption(text, navigate) {
  if (!text) return null;
  const parts = text.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return (
        <span key={i} className="text-stone-500 font-medium cursor-pointer hover:underline"
          onClick={() => navigate?.(`/explore?tag=${encodeURIComponent(part.slice(1))}`)}
        >{part}</span>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-stone-500 font-medium cursor-pointer hover:underline"
          onClick={() => navigate?.(`/${part.slice(1)}`)}
        >{part}</span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/* ── Image carousel ── */
function PostCarousel({ images, userName }) {
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef(null);
  const hasMultiple = images.length > 1;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setIdx(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  if (!images.length) return <div className="w-full aspect-square bg-stone-100" />;

  return (
    <div className="relative w-full bg-black">
      <div
        ref={scrollRef}
        className={`w-full aspect-square scrollbar-hide flex ${hasMultiple ? 'snap-x snap-mandatory overflow-x-auto' : 'overflow-hidden'}`}
        onScroll={handleScroll}
      >
        {images.map((src, i) => (
          <div key={typeof src === 'string' ? src : i} className="min-w-full snap-start flex items-center justify-center aspect-square">
            <img
              src={src}
              alt={`${userName} imagen ${i + 1}`}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      {hasMultiple && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-0.5 z-[2]">
          <span className="text-[11px] text-white font-semibold tabular-nums">{idx + 1}/{images.length}</span>
        </div>
      )}
      {hasMultiple && (
        <div className="flex justify-center gap-1.5 py-2 bg-white">
          {images.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-200 ${i === idx ? 'w-2 h-2 bg-stone-950' : 'w-1.5 h-1.5 bg-stone-300'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [likedComments, setLikedComments] = useState(new Set());
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditCaption, setShowEditCaption] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [localCaption, setLocalCaption] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let active = true;
    apiClient.get(`/posts/${postId}`)
      .then((data) => { if (active) setPost(data?.post || data); })
      .catch(() => { if (active) setPost(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId]);

  useEffect(() => {
    if (!post) return;
    setLiked(post.liked ?? post.is_liked ?? false);
    setLikesCount(post.likes ?? post.likes_count ?? 0);
    setSaved(post.saved ?? post.is_saved ?? false);
  }, [post]);

  const fetchComments = useCallback(() => {
    setCommentsLoading(true);
    apiClient.get(`/posts/${postId}/comments?limit=50`)
      .then((data) => setComments(Array.isArray(data) ? data : data?.comments || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [postId]);

  useEffect(() => { if (post) fetchComments(); }, [post, fetchComments]);

  const handleSendComment = async () => {
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
      toast.error('Error al enviar comentario');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await apiClient.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => (c.comment_id || c.id) !== commentId));
      setPost(prev => prev ? { ...prev, comments_count: Math.max(0, (prev.comments_count || 1) - 1) } : prev);
    } catch {
      toast.error('Error al eliminar comentario');
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

  const handleLikePost = async () => {
    setLiked(l => !l);
    setLikesCount(c => liked ? Math.max(0, c - 1) : c + 1);
    try { await apiClient.post(`/posts/${postId}/like`); } catch {
      setLiked(l => !l);
      setLikesCount(c => liked ? c + 1 : Math.max(0, c - 1));
    }
  };

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

  const handleReply = useCallback((commentId, username) => {
    setReplyTo({ commentId, username });
    setNewComment(`@${username} `);
    inputRef.current?.focus();
  }, []);

  const isOwner = user && post && (
    (user.user_id || user.id) === (post.user?.id || post.user?.user_id || post.user_id)
  );

  const handleEditSave = async () => {
    try {
      await apiClient.patch(`/posts/${postId}`, { caption: editCaption });
      setLocalCaption(editCaption);
      setShowEditCaption(false);
      toast.success('Publicación editada');
    } catch {
      toast.error('Error al editar');
    }
  };

  const handleDeletePost = async () => {
    setShowDeleteConfirm(false);
    try {
      await apiClient.delete(`/posts/${postId}`);
      toast.success('Post eliminado');
      navigate(-1);
    } catch {
      toast.error('Error al eliminar');
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-stone-100 animate-pulse" />
          <div className="flex-1"><div className="w-24 h-3 bg-stone-100 rounded animate-pulse" /></div>
        </div>
        {/* Image skeleton */}
        <div className="aspect-square bg-stone-100 animate-pulse" />
        {/* Actions skeleton */}
        <div className="flex gap-4 px-4 py-3">
          {[1,2,3,4].map(i => <div key={i} className="w-6 h-6 bg-stone-100 rounded animate-pulse" />)}
        </div>
        {/* Caption skeleton */}
        <div className="px-4 space-y-2">
          <div className="w-3/4 h-3 bg-stone-100 rounded animate-pulse" />
          <div className="w-1/2 h-3 bg-stone-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white">
        <p className="text-[15px] text-stone-500">Post no encontrado</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-stone-950 text-white rounded-full text-[13px] font-semibold border-none cursor-pointer"
        >
          Volver al feed
        </button>
      </div>
    );
  }

  const images = (() => {
    if (Array.isArray(post?.media) && post.media.length > 0) return post.media.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
    if (Array.isArray(post?.images) && post.images.length > 0) return post.images;
    if (post?.image_url) return [post.image_url];
    return [];
  })();

  const userObj = post?.user || {};
  const avatarUrl = userObj.avatar_url || userObj.avatar || userObj.profile_image || post?.user_profile_image;
  const userName = userObj.name || post?.user_name || 'Usuario';
  const commentsCount = post.comments_count ?? comments.length;

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-stone-100 h-12 flex items-center gap-3 px-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button onClick={() => navigate(-1)} aria-label="Volver" className="bg-transparent border-none cursor-pointer p-1 flex items-center -ml-1">
          <ChevronLeft size={24} className="text-stone-950" />
        </button>
        <span className="text-[15px] font-semibold text-stone-950 tracking-tight">Publicación</span>
      </header>

      {/* ── Post content ── */}
      <div className="max-w-[600px] mx-auto bg-white sm:mt-4 sm:rounded-2xl sm:shadow-sm sm:border sm:border-stone-100">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Link to={`/${userObj.username || userObj.id || post.user_id}`} className="shrink-0">
            {avatarUrl ? (
              <img loading="lazy" src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/${userObj.username || userObj.id || post.user_id}`} className="text-[13px] font-semibold text-stone-950 no-underline hover:underline">
              {userName}
            </Link>
            {post.location && <p className="text-[11px] text-stone-400 truncate">{post.location}</p>}
          </div>
          <button className="bg-transparent border-none cursor-pointer p-1 relative" aria-label="Más opciones" onClick={() => setShowMenu(v => !v)}>
            <MoreHorizontal size={20} className="text-stone-500" />
          </button>
        </div>

        <BottomSheet isOpen={showMenu} onClose={() => setShowMenu(false)}>
          <div className="px-5 pb-6 pt-2">
            {isOwner && (
              <>
                <button
                  className="flex items-center gap-3 w-full py-3.5 text-[15px] font-medium text-stone-950 bg-transparent border-none cursor-pointer"
                  onClick={() => { setEditCaption(localCaption ?? post.caption ?? post.content ?? ''); setShowEditCaption(true); setShowMenu(false); }}
                >
                  <Pencil size={20} /> Editar
                </button>
                <button
                  className="flex items-center gap-3 w-full py-3.5 text-[15px] font-medium text-stone-950 bg-transparent border-none cursor-pointer"
                  onClick={() => { setShowDeleteConfirm(true); setShowMenu(false); }}
                >
                  <Trash2 size={20} /> Eliminar
                </button>
              </>
            )}
            <button
              className="flex items-center gap-3 w-full py-3.5 text-[15px] font-medium text-stone-950 bg-transparent border-none cursor-pointer"
              onClick={() => {
                navigator.clipboard?.writeText(`${window.location.origin}/posts/${postId}`);
                toast.success('Enlace copiado');
                setShowMenu(false);
              }}
            >
              Copiar enlace
            </button>
            {!isOwner && (
              <button
                className="flex items-center gap-3 w-full py-3.5 text-[15px] font-medium text-stone-950 bg-transparent border-none cursor-pointer"
                onClick={async () => {
                  try {
                    await apiClient.post(`/posts/${postId}/report`, { reason: 'inappropriate' });
                    toast.success('Reporte enviado');
                  } catch { toast.error('Error al reportar'); }
                  setShowMenu(false);
                }}
              >
                <Flag size={20} /> Reportar
              </button>
            )}
          </div>
        </BottomSheet>

        {/* Image */}
        <PostCarousel images={images} userName={userName} />

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

        {/* Likes */}
        {likesCount > 0 && (
          <p className="px-4 pb-1 text-[13px] font-semibold text-stone-950">
            {likesCount.toLocaleString()} Me gusta
          </p>
        )}

        {/* Caption */}
        {(localCaption ?? post.caption ?? post.content) && (
          <div className="px-4 pb-2">
            <p className="text-[13px] leading-relaxed text-stone-950">
              <Link to={`/${userObj.username || userObj.id || post.user_id}`} className="font-semibold text-stone-950 no-underline hover:underline mr-1.5">
                {userName}
              </Link>
              {renderCaption(localCaption ?? post.caption ?? post.content, navigate)}
            </p>
          </div>
        )}

        {/* Time */}
        <p className="px-4 pb-3 text-[11px] text-stone-400">{timeAgo(post.created_at)}</p>
      </div>

      {/* ── Edit caption modal ── */}
      {showEditCaption && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setShowEditCaption(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-4 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-950">Editar publicación</span>
              <button className="bg-transparent border-none cursor-pointer p-1" onClick={() => setShowEditCaption(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <textarea
              value={editCaption}
              onChange={e => setEditCaption(e.target.value.slice(0, 2200))}
              className="w-full border border-stone-200 rounded-2xl px-3 py-2.5 text-sm font-sans resize-none outline-none focus:border-stone-400 min-h-[80px] box-border"
              aria-label="Editar descripción"
            />
            <p className="text-[11px] text-stone-400">La imagen no se puede cambiar tras publicar.</p>
            <button
              onClick={handleEditSave}
              className="w-full bg-stone-950 text-white border-none rounded-full py-3 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-5 flex flex-col gap-3 text-center" onClick={e => e.stopPropagation()}>
            <p className="text-base font-semibold text-stone-950">¿Eliminar este post?</p>
            <p className="text-sm text-stone-500">Se eliminará permanentemente junto con sus comentarios y likes. Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-stone-100 text-stone-950 border-none rounded-full py-3 text-sm font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePost}
                className="flex-1 bg-stone-950 text-white border-none rounded-full py-3 text-sm font-semibold cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comments section ── */}
      <div className="max-w-[600px] mx-auto mt-2 bg-white sm:rounded-2xl sm:shadow-sm sm:border sm:border-stone-100">
        {/* Label */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100">
          <span className="text-[12px] font-semibold text-stone-500 uppercase tracking-wider">Comentarios</span>
          {commentsCount > 0 && (
            <span className="text-[11px] font-bold text-white bg-stone-950 rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {commentsCount}
            </span>
          )}
        </div>

        {/* Comments list */}
        <div className="px-4">
          {commentsLoading ? (
            <div className="space-y-3 py-4">
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
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-[14px] font-semibold text-stone-950">Sin comentarios aún</p>
              <p className="text-[12px] text-stone-400 mt-1">Sé el primero en comentar</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-50">
              {comments.map(c => {
                const cId = c.comment_id || c.id;
                const isOwn = user?.user_id === c.user_id;
                const avatar = c.user_profile_image || c.avatar || c.avatar_url;
                const cName = c.user_name || c.username || 'usuario';

                return (
                  <div key={cId} className="flex gap-3 py-3 group">
                    <Link to={`/${c.username || c.user_id}`} className="shrink-0">
                      {avatar ? (
                        <img loading="lazy" src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">
                          {cName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] leading-relaxed text-stone-950">
                        <Link to={`/${c.username || c.user_id}`} className="font-semibold text-stone-950 no-underline hover:underline mr-1.5">
                          {cName}
                        </Link>
                        {c.user_id === post.user_id && (
                          <span className="text-[9px] font-bold text-white bg-stone-950 rounded-full px-1.5 py-0.5 mr-1.5 align-middle">Autor</span>
                        )}
                        {c.text || c.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-stone-400">{timeAgo(c.created_at)}</span>
                        <button
                          onClick={() => handleLikeComment(cId)}
                          className="bg-transparent border-none cursor-pointer p-0 flex items-center gap-1 min-h-[32px]"
                        >
                          <Heart size={12} className={likedComments.has(cId) ? 'text-[#FF3040] fill-[#FF3040]' : 'text-stone-400'} strokeWidth={1.8} />
                          {(c.likes_count || 0) > 0 && <span className="text-[11px] text-stone-400">{c.likes_count}</span>}
                        </button>
                        <button
                          onClick={() => handleReply(cId, cName)}
                          className="bg-transparent border-none cursor-pointer p-0 text-[11px] text-stone-400 font-semibold hover:text-stone-600 min-h-[32px] flex items-center"
                        >
                          Responder
                        </button>
                        {isOwn && (
                          <button
                            onClick={() => handleDeleteComment(cId)}
                            className="bg-transparent border-none cursor-pointer p-0 min-h-[32px] flex items-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} className="text-stone-400 hover:text-stone-700" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky comment input ── */}
      {isAuthenticated && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-100" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
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
              <img loading="lazy" src={user.avatar_url || user.avatar || user.profile_image} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500 shrink-0">
                {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
              placeholder="Añade un comentario..."
              className="flex-1 h-9 rounded-full bg-stone-100 px-3.5 text-[13px] text-stone-950 placeholder:text-stone-400 font-sans outline-none border-none"
              disabled={sending}
            />
            <button
              onClick={handleSendComment}
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
      )}
    </div>
  );
}
