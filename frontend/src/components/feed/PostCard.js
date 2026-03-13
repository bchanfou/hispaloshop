import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Send,
  ShoppingBag,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ── Heart animation posicionado en el punto de doble-tap ──────────────────────
function LikeAnimation({ show, x, y }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="pointer-events-none absolute z-10 flex items-center justify-center"
          style={{
            left: x ?? '50%',
            top:  y ?? '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <Heart className="h-28 w-28 fill-white text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ── Producto etiquetado en imagen ─────────────────────────────────────────────
function ProductTag({ product, t }) {
  if (!product) return null;
  const productId = product.id || product.product_id;
  if (!productId) return null;
  const amount = Number(product.price);
  const price = Number.isNaN(amount)
    ? null
    : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(amount);

  return (
    <Link
      to={`/products/${productId}`}
      className="absolute bottom-4 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border border-stone-200 bg-white/96 px-3 py-1.5 shadow-[0_4px_16px_rgba(15,15,15,0.14)] backdrop-blur-sm"
      aria-label={t('feed.viewTaggedProduct', 'Ver producto etiquetado')}
    >
      <ShoppingBag className="h-3 w-3 shrink-0 text-stone-950" />
      <span className="truncate text-[12px] font-medium text-stone-950">{product.name}</span>
      {price ? <span className="shrink-0 text-[11px] text-stone-500">{price}</span> : null}
    </Link>
  );
}

// ── Caption con hashtags y colapso en 2 líneas ────────────────────────────────
function Caption({ author, text, expanded, onExpand }) {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  const isTruncatable = text.length > 100 || text.includes('\n');

  return (
    <div>
      <p className={`text-[13.5px] leading-[1.45] text-stone-800 ${expanded || !isTruncatable ? '' : 'line-clamp-2'}`}>
        <span className="mr-1 font-semibold text-stone-950">{author}</span>
        {parts.map((part, i) => {
          if (/^#\S+/.test(part)) {
            return <span key={i} className="font-medium text-stone-500">{part}</span>;
          }
          if (/^@\S+/.test(part)) {
            return <span key={i} className="font-semibold text-stone-700">{part}</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
      {isTruncatable && !expanded ? (
        <button
          type="button"
          onClick={onExpand}
          className="mt-0.5 text-[13px] text-stone-400 transition-colors hover:text-stone-600"
        >
          más
        </button>
      ) : null}
    </div>
  );
}

// ── Tiempo relativo compacto ──────────────────────────────────────────────────
function timeAgo(timestamp, t) {
  const value = Number(timestamp);
  if (!value) return '';
  const seconds = Math.floor((Date.now() - value) / 1000);
  if (seconds < 60)  return t('time.justNow',    'ahora');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)  return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7)      return `${days}d`;
  return new Date(value).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

// ── PostCard — Apple × Instagram ─────────────────────────────────────────────
function PostCard({ post, onLike, onComment, onShare, onSave, priority = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [liked,             setLiked]             = useState(post.liked || false);
  const [saved,             setSaved]             = useState(post.saved || false);
  const [likeCount,         setLikeCount]         = useState(post.likes || 0);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [heartPos,          setHeartPos]          = useState({ x: null, y: null });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showOptions,       setShowOptions]       = useState(false);
  const [captionExpanded,   setCaptionExpanded]   = useState(false);
  const lastTapRef = useRef(0);

  // Normalizar imágenes
  const images = post.media?.filter(Boolean)?.length
    ? post.media
    : [{ url: post.image_url || post.media_url }];
  const hasMultiple = images.length > 1;
  const currentUrl  = images[currentImageIndex]?.url;

  // Metadatos del autor
  const authorName     = post.user?.name || post.user_name || t('common.user', 'Usuario');
  const authorAvatar   = post.user?.avatar || post.user_profile_image || null;
  const authorVerified = post.user?.verified || post.user_verified;
  const authorId       = post.user?.id || post.user_id || post.author_id || null;
  const hasStory       = post.user?.has_story || post.user?.hasStory || false;
  const postUrl        = `${window.location.origin}/posts/${post.id}`;
  const timeLabel      = timeAgo(post.timestamp || post.created_at, t);

  // ── Handlers ──
  const handleDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && !liked) {
      const rect = e.currentTarget.getBoundingClientRect();
      setHeartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setLiked(true);
      setLikeCount((n) => n + 1);
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 700);
      onLike?.();
    }
    lastTapRef.current = now;
  };

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((n) => (liked ? n - 1 : n + 1));
    onLike?.();
  };

  const handleSave = () => { setSaved((prev) => !prev); onSave?.(); };

  const handleShare = async () => {
    setShowOptions(false);
    if (onShare) { await onShare(); return; }
    try {
      if (navigator.share) {
        await navigator.share({ title: post.caption || t('feed.shareTitle', 'Publicación de Hispaloshop'), url: postUrl });
        return;
      }
      await navigator.clipboard?.writeText(postUrl);
    } catch { /* cancelado */ }
  };

  const handleComment = () => {
    onComment ? onComment() : navigate(`/posts/${post.id}`);
  };

  const goNext = (e) => { e.stopPropagation(); setCurrentImageIndex((i) => Math.min(i + 1, images.length - 1)); };
  const goPrev = (e) => { e.stopPropagation(); setCurrentImageIndex((i) => Math.max(i - 1, 0)); };

  const imageAlt = post.caption
    ? t('feed.postImageAltWithCaption', 'Imagen de la publicación: {{caption}}', { caption: post.caption })
    : t('feed.postImageAlt', 'Imagen de la publicación de {{author}}', { author: authorName });

  return (
    <article className="border-b border-stone-100 bg-white" data-testid={`post-card-${post.id}`}>

      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">

        {/* Avatar con story ring */}
        <Link
          to={authorId ? `/user/${authorId}` : '#'}
          onClick={(e) => { if (!authorId) e.preventDefault(); }}
          aria-label={t('feed.openAuthorProfile', 'Abrir perfil de {{author}}', { author: authorName })}
          className="shrink-0"
        >
          <div className={`rounded-full ${hasStory ? 'bg-gradient-to-tr from-stone-950 to-stone-600 p-[1.5px]' : ''}`}>
            <div className={`h-8 w-8 overflow-hidden rounded-full bg-stone-100 ${hasStory ? '' : 'border border-stone-200'}`}>
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[12px] font-semibold text-stone-500">
                  {(authorName[0] || '?').toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </Link>

        {/* Nombre + verificado + tiempo en línea */}
        <Link
          to={authorId ? `/user/${authorId}` : '#'}
          onClick={(e) => { if (!authorId) e.preventDefault(); }}
          className="min-w-0 flex-1"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-semibold leading-tight text-stone-950">{authorName}</span>
            {authorVerified ? (
              <span
                className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full bg-stone-950 text-[8px] font-bold text-white"
                aria-label={t('feed.verifiedAccount', 'Cuenta verificada')}
              >
                ✓
              </span>
            ) : null}
            {timeLabel ? (
              <>
                <span className="text-[11px] text-stone-300" aria-hidden="true">·</span>
                <span className="text-[11px] text-stone-400">{timeLabel}</span>
              </>
            ) : null}
          </div>
        </Link>

        {/* ··· opciones */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowOptions((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-stone-100 active:bg-stone-200"
            aria-label={t('feed.postOptions', 'Opciones')}
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={1.8} />
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
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1,    y: 0  }}
                  exit={{    opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.11 }}
                  className="absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-[0_12px_36px_rgba(15,15,15,0.13)]"
                >
                  <Link
                    to={`/posts/${post.id}`}
                    onClick={() => setShowOptions(false)}
                    className="block px-4 py-3 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    {t('feed.viewPost', 'Ver publicación')}
                  </Link>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="block w-full border-t border-stone-100 px-4 py-3 text-left text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    {t('feed.share', 'Compartir')}
                  </button>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Media — full-width ── */}
      <div
        className="relative w-full cursor-pointer overflow-hidden bg-stone-100"
        onClick={handleDoubleTap}
      >
        <div className="relative aspect-square w-full">
          <LikeAnimation show={showLikeAnimation} x={heartPos.x} y={heartPos.y} />

          {currentUrl ? (
            <img
              src={currentUrl}
              alt={imageAlt}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-stone-100">
              <ImageIcon className="h-8 w-8 text-stone-300" />
            </div>
          )}

          {post.productTag ? <ProductTag product={post.productTag} t={t} /> : null}

          {/* Flechas carousel */}
          {hasMultiple && currentImageIndex > 0 ? (
            <button
              type="button"
              onClick={goPrev}
              aria-label={t('feed.previousImage', 'Imagen anterior')}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            </button>
          ) : null}
          {hasMultiple && currentImageIndex < images.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              aria-label={t('feed.nextImage', 'Imagen siguiente')}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
            </button>
          ) : null}
        </div>

        {/* Dots carousel */}
        {hasMultiple ? (
          <div className="flex items-center justify-center gap-1 py-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i); }}
                aria-label={`Imagen ${i + 1}`}
                className={`rounded-full transition-all duration-200 ${
                  i === currentImageIndex ? 'h-1.5 w-1.5 bg-stone-950' : 'h-1.5 w-1.5 bg-stone-300'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Acciones + info ── */}
      <div className="px-3 pb-3">

        {/* Barra de acciones */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-0">
            {/* Like */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.84 }}
              onClick={handleLike}
              aria-label={liked ? t('feed.unlikePost', 'Quitar me gusta') : t('feed.likePost', 'Me gusta')}
              className="flex h-10 w-10 items-center justify-center text-stone-950 active:opacity-70"
            >
              <Heart
                className={`h-[26px] w-[26px] transition-all duration-150 ${
                  liked ? 'fill-stone-950 text-stone-950 scale-110' : 'text-stone-950'
                }`}
                strokeWidth={liked ? 0 : 1.8}
              />
            </motion.button>

            {/* Comentar */}
            <button
              type="button"
              onClick={handleComment}
              aria-label={t('feed.commentPost', 'Comentar')}
              className="flex h-10 w-10 items-center justify-center text-stone-950 active:opacity-70"
            >
              <MessageCircle className="h-[26px] w-[26px]" strokeWidth={1.8} />
            </button>

            {/* Compartir */}
            <button
              type="button"
              onClick={handleShare}
              aria-label={t('feed.sharePost', 'Compartir')}
              className="flex h-10 w-10 items-center justify-center text-stone-950 active:opacity-70"
            >
              <Send className="h-[24px] w-[24px] -rotate-12" strokeWidth={1.8} />
            </button>
          </div>

          {/* Guardar */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.84 }}
            onClick={handleSave}
            aria-label={saved ? t('feed.unsavePost', 'Quitar guardado') : t('feed.savePost', 'Guardar')}
            className="flex h-10 w-10 items-center justify-center text-stone-950 active:opacity-70"
          >
            <Bookmark
              className={`h-[26px] w-[26px] transition-all duration-150 ${
                saved ? 'fill-stone-950 text-stone-950 scale-105' : 'text-stone-950'
              }`}
              strokeWidth={saved ? 0 : 1.8}
            />
          </motion.button>
        </div>

        {/* Likes */}
        {likeCount > 0 ? (
          <p className="mb-1 text-[13.5px] font-semibold text-stone-950">
            {likeCount === 1
              ? t('feed.oneLike', '1 me gusta')
              : t('feed.multipleLikes', '{{count}} me gusta', { count: likeCount.toLocaleString('es-ES') })}
          </p>
        ) : null}

        {/* Caption colapsable */}
        <Caption
          author={authorName}
          text={post.caption}
          expanded={captionExpanded}
          onExpand={() => setCaptionExpanded(true)}
        />

        {/* Ver comentarios */}
        {post.comments > 0 ? (
          <button
            type="button"
            onClick={handleComment}
            aria-label={t('feed.viewCommentsAria', 'Ver comentarios')}
            className="mt-1 block text-[13px] text-stone-400 transition-colors hover:text-stone-600"
          >
            {t('feed.viewComments', 'Ver los {{count}} comentarios', { count: post.comments })}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default PostCard;
