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

const formatPrice = (price) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(price);

// Regex to split caption into segments of plain text vs hashtags
function renderCaption(text) {
  if (!text) return null;
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith('#') ? (
      <span key={i} style={{ color: 'var(--color-stone)' }}>{part}</span>
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
  const captionRef = useRef(null);

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
      // Double tap — always like (never unlike)
      if (!liked) {
        setLiked(true);
        setLikesCount((c) => c + 1);
        onLike?.(post.id);
      }
      // Trigger animation
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

  const images = post.images ?? (Array.isArray(post.media) ? post.media.map((m) => (typeof m === 'string' ? m : m?.url)).filter(Boolean) : []);
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

  // Caption line-clamp check (approximate: >3 lines → clamp)
  const shouldClamp = !expanded && captionText && captionText.length > 140;

  // ---- styles -------------------------------------------------------------

  const S = {
    container: {
      background: 'var(--color-white)',
      borderBottom: '1px solid var(--color-border)',
      fontFamily: 'var(--font-sans)',
    },

    // Header
    header: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      gap: 10,
    },
    avatarWrap: {
      flexShrink: 0,
      width: 36,
      height: 36,
      borderRadius: 'var(--radius-full)',
      padding: hasStory ? 2 : 0,
      background: hasStory
        ? 'var(--color-black)'
        : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: hasStory ? 30 : 36,
      height: hasStory ? 30 : 36,
      borderRadius: 'var(--radius-full)',
      objectFit: 'cover',
      border: hasStory ? '2px solid var(--color-white)' : 'none',
    },
    headerInfo: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      flexWrap: 'wrap',
    },
    name: {
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--color-black)',
      whiteSpace: 'nowrap',
    },
    handle: {
      fontSize: 12,
      color: 'var(--color-stone)',
      whiteSpace: 'nowrap',
    },
    sep: {
      fontSize: 11,
      color: 'var(--color-stone)',
    },
    time: {
      fontSize: 11,
      color: 'var(--color-stone)',
      whiteSpace: 'nowrap',
    },
    moreBtn: {
      background: 'none',
      border: 'none',
      padding: 4,
      cursor: 'pointer',
      color: 'var(--color-stone)',
      display: 'flex',
      alignItems: 'center',
      flexShrink: 0,
    },

    // Media
    mediaWrap: {
      position: 'relative',
      width: '100%',
      overflow: 'hidden',
    },
    scrollContainer: {
      display: 'flex',
      overflowX: hasMultiple ? 'auto' : 'hidden',
      scrollSnapType: hasMultiple ? 'x mandatory' : undefined,
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
    slide: {
      minWidth: '100%',
      scrollSnapAlign: 'start',
    },
    img: {
      width: '100%',
      aspectRatio: '1 / 1',
      objectFit: 'cover',
      display: 'block',
    },
    dots: {
      display: 'flex',
      justifyContent: 'center',
      gap: 4,
      padding: '8px 0',
    },
    dot: (active) => ({
      width: 24,
      height: 24,
      borderRadius: 'var(--radius-full)',
      background: 'transparent',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }),
    dotInner: (active) => ({
      width: 6,
      height: 6,
      borderRadius: 'var(--radius-full)',
      background: active ? 'var(--color-black)' : 'var(--color-border)',
      transition: 'var(--transition-fast)',
    }),

    // Heart animation overlay
    heartOverlay: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 2,
    },

    // Actions
    actions: {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      gap: 16,
    },
    actionBtn: {
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      color: 'var(--color-stone)',
      transition: 'transform 0.15s ease',
    },
    actionCount: {
      fontSize: 13,
      fontWeight: 600,
      color: 'var(--color-black)',
    },
    bookmarkBtn: {
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      color: 'var(--color-stone)',
    },

    // Caption
    caption: {
      padding: '0 16px 8px',
      fontSize: 14,
      lineHeight: 1.45,
      color: 'var(--color-black)',
    },
    captionName: {
      fontWeight: 600,
      marginRight: 4,
    },
    captionText: shouldClamp
      ? {
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }
      : {},
    verMas: {
      color: 'var(--color-stone)',
      cursor: 'pointer',
      background: 'none',
      border: 'none',
      padding: 0,
      fontSize: 14,
      fontFamily: 'inherit',
    },

    // Products
    productsRow: {
      display: 'flex',
      overflowX: 'auto',
      gap: 8,
      padding: '0 16px 12px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    },
    productPill: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-full)',
      padding: '4px 12px 4px 4px',
      cursor: 'pointer',
      flexShrink: 0,
      border: 'none',
      fontFamily: 'inherit',
    },
    productImg: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-full)',
      objectFit: 'cover',
    },
    productName: {
      fontSize: 12,
      fontWeight: 500,
      color: 'var(--color-black)',
      whiteSpace: 'nowrap',
      maxWidth: 120,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    productPrice: {
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--color-black)',
      whiteSpace: 'nowrap',
    },
  };

  // ---- keyframes (injected once) ------------------------------------------

  const heartAnimStyle = showHeartAnim
    ? {
        animation: 'postcard-heart-pop 0.9s ease forwards',
      }
    : { opacity: 0 };

  // ---- render -------------------------------------------------------------

  return (
    <article style={S.container}>
      {/* Inline keyframe — only rendered when animating */}
      {showHeartAnim && (
        <style>{`
          @keyframes postcard-heart-pop {
            0%   { opacity: 0; transform: scale(0.5); }
            15%  { opacity: 1; transform: scale(1.3); }
            30%  { opacity: 1; transform: scale(1); }
            70%  { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(1); }
          }
        `}</style>
      )}

      {/* ---- Header ---- */}
      <div style={S.header}>
        <div style={S.avatarWrap}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={user.name} style={S.avatar} />
          ) : (
            <div
              style={{
                ...S.avatar,
                background: 'var(--color-border)',
              }}
            />
          )}
        </div>

        <div style={S.headerInfo}>
          <span style={S.name}>{user.name}</span>
          {user.username && <span style={S.handle}>@{user.username}</span>}
          {createdAt && (
            <>
              <span style={S.sep}>&middot;</span>
              <span style={S.time}>{timeAgo(createdAt)}</span>
            </>
          )}
        </div>

        <button style={S.moreBtn} aria-label="Opciones">
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* ---- Media ---- */}
      {images.length > 0 && (
        <div style={S.mediaWrap}>
          <div
            ref={scrollRef}
            style={S.scrollContainer}
            onScroll={handleScroll}
            onClick={handleDoubleTap}
          >
            {images.map((src, i) => (
              <div key={typeof src === 'string' ? src : i} style={S.slide}>
                <img
                  src={src}
                  alt={`Post ${post.id} imagen ${i + 1}`}
                  style={S.img}
                  loading={i === 0 && priority ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>

          {/* Heart animation overlay */}
          {showHeartAnim && (
            <div style={S.heartOverlay}>
              <Heart
                size={72}
                fill="var(--color-black)"
                color="var(--color-black)"
                style={heartAnimStyle}
              />
            </div>
          )}

          {/* Dots */}
          {hasMultiple && (
            <div style={S.dots}>
              {images.map((_, i) => (
                <button
                  key={i}
                  style={S.dot(i === carouselIndex)}
                  aria-label={`Imagen ${i + 1} de ${images.length}`}
                  onClick={() => {
                    scrollRef.current?.scrollTo({
                      left: i * scrollRef.current.clientWidth,
                      behavior: 'smooth',
                    });
                  }}
                >
                  <span style={S.dotInner(i === carouselIndex)} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Actions ---- */}
      <div style={S.actions}>
        <button
          style={{
            ...S.actionBtn,
            color: liked ? 'var(--color-black)' : 'var(--color-stone)',
          }}
          onClick={handleLike}
          aria-label={liked ? `Quitar me gusta · ${likesCount}` : `Me gusta · ${likesCount}`}
        >
          <Heart
            size={24}
            fill={liked ? 'var(--color-black)' : 'none'}
            color={liked ? 'var(--color-black)' : 'currentColor'}
          />
          {likesCount > 0 && <span style={S.actionCount}>{likesCount}</span>}
        </button>

        <button
          style={S.actionBtn}
          onClick={() => onComment?.(post.id)}
          aria-label={`Comentar · ${commentsCount}`}
        >
          <MessageCircle size={24} />
          {commentsCount > 0 && (
            <span style={S.actionCount}>{commentsCount}</span>
          )}
        </button>

        <button style={S.actionBtn} onClick={() => onShare?.(post.id)} aria-label="Compartir">
          <Share2 size={24} />
        </button>

        <button
          style={{
            ...S.bookmarkBtn,
            color: saved ? 'var(--color-black)' : 'var(--color-stone)',
          }}
          onClick={handleSave}
          aria-label={saved ? 'Quitar guardado' : 'Guardar'}
        >
          <Bookmark
            size={24}
            fill={saved ? 'var(--color-black)' : 'none'}
            color={saved ? 'var(--color-black)' : 'currentColor'}
          />
        </button>
      </div>

      {/* ---- Caption ---- */}
      {captionText && (
        <div style={S.caption}>
          <div style={S.captionText} ref={captionRef}>
            <span style={S.captionName}>{user.name}</span>
            {renderCaption(captionText)}
          </div>
          {shouldClamp && (
            <button style={S.verMas} onClick={() => setExpanded(true)}>
              ... Ver m&aacute;s
            </button>
          )}
        </div>
      )}

      {/* ---- Tagged products ---- */}
      {normalizedProducts.length > 0 && (
        <div style={S.productsRow}>
          {normalizedProducts.map((product) => (
            <button
              key={product.id || product.product_id}
              style={S.productPill}
              onClick={() => navigate(`/product/${product.id || product.product_id}`)}
            >
              {(product.image || product.thumbnail) && (
                <img
                  src={product.image || product.thumbnail}
                  alt={product.name || product.title}
                  style={S.productImg}
                />
              )}
              <span style={S.productName}>{product.name || product.title}</span>
              {product.price != null && <span style={S.productPrice}>{formatPrice(product.price)}</span>}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
