import { useState, useRef, useCallback, useEffect } from 'react';
import apiClient from '../../services/api/client';

export const useReelPlayer = (reel) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('reelsMuted') !== 'false';
  });
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [isLiked, setIsLiked] = useState(reel?.stats?.isLiked || false);
  const [likesCount, setLikesCount] = useState(reel?.stats?.likes || 0);
  const [isSaved, setIsSaved] = useState(reel?.stats?.isSaved || false);
  const [isFollowing, setIsFollowing] = useState(reel?.user?.isFollowing || false);
  const controlsTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Persistir preferencia de mute
  useEffect(() => {
    localStorage.setItem('reelsMuted', isMuted.toString());
  }, [isMuted]);

  // Play/Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        // Auto-play policy prevented
        setIsMuted(true);
        videoRef.current.muted = true;
        videoRef.current.play();
      });
    }
  }, [isPlaying]);

  // Mute/Unmute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    
    // Fade in volumen
    if (!newMuted && videoRef.current) {
      videoRef.current.volume = 0;
      let vol = 0;
      const fadeIn = setInterval(() => {
        vol += 0.1;
        if (videoRef.current) {
          videoRef.current.volume = Math.min(vol, 1);
        }
        if (vol >= 1) clearInterval(fadeIn);
      }, 30);
    }
  }, [isMuted]);

  // Like (optimistic + API call)
  const toggleLike = useCallback(() => {
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : prev - 1);
    if (reel?.id) {
      apiClient
        .post(`/reels/${reel.id}/like`, {})
        .catch(() => {
          // Revert on error
          setIsLiked(!newLiked);
          setLikesCount(prev => newLiked ? prev - 1 : prev + 1);
        });
    }
  }, [isLiked, reel?.id]);

  // Save
  const toggleSave = useCallback(() => {
    setIsSaved(prev => !prev);
  }, []);

  // Follow
  const toggleFollow = useCallback(() => {
    setIsFollowing(prev => !prev);
  }, []);

  // Show/hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2000);
  }, [isPlaying]);

  // Handle tap
  const handleTap = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  // Handle double tap (like)
  const handleDoubleTap = useCallback((e) => {
    e.stopPropagation();
    toggleLike();
    return true;
  }, [toggleLike]);

  // Handle hold (pause)
  const handleHoldStart = useCallback(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  const handleHoldEnd = useCallback(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play();
    }
  }, [isPlaying]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setProgress(duration ? (current / duration) * 100 : 0);
    }
  }, []);

  const handleProgress = useCallback(() => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const duration = videoRef.current.duration;
      setBuffered(duration ? (bufferedEnd / duration) * 100 : 0);
    }
  }, []);

  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    retryCountRef.current = 0;
  }, []);

  const handleError = useCallback(() => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.load();
        }
      }, 1000 * retryCountRef.current);
    } else {
      setError('Error al cargar el video');
      setIsLoading(false);
    }
  }, []);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleWaiting = useCallback(() => setIsLoading(true), []);
  const handleCanPlay = useCallback(() => setIsLoading(false), []);

  // Intersection Observer para auto-play/pause
  useEffect(() => {
    if (!videoRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          videoRef.current?.play().catch(() => {});
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      }
    };
  }, []);

  return {
    videoRef,
    isPlaying,
    isMuted,
    progress,
    buffered,
    isLoading,
    error,
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
  };
};

export default useReelPlayer;
