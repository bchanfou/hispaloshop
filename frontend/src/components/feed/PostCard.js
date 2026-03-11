import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Share2,
  ShoppingBag,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

function LikeAnimation({ show }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.4, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <Heart className="h-24 w-24 fill-red-500 text-white drop-shadow-lg" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function formatPrice(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return null;

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function ProductTag({ product }) {
  if (!product) return null;
  const productId = product.id || product.product_id;
  const price = formatPrice(product.price);

  return (
    <Link
      to={`/products/${productId}`}
      className="absolute bottom-4 left-4 rounded-2xl border border-stone-200 bg-white/96 px-3 py-2 shadow-[0_10px_24px_rgba(15,15,15,0.14)] backdrop-blur-sm transition-colors hover:bg-white"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-950 text-white">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="max-w-[140px] truncate text-xs font-semibold text-stone-950">{product.name}</p>
          {price ? <p className="text-xs text-stone-600">{price}</p> : null}
        </div>
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
  const authorName = post.user?.name || post.user_name;
  const authorAvatar = post.user?.avatar || post.user_profile_image || '/default-avatar.png';
  const authorVerified = post.user?.verified || post.user_verified;

  const handleImageTap = () => {
    const now = Date.now();
    const doubleTapDelay = 300;

    if (now - lastTapRef.current < doubleTapDelay && !liked) {
      setLiked(true);
      setLikeCount((prev) => prev + 1);
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 600);
      if (onLike) onLike();
    }

    lastTapRef.current = now;
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
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
      } catch {
        // Native share dismissed.
      }
    }
  };

  const handleComment = () => {
    if (onComment) onComment();
  };

  const nextImage = (event) => {
    event.stopPropagation();
    setCurrentImageIndex((prev) => Math.min(prev + 1, images.length - 1));
  };

  const prevImage = (event) => {
    event.stopPropagation();
    setCurrentImageIndex((prev) => Math.max(prev - 1, 0));
  };

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
    <article className="border-b border-stone-100 bg-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={`/user/${post.user?.id || post.user_id}`} className="flex min-w-0 items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
              <img src={authorAvatar} alt={authorName} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-stone-950">{authorName}</p>
                {authorVerified ? (
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-950 text-[10px] font-bold text-white">
                    ✓
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-stone-500">{formatTimeAgo(post.timestamp || post.created_at)}</p>
            </div>
          </Link>

          <div className="h-9 w-9" aria-hidden="true" />
        </div>

        <div className="relative overflow-hidden bg-stone-100" onClick={handleImageTap}>
          <div className="relative aspect-square w-full">
            <LikeAnimation show={showLikeAnimation} />

            <img
              src={images[currentImageIndex]?.url}
              alt={post.caption || 'Post'}
              className="h-full w-full object-cover"
            />

            {post.productTag ? <ProductTag product={post.productTag} /> : null}

            {hasMultipleImages ? (
              <>
                {currentImageIndex > 0 ? (
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                ) : null}

                {currentImageIndex < images.length - 1 ? (
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                ) : null}

                <div className="absolute left-3 right-3 top-3 flex gap-1">
                  {images.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/45'
                      }`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleLike}
                aria-label={liked ? 'Quitar me gusta' : 'Me gusta'}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                  liked ? 'text-red-500' : 'text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
              </motion.button>
              <button
                onClick={handleComment}
                aria-label="Ver comentarios"
                className="flex h-10 w-10 items-center justify-center rounded-full text-stone-900 transition-colors hover:bg-stone-100"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              <button
                onClick={handleShare}
                aria-label="Compartir publicación"
                className="flex h-10 w-10 items-center justify-center rounded-full text-stone-900 transition-colors hover:bg-stone-100"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={handleSave}
              aria-label={saved ? 'Quitar guardado' : 'Guardar publicación'}
              className="flex h-10 w-10 items-center justify-center rounded-full text-stone-900 transition-colors hover:bg-stone-100"
            >
              <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
            </motion.button>
          </div>

          <p className="text-sm font-semibold text-stone-950">
            {likeCount.toLocaleString()} {t('feed.likes', 'me gusta')}
          </p>

          {post.caption ? (
            <div className="mt-2 text-sm leading-6 text-stone-700">
              <span className="font-semibold text-stone-950">{authorName}</span>{' '}
              <span>{post.caption}</span>
            </div>
          ) : null}

          {post.comments > 0 ? (
            <button onClick={handleComment} className="mt-2 text-sm text-stone-500 transition-colors hover:text-stone-800">
              {t('feed.viewComments', 'Ver los {{count}} comentarios', { count: post.comments })}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default PostCard;
