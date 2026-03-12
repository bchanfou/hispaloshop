import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import useReelPlayer from './useReelPlayer';
import ReelVideo from './ReelVideo';
import ReelSidebar from './ReelSidebar';
import ReelOverlay from './ReelOverlay';
import ReelComments from './ReelComments';
import ProductDrawer from './ProductDrawer';
import LikeAnimation from './LikeAnimation';

function ReelPlayer({ reel, isActive, onNext, onPrev }) {
  const navigate = useNavigate();
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
    handleDoubleTap,
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
    showControlsTemporarily,
  } = useReelPlayer(reel);

  // Expose video ref to parent
  React.useEffect(() => {
    window.reelVideoRef = (ref) => {
      if (videoRef) {
        videoRef.current = ref;
      }
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
    const minSwipeDistance = 80;

    handleHoldEnd();

    // Swipe up/down
    if (Math.abs(swipeDistance) > minSwipeDistance && touchDuration < 300) {
      if (swipeDistance > 0 && onNext) {
        onNext();
      } else if (swipeDistance < 0 && onPrev) {
        onPrev();
      }
      return;
    }

    // Tap detection
    const now = Date.now();
    const doubleTapDelay = 300;
    
    if (now - lastTapTime.current < doubleTapDelay) {
      // Double tap
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
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Copy to clipboard fallback
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Enlace copiado al portapapeles');
      } catch (err) {
        toast.error('No se pudo copiar el enlace');
      }
    }
  };

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

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
          <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Like animation */}
      <LikeAnimation show={showLikeAnim} x={likePosition.x} y={likePosition.y} />

      {/* Overlay */}
      <ReelOverlay reel={reel} />

      {/* Sidebar */}
      <ReelSidebar
        reel={reel}
        isLiked={isLiked}
        likesCount={likesCount}
        isSaved={isSaved}
        isFollowing={isFollowing}
        onLike={toggleLike}
        onSave={toggleSave}
        onFollow={toggleFollow}
        onOpenComments={() => setShowComments(true)}
        onOpenProduct={() => setShowProduct(true)}
        onShare={handleShare}
      />

      {/* Pause indicator */}
      {!isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-white fill-white ml-1" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Mute toggle button (visible when controls shown) */}
      {showControls && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          className="absolute top-20 right-4 z-30 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
        >
          {isMuted ? (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Product Drawer */}
      <ProductDrawer
        isOpen={showProduct}
        onClose={() => setShowProduct(false)}
        product={reel.productTag}
      />
    </div>
  );
}

export default ReelPlayer;
