import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useReelPlayer from './useReelPlayer';
import ReelVideo from './ReelVideo';
import ReelSidebar from './ReelSidebar';
import ReelOverlay from './ReelOverlay';
import ReelComments from './ReelComments';
import ProductDrawer from './ProductDrawer';
import LikeAnimation from './LikeAnimation';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

function ReelPlayer({ reel, isActive, onNext, onPrev }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const containerRef = useRef(null);
  const [showComments, setShowComments] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [likePosition, setLikePosition] = useState({ x: '50%', y: '50%' });

  const {
    videoRef,
    isPlaying,
    isMuted,
    isLoading,
    showControls,
    progress,
    isLiked,
    likesCount,
    isSaved,
    isFollowing,
    togglePlay,
    toggleMute,
    toggleLike,
    toggleSave,
    toggleFollow,
    handleTap,
    handleHoldStart,
    handleHoldEnd,
    handleTimeUpdate,
    handleProgress,
    handleLoadedData,
    handleError,
    handlePlay,
    handlePause,
    handleWaiting,
    handleCanPlay,
  } = useReelPlayer(reel);

  // Expose video ref
  React.useEffect(() => {
    window.reelVideoRef = (ref) => {
      if (videoRef) videoRef.current = ref;
    };
  }, [videoRef]);

  // Touch handling
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const lastTapTime = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    handleHoldStart();
  };

  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const touchDuration = Date.now() - touchStartTime.current;
    const swipeDistance = touchStartY.current - touchEndY;

    handleHoldEnd();

    // Swipe up/down
    if (Math.abs(swipeDistance) > 80 && touchDuration < 300) {
      if (swipeDistance > 0 && onNext) onNext();
      else if (swipeDistance < 0 && onPrev) onPrev();
      return;
    }

    // Tap detection
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      // Double tap — like
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.changedTouches[0].clientX - rect.left;
        const y = e.changedTouches[0].clientY - rect.top;
        setLikePosition({
          x: `${(x / rect.width) * 100}%`,
          y: `${(y / rect.height) * 100}%`,
        });
      }
      setShowLikeAnim(true);
      setTimeout(() => setShowLikeAnim(false), 800);
      toggleLike();
    } else {
      // Single tap
      handleTap();
      togglePlay();
    }
    lastTapTime.current = now;
  };

  const handleShare = async () => {
    const shareData = {
      title: `Reel de ${reel.user.username}`,
      text: reel.description,
      url: `${window.location.origin}/reels/${reel.id}`,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Enlace copiado al portapapeles');
      } catch {
        toast.error('No se pudo copiar el enlace');
      }
    }
  };

  const handleAddToCart = useCallback(async () => {
    if (!user) {
      toast.error('Inicia sesión para añadir productos', {
        action: { label: 'Entrar', onClick: () => { window.location.href = '/login'; } },
      });
      return;
    }
    if (!reel.productTag?.id) return;
    const success = await addToCart(reel.productTag.id, 1);
    if (success) {
      toast.success('Añadido al carrito');
    } else {
      toast.error('Error al añadir');
    }
  }, [user, reel.productTag, addToCart]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden snap-start"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video */}
      <ReelVideo
        src={reel.videoUrl}
        poster={reel.thumbnail}
        isMuted={isMuted}
        isActive={isActive}
        onTimeUpdate={handleTimeUpdate}
        onProgress={handleProgress}
        onLoadedData={handleLoadedData}
        onError={handleError}
        onPlay={handlePlay}
        onPause={handlePause}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
      />

      {/* Bottom gradient overlay — 35% height */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '35vh',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
        }}
      />

      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 5,
        height: 2, background: 'rgba(255,255,255,0.15)',
      }}>
        <div style={{
          height: '100%', background: 'rgba(255,255,255,0.55)',
          width: `${progress ?? 0}%`,
          transition: 'width 0.15s linear',
        }} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Like animation */}
      <LikeAnimation show={showLikeAnim} x={likePosition.x} y={likePosition.y} />

      {/* Overlay — bottom info + green buy button */}
      <ReelOverlay
        reel={reel}
        isFollowing={isFollowing}
        toggleFollow={toggleFollow}
        onAddToCart={handleAddToCart}
      />

      {/* Sidebar — avatar + actions */}
      <ReelSidebar
        reel={reel}
        isLiked={isLiked}
        likesCount={likesCount}
        isSaved={isSaved}
        onLike={toggleLike}
        onSave={toggleSave}
        onOpenComments={() => setShowComments(true)}
        onShare={handleShare}
      />

      {/* Pause indicator */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg style={{ width: 32, height: 32, fill: '#fff', marginLeft: 3 }} viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Mute toggle (visible when controls shown) */}
      {showControls && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMute(); }}
          style={{
            position: 'absolute', top: 100, right: 12, zIndex: 30,
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {isMuted ? (
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="#fff" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="#fff" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      )}

      {/* Comments Modal */}
      <ReelComments
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        reelId={reel.id}
        commentsCount={reel.stats.comments}
      />

      {/* Product Drawer — opens when tapping product thumbnail in sidebar */}
      <ProductDrawer
        isOpen={showProduct}
        onClose={() => setShowProduct(false)}
        product={reel.productTag}
      />
    </div>
  );
}

const areReelPropsEqual = (prev, next) => {
  return (
    prev.reel?.id === next.reel?.id &&
    prev.reel?.stats?.likes === next.reel?.stats?.likes &&
    prev.reel?.stats?.comments === next.reel?.stats?.comments &&
    prev.reel?.is_liked === next.reel?.is_liked &&
    prev.reel?.is_saved === next.reel?.is_saved &&
    prev.isActive === next.isActive &&
    prev.reel?.video_url === next.reel?.video_url
  );
};

export default React.memo(ReelPlayer, areReelPropsEqual);
