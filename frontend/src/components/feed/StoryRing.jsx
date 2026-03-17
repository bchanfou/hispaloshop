import React from 'react';
import { Plus } from 'lucide-react';

export default function StoryRing({ user, isSelf, hasUnseenStory, onClick }) {
  const label = isSelf ? 'Tu historia' : (user?.name || user?.username || '');
  const avatarUrl = user?.avatar_url || user?.profile_image;
  const showPlaceholder = isSelf && !hasUnseenStory;

  let borderStyle;
  if (showPlaceholder) {
    borderStyle = '2px dashed var(--color-border)';
  } else if (hasUnseenStory) {
    borderStyle = '2px solid var(--color-black)';
  } else {
    borderStyle = '2px solid var(--color-border)';
  }

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        width: 68,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 62,
          height: 62,
          borderRadius: '50%',
          overflow: 'hidden',
          border: borderStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: showPlaceholder ? 'var(--color-surface)' : 'transparent',
        }}
      >
        {showPlaceholder ? (
          <Plus size={18} color="var(--color-black)" />
        ) : (
          <img
            src={avatarUrl}
            alt={label}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </div>

      <span
        title={label}
        style={{
          fontSize: 10,
          color: 'var(--color-black)',
          fontFamily: 'var(--font-sans)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 60,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </div>
  );
}
