import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Play,
  Share2,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

function formatCount(value) {
  if (!value) return '0';
  if (value > 999) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
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

function ReelCard({ reel, isInFeed = true, onOpenFullscreen, onLike, onComment, onShare }) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(reel.liked || false);
  const [likeCount, setLikeCount] = useState(reel.likes || 0);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && videoRef.current) {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        } else if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    if (videoRef.current) observer.observe(videoRef.current);

    return () => {
      observer.disconnect();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const togglePlay = (event) => {
    event.stopPropagation();
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }

    setIsPlaying((prev) => !prev);
  };

  const toggleMute = (event) => {
    event.stopPropagation();
    if (!videoRef.current) return;

    videoRef.current.muted = !isMuted;
    setIsMuted((prev) => !prev);
  };

  const handleLike = (event) => {
    event?.stopPropagation?.();
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    onLike?.();
  };

  const handleComment = (event) => {
    event?.stopPropagation?.();
    onComment?.();
  };

  const handleShare = async (event) => {
    event?.stopPropagation?.();

    if (onShare) {
      await onShare();
      return;
    }

    const reelUrl = `${window.location.origin}/posts/${reel.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Hispaloshop',
          text: reel.caption || t('feed.reelShareText', 'Mira este reel en Hispaloshop'),
          url: reelUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reelUrl);
      }
    } catch {
      // Native share cancelled or clipboard unavailable.
    }
  };

  const handleTap = () => {
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2000);
  };

  const productPrice = formatPrice(reel.productTag?.price);
  const reelAuthor = reel.user?.name || reel.user_name || t('common.user', 'Usuario');

  if (isInFeed) {
    return (
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        className="group relative aspect-[9/16] w-full overflow-hidden rounded-[28px] border border-stone-200 bg-stone-950 text-left"
        onClick={() => onOpenFullscreen?.(reel)}
        aria-label={t('feed.openReel', 'Abrir reel de {{author}}', { author: reelAuthor })}
      >
        <img
          src={reel.thumbnail || reel.videoUrl}
          alt={reel.caption || t('feed.reelThumbnailAlt', 'Vista previa del reel de {{author}}', { author: reelAuthor })}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-transparent to-black/72" />

        <div className="absolute left-3 right-3 top-3 flex items-start justify-between">
          <span className="rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-stone-950 backdrop-blur-sm">
            Reel
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <Heart className="h-3.5 w-3.5 fill-white text-white" />
            {formatCount(reel.likes)}
          </span>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
            <Play className="ml-0.5 h-6 w-6 fill-white" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="mb-3 flex items-center gap-2">
            <img
              src={reel.user?.avatar || '/default-avatar.png'}
              alt={t('feed.authorAvatar', 'Avatar de {{author}}', { author: reelAuthor })}
              loading="lazy"
              className="h-8 w-8 rounded-full border border-white/50 object-cover"
            />
            <span className="truncate text-sm font-medium text-white">@{reelAuthor}</span>
          </div>

          <p className="line-clamp-2 text-sm text-white/90">{reel.caption}</p>

          {reel.productTag ? (
            <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/16 px-3 py-2 text-xs text-white backdrop-blur-sm">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="truncate">{reel.productTag.name}</span>
              {productPrice ? <span className="text-white/80">{productPrice}</span> : null}
            </div>
          ) : null}
        </div>
      </motion.button>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black" onClick={handleTap}>
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="h-full w-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      {showControls ? (
        <>
          <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent p-4 pt-safe">
            <button
              type="button"
              onClick={() => window.history.back()}
              aria-label={t('feed.closeReel', 'Cerrar reel')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? t('feed.enableSound', 'Activar sonido') : t('feed.muteSound', 'Silenciar')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
            >
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4">
            <Link
              to={`/user/${reel.user?.id}`}
              className="flex flex-col items-center gap-1"
              aria-label={t('feed.openAuthorProfile', 'Abrir perfil de {{author}}', { author: reelAuthor })}
            >
              <img
                src={reel.user?.avatar || '/default-avatar.png'}
                alt={t('feed.authorAvatar', 'Avatar de {{author}}', { author: reelAuthor })}
                loading="lazy"
                className="h-11 w-11 rounded-full border-2 border-white object-cover"
              />
            </Link>

            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={handleLike}
              aria-label={liked ? t('feed.unlikePost', 'Quitar me gusta') : t('feed.likePost', 'Me gusta')}
              className="flex flex-col items-center gap-1"
            >
              <Heart className={`h-7 w-7 ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              <span className="text-xs font-medium text-white">{formatCount(likeCount)}</span>
            </motion.button>

            <button
              type="button"
              onClick={handleComment}
              aria-label={t('feed.commentPost', 'Abrir comentarios')}
              className="flex flex-col items-center gap-1"
            >
              <MessageCircle className="h-7 w-7 text-white" />
              <span className="text-xs font-medium text-white">{reel.comments || 0}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label={t('feed.sharePost', 'Compartir publicación')}
              className="flex flex-col items-center gap-1"
            >
              <Share2 className="h-7 w-7 text-white" />
              <span className="text-xs font-medium text-white">{t('feed.share', 'Compartir')}</span>
            </button>

            {reel.productTag ? (
              <Link
                to={`/products/${reel.productTag.id}`}
                className="flex flex-col items-center gap-1"
                aria-label={t('feed.viewTaggedProduct', 'Ver producto etiquetado')}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/18 text-white backdrop-blur-sm">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </Link>
            ) : null}
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 pb-safe">
            <div className="pr-16">
              <Link to={`/user/${reel.user?.id}`} className="text-sm font-semibold text-white">
                @{reelAuthor}
              </Link>
              <p className="mt-2 line-clamp-2 text-sm text-white/90">{reel.caption}</p>

              {reel.productTag ? (
                <Link
                  to={`/products/${reel.productTag.id}`}
                  className="mt-4 flex items-center gap-3 rounded-[24px] border border-white/15 bg-white/14 px-3 py-3 backdrop-blur-sm"
                >
                  <img
                    src={reel.productTag.image}
                    alt={reel.productTag.name}
                    loading="lazy"
                    className="h-11 w-11 rounded-2xl bg-white/50 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{reel.productTag.name}</p>
                    {productPrice ? <p className="text-xs text-white/80">{productPrice}</p> : null}
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-950">
                    {t('common.view', 'Ver')}
                  </span>
                </Link>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {!isPlaying ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white">
            <Play className="ml-1 h-8 w-8 fill-white" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ReelCard;
