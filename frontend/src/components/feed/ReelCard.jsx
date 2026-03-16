import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Play,
  Pause,
  Plus,
} from 'lucide-react';

const formatPrice = (price) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(
    price
  );

export default function ReelCard({ reel, isActive, onLike, embedded = false }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(reel.likes_count ?? 0);
  const [playing, setPlaying] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  // IntersectionObserver auto play/pause
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
          setPlaying(true);
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.8 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // External isActive control
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive === true) {
      video.play().catch(() => {});
      setPlaying(true);
    } else if (isActive === false) {
      video.pause();
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
  }, []);

  const handleLike = useCallback(() => {
    const next = !liked;
    setLiked(next);
    setLikesCount((c) => (next ? c + 1 : c - 1));
    onLike?.(reel.id, next);
  }, [liked, reel.id, onLike]);

  const product = reel.products?.[0];

  // ---- Styles ----

  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: embedded ? '400px' : '100dvh',
    background: 'var(--color-black)',
    overflow: 'hidden',
    scrollSnapAlign: 'start',
  };

  const videoStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const playIconOverlayStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    opacity: showPlayIcon ? 0.8 : 0,
    transition: `opacity ${showPlayIcon ? '0.1s' : '0.4s'} ease`,
  };

  const gradientStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    background:
      'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
    pointerEvents: 'none',
  };

  const actionsStyle = {
    position: 'absolute',
    right: '16px',
    bottom: embedded ? '80px' : '120px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'center',
    zIndex: 2,
  };

  const actionBtnStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))',
  };

  const actionCountStyle = {
    fontSize: '12px',
    color: 'var(--color-white)',
    fontFamily: 'var(--font-sans)',
    lineHeight: 1,
  };

  const infoStyle = {
    position: 'absolute',
    bottom: embedded ? '50px' : '80px',
    left: '16px',
    right: '80px',
    zIndex: 2,
  };

  const nameStyle = {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-white)',
    fontFamily: 'var(--font-sans)',
    marginBottom: '6px',
  };

  const captionStyle = {
    fontSize: '13px',
    color: 'var(--color-white)',
    opacity: 0.85,
    fontFamily: 'var(--font-sans)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: 1.4,
    marginBottom: '6px',
  };

  const musicStyle = {
    fontSize: '12px',
    color: 'var(--color-white)',
    opacity: 0.6,
    fontFamily: 'var(--font-sans)',
  };

  const avatarWrapperStyle = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  const avatarStyle = {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-full)',
    objectFit: 'cover',
    border: '2px solid var(--color-white)',
  };

  const followBtnStyle = {
    position: 'absolute',
    bottom: '-10px',
    width: '20px',
    height: '20px',
    borderRadius: 'var(--radius-full)',
    background: 'var(--color-green)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  };

  const ctaBarStyle = {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    right: '16px',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: 'var(--radius-full)',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    zIndex: 2,
  };

  const ctaThumbStyle = {
    width: '36px',
    height: '36px',
    borderRadius: 'var(--radius-md)',
    objectFit: 'cover',
    flexShrink: 0,
  };

  const ctaInfoStyle = {
    flex: 1,
    marginLeft: '10px',
    marginRight: '10px',
    minWidth: 0,
  };

  const ctaNameStyle = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--color-white)',
    fontFamily: 'var(--font-sans)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const ctaPriceStyle = {
    fontSize: '12px',
    color: 'var(--color-white)',
    opacity: 0.85,
    fontFamily: 'var(--font-sans)',
  };

  const ctaBtnStyle = {
    background: 'var(--color-white)',
    color: 'var(--color-black)',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
    padding: '8px 16px',
    borderRadius: 'var(--radius-full)',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'var(--transition-fast)',
  };

  // ---- Render ----

  return (
    <div ref={containerRef} style={containerStyle}>
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.video_url}
        poster={reel.thumbnail_url}
        style={videoStyle}
        loop
        playsInline
        muted
        onClick={togglePlay}
      />

      {/* Play/Pause icon flash */}
      <div style={playIconOverlayStyle}>
        {playing ? (
          <Pause size={48} color="var(--color-white)" />
        ) : (
          <Play size={48} color="var(--color-white)" fill="var(--color-white)" />
        )}
      </div>

      {/* Gradient */}
      <div style={gradientStyle} />

      {/* Actions column */}
      <div style={actionsStyle}>
        {/* Avatar + follow */}
        <div style={avatarWrapperStyle}>
          <img
            src={reel.user?.avatar_url}
            alt={reel.user?.name}
            style={avatarStyle}
          />
          <button style={followBtnStyle} aria-label="Seguir">
            <Plus size={14} color="var(--color-white)" strokeWidth={3} />
          </button>
        </div>

        {/* Like */}
        <button style={actionBtnStyle} onClick={handleLike} aria-label="Me gusta">
          <Heart
            size={28}
            color={liked ? '#ef4444' : 'var(--color-white)'}
            fill={liked ? '#ef4444' : 'none'}
          />
          <span style={actionCountStyle}>{likesCount}</span>
        </button>

        {/* Comment */}
        <button style={actionBtnStyle} aria-label="Comentar">
          <MessageCircle size={28} color="var(--color-white)" />
          <span style={actionCountStyle}>{reel.comments_count ?? 0}</span>
        </button>

        {/* Share */}
        <button style={actionBtnStyle} aria-label="Compartir">
          <Share2 size={28} color="var(--color-white)" />
        </button>

        {/* Bookmark */}
        <button style={actionBtnStyle} aria-label="Guardar">
          <Bookmark size={28} color="var(--color-white)" />
        </button>
      </div>

      {/* Info bottom-left */}
      <div style={infoStyle}>
        <div style={nameStyle}>{reel.user?.name}</div>
        {reel.caption && <div style={captionStyle}>{reel.caption}</div>}
        {reel.music_name && (
          <div style={musicStyle}>🎵 {reel.music_name}</div>
        )}
      </div>

      {/* Product CTA */}
      {product && (
        <div style={ctaBarStyle}>
          {product.image && (
            <img src={product.image} alt={product.name} style={ctaThumbStyle} />
          )}
          <div style={ctaInfoStyle}>
            <div style={ctaNameStyle}>{product.name}</div>
            <div style={ctaPriceStyle}>{formatPrice(product.price)}</div>
          </div>
          <button
            style={ctaBtnStyle}
            onClick={() => navigate(`/product/${product.id}`)}
          >
            Añadir
          </button>
        </div>
      )}
    </div>
  );
}
