import React from 'react';

const V2 = {
  black: '#0A0A0A',
  surface: '#F0EDE8',
  fontSans: 'Inter, system-ui, sans-serif',
  radiusFull: 9999,
};

const DIET_TAGS = new Set(['Vegano', 'Vegetariano', 'Pescetariano']);

const dietStyle = {
  backgroundColor: V2.surface,
  color: V2.black,
};

const allergyStyle = {
  backgroundColor: '#f5f5f4',
  color: '#78716c',
};

export default function ChatDietTags({ tags }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div
      className="flex items-center overflow-x-auto"
      style={{ gap: 6, fontFamily: V2.fontSans }}
    >
      {tags.map((tag) => {
        const isDiet = DIET_TAGS.has(tag);
        const colors = isDiet ? dietStyle : allergyStyle;

        return (
          <span
            key={tag}
            className="shrink-0 flex items-center"
            style={{
              height: 24,
              borderRadius: V2.radiusFull,
              padding: '0 10px',
              fontSize: 11,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              ...colors,
            }}
          >
            {tag}
          </span>
        );
      })}
    </div>
  );
}
