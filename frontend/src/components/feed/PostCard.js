import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
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

function ProductTag({ product, t }) {
  if (!product) return null;
  const productId = product.id || product.product_id;
  const price = formatPrice(product.price);

  return (
    <Link
      to={`/products/${productId}`}
      className="absolute bottom-4 left-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-stone-200 bg-white/96 px-3 py-2 shadow-[0_8px_20px_rgba(15,15,15,0.12)] backdrop-blur-sm transition-colors hover:bg-white"
      aria-label={t('feed.viewTaggedProduct', 'Ver producto etiquetado')}
    >
      <ShoppingBag className="h-3.5 w-3.5 shrink-0 text-stone-950" />
      <span className="max-w-[160px] truncate text-xs font-medium text-stone-950">{product.name}</span>
      {price ? <span className="shrink-0 text-xs text-stone-500">{price}</span> : null}
    </Link>
  );
}

function PostCard({ post, onLike, onComment, onShare, onSave }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(post.liked || false);
  const [saved, setSaved] = useState(post.saved || false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const lastTapRef = useRef(0);

  const images = post.media?.filter(Boolean)?.length
    ? post.media
    : [{ url: post.image_url || post.media_url, ratio: '1:1' }];
  const hasMultipleImages = images.length > 1;
  const authorName = post.user?.name || post.user_name || t('common.user', 'Usuario');
  const authorAvatar = post.user?.avatar || post.user_profile_image || '/default-avatar.png';
  const authorVerified = post.user?.verified || post.user_verified;
  const currentImageUrl = images[currentImageIndex]?.url;
  const postUrl = `${window.location.origin}/posts/${post.id}`;

  const handleImageTap = () => {
    const now = Date.now();
    const doubleTapDelay = 300;

    if (now - lastTapRef.current < doubleTapDelay && !liked) {
      setLiked(true);
      setLikeCount((prev) => prev + 1);
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 600);
      onLike?.();
    }

    lastTapRef.current = now;
  };

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    onLike?.();
  };

  const handleSave = () => {
    setSaved((prev) => !prev);
    onSave?.();
  };

  const handleShare = async () => {
    setShowOptions(false);

    if (onShare) {
      await onShare();
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.caption || t('feed.shareTitle', 'Publicación de Hispaloshop'),
          text: post.caption || t('feed.shareText', 'Mira esta publicación en Hispaloshop'),
          url: postUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(postUrl);
      }
    } catch {
      // Native share cancelled or clipboard not available.
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment();
      return;
    }

    navigate(`/posts/${post.id}`);
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
    const value = Number(timestamp);
    if (!value) return '';

    const seconds = Math.floor((Date.now() - value) / 1000);
    if (seconds < 60) return t('time.justNow', 'Ahora');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('time.minutesAgo', '{{count}} min', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', '{{count}} h', { count: hours });
    const days = Math.floor(hours / 24);
    return t('time.daysAgo', '{{count}} d', { count: days });
  };

  const imageAlt = post.caption
    ? t('feed.postImageAltWithCaption', 'Imagen de la publicación: {{caption}}', { caption: post.caption })
    : t('feed.postImageAlt', 'Imagen de la publicación de {{author}}', { author: authorName });

  return (
    <article className="border-b border-stone-100 bg-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            to={`/user/${post.user?.id || post.user_id}`}
            className="flex min-w-0 items-center gap-3"
            aria-label={t('feed.openAuthorProfile', 'Abrir perfil de {{author}}', { author: authorName })}
          >
            <div className="h-10 w-10 overflow-hidden rounded-full border border-stone-200 bg-stone-100">
              <img
                src={authorAvatar}
                alt={t('feed.authorAvatar', 'Avatar de {{author}}', { author: authorName })}
                loading="lazy"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-stone-950">{authorName}</p>
                {authorVerified ? (
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-950 text-[10px] font-bold text-white"
                    aria-label={t('feed.verifiedAccount', 'Cuenta verificada')}
                  >
                    ✓
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-stone-500">{formatTimeAgo(post.timestamp || post.created_at)}</p>
            </div>
          </Link>

          <div className="relative">
            <button
              type="button"
              aria-label={t('feed.postOptions', 'Opciones de la publicación')}
              onClick={() => setShowOptions((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-stone-100"
            >
              <MoreHorizontal className="h-5 w-5 text-stone-500" />
            </button>

            <AnimatePresence>
              {showOptions ? (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowOptions(false)}
                    className="fixed inset-0 z-30"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_12px_30px_rgba(15,15,15,0.12)]"
                  >
                    <Link
                      to={`/posts/${post.id}`}
                      onClick={() => setShowOptions(false)}
                      className="flex w-full items-center px-4 py-3 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      {t('feed.viewPost', 'Ver publicación')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="flex w-full items-center border-t border-stone-100 px-4 py-3 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      {t('feed.share', 'Compartir')}
                    </button>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative overflow-hidden bg-stone-100" onClick={handleImageTap}>
          <div className="relative aspect-square w-full">
            <LikeAnimation show={showLikeAnimation} />

            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt={imageAlt}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-100">
                <ImageIcon className="h-8 w-8 text-stone-400" />
              </div>
            )}

            {post.productTag ? <ProductTag product={post.productTag} t={t} /> : null}

            {hasMultipleImages ? (
              <>
                {currentImageIndex > 0 ? (
                  <button
                    type="button"
                    onClick={prevImage}
                    aria-label={t('feed.previousImage', 'Imagen anterior')}
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                ) : null}

                {currentImageIndex < images.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextImage}
                    aria-label={t('feed.nextImage', 'Imagen siguiente')}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white"
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
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={handleLike}
                aria-label={liked ? t('feed.unlikePost', 'Quitar me gusta') : t('feed.likePost', 'Me gusta')}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                  liked ? 'text-red-500' : 'text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
              </motion.button>
              <button
                type="button"
                onClick={handleComment}
                aria-label={t('feed.commentPost', 'Abrir comentarios')}
                className="flex h-11 w-11 items-center justify-center rounded-full text-stone-900 transition-colors hover:bg-stone-100"
              >
                <MessageCircle className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                aria-label={t('feed.sharePost', 'Compartir publicación')}
                className="flex h-11 w-11 items-center justify-center rounded-full text-stone-900 transition-colors hover:bg-stone-100"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={handleSave}
              aria-label={saved ? t('feed.unsavePost', 'Quitar guardado') : t('feed.savePost', 'Guardar publicación')}
              className="flex h-11 w-11 items-center justify-center rounded-full text-stone-900 transition-colors hover:bg-stone-100"
            >
              <Bookmark className={`h-5 w-5 ${saved ? 'fill-current' : ''}`} />
            </motion.button>
          </div>

          {likeCount > 0 ? (
            <p className="text-sm font-semibold text-stone-950">
              {likeCount === 1
                ? t('feed.oneLike', '1 me gusta')
                : t('feed.multipleLikes', '{{count}} me gusta', {
                    count: likeCount.toLocaleString('es-ES'),
                  })}
            </p>
          ) : null}

          {post.caption ? (
            <div className="mt-2 text-sm leading-6 text-stone-700">
              <span className="font-semibold text-stone-950">{authorName}</span>{' '}
              <span>{post.caption}</span>
            </div>
          ) : null}

          {post.comments > 0 ? (
            <button
              type="button"
              onClick={handleComment}
              aria-label={t('feed.viewCommentsAria', 'Ver comentarios')}
              className="mt-2 text-sm text-stone-500 transition-colors hover:text-stone-800"
            >
              {t('feed.viewComments', 'Ver los {{count}} comentarios', { count: post.comments })}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default PostCard;
