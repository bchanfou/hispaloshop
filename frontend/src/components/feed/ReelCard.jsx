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
  Volume2,
  VolumeX,
} from 'lucide-react';

const priceFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const formatPrice = (price) => priceFormatter.format(price);

export default function ReelCard({ reel, isActive, onLike, onComment, onShare, embedded = false, priority = false }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const playIconTimer = useRef(null);
  const lastTapRef = useRef(0);
  const singleTapTimer = useRef(null);

  const [liked, setLiked] = useState(reel.liked ?? reel.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(reel.likes ?? reel.likes_count ?? 0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [progress, setProgress] = useState(0);
  const doubleTapHeartTimer = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(playIconTimer.current);
      clearTimeout(singleTapTimer.current);
      clearTimeout(doubleTapHeartTimer.current);
    };
  }, []);

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

  // Pause on tab switch (visibilitychange)
  useEffect(() => {
    const handleVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
        setPlaying(false);
      } else if (isActive) {
        video.play().catch(() => {});
        setPlaying(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isActive]);

  // Track video progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      if (video.duration > 0) setProgress(video.currentTime / video.duration);
    };
    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
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
    clearTimeout(playIconTimer.current);
    playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 600);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const handleLike = useCallback(() => {
    const next = !liked;
    setLiked(next);
    setLikesCount((c) => (next ? c + 1 : c - 1));
    onLike?.(reel.id, next);
  }, [liked, reel.id, onLike]);

  // Single tap = play/pause (250ms debounce), double-tap = like
  const handleVideoTap = useCallback(() => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;

    if (isDoubleTap) {
      clearTimeout(singleTapTimer.current);
      if (!liked) {
        setLiked(true);
        setLikesCount((c) => c + 1);
        onLike?.(reel.id, true);
      }
      setShowDoubleTapHeart(true);
      clearTimeout(doubleTapHeartTimer.current);
      doubleTapHeartTimer.current = setTimeout(() => setShowDoubleTapHeart(false), 800);
    } else {
      singleTapTimer.current = setTimeout(() => {
        togglePlay();
      }, 250);
    }
  }, [liked, reel.id, onLike, togglePlay]);

  const videoUrl = reel.video_url || reel.videoUrl;
  const thumbnailUrl = reel.thumbnail_url || reel.thumbnail;
  const avatarUrl = reel.user?.avatar_url || reel.user?.avatar || reel.user?.profile_image;
  const reelCommentsCount = reel.comments_count ?? reel.comments ?? 0;
  const product = reel.products?.[0] || reel.productTag || null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden snap-start ${
        embedded ? 'h-[400px]' : 'h-dvh'
      }`}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
        preload={priority ? 'auto' : 'none'}
        onClick={handleVideoTap}
        aria-label={playing ? 'Pausar vídeo' : 'Reproducir vídeo'}
      />

      {/* Play/Pause icon flash */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none motion-reduce:hidden"
        style={{
          opacity: showPlayIcon ? 0.8 : 0,
          transition: `opacity ${showPlayIcon ? '100ms' : '400ms'} ease`,
        }}
      >
        {playing ? (
          <Pause size={48} className="text-white" />
        ) : (
          <Play size={48} className="text-white fill-white" />
        )}
      </div>

      {/* Stable keyframe — always present to avoid DOM thrashing */}
      <style>{`@keyframes heartPop { 0% { transform: scale(0); opacity: 1; } 30% { transform: scale(1.2); } 50% { transform: scale(0.95); } 70% { transform: scale(1); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }`}</style>

      {/* Double-tap heart */}
      {showDoubleTapHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5] motion-reduce:hidden">
          <Heart
            size={80}
            className="text-white fill-white"
            style={{
              animation: 'heartPop 0.8s ease-out forwards',
            }}
          />
        </div>
      )}

      {/* Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />

      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-10 w-11 h-11 rounded-full bg-black/40 flex items-center justify-center"
        aria-label={muted ? 'Activar sonido' : 'Silenciar'}
      >
        {muted ? (
          <VolumeX className="w-5 h-5 text-white" />
        ) : (
          <Volume2 className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Actions column */}
      <div
        className={`absolute right-4 flex flex-col gap-5 items-center z-[2] ${
          embedded ? 'bottom-20' : 'bottom-[120px]'
        }`}
      >
        {/* Avatar + follow */}
        <div className="relative flex flex-col items-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={reel.user?.name || 'Usuario'}
              className="w-10 h-10 rounded-full object-cover border-2 border-white bg-stone-800"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-white bg-stone-800 flex items-center justify-center text-sm font-bold text-white">
              {(reel.user?.name || '?')[0].toUpperCase()}
            </div>
          )}
          <button
            className="absolute -bottom-3 w-11 h-11 rounded-full bg-transparent border-none flex items-center justify-center"
            aria-label="Seguir"
          >
            <span className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
              <Plus size={12} className="text-white" strokeWidth={3} />
            </span>
          </button>
        </div>

        {/* Like */}
        <button
          className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform"
          onClick={handleLike}
          aria-label={liked ? `Quitar me gusta · ${likesCount}` : `Me gusta · ${likesCount}`}
          aria-pressed={liked}
        >
          <Heart
            size={28}
            className={liked ? 'text-white fill-white' : 'text-white'}
          />
          <span className="text-xs text-white font-sans leading-none">{likesCount}</span>
        </button>

        {/* Comment */}
        <button
          className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform"
          onClick={() => onComment?.(reel.id)}
          aria-label="Comentar"
        >
          <MessageCircle size={28} className="text-white" />
          <span className="text-xs text-white font-sans leading-none">{reelCommentsCount}</span>
        </button>

        {/* Share */}
        <button
          className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform"
          onClick={() => onShare?.(reel.id)}
          aria-label="Compartir"
        >
          <Share2 size={28} className="text-white" />
        </button>

        {/* Bookmark */}
        <button
          className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform"
          aria-label="Guardar"
        >
          <Bookmark size={28} className="text-white" />
        </button>
      </div>

      {/* Info bottom-left */}
      <div
        className={`absolute left-4 right-20 z-[2] ${
          embedded
            ? product ? 'bottom-[76px]' : 'bottom-[50px]'
            : product ? 'bottom-[76px]' : 'bottom-20'
        }`}
      >
        <button
          className="text-[15px] font-semibold text-white font-sans mb-1.5 bg-transparent border-none p-0 cursor-pointer text-left"
          onClick={() => reel.user?.id && navigate(`/profile/${reel.user.id}`)}
          aria-label={`Ver perfil de ${reel.user?.name || 'usuario'}`}
        >
          {reel.user?.name}
        </button>
        {reel.caption && (
          <div className="text-[13px] text-white/85 font-sans line-clamp-2 leading-[1.4] mb-1.5">
            {reel.caption}
          </div>
        )}
        {reel.music_name && (
          <div className="text-xs text-white/60 font-sans">
            🎵 {reel.music_name}
          </div>
        )}
      </div>

      {/* Product CTA */}
      {product && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/15 backdrop-blur-xl rounded-full p-2 flex items-center z-[2]">
          {(product.image || product.thumbnail) && (
            <img
              src={product.image || product.thumbnail}
              alt={product.name || product.title}
              className="w-9 h-9 rounded-lg object-cover shrink-0 bg-stone-700"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <div className="flex-1 mx-2.5 min-w-0">
            <div className="text-[13px] font-semibold text-white font-sans truncate">
              {product.name || product.title}
            </div>
            {product.price != null && (
              <div className="text-xs text-white/85 font-sans">
                {formatPrice(product.price)}
              </div>
            )}
          </div>
          <button
            className="bg-white text-stone-950 text-[13px] font-semibold font-sans py-2 px-4 rounded-full border-none cursor-pointer shrink-0 hover:bg-stone-100 active:bg-stone-200 transition-colors"
            onClick={() => navigate(`/product/${product.id || product.product_id}`)}
          >
            Añadir
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-[3]">
        <div
          className="h-full w-full bg-white/80 origin-left"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
