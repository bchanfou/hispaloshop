import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart, MessageCircle, Send, Bookmark, BookmarkCheck,
  X, Loader2, ChevronLeft, ChevronRight, Share2, MoreHorizontal, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/api/client';
import { sanitizeImageUrl } from '../utils/helpers';
import { usePostComments } from '../features/posts/hooks/usePostComments';
import ProductDetailOverlay from './store/ProductDetailOverlay';
import ProductTagMarkers from './intelligence/ProductTagMarkers';
import ContextualProductSuggestions from './intelligence/ContextualProductSuggestions';

function getImgUrl(url) {
  return sanitizeImageUrl(url);
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function PostViewer({ post, posts, profile, currentUser, onClose, onNavigate }) {
  const { t } = useTranslation();
  const [liked, setLiked] = useState(post.is_liked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [saved, setSaved] = useState(post.is_bookmarked || false);
  const [commentText, setCommentText] = useState('');
  const [likeAnim, setLikeAnim] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const commentInputRef = useRef(null);
  const menuRef = useRef(null);

  const { comments, isLoading: loadingComments, submitComment: submitCommentMutation, isSubmitting: sendingComment } = usePostComments(post.post_id);

  const safePosts = Array.isArray(posts) ? posts : [];
  const currentIdx = safePosts.findIndex(p => p.post_id === post.post_id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < safePosts.length - 1;
  const isOwner = currentUser?.user_id === post.user_id;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Reset state when post changes
  useEffect(() => {
    setLiked(post.is_liked || false);
    setLikesCount(post.likes_count || 0);
    setSaved(post.is_bookmarked || false);
    setCommentText('');
    setShowMenu(false);
  }, [post.post_id]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(safePosts[currentIdx - 1]);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(safePosts[currentIdx + 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIdx, hasPrev, hasNext, onClose, onNavigate, safePosts]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleLike = async () => {
    if (!currentUser) { toast.error(t('social.loginToLike')); return; }
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 600);
    try {
      const data = await apiClient.post(`/posts/${post.post_id}/like`, {});
      setLiked(data.liked);
      setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
    } catch { toast.error('Error'); }
  };

  const handleDoubleTap = () => {
    if (!currentUser || liked) return;
    handleLike();
  };

  const handleBookmark = async () => {
    if (!currentUser) { toast.error(t('social.loginToSave')); return; }
    try {
      const data = await apiClient.post(`/posts/${post.post_id}/bookmark`, {});
      setSaved(data.bookmarked);
      toast.success(data.bookmarked ? t('social.saved') : t('social.unsaved'));
    } catch { toast.error('Error'); }
  };

  const submitComment = async () => {
    if (!currentUser) { toast.error(t('social.login')); return; }
    if (!commentText.trim()) return;
    try {
      await submitCommentMutation(commentText.trim());
      setCommentText('');
    } catch { toast.error(t('social.errorComment')); }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('social.deleteConfirm'))) return;
    try {
      await apiClient.delete(`/posts/${post.post_id}`);
      toast.success(t('social.deleted'));
      onClose();
    } catch { toast.error(t('social.errorDelete')); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/user/${post.user_id}`;
    if (navigator.share) {
      try { await navigator.share({ title: post.caption || 'Hispaloshop', url }); } catch { /* ignore */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t('social.linkCopied'));
    }
  };

  const imgSrc = getImgUrl(post.image_url);
  const avatarSrc = getImgUrl(post.user_profile_image || profile?.profile_image);
  const taggedProducts = post.tagged_products || (post.tagged_product ? [post.tagged_product] : []);

  const handleSelectProduct = async (product) => {
    setSelectedProduct(product);
    try {
      await apiClient.post('/intelligence/track', {
        event_type: 'product_click',
        content_type: 'post',
        content_id: post.post_id,
        product_id: product.product_id || product.id,
        producer_id: product.producer_id,
      });
    } catch {
      // ignore tracking errors
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" data-testid="post-viewer-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
        data-testid="close-post-viewer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Nav arrows */}
      {hasPrev && (
        <button
          onClick={() => onNavigate(posts[currentIdx - 1])}
          className="absolute left-2 md:left-4 z-50 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          data-testid="post-viewer-prev"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {hasNext && (
        <button
          onClick={() => onNavigate(posts[currentIdx + 1])}
          className="absolute right-2 md:right-4 z-50 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          data-testid="post-viewer-next"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Content Card */}
      <div className="relative z-10 w-full max-w-5xl mx-4 max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Left: Image */}
        <div
          className="md:flex-1 bg-black flex items-center justify-center min-h-[250px] md:min-h-[500px] relative cursor-pointer"
          onDoubleClick={handleDoubleTap}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={post.caption || 'Post'}
              className="w-full h-full object-contain max-h-[40vh] md:max-h-[90vh]"
            />
          ) : (
            <div className="flex items-center justify-center p-8">
              <p className="text-white/80 text-lg text-center max-w-md leading-relaxed whitespace-pre-wrap">
                {post.caption}
              </p>
            </div>
          )}
          {/* Double tap heart animation */}
          {likeAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Heart className="w-24 h-24 fill-white text-white animate-ping opacity-80" />
            </div>
          )}
          {imgSrc ? <ProductTagMarkers tags={taggedProducts} onSelect={handleSelectProduct} /> : null}
        </div>

        {/* Right: Details & Comments */}
        <div className="w-full md:w-[360px] flex flex-col border-l border-stone-200 bg-white">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-200">
            <Link to={`/user/${post.user_id}`} onClick={onClose} className="shrink-0">
              <div className="w-9 h-9 rounded-full bg-stone-200 overflow-hidden border border-stone-100">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold text-sm">
                    {(post.user_name || profile?.name || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/user/${post.user_id}`} onClick={onClose} className="font-semibold text-sm text-primary hover:underline">
                {post.user_name || profile?.name}
              </Link>
              {post.location && <p className="text-xs text-text-muted">{post.location}</p>}
            </div>
            {(isOwner || isAdmin) && (
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-stone-100 rounded-full" data-testid="post-viewer-menu">
                  <MoreHorizontal className="w-5 h-5 text-text-muted" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 py-1 min-w-[150px]">
                    <button onClick={handleDelete} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50" data-testid="post-viewer-delete">
                      <Trash2 className="w-4 h-4" /> {t('social.delete')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments list (scrollable) */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[120px] max-h-[30vh] md:max-h-none">
            {/* Caption as first "comment" */}
            {imgSrc && post.caption && (
              <div className="flex gap-2.5">
                <Link to={`/user/${post.user_id}`} onClick={onClose} className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden">
                    {avatarSrc ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-bold">{(post.user_name || 'U')[0]}</div>
                    )}
                  </div>
                </Link>
                <div>
                  <p className="text-sm">
                    <Link to={`/user/${post.user_id}`} onClick={onClose} className="font-semibold text-primary hover:underline mr-1.5">
                      {post.user_name || profile?.name}
                    </Link>
                    <span className="text-primary">{post.caption}</span>
                  </p>
                  <span className="text-[10px] text-text-muted">{timeAgo(post.created_at)}</span>
                </div>
              </div>
            )}

            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">{t('social.noComments')}</p>
            ) : (
              comments.map(c => (
                <div key={c.comment_id} className="flex gap-2.5" data-testid={`comment-${c.comment_id}`}>
                  <Link to={`/user/${c.user_id}`} onClick={onClose} className="shrink-0">
                    <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden flex items-center justify-center text-stone-400 text-xs font-bold">
                      {(c.user_name || 'U')[0].toUpperCase()}
                    </div>
                  </Link>
                  <div className="flex-1">
                    <p className="text-sm">
                      <Link to={`/user/${c.user_id}`} onClick={onClose} className="font-semibold text-primary hover:underline mr-1.5">
                        {c.user_name}
                      </Link>
                      <span className="text-primary">{c.text}</span>
                    </p>
                    <span className="text-[10px] text-text-muted">{timeAgo(c.created_at)}</span>
                  </div>
                </div>
              ))
            )}

            <ContextualProductSuggestions contentType="post" contentId={post.post_id} />
          </div>

          {/* Actions bar */}
          <div className="border-t border-stone-200 px-4 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <button onClick={handleLike} className="group active:scale-125 transition-transform" data-testid="post-viewer-like">
                  <Heart className={`w-6 h-6 transition-all ${liked ? 'fill-red-500 text-red-500' : 'text-primary group-hover:text-red-400'}`} />
                </button>
                <button onClick={() => commentInputRef.current?.focus()} className="group" data-testid="post-viewer-comment-focus">
                  <MessageCircle className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
                </button>
                <button onClick={handleShare} className="group">
                  <Share2 className="w-5 h-5 text-primary group-hover:text-accent transition-colors" />
                </button>
              </div>
              <button onClick={handleBookmark} className="group" data-testid="post-viewer-bookmark">
                {saved
                  ? <BookmarkCheck className="w-6 h-6 text-accent fill-accent" />
                  : <Bookmark className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
                }
              </button>
            </div>
            {likesCount > 0 && (
              <p className="text-sm font-semibold text-primary mb-1">{likesCount} {t('social.likes')}</p>
            )}
            <p className="text-[10px] text-text-muted uppercase">{timeAgo(post.created_at)}</p>
          </div>

          {/* Comment input */}
          {currentUser && (
            <div className="border-t border-stone-200 px-4 py-3 flex items-center gap-2">
              <input
                ref={commentInputRef}
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder={t('social.writeComment')}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-text-muted"
                data-testid="post-viewer-comment-input"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim() || sendingComment}
                className="text-accent font-semibold text-sm disabled:opacity-30 hover:text-accent/90 p-1"
                data-testid="post-viewer-send-comment"
              >
                {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedProduct ? <ProductDetailOverlay product={selectedProduct} store={selectedProduct.store || null} onClose={() => setSelectedProduct(null)} /> : null}
    </div>
  );
}
