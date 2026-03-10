import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function LikeAnimation({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <Heart className="w-24 h-24 text-white fill-red-500 drop-shadow-lg" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProductTag({ product }) {
  if (!product) return null;
  const productId = product.id || product.product_id;
  
  return (
    <Link
      to={`/products/${productId}`}
      className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg flex items-center gap-2 hover:bg-white transition-colors"
    >
      <ShoppingBag className="w-4 h-4 text-accent" />
      <div>
        <p className="text-xs font-medium text-gray-900 truncate max-w-[120px]">{product.name}</p>
        <p className="text-xs font-bold text-accent">€{product.price?.toFixed(2)}</p>
      </div>
    </Link>
  );
}

function PostCard({ post, onLike, onComment, onShare, onSave }) {
  const { t } = useTranslation();
  const [liked, setLiked] = useState(post.liked || false);
  const [saved, setSaved] = useState(post.saved || false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const lastTapRef = useRef(0);

  const images = post.media || [{ url: post.image_url || post.media_url, ratio: '1:1' }];
  const hasMultipleImages = images.length > 1;

  // Doble tap para like
  const handleImageTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Doble tap detectado
      if (!liked) {
        setLiked(true);
        setLikeCount(prev => prev + 1);
        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 600);
      }
    }
    lastTapRef.current = now;
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    if (onLike) onLike();
  };

  const handleSave = () => {
    setSaved(!saved);
    if (onSave) onSave();
  };

  const handleShare = async () => {
    if (onShare) {
      await onShare();
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.caption || 'Publicación de Hispaloshop',
          text: post.caption,
          url: `${window.location.origin}/posts/${post.id}`,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment();
    }
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => Math.min(prev + 1, images.length - 1));
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => Math.max(prev - 1, 0));
  };

  // Formato de tiempo relativo
  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return t('time.justNow', 'Ahora');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('time.minutesAgo', '{{count}}m', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', '{{count}}h', { count: hours });
    const days = Math.floor(hours / 24);
    return t('time.daysAgo', '{{count}}d', { count: days });
  };

  return (
    <article className="bg-white mb-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/user/${post.user?.id || post.user_id}`} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden">
            <img
              src={post.user?.avatar || post.user_profile_image || '/default-avatar.png'}
              alt={post.user?.name || post.user_name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {post.user?.name || post.user_name}
            </p>
            {post.user?.verified && (
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            )}
          </div>
        </Link>
        <button className="p-1 text-text-muted hover:text-gray-900">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Imagen(es) */}
      <div 
        className="relative w-full aspect-square bg-stone-100 overflow-hidden"
        onClick={handleImageTap}
      >
        <LikeAnimation show={showLikeAnimation} />
        
        <img
          src={images[currentImageIndex]?.url}
          alt={post.caption || 'Post'}
          className="w-full h-full object-cover"
        />

        {/* Product tag */}
        {post.productTag && <ProductTag product={post.productTag} />}

        {/* Navegación carrusel */}
        {hasMultipleImages && (
          <>
            {currentImageIndex > 0 && (
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 rounded-full text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {currentImageIndex < images.length - 1 && (
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/30 rounded-full text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            {/* Indicadores */}
            <div className="absolute top-2 left-2 right-2 flex gap-1">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-0.5 rounded-full ${
                    idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleLike}
            className={`transition-colors ${liked ? 'text-red-500' : 'text-gray-900'}`}
          >
            <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
          </motion.button>
          <button onClick={handleComment} className="text-gray-900">
            <MessageCircle className="w-6 h-6" />
          </button>
          <button onClick={handleShare} className="text-gray-900">
            <Share2 className="w-6 h-6" />
          </button>
        </div>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleSave}
          className="text-gray-900"
        >
          <Bookmark className={`w-6 h-6 ${saved ? 'fill-current' : ''}`} />
        </motion.button>
      </div>

      {/* Info */}
      <div className="px-4 pb-4">
        <p className="text-sm font-semibold text-gray-900">
          {likeCount.toLocaleString()} {t('feed.likes', 'me gusta')}
        </p>
        
        {post.caption && (
          <div className="mt-1">
            <span className="text-sm font-semibold text-gray-900">
              {post.user?.name || post.user_name}
            </span>{' '}
            <span className="text-sm text-gray-900">{post.caption}</span>
          </div>
        )}

        {post.comments > 0 && (
          <button onClick={handleComment} className="text-sm text-text-muted mt-1 block">
            {t('feed.viewComments', 'Ver los {{count}} comentarios', { count: post.comments })}
          </button>
        )}

        <p className="text-xs text-text-muted mt-1 uppercase tracking-wide">
          {formatTimeAgo(post.timestamp || post.created_at)}
        </p>
      </div>
    </article>
  );
}

export default PostCard;
