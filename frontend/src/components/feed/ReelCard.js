import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Heart, Play, Volume2, VolumeX, ShoppingBag, MessageCircle, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function ReelCard({ reel, isInFeed = true, onOpenFullscreen }) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [liked, setLiked] = useState(reel.liked || false);
  const [likeCount, setLikeCount] = useState(reel.likes || 0);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Auto-play when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && videoRef.current) {
          videoRef.current.play();
          setIsPlaying(true);
        } else if (videoRef.current) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
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

  // Versión para grid (preview)
  if (isInFeed) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative aspect-[9/16] bg-stone-900 rounded-lg overflow-hidden cursor-pointer group"
        onClick={() => onOpenFullscreen?.(reel)}
      >
        {/* Thumbnail/Video */}
        <img
          src={reel.thumbnail || reel.videoUrl}
          alt={reel.caption}
          className="w-full h-full object-cover"
        />
        
        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
        
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
        </div>
        
        {/* Stats */}
        <div className="absolute top-2 right-2 flex items-center gap-1 text-white text-xs font-medium">
          <Heart className="w-3.5 h-3.5 fill-white" />
          {reel.likes > 999 ? `${(reel.likes / 1000).toFixed(1)}k` : reel.likes}
        </div>
        
        {/* Info bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-2 mb-1">
            <img
              src={reel.user?.avatar || '/default-avatar.png'}
              alt={reel.user?.name}
              className="w-6 h-6 rounded-full border border-white/50"
            />
            <span className="text-white text-xs font-medium truncate">
              @{reel.user?.name || reel.user_name}
            </span>
          </div>
          <p className="text-white/90 text-xs line-clamp-2">{reel.caption}</p>
          
          {reel.productTag && (
            <div className="mt-2 flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 w-fit">
              <ShoppingBag className="w-3 h-3 text-white" />
              <span className="text-white text-xs">{reel.productTag.name}</span>
              <span className="text-white/80 text-xs">€{reel.productTag.price}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Versión full-screen
  return (
    <div 
      className="relative w-full h-screen bg-black overflow-hidden"
      onClick={handleTap}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />
      
      {/* Overlay controls */}
      {showControls && (
        <>
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
            <button 
              onClick={() => window.history.back()}
              className="text-white p-2"
            >
              ✕
            </button>
            <button onClick={toggleMute} className="p-2 text-white">
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>
          
          {/* Sidebar derecha */}
          <div className="absolute right-2 bottom-20 flex flex-col items-center gap-4">
            <Link to={`/user/${reel.user?.id}`} className="flex flex-col items-center gap-1">
              <img
                src={reel.user?.avatar || '/default-avatar.png'}
                alt={reel.user?.name}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            </Link>
            
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleLike}
              className="flex flex-col items-center gap-1"
            >
              <Heart className={`w-7 h-7 ${liked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
              <span className="text-white text-xs font-medium">
                {likeCount > 999 ? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
              </span>
            </motion.button>
            
            <button className="flex flex-col items-center gap-1">
              <MessageCircle className="w-7 h-7 text-white" />
              <span className="text-white text-xs font-medium">{reel.comments || 0}</span>
            </button>
            
            <button className="flex flex-col items-center gap-1">
              <Share2 className="w-7 h-7 text-white" />
            </button>
            
            {reel.productTag && (
              <Link
                to={`/products/${reel.productTag.id}`}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
              </Link>
            )}
          </div>
          
          {/* Bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-safe bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="pr-16">
              <Link to={`/user/${reel.user?.id}`} className="text-white font-semibold text-sm">
                @{reel.user?.name || reel.user_name}
              </Link>
              <p className="text-white/90 text-sm mt-1 line-clamp-2">{reel.caption}</p>
              
              {reel.productTag && (
                <Link
                  to={`/products/${reel.productTag.id}`}
                  className="mt-3 flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2"
                >
                  <img
                    src={reel.productTag.image}
                    alt={reel.productTag.name}
                    className="w-10 h-10 rounded bg-white/50 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{reel.productTag.name}</p>
                    <p className="text-white/80 text-xs">€{reel.productTag.price}</p>
                  </div>
                  <button className="px-3 py-1 bg-accent text-white text-xs font-medium rounded-full">
                    Ver
                  </button>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* Pause indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}

export default ReelCard;
