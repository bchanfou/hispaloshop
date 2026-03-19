import React from 'react';
import { Plus } from 'lucide-react';

const ringClasses = {
  placeholder: 'border-2 border-dashed border-stone-200 bg-stone-50',
  unseen: 'bg-stone-950 p-[2px]',
  seen: 'border-2 border-solid border-stone-200',
};

function StoryRing({ user, isSelf, hasUnseenStory, onClick, itemsCount }) {
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
      className="flex flex-col items-center gap-1 cursor-pointer w-[68px] shrink-0 transition-transform duration-150 hover:scale-105 active:scale-95"
    >
      <div className="relative">
      <div
        className={`w-[62px] h-[62px] rounded-full flex items-center justify-center ${ringClass}`}
      >
        {showPlaceholder ? (
          <Plus size={18} className="text-stone-950" />
        ) : (
          <div className={`rounded-full overflow-hidden bg-white flex items-center justify-center ${hasUnseenStory ? 'w-[56px] h-[56px]' : 'w-[54px] h-[54px]'}`}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={label}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-stone-500 text-lg font-semibold">
                {(label || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>
      {itemsCount > 1 && hasUnseenStory && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-stone-950 text-white text-[8px] font-bold flex items-center justify-center border border-white">
          {itemsCount}
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

export default React.memo(StoryRing);
