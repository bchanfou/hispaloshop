import React from 'react';
import { X } from 'lucide-react';
import { timeAgo } from '../../../utils/time';
// @ts-ignore — JS module
import ReportButton from '../../moderation/ReportButton';

interface StoryUser {
  id?: string;
  user_id?: string;
  name?: string;
  username?: string;
  avatar_url?: string;
  avatar?: string;
  profile_image?: string;
}

interface StoryHeaderProps {
  user: StoryUser;
  createdAt?: string;
  paused: boolean;
  storyId?: string;
  ownerId?: string;
  onAvatarClick: () => void;
  onClose: () => void;
}

export default function StoryHeader({
  user,
  createdAt,
  paused,
  storyId,
  ownerId,
  onAvatarClick,
  onClose,
}: StoryHeaderProps) {
  const avatarSrc = user?.avatar_url || user?.avatar || user?.profile_image;
  const displayName = user?.name || user?.username || 'usuario';

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div
        onClick={onAvatarClick}
        className="flex items-center gap-2 cursor-pointer"
        role="link"
        aria-label={`Ver perfil de ${displayName}`}
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={`Avatar de ${displayName}`}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-semibold text-white font-sans">
          {displayName}
        </span>
      </div>
      <span className="text-xs text-white/60 font-sans">
        {createdAt ? timeAgo(createdAt) : ''}
      </span>
      <div className="flex-1" />
      {paused && (
        <span className="text-[10px] text-white/40 font-sans mr-1">
          En pausa
        </span>
      )}
      {storyId && (
        <div className="w-11 h-11 flex items-center justify-center text-white/70">
          <ReportButton
            contentType="story"
            contentId={storyId}
            contentOwnerId={ownerId}
          />
        </div>
      )}
      <button
        onClick={onClose}
        className="w-11 h-11 bg-transparent border-none cursor-pointer flex items-center justify-center"
        aria-label="Cerrar historia"
      >
        <X size={24} className="text-white" />
      </button>
    </div>
  );
}
