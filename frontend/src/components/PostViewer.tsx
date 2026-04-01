import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { timeAgo } from '../utils/time';
import apiClient from '../services/api/client';

interface PostUser {
  name?: string;
  username?: string;
  user_id?: string;
  profile_image?: string;
  avatar_url?: string;
  avatar?: string;
  id?: string;
}

interface Post {
  id?: string;
  post_id?: string;
  postId?: string;
  content?: string;
  caption?: string;
  images?: string[];
  media?: any[];
  image_url?: string;
  user?: PostUser;
  is_liked?: boolean;
  liked?: boolean;
  is_saved?: boolean;
  saved?: boolean;
  likes_count?: number;
  likes?: number;
  comments_count?: number;
  comments?: number;
  created_at?: string;
  timestamp?: string;
  [key: string]: any;
}

interface PostViewerProps {
  post: Post;
  posts?: Post[];
  profile?: PostUser;
  onClose?: () => void;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  isOwn?: boolean;
  onDelete?: (postId: string) => void;
}

export default function PostViewer({ post, posts = [], profile, onClose, onLike, onComment, isOwn = false, onDelete }: PostViewerProps) {
  const navigate = useNavigate();
  const [currentIndex] = useState(() => {
    const idx = posts.findIndex((p) => (p.post_id || p.id) === (post?.post_id || post?.id));
    return idx >= 0 ? idx : 0;
  });
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to target post on mount and when currentIndex changes
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const target = container.querySelector(`[data-post-index="${currentIndex}"]`);
    if (target) (target as HTMLElement).scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
  }, [currentIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDelete = useCallback(async (postId: string) => {
    if (!postId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/posts/${postId}`);
      toast.success('Publicación eliminada');
      onDelete?.(postId);
      if (posts.length <= 1) onClose?.();
    } catch {
      toast.error('Error al eliminar');
    } finally {
      setDeleting(false);
      setShowMenu(null);
    }
  }, [posts.length, onClose, onDelete]);

  if (!posts || posts.length === 0) return null;

  const displayPosts = posts.length > 0 ? posts : [post];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Visor de publicaciones"
      className="fixed inset-0 z-[9999] bg-white"
    >
      {/* Header bar */}
      <div className="sticky top-0 z-50 flex h-[52px] items-center justify-between border-b border-stone-200 bg-white px-3">
        <button onClick={onClose} aria-label="Cerrar" className="flex items-center justify-center p-2">
          <ChevronLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[15px] font-semibold text-stone-950">Publicaciones</span>
        <div className="w-10" />
      </div>

      {/* Scrollable feed */}
      <div ref={scrollRef} className="overflow-y-auto pb-20" style={{ height: 'calc(100dvh - 52px)' }}>
        {displayPosts.map((p, idx) => (
          <PostFeedCard
            key={p.id || p.post_id || idx}
            post={p}
            profile={profile}
            index={idx}
            isOwn={isOwn}
            showMenu={showMenu}
            setShowMenu={setShowMenu}
            deleting={deleting}
            onDelete={handleDelete}
            onLike={onLike}
            onComment={onComment}
            onClose={onClose}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* -- Individual post card in feed layout -- */

interface PostFeedCardProps {
  key?: string | number;
  post: Post;
  profile?: PostUser;
  index: number;
  isOwn: boolean;
  showMenu: string | null;
  setShowMenu: (id: string | null) => void;
  deleting: boolean;
  onDelete?: (postId: string) => void;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onClose?: () => void;
}

function PostFeedCard({ post: currentPost, profile, index, isOwn, showMenu, setShowMenu, deleting, onDelete, onLike, onComment, onClose }: PostFeedCardProps) {
  const navigate = useNavigate();
  const [imageIndex, setImageIndex] = useState(0);
  const [liked, setLiked] = useState(currentPost.is_liked ?? currentPost.liked ?? false);
  const [saved, setSaved] = useState(currentPost.is_saved ?? currentPost.saved ?? false);
  const [localLikesCount, setLocalLikesCount] = useState(currentPost.likes_count ?? currentPost.likes ?? 0);

  const images: string[] = (() => {
    if (Array.isArray(currentPost.images) && currentPost.images.length > 0) return currentPost.images;
    if (Array.isArray(currentPost.media) && currentPost.media.length > 0) return currentPost.media.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean);
    if (currentPost.image_url) return [currentPost.image_url];
    return [];
  })();
  const user: PostUser = currentPost.user || profile || {};
  const avatarUrl = user.profile_image || user.avatar_url || user.avatar;
  const caption = currentPost.content ?? currentPost.caption ?? '';
  const commentsCount = currentPost.comments_count ?? currentPost.comments ?? 0;
  const postId = currentPost.id || currentPost.post_id || '';

  const handleLike = useCallback(async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLocalLikesCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    try {
      await apiClient.post(`/posts/${postId}/like`); // backend toggles
      onLike?.(postId);
    } catch {
      setLiked(wasLiked);
      setLocalLikesCount((c) => wasLiked ? c + 1 : Math.max(0, c - 1));
    }
  }, [liked, postId, onLike]);

  const handleSave = useCallback(async () => {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      await apiClient.post(`/posts/${postId}/save`); // backend toggles
    } catch {
      setSaved(wasSaved);
    }
  }, [saved, postId]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/posts/${postId}`;
    if (navigator.share) {
      try { await navigator.share({ title: caption?.slice(0, 60) || 'Publicación', url }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); toast.success('Enlace copiado'); } catch { /* fallback */ }
    }
  }, [postId, caption]);

  const handleComment = () => {
    onComment?.(postId);
    onClose?.();
    navigate(`/posts/${postId}`);
  };

  return (
    <div data-post-index={index} className="border-b border-stone-200 bg-white">
      {/* Post header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div
          onClick={() => { const target = user.username || user.user_id; if (target) { onClose?.(); navigate(`/${target}`); } }}
          className="cursor-pointer"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={user.name || 'Avatar'} className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-500">
              {(user.name || '?')[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-950 truncate">{user.name || user.username || 'Usuario'}</p>
          <p className="text-[11px] text-stone-500">{timeAgo(currentPost.created_at || currentPost.timestamp)}</p>
        </div>
        {isOwn && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(showMenu === postId ? null : postId)}
              aria-label="Opciones"
              className="flex items-center justify-center p-1.5"
            >
              <MoreHorizontal size={20} className="text-stone-500" />
            </button>
            {showMenu === postId && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(null)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-stone-100 overflow-hidden">
                  <button
                    onClick={() => { onClose?.(); toast?.('Edición de posts no disponible aún'); }}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-stone-950 hover:bg-stone-50"
                  >
                    <Pencil size={16} /> Editar
                  </button>
                  <button
                    onClick={() => onDelete?.(postId)}
                    disabled={deleting}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={16} /> {deleting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Image gallery */}
      {images.length > 0 && (
        <div className="relative">
          <img
            src={images[imageIndex] || images[0]}
            alt={`Imagen ${imageIndex + 1}`}
            loading={index < 2 ? 'eager' : 'lazy'}
            className="block w-full aspect-square object-cover"
          />
          {images.length > 1 && imageIndex > 0 && (
            <button
              onClick={() => setImageIndex((i) => i - 1)}
              aria-label="Imagen anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40"
            >
              <ChevronLeft size={16} className="text-white" />
            </button>
          )}
          {images.length > 1 && imageIndex < images.length - 1 && (
            <button
              onClick={() => setImageIndex((i) => i + 1)}
              aria-label="Imagen siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40"
            >
              <ChevronRight size={16} className="text-white" />
            </button>
          )}
          {images.length > 1 && (
            <div className="flex justify-center gap-1 py-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIndex(i)}
                  aria-label={`Imagen ${i + 1}`}
                  className="p-0 bg-transparent border-none cursor-pointer"
                >
                  <span className={`block h-1.5 w-1.5 rounded-full transition-colors ${i === imageIndex ? 'bg-stone-950' : 'bg-stone-300'}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-2">
        <button onClick={handleLike} aria-label="Me gusta" className="bg-transparent border-none cursor-pointer p-2 min-w-[44px] min-h-[44px] flex items-center gap-1">
          <Heart size={24} fill={liked ? '#0c0a09' : 'none'} className={liked ? 'text-stone-950' : 'text-stone-600'} />
        </button>
        <span className="text-[13px] font-semibold text-stone-950">{localLikesCount}</span>
        <button onClick={handleComment} aria-label="Comentar" className="bg-transparent border-none cursor-pointer p-0 flex items-center gap-1">
          <MessageCircle size={24} className="text-stone-600" />
        </button>
        <span className="text-[13px] font-semibold text-stone-950">{commentsCount}</span>
        <button onClick={handleShare} aria-label="Compartir" className="bg-transparent border-none cursor-pointer p-0 flex">
          <Send size={24} className="text-stone-600" />
        </button>
        <button
          onClick={handleSave}
          aria-label={saved ? 'Quitar guardado' : 'Guardar'}
          className="bg-transparent border-none cursor-pointer p-0 flex ml-auto"
        >
          <Bookmark size={24} fill={saved ? '#0A0A0A' : 'none'} className={saved ? 'text-stone-950' : 'text-stone-600'} />
        </button>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-4 pb-3">
          <p className="text-sm text-stone-950 leading-relaxed">
            <strong>{user.name || user.username || ''}</strong>{' '}
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}
