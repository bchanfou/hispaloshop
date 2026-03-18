import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Heart, MessageCircle, Share2, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function timeAgo(dateString) {
  if (!dateString) return '';
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

export default function PostViewer({ post, posts = [], profile, onClose, onLike, onComment }) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = posts.findIndex((p) => (p.post_id || p.id) === (post?.post_id || post?.id));
    return idx >= 0 ? idx : 0;
  });
  const [imageIndex, setImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const currentPost = posts[currentIndex] || post;

  const goNext = useCallback(() => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex((i) => i + 1);
      setImageIndex(0);
    }
  }, [currentIndex, posts.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setImageIndex(0);
    }
  }, [currentIndex]);

  // Sync liked/saved state when post changes
  useEffect(() => {
    if (currentPost) {
      setLiked(currentPost.is_liked ?? currentPost.liked ?? false);
      setSaved(currentPost.is_saved ?? currentPost.saved ?? false);
    }
  }, [currentPost]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  if (!currentPost) return null;

  const images = (() => {
    if (Array.isArray(currentPost.images) && currentPost.images.length > 0) return currentPost.images;
    if (Array.isArray(currentPost.media) && currentPost.media.length > 0) return currentPost.media.map((m) => (typeof m === 'string' ? m : m?.url)).filter(Boolean);
    if (currentPost.image_url) return [currentPost.image_url];
    return [];
  })();
  const user = currentPost.user || profile || {};
  const avatarUrl = user.profile_image || user.avatar_url || user.avatar;
  const caption = currentPost.content ?? currentPost.caption ?? '';
  const likesCount = currentPost.likes_count ?? currentPost.likes ?? 0;
  const commentsCount = currentPost.comments_count ?? currentPost.comments ?? 0;

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    onLike?.(currentPost.id || currentPost.post_id);
  };

  const handleComment = () => {
    onComment?.(currentPost.id || currentPost.post_id);
    navigate(`/posts/${currentPost.id || currentPost.post_id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label="Visor de publicación"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: 480, width: '100%', maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 10 }}>
          <div
            onClick={() => { const target = user.username || user.user_id; if (target) { onClose?.(); navigate(`/${target}`); } }}
            style={{ cursor: 'pointer' }}
          >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user.name || 'Avatar'}
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'var(--color-stone)',
            }}>
              {(user.name || '?')[0].toUpperCase()}
            </div>
          )}
          </div>
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { const target = user.username || user.user_id; if (target) { onClose?.(); navigate(`/${target}`); } }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>{user.name || user.username || 'Usuario'}</p>
            <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: 0 }}>{timeAgo(currentPost.created_at || currentPost.timestamp)}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="var(--color-stone)" />
          </button>
        </div>

        {/* Image gallery */}
        {images.length > 0 && (
          <div style={{ position: 'relative' }}>
            <img
              src={images[imageIndex] || images[0]}
              alt={`Imagen ${imageIndex + 1} de ${images.length}`}
              loading={imageIndex === 0 ? 'eager' : 'lazy'}
              style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
            />
            {/* Gallery nav arrows */}
            {images.length > 1 && imageIndex > 0 && (
              <button
                onClick={() => setImageIndex((i) => i - 1)}
                aria-label="Imagen anterior"
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ChevronLeft size={18} color="var(--color-white)" />
              </button>
            )}
            {images.length > 1 && imageIndex < images.length - 1 && (
              <button
                onClick={() => setImageIndex((i) => i + 1)}
                aria-label="Imagen siguiente"
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ChevronRight size={18} color="var(--color-white)" />
              </button>
            )}
            {/* Gallery dots */}
            {images.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '8px 0' }}>
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    aria-label={`Imagen ${i + 1} de ${images.length}`}
                    style={{ width: 24, height: 24, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-full)', background: i === imageIndex ? 'var(--color-black)' : 'var(--color-border)', transition: 'var(--transition-fast)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions — functional */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px' }}>
          <button
            onClick={handleLike}
            aria-label={liked ? `Quitar me gusta · ${likesCount}` : `Me gusta · ${likesCount}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Heart size={24} fill={liked ? 'var(--color-black)' : 'none'} color={liked ? 'var(--color-black)' : 'var(--color-stone)'} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)' }}>{likesCount}</span>

          <button
            onClick={handleComment}
            aria-label={`Comentar · ${commentsCount}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <MessageCircle size={24} color="var(--color-stone)" />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)' }}>{commentsCount}</span>

          <button
            aria-label="Compartir"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <Share2 size={24} color="var(--color-stone)" />
          </button>

          <button
            onClick={() => setSaved((s) => !s)}
            aria-label={saved ? 'Quitar guardado' : 'Guardar'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 'auto', display: 'flex' }}
          >
            <Bookmark size={24} fill={saved ? 'var(--color-black)' : 'none'} color={saved ? 'var(--color-black)' : 'var(--color-stone)'} />
          </button>
        </div>

        {/* Caption */}
        {caption && (
          <div style={{ padding: '0 16px 12px' }}>
            <p style={{ fontSize: 14, color: 'var(--color-black)', margin: 0, lineHeight: 1.5 }}>
              <strong>{user.name || user.username || ''}</strong>{' '}
              {caption}
            </p>
          </div>
        )}
      </div>

      {/* Nav arrows (between posts) */}
      {posts.length > 1 && currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="Publicación anterior"
          style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ChevronLeft size={24} color="var(--color-white)" />
        </button>
      )}
      {posts.length > 1 && currentIndex < posts.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="Publicación siguiente"
          style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ChevronRight size={24} color="var(--color-white)" />
        </button>
      )}
    </motion.div>
  );
}
