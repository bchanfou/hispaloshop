import React from 'react';
import { Plus } from 'lucide-react';

const ringClasses = {
  placeholder: 'border-2 border-dashed border-stone-200 bg-stone-50',
  unseen: 'border-2 border-solid border-stone-950',
  seen: 'border-2 border-solid border-stone-200',
};

export default function StoryRing({ user, isSelf, hasUnseenStory, onClick }) {
  const label = isSelf ? 'Tu historia' : (user?.name || user?.username || '');
  const avatarUrl = user?.avatar_url || user?.avatar || user?.profile_image;
  const showPlaceholder = isSelf && !hasUnseenStory;

  const ringClass = showPlaceholder
    ? ringClasses.placeholder
    : hasUnseenStory
    ? ringClasses.unseen
    : ringClasses.seen;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      role="button"
      tabIndex={0}
      aria-label={isSelf ? 'Crear tu historia' : `Ver historia de ${label}`}
      className="flex flex-col items-center gap-1 cursor-pointer w-[68px] shrink-0"
    >
      <div
        className={`w-[62px] h-[62px] rounded-full overflow-hidden flex items-center justify-center ${ringClass}`}
      >
        {showPlaceholder ? (
          <Plus size={18} className="text-stone-950" />
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-stone-500 text-lg font-semibold">
            {(label || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <span
        title={label}
        className="text-[10px] text-stone-950 font-sans overflow-hidden text-ellipsis whitespace-nowrap max-w-[60px] text-center"
      >
        {label}
      </span>
    </div>
  );
}
