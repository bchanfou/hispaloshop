import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateString) {
  if (!dateString) return '';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'hace 1m';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}

const priceFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const formatPrice = (price) => priceFormatter.format(price);

// Inject keyframe once at module level (idempotent)
if (typeof document !== 'undefined' && !document.getElementById('postcard-heart-keyframe')) {
  const style = document.createElement('style');
  style.id = 'postcard-heart-keyframe';
  style.textContent = `
    @keyframes postcard-heart-pop {
      0%   { opacity: 0; transform: scale(0.5); }
      15%  { opacity: 1; transform: scale(1.3); }
      30%  { opacity: 1; transform: scale(1); }
      70%  { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(1); }
    }
    .postcard-heart-active { animation: postcard-heart-pop 0.9s ease forwards; }
  `;
  document.head.appendChild(style);
}

function renderCaption(text) {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('#') ? (
      <span key={i} className="text-stone-500">{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------

export default function PostCard({ post, onLike, onComment, onShare, onSave, priority = false }) {
  const navigate = useNavigate();

  // Local optimistic state — accept both prop schemas
  const [liked, setLiked] = useState(post.liked ?? post.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes ?? post.likes_count ?? 0);
  const [saved, setSaved] = useState(post.saved ?? post.is_saved ?? false);
  const [expanded, setExpanded] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);

  const lastTapRef = useRef(0);
  const heartTimerRef = useRef(null);
  const scrollRef = useRef(null);

  // ---- handlers -----------------------------------------------------------

  const handleLike = useCallback(() => {
    const next = !liked;
    setLiked(next);
    setLikesCount((c) => (next ? c + 1 : c - 1));
    onLike?.(post.id);
  }, [liked, onLike, post.id]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!liked) {
        setLiked(true);
        setLikesCount((c) => c + 1);
        onLike?.(post.id);
      }
      setShowHeartAnim(true);
      clearTimeout(heartTimerRef.current);
      heartTimerRef.current = setTimeout(() => setShowHeartAnim(false), 900);
    }
    lastTapRef.current = now;
  }, [liked, onLike, post.id]);

  const handleSave = useCallback(() => {
    setSaved((s) => !s);
    onSave?.(post.id);
  }, [onSave, post.id]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setCarouselIndex(idx);
  }, []);

  // ---- derived (accept both prop schemas) --------------------------------

  const images = (() => {
    if (Array.isArray(post.images) && post.images.length > 0) return post.images;
    if (Array.isArray(post.media) && post.media.length > 0) return post.media.map((m) => (typeof m === 'string' ? m : m?.url)).filter(Boolean);
    if (post.image_url) return [post.image_url];
    return [];
  })();
  const hasMultiple = images.length > 1;
  const user = post.user ?? {};
  const avatarUrl = user.avatar_url || user.avatar || user.profile_image;
  const captionText = post.content ?? post.caption ?? '';
  const commentsCount = post.comments_count ?? post.comments ?? 0;
  const createdAt = post.created_at ?? post.timestamp;
  const hasStory = user.has_story ?? post.has_story ?? false;
  const normalizedProducts = Array.isArray(post.products) && post.products.length > 0
    ? post.products
    : post.productTag ? [post.productTag] : [];

  const shouldClamp = !expanded && captionText && captionText.length > 140;

  // ---- render -------------------------------------------------------------

  return (
    <article className="border-b border-stone-200 bg-white font-sans">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div
          className={`flex shrink-0 items-center justify-center rounded-full ${
            hasStory ? 'h-9 w-9 bg-stone-950 p-0.5' : 'h-9 w-9'
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user.name}
              className={`rounded-full object-cover ${
                hasStory ? 'h-[30px] w-[30px] border-2 border-white' : 'h-9 w-9'
              }`}
            />
          ) : (
            <div
              className={`rounded-full bg-stone-200 ${
                hasStory ? 'h-[30px] w-[30px] border-2 border-white' : 'h-9 w-9'
              }`}
            />
          )}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
          <span className="text-sm font-semibold text-stone-950 whitespace-nowrap">{user.name}</span>
          {user.username && (
            <span className="text-xs text-stone-500 whitespace-nowrap">@{user.username}</span>
          )}
          {createdAt && (
            <>
              <span className="text-[11px] text-stone-500">&middot;</span>
              <span className="text-[11px] text-stone-500 whitespace-nowrap">{timeAgo(createdAt)}</span>
            </>
          )}
        </div>

        <button
          className="flex shrink-0 items-center justify-center min-w-[44px] min-h-[44px] p-3 bg-transparent border-none cursor-pointer text-stone-500"
          aria-label="Opciones"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* ---- Media ---- */}
      {images.length > 0 && (
        <div className="relative w-full overflow-hidden">
          <div
            ref={scrollRef}
            className={`scrollbar-hide flex ${
              hasMultiple ? 'snap-x snap-mandatory overflow-x-auto' : 'overflow-hidden'
            }`}
            onScroll={handleScroll}
            onClick={handleDoubleTap}
          >
            {images.map((src, i) => (
              <div key={typeof src === 'string' ? src : i} className="min-w-full snap-start">
                <img
                  src={src}
                  alt={`Post ${post.id} imagen ${i + 1}`}
                  className="block w-full aspect-square object-cover"
                  loading={i === 0 && priority ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>

          {/* Heart animation overlay */}
          {showHeartAnim && (
            <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
              <Heart
                size={72}
                className={`fill-stone-950 text-stone-950 ${showHeartAnim ? 'postcard-heart-active' : 'opacity-0'}`}
              />
            </div>
          )}

          {/* Dots */}
          {hasMultiple && (
            <div className="flex justify-center gap-1 py-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-transparent border-none p-0 cursor-pointer"
                  aria-label={`Imagen ${i + 1} de ${images.length}`}
                  onClick={() => {
                    scrollRef.current?.scrollTo({
                      left: i * scrollRef.current.clientWidth,
                      behavior: 'smooth',
                    });
                  }}
                >
                  <span
                    className={`block h-1.5 w-1.5 rounded-full transition-colors duration-150 ${
                      i === carouselIndex ? 'bg-stone-950' : 'bg-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Actions ---- */}
      <div className="flex items-center gap-4 px-3 py-2">
        <button
          className={`flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer transition-transform duration-150 ${
            liked ? 'text-stone-950' : 'text-stone-500'
          }`}
          onClick={handleLike}
          aria-label={liked ? `Quitar me gusta · ${likesCount}` : `Me gusta · ${likesCount}`}
        >
          <Heart
            size={24}
            fill={liked ? 'currentColor' : 'none'}
            color="currentColor"
          />
          {likesCount > 0 && (
            <span className="text-[13px] font-semibold text-stone-950">{likesCount}</span>
          )}
        </button>

        <button
          className="flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer text-stone-500 transition-transform duration-150"
          onClick={() => onComment?.(post.id)}
          aria-label={`Comentar · ${commentsCount}`}
        >
          <MessageCircle size={24} />
          {commentsCount > 0 && (
            <span className="text-[13px] font-semibold text-stone-950">{commentsCount}</span>
          )}
        </button>

        <button
          className="flex min-h-[44px] items-center gap-1 bg-transparent border-none py-2.5 cursor-pointer text-stone-500 transition-transform duration-150"
          onClick={() => onShare?.(post.id)}
          aria-label="Compartir"
        >
          <Share2 size={24} />
        </button>

        <button
          className={`ml-auto flex min-h-[44px] items-center bg-transparent border-none py-2.5 cursor-pointer ${
            saved ? 'text-stone-950' : 'text-stone-500'
          }`}
          onClick={handleSave}
          aria-label={saved ? 'Quitar guardado' : 'Guardar'}
        >
          <Bookmark
            size={24}
            fill={saved ? 'currentColor' : 'none'}
            color="currentColor"
          />
        </button>
      </div>

      {/* ---- Caption ---- */}
      {captionText && (
        <div className="px-4 pb-2 text-sm leading-[1.45] text-stone-950">
          <div className={shouldClamp ? 'line-clamp-3' : ''}>
            <span className="mr-1 font-semibold">{user.name}</span>
            {renderCaption(captionText)}
          </div>
          {shouldClamp && (
            <button
              className="min-h-[44px] bg-transparent border-none p-0 py-1 text-sm text-stone-500 cursor-pointer font-[inherit]"
              onClick={() => setExpanded(true)}
            >
              ... Ver m&aacute;s
            </button>
          )}
        </div>
      )}

      {/* ---- Tagged products ---- */}
      {normalizedProducts.length > 0 && (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-3">
          {normalizedProducts.map((product) => (
            <button
              key={product.id || product.product_id}
              className="flex shrink-0 items-center gap-2 rounded-full bg-stone-100 py-1 pl-1 pr-3 border-none cursor-pointer font-[inherit]"
              onClick={() => navigate(`/product/${product.id || product.product_id}`)}
            >
              {(product.image || product.thumbnail) && (
                <img
                  src={product.image || product.thumbnail}
                  alt={product.name || product.title}
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <span className="max-w-[120px] truncate text-xs font-medium text-stone-950">
                {product.name || product.title}
              </span>
              {product.price != null && (
                <span className="whitespace-nowrap text-xs font-bold text-stone-950">
                  {formatPrice(product.price)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
