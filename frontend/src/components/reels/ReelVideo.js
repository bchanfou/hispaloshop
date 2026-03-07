import React, { useEffect, useRef } from 'react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';

function ReelVideo({
  src,
  poster,
  isMuted,
  isActive,
  onTimeUpdate,
  onProgress,
  onLoadedData,
  onError,
  onPlay,
  onPause,
  onWaiting,
  onCanPlay,
}) {
  const videoRef = useRef(null);

  // Forward ref
  useEffect(() => {
    if (videoRef.current && window.reelVideoRef) {
      window.reelVideoRef(videoRef.current);
    }
  }, []);

  // Control playback based on active state
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play prevented
        });
      }
    } else {
      videoRef.current.pause();
    }
  }, [isActive]);

  // Update mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={isMuted}
        disablePictureInPicture
        disableRemotePlayback
        webkit-playsinline="true"
        onTimeUpdate={onTimeUpdate}
        onProgress={onProgress}
        onLoadedData={onLoadedData}
        onError={onError}
        onPlay={onPlay}
        onPause={onPause}
        onWaiting={onWaiting}
        onCanPlay={onCanPlay}
      />
      
      {/* Mute indicator overlay */}
      <div className="absolute top-20 right-4 z-20">
        <div className={`p-2 rounded-full ${isMuted ? 'bg-black/40' : 'bg-transparent'}`}>
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </div>
      </div>
    </div>
  );
}

export default ReelVideo;
