import React from 'react';
import { Plus } from 'lucide-react';

const ringClasses = {
  placeholder: 'border-2 border-dashed border-stone-200 bg-stone-50',
  seen: 'bg-stone-300',
};

function StoryRing({ user, isSelf, hasUnseenStory, onClick, itemsCount }) {
  const label = isSelf ? 'Tu historia' : (user?.name || user?.username || '');
  const avatarUrl = user?.avatar_url || user?.avatar || user?.profile_image;
  const showPlaceholder = isSelf && !hasUnseenStory;

  const isUnseen = !showPlaceholder && hasUnseenStory;
  const isSeen = !showPlaceholder && !hasUnseenStory;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
      role="button"
      tabIndex={0}
      aria-label={isSelf ? 'Crear tu historia' : `Ver historia de ${label}`}
      className="flex flex-col items-center gap-1 cursor-pointer w-[58px] shrink-0 snap-center transition-transform duration-150 hover:scale-105 active:scale-95"
    >
      <div className="relative">
      {showPlaceholder ? (
        <div className={`w-[58px] h-[58px] rounded-full flex items-center justify-center ${ringClasses.placeholder}`}>
          <Plus size={18} className="text-stone-400" />
        </div>
      ) : (
        <div
          className={`w-[58px] h-[58px] rounded-full p-[2.5px] ${
            isUnseen
              ? 'bg-gradient-to-br from-stone-950 via-stone-600 to-stone-400 animate-story-pulse'
              : ringClasses.seen
          }`}
        >
          <div className="w-full h-full rounded-full bg-white p-[2px]">
            <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
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
          </div>
        </div>
      )}
      {itemsCount > 1 && (
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 min-w-[16px] h-[16px] rounded-full bg-stone-950 text-white text-[9px] font-bold flex items-center justify-center">
          {itemsCount}
        </span>
      )}
      </div>

      <span
        title={label}
        className="text-[10px] text-stone-950 font-sans overflow-hidden text-ellipsis whitespace-nowrap max-w-[58px] text-center"
      >
        {label && label.length > 8 ? label.slice(0, 8) + '…' : label}
      </span>
    </div>
  );
}

// B-1: Custom comparator — skip re-render if visual props are unchanged
// onClick is always a new closure from StoriesBar, so we exclude it
export default React.memo(StoryRing, (prev, next) => (
  prev.isSelf === next.isSelf &&
  prev.hasUnseenStory === next.hasUnseenStory &&
  prev.itemsCount === next.itemsCount &&
  prev.isLoading === next.isLoading &&
  (prev.user?.id || prev.user?.avatar_url) === (next.user?.id || next.user?.avatar_url)
));
