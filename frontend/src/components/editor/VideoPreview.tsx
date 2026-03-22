// @ts-nocheck
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';

interface VideoPreviewProps {
  videoUrl: string;
  playing: boolean;
  speed: number;
  muted: boolean;
  volume: number;
  trimStart: number;
  trimEnd: number;
  filter: string;
  onTimeUpdate: (time: number) => void;
  onDurationReady: (duration: number) => void;
}

export default function VideoPreview({
  videoUrl,
  playing,
  speed,
  muted,
  volume,
  trimStart,
  trimEnd,
  filter,
  onTimeUpdate,
  onDurationReady,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);
  const [showIcon, setShowIcon] = useState<'play' | 'pause' | null>(null);
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrubbingRef = useRef(false);

  // Duration ready
  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    onDurationReady(v.duration);
    if (trimStart > 0) v.currentTime = trimStart;
  }, [onDurationReady, trimStart]);

  // Play / pause
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    if (playing) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, [playing, videoUrl]);

  // Speed
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed]);

  // Muted + volume
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = volume;
  }, [muted, volume]);

  // Time update loop — uses rAF for smooth progress without re-rendering parent
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tick = () => {
      if (!v) return;
      const ct = v.currentTime;

      // Loop within trim bounds
      const end = trimEnd > 0 ? trimEnd : v.duration;
      if (ct >= end) {
        v.currentTime = trimStart;
      }

      // Progress bar
      const dur = end - trimStart;
      if (dur > 0) {
        setProgress((ct - trimStart) / dur);
      }

      onTimeUpdate(ct);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trimStart, trimEnd, onTimeUpdate]);

  // Tap overlay icon
  const handleTap = useCallback(() => {
    if (scrubbingRef.current) return;
    setShowIcon(playing ? 'pause' : 'play');
    if (iconTimerRef.current) clearTimeout(iconTimerRef.current);
    iconTimerRef.current = setTimeout(() => setShowIcon(null), 600);
  }, [playing]);

  // Scrub handlers
  const getScrubTime = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return trimStart;
      const rect = el.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const end = trimEnd > 0 ? trimEnd : (videoRef.current?.duration ?? 0);
      return trimStart + pct * (end - trimStart);
    },
    [trimStart, trimEnd]
  );

  const handleScrubStart = useCallback(
    (clientX: number) => {
      scrubbingRef.current = true;
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.currentTime = getScrubTime(clientX);
      }
    },
    [getScrubTime]
  );

  const handleScrubMove = useCallback(
    (clientX: number) => {
      if (!scrubbingRef.current) return;
      const v = videoRef.current;
      if (v) v.currentTime = getScrubTime(clientX);
    },
    [getScrubTime]
  );

  const handleScrubEnd = useCallback(() => {
    scrubbingRef.current = false;
    if (playing && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [playing]);

  // Touch scrub
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      handleScrubStart(e.touches[0].clientX);
    },
    [handleScrubStart]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleScrubMove(e.touches[0].clientX);
    },
    [handleScrubMove]
  );

  // Mouse scrub
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleScrubStart(e.clientX);
      const onMove = (ev: MouseEvent) => handleScrubMove(ev.clientX);
      const onUp = () => {
        handleScrubEnd();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [handleScrubStart, handleScrubMove, handleScrubEnd]
  );

  if (!videoUrl) return null;

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden bg-black"
      onClick={handleTap}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        style={{ filter: filter || 'none' }}
        playsInline
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Play/Pause overlay icon */}
      {showIcon && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            animation: 'videoPreviewFade 600ms ease-out forwards',
          }}
        >
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            {showIcon === 'play' ? (
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            ) : (
              <Pause className="w-8 h-8 text-white" fill="white" />
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleScrubEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-full bg-white transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Inline keyframes for fade animation */}
      <style>{`
        @keyframes videoPreviewFade {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
