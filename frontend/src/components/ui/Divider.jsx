import React from 'react';

export default function Divider({ text, style, ...props }) {
  if (!text) {
    return (
      <hr
        style={{
          height: '0.5px',
          background: 'var(--color-border)',
          border: 'none',
          margin: 0,
          ...style,
        }}
        {...props}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        ...style,
      }}
      {...props}
    >
      <span style={{ flex: 1, height: '0.5px', background: 'var(--color-border)' }} />
      <span
        style={{
          fontSize: '10px',
          color: 'var(--color-stone)',
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {text}
      </span>
      <span style={{ flex: 1, height: '0.5px', background: 'var(--color-border)' }} />
    </div>
  );
}
