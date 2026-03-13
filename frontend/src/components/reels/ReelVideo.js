import React, { useEffect, useRef } from 'react';

/**
 * ReelVideo — renderiza el <video> del reel.
 * El indicador de mute se gestiona en ReelPlayer (botón dedicado).
 * La progress bar también vive en ReelPlayer para evitar re-renders de reelVideo.
 */
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

  // Forward ref — expone el elemento video via window.reelVideoRef callback
  useEffect(() => {
    if (videoRef.current && window.reelVideoRef) {
      window.reelVideoRef(videoRef.current);
    }
  }, []);

  // Controla reproducción basado en isActive
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      const p = videoRef.current.play();
      if (p !== undefined) p.catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive]);

  // Sincroniza estado mute imperativamente
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className="h-full w-full object-cover"
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
  );
}

export default ReelVideo;
