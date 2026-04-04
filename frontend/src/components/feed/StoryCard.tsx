import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface StoryCardProps {
  user: {
    id?: string;
    user_id?: string;
    name?: string;
    username?: string;
    avatar_url?: string;
    avatar?: string;
    profile_image?: string;
  };
  preview?: {
    image?: string;
    video?: string;
    text?: string;
  };
  hasUnseen: boolean;
  storiesCount?: number;
  isSelf?: boolean;
  hasActiveStory?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  layoutId?: string;
}

function StoryCard({
  user,
  preview,
  hasUnseen,
  storiesCount = 1,
  isSelf = false,
  hasActiveStory = true,
  isLoading = false,
  onClick,
  layoutId,
}: StoryCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const label = isSelf
    ? 'Tu historia'
    : user?.name || user?.username || '';
  const avatarUrl =
    user?.avatar_url || user?.avatar || user?.profile_image;
  const showPlaceholder = isSelf && !hasActiveStory;

  // Pause video when off-screen to save resources
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [preview?.video]);

  const borderClass = showPlaceholder
    ? 'ring-1 ring-dashed ring-stone-200'
    : hasUnseen
      ? 'ring-2 ring-stone-950'
      : 'ring-1 ring-stone-200';

  return (
    <motion.div
      layoutId={layoutId}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={
        isSelf
          ? hasActiveStory
            ? 'Ver tu historia'
            : 'Crear tu historia'
          : `Ver historia de ${label}`
      }
      className={`relative w-[80px] h-[100px] shrink-0 snap-center cursor-pointer overflow-hidden rounded-xl ${borderClass} transition-all duration-300 ${
        isLoading ? 'animate-pulse opacity-60 pointer-events-none' : ''
      }`}
      whileTap={{ scale: 0.95 }}
    >
      {/* Media background */}
      {showPlaceholder ? (
        <div className="flex h-full w-full items-center justify-center bg-stone-50">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Plus size={22} className="text-stone-400" />
          </motion.div>
        </div>
      ) : preview?.video ? (
        <video
          ref={videoRef}
          src={preview.video}
          poster={preview.image || undefined}
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : preview?.image ? (
        <img
          src={preview.image}
          alt={label}
          loading="lazy"
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-stone-100">
          <span className="text-xl font-semibold text-stone-300">
            {(label || '?').charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Bottom gradient + name */}
      {!showPlaceholder && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-1.5 pb-1.5 pt-5">
          <span
            title={label}
            className="block truncate text-[10px] font-semibold leading-tight text-white"
          >
            {label && label.length > 9 ? label.slice(0, 9) + '…' : label}
          </span>
        </div>
      )}

      {/* Self placeholder label */}
      {showPlaceholder && (
        <div className="absolute inset-x-0 bottom-0 px-1 pb-1.5">
          <span className="block truncate text-center text-[10px] font-medium text-stone-500">
            Tu historia
          </span>
        </div>
      )}

      {/* Mini avatar — top left */}
      {!showPlaceholder && avatarUrl && (
        <div className="absolute left-1 top-1 h-5 w-5 overflow-hidden rounded-full ring-[1.5px] ring-white">
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      {!showPlaceholder && !avatarUrl && (
        <div className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-700 ring-[1.5px] ring-white">
          <span className="text-[8px] font-bold text-white">
            {(label || '?').charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Story count badge — top right */}
      {storiesCount > 1 && !showPlaceholder && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-stone-950 px-1 text-[9px] font-bold text-white">
          {storiesCount}
        </span>
      )}
    </motion.div>
  );
}

export default React.memo(StoryCard, (prev, next) =>
  prev.isSelf === next.isSelf &&
  prev.hasUnseen === next.hasUnseen &&
  prev.hasActiveStory === next.hasActiveStory &&
  prev.storiesCount === next.storiesCount &&
  prev.isLoading === next.isLoading &&
  prev.preview?.video === next.preview?.video &&
  prev.preview?.image === next.preview?.image &&
  (prev.user?.id || prev.user?.avatar_url) ===
    (next.user?.id || next.user?.avatar_url),
);
