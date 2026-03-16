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
  const currentPost = posts[currentIndex] || post;

  const goNext = useCallback(() => {
    if (currentIndex < posts.length - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, posts.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

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

  const images = currentPost.images || (currentPost.image_url ? [currentPost.image_url] : []);
  const user = currentPost.user || profile || {};

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
          <img
            src={user.profile_image || user.avatar_url || '/placeholder-avatar.png'}
            alt=""
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>{user.name || user.username || 'Usuario'}</p>
            <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: 0 }}>{timeAgo(currentPost.created_at)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={20} color="var(--color-stone)" />
          </button>
        </div>

        {/* Image */}
        {images.length > 0 && (
          <img
            src={images[0]}
            alt=""
            loading="lazy"
            style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
          />
        )}

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px' }}>
          <Heart size={24} color="var(--color-stone)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)' }}>{currentPost.likes_count || 0}</span>
          <MessageCircle size={24} color="var(--color-stone)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)' }}>{currentPost.comments_count || 0}</span>
          <Share2 size={24} color="var(--color-stone)" />
          <Bookmark size={24} color="var(--color-stone)" style={{ marginLeft: 'auto' }} />
        </div>

        {/* Caption */}
        {currentPost.content && (
          <div style={{ padding: '0 16px 12px' }}>
            <p style={{ fontSize: 14, color: 'var(--color-black)', margin: 0, lineHeight: 1.5 }}>
              <strong>{user.name || user.username || ''}</strong>{' '}
              {currentPost.content}
            </p>
          </div>
        )}
      </div>

      {/* Nav arrows */}
      {posts.length > 1 && currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          style={{ position: 'absolute', left: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ChevronLeft size={24} color="#fff" />
        </button>
      )}
      {posts.length > 1 && currentIndex < posts.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          style={{ position: 'absolute', right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <ChevronRight size={24} color="#fff" />
        </button>
      )}
    </motion.div>
  );
}
