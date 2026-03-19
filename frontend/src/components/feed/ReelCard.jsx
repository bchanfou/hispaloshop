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
  Check,
  Volume2,
  VolumeX,
  Send,
  X as XIcon,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';

const priceFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const formatPrice = (price) => priceFormatter.format(price);

// Inject keyframe once at module level (idempotent)
if (typeof document !== 'undefined' && !document.getElementById('reelcard-heart-keyframe')) {
  const style = document.createElement('style');
  style.id = 'reelcard-heart-keyframe';
  style.textContent = '@keyframes heartPop { 0% { transform: scale(0); opacity: 1; } 30% { transform: scale(1.2); } 50% { transform: scale(0.95); } 70% { transform: scale(1); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }';
  document.head.appendChild(style);
}

export default function ReelCard({ reel, isActive, onLike, onComment, onShare, embedded = false, priority = false }) {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [likedComments, setLikedComments] = useState(new Set());
  const [replyTo, setReplyTo] = useState(null);
  const [isFollowing, setIsFollowing] = useState(reel.is_following ?? false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const playIconTimer = useRef(null);
  const lastTapRef = useRef(0);
  const singleTapTimer = useRef(null);

  const [liked, setLiked] = useState(reel.liked ?? reel.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(reel.likes ?? reel.likes_count ?? 0);
  const [saved, setSaved] = useState(reel.saved ?? reel.is_saved ?? false);
  const [playing, setPlaying] = useState(false);

  // Sync local state when props change (e.g. from React Query cache update)
  useEffect(() => {
    setLiked(reel.liked ?? reel.is_liked ?? false);
    setLikesCount(reel.likes ?? reel.likes_count ?? 0);
  }, [reel.liked, reel.is_liked, reel.likes, reel.likes_count]);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('hsp_reel_muted') !== 'false'; } catch { return true; }
  });
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const doubleTapHeartTimer = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(playIconTimer.current);
      clearTimeout(singleTapTimer.current);
      clearTimeout(doubleTapHeartTimer.current);
    };
  }, []);

  // Track view (fire once per mount)
  const viewTrackedRef = useRef(false);

  // IntersectionObserver auto play/pause
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => { setPlaying(false); });
          setPlaying(true);
          // Track view once when reel becomes visible
          if (!viewTrackedRef.current) {
            viewTrackedRef.current = true;
            const reelId = reel.id || reel.reel_id || reel.post_id;
            if (reelId) apiClient.post(`/reels/${reelId}/view`).catch(() => {});
          }
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [reel.id, reel.reel_id, reel.post_id]);

  // Pause on tab switch (visibilitychange)
  useEffect(() => {
    const handleVisibility = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        video.pause();
        setPlaying(false);
      } else if (isActive) {
        video.play().catch(() => { setPlaying(false); });
        setPlaying(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isActive]);

  // Track video progress — throttled to avoid excess re-renders
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let lastUpdate = 0;
    const onTime = () => {
      const now = performance.now();
      if (now - lastUpdate < 250) return; // max 4 updates/sec
      lastUpdate = now;
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
      video.play().catch(() => { setPlaying(false); });
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
      video.play().catch(() => { setPlaying(false); });
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
    setShowPlayIcon(true);
    clearTimeout(playIconTimer.current);
    playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 600);
  }, []);

  // Comment handlers
  const fetchComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const reelId = reel.id || reel.reel_id || reel.post_id;
      const res = await apiClient.get(`/reels/${reelId}/comments?limit=30`);
      setComments(Array.isArray(res) ? res : res?.data || res?.comments || []);
    } catch { setComments([]); }
    finally { setCommentsLoading(false); }
  }, [reel]);

  const submitComment = useCallback(async () => {
    if (!newComment.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      const reelId = reel.id || reel.reel_id || reel.post_id;
      const payload = { text: newComment.trim() };
      if (replyTo) payload.reply_to = replyTo.commentId;
      await apiClient.post(`/reels/${reelId}/comments`, payload);
      setNewComment('');
      setReplyTo(null);
      fetchComments();
    } catch { toast.error('Error al comentar'); }
    finally { setSendingComment(false); }
  }, [newComment, sendingComment, reel, replyTo, fetchComments]);

  const openComments = useCallback(() => {
    setShowComments(true);
    videoRef.current?.pause();
    setPlaying(false);
    fetchComments();
  }, [fetchComments]);

  const closeComments = useCallback(() => {
    setShowComments(false);
    setReplyTo(null);
  }, []);

  const handleLikeComment = useCallback(async (commentId) => {
    setLikedComments(prev => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
    try { await apiClient.post(`/comments/${commentId}/like`); } catch {}
  }, []);

  const handleDeleteComment = useCallback(async (commentId) => {
    try {
      await apiClient.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => (c.comment_id || c.id || c._id) !== commentId));
    } catch { toast.error('Error al eliminar'); }
  }, []);

  const handleReplyComment = useCallback((commentId, username) => {
    setReplyTo({ commentId, username });
    setNewComment(`@${username} `);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    try { localStorage.setItem('hsp_reel_muted', String(video.muted)); } catch {}
  }, []);

  const handleLike = useCallback(async () => {
    const prev = liked;
    const next = !liked;
    setLiked(next);
    setLikesCount((c) => (next ? c + 1 : c - 1));
    const reelId = reel.id || reel.reel_id || reel.post_id;
    try {
      await apiClient.post(`/reels/${reelId}/like`);
    } catch {
      // Rollback on failure
      setLiked(prev);
      setLikesCount((c) => (prev ? c + 1 : c - 1));
      toast.error('Error al dar me gusta');
    }
    onLike?.(reelId, next);
  }, [liked, reel.id, reel.reel_id, reel.post_id, onLike]);

  // Single tap = play/pause (250ms debounce), double-tap = like
  const handleVideoTap = useCallback(() => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;

    if (isDoubleTap) {
      clearTimeout(singleTapTimer.current);
      if (!liked) {
        const reelId = reel.id || reel.reel_id || reel.post_id;
        setLiked(true);
        setLikesCount((c) => c + 1);
        apiClient.post(`/reels/${reelId}/like`).catch(() => {
          setLiked(false);
          setLikesCount((c) => c - 1);
        });
        onLike?.(reelId, true);
      }
      setShowDoubleTapHeart(true);
      clearTimeout(doubleTapHeartTimer.current);
      doubleTapHeartTimer.current = setTimeout(() => setShowDoubleTapHeart(false), 800);
    } else {
      singleTapTimer.current = setTimeout(() => {
        if (embedded) {
          navigate('/reels');
        } else {
          togglePlay();
        }
      }, 250);
    }
  }, [liked, reel.id, onLike, togglePlay, embedded, navigate]);

  const videoUrl = reel.video_url || reel.videoUrl;
  const thumbnailUrl = reel.thumbnail_url || reel.thumbnail;
  const avatarUrl = reel.user?.avatar_url || reel.user?.avatar || reel.user?.profile_image || reel.user_profile_image;
  const reelCommentsCount = reel.comments_count ?? reel.comments ?? 0;
  const product = reel.products?.[0] || reel.tagged_products?.[0] || reel.tagged_product || reel.productTag || null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden snap-start ${
        embedded ? 'h-[400px]' : 'h-dvh'
      }`}
    >
      {/* Video */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={thumbnailUrl || undefined}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          playsInline
          muted={muted}
          preload={priority ? 'metadata' : 'none'}
          onClick={handleVideoTap}
          onLoadedMetadata={() => { if (videoRef.current) setVideoDuration(videoRef.current.duration); }}
          aria-label={playing ? 'Pausar vídeo' : 'Reproducir vídeo'}
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full bg-stone-900 flex items-center justify-center"
          onClick={handleVideoTap}
        >
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Play size={48} className="text-white/30" />
          )}
        </div>
      )}

      {/* Duration badge */}
      {videoDuration > 0 && !playing && (
        <div className="absolute top-4 right-4 z-[2] bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
          <span className="text-[11px] text-white font-semibold font-sans tabular-nums">
            {Math.floor(videoDuration / 60)}:{String(Math.floor(videoDuration % 60)).padStart(2, '0')}
          </span>
        </div>
      )}

      {/* Play/Pause icon — flash on toggle, persistent when paused */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none motion-reduce:hidden"
        style={{
          opacity: showPlayIcon ? 0.8 : (!playing && !showDoubleTapHeart ? 0.5 : 0),
          transition: `opacity ${showPlayIcon ? '100ms' : '400ms'} ease`,
        }}
      >
        <div className="bg-black/30 rounded-full p-4">
          {playing ? (
            <Pause size={36} className="text-white" />
          ) : (
            <Play size={36} className="text-white fill-white" />
          )}
        </div>
      </div>


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
          <div
            onClick={(e) => { e.stopPropagation(); const target = reel.user?.username || reel.user?.id || reel.user?.user_id; if (target) navigate(`/${target}`); }}
            className="cursor-pointer"
            role="link"
            aria-label={`Ver perfil de ${reel.user?.name || reel.user?.full_name || 'usuario'}`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={reel.user?.name || reel.user?.full_name || 'Usuario'}
                className="w-10 h-10 rounded-full object-cover border-2 border-white bg-white/20"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-white bg-white/20 flex items-center justify-center text-sm font-bold text-white">
                {(reel.user?.name || reel.user?.full_name || '?')[0].toUpperCase()}
              </div>
            )}
          </div>
          {(() => {
            const reelUserId = reel.user?.id || reel.user?.user_id;
            const isOwnReel = currentUser && reelUserId && (currentUser.id === reelUserId || currentUser.user_id === reelUserId);
            if (isOwnReel) return null;
            return (
              <button
                className="absolute -bottom-3 w-11 h-11 rounded-full bg-transparent border-none flex items-center justify-center"
                aria-label={isFollowing ? 'Siguiendo' : 'Seguir'}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isFollowing) return;
                  try {
                    const res = await apiClient.post(`/users/${reelUserId}/follow`, {});
                    if (res?.status === 'pending') {
                      toast.success('Solicitud enviada');
                    } else {
                      setIsFollowing(true);
                      toast.success('Siguiendo a ' + (reel.user?.name || reel.user?.full_name || 'usuario'));
                    }
                  } catch {
                    toast.error('No se pudo seguir al usuario');
                  }
                }}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center ${isFollowing ? 'bg-white' : 'bg-black'}`}>
                  {isFollowing ? (
                    <Check size={12} className="text-black" strokeWidth={3} />
                  ) : (
                    <Plus size={12} className="text-white" strokeWidth={3} />
                  )}
                </span>
              </button>
            );
          })()}
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
            className={liked ? 'text-[#FF3040] fill-[#FF3040]' : 'text-white'}
          />
          <span className="text-xs text-white font-sans leading-none">{likesCount}</span>
        </button>

        {/* Comment */}
        <button
          className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform"
          onClick={openComments}
          aria-label="Comentar"
        >
          <MessageCircle size={28} className="text-white" />
          <span className="text-xs text-white font-sans leading-none">{reelCommentsCount}</span>
        </button>

        {/* Share */}
        <button
          className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform"
          onClick={async () => {
            const reelId = reel.id || reel.reel_id || reel.post_id;
            const url = `${window.location.origin}/reels/${reelId}`;
            try {
              if (navigator.share) {
                await navigator.share({ title: reel.caption || 'Reel', url });
              } else {
                await navigator.clipboard?.writeText(url);
                toast.success('Enlace copiado');
              }
            } catch {
              // User cancelled share dialog
            }
            onShare?.(reelId);
          }}
          aria-label="Compartir"
        >
          <Share2 size={28} className="text-white" />
        </button>

        {/* Bookmark */}
        <button
          className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] bg-transparent border-none p-0 cursor-pointer drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] active:scale-90 transition-transform"
          aria-label={saved ? 'Quitar guardado' : 'Guardar'}
          aria-pressed={saved}
          onClick={async () => {
            const next = !saved;
            setSaved(next);
            try {
              const reelId = reel.id || reel.reel_id || reel.post_id;
              await apiClient.post(`/posts/${reelId}/save`);
            } catch {
              setSaved(!next); // rollback
              toast.error('Error al guardar');
            }
          }}
        >
          <Bookmark size={28} fill={saved ? 'currentColor' : 'none'} className="text-white" />
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
          onClick={() => { const target = reel.user?.username || reel.user?.id || reel.user?.user_id; if (target) navigate(`/${target}`); }}
          aria-label={`Ver perfil de ${reel.user?.name || reel.user?.full_name || 'usuario'}`}
        >
          {reel.user?.name || reel.user?.full_name || 'Usuario'}
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
              className="w-9 h-9 rounded-xl object-cover shrink-0 bg-white/20"
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
            onClick={() => navigate(`/products/${product.id || product.product_id}`)}
          >
            Añadir
          </button>
        </div>
      )}

      {/* Comments bottom sheet */}
      {showComments && (
        <div className="absolute inset-0 z-[10] flex flex-col justify-end" onClick={closeComments}>
          <div
            className="bg-stone-950/95 backdrop-blur-xl rounded-t-2xl max-h-[60vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-sm font-semibold text-white">Comentarios</span>
              <button onClick={closeComments} className="bg-transparent border-none cursor-pointer p-1" aria-label="Cerrar">
                <XIcon size={18} className="text-white/60" />
              </button>
            </div>
            {/* List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 min-h-[100px]">
              {commentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-white/40 text-sm py-8">Sé el primero en comentar</p>
              ) : (
                comments.map((c, i) => {
                  const cId = c.comment_id || c.id || c._id;
                  const cName = c.user?.name || c.user_name || c.username || 'Usuario';
                  const isOwn = currentUser?.user_id === c.user_id;
                  return (
                    <div key={cId || i} className="flex gap-2.5 py-2.5 group">
                      <div className="w-8 h-8 rounded-full bg-white/20 shrink-0 flex items-center justify-center text-white text-[10px] font-semibold overflow-hidden">
                        {(c.user?.avatar_url || c.user_profile_image || c.avatar_url) ? (
                          <img src={c.user?.avatar_url || c.user_profile_image || c.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          cName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-white/90 leading-[1.4]">
                          <span className="font-semibold text-white mr-1.5">{cName}</span>
                          {c.text || c.content}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-white/30">{c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}</span>
                          <button
                            onClick={() => handleLikeComment(cId)}
                            className="bg-transparent border-none cursor-pointer p-0 flex items-center gap-1 min-h-[28px]"
                          >
                            <Heart size={12} className={likedComments.has(cId) ? 'text-[#FF3040] fill-[#FF3040]' : 'text-white/40'} strokeWidth={1.8} />
                            {(c.likes_count || 0) > 0 && <span className="text-[10px] text-white/40">{c.likes_count}</span>}
                          </button>
                          <button
                            onClick={() => handleReplyComment(cId, cName)}
                            className="bg-transparent border-none cursor-pointer p-0 text-[10px] text-white/40 font-semibold hover:text-white/70 min-h-[28px] flex items-center"
                          >
                            Responder
                          </button>
                          {isOwn && (
                            <button
                              onClick={() => handleDeleteComment(cId)}
                              className="bg-transparent border-none cursor-pointer p-0 min-h-[28px] flex items-center"
                            >
                              <Trash2 size={12} className="text-white/30 hover:text-white/60" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Reply indicator */}
            {replyTo && (
              <div className="flex items-center justify-between px-4 py-1.5 border-t border-white/10">
                <span className="text-[11px] text-white/50">Respondiendo a <span className="font-semibold text-white/70">@{replyTo.username}</span></span>
                <button onClick={() => { setReplyTo(null); setNewComment(''); }} className="bg-transparent border-none cursor-pointer p-0">
                  <XIcon size={12} className="text-white/40" />
                </button>
              </div>
            )}
            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
                placeholder="Añade un comentario..."
                className="flex-1 bg-white/10 text-white border-none rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-white/30 font-sans"
                aria-label="Escribir comentario"
              />
              <button
                onClick={submitComment}
                disabled={!newComment.trim() || sendingComment}
                className={`w-9 h-9 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors ${
                  newComment.trim() ? 'bg-white text-stone-950' : 'bg-white/10 text-white/30'
                }`}
                aria-label="Enviar comentario"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar — clickable to seek */}
      <div
        className="absolute bottom-0 left-0 right-0 h-2 bg-white/20 z-[3] cursor-pointer"
        onClick={(e) => {
          const video = videoRef.current;
          if (!video || !video.duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          video.currentTime = ratio * video.duration;
          setProgress(ratio);
        }}
        role="slider"
        aria-label="Progreso del vídeo"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full w-full bg-white/90 origin-left"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
