import React from 'react';

interface StoryProgressBarProps {
  items: Array<{ id?: string; _id?: string }>;
  currentItemIndex: number;
  progress: number;
  prefersReducedMotion: boolean;
}

export default function StoryProgressBar({
  items,
  currentItemIndex,
  progress,
  prefersReducedMotion,
}: StoryProgressBarProps) {
  return (
    <div
      className="flex gap-1 px-2 pt-[calc(env(safe-area-inset-top,8px)+8px)]"
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {items.map((item, i) => {
        let fillWidth: string;
        if (i < currentItemIndex) fillWidth = '100%';
        else if (i === currentItemIndex) fillWidth = `${progress * 100}%`;
        else fillWidth = '0%';

        return (
          <div
            key={item.id || item._id || `story-seg-${i}`}
            className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/30"
          >
            <div
              className="h-full bg-white"
              style={{
                width: fillWidth,
                transition:
                  prefersReducedMotion
                    ? 'none'
                    : i === currentItemIndex
                      ? 'none'
                      : 'width 0.1s',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
