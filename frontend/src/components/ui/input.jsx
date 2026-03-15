import React, { useState } from 'react';

export default function Input({
  label,
  helper,
  error,
  disabled,
  iconLeft: IconLeft,
  iconRight: IconRight,
  style,
  inputStyle,
  className,
  ...props
}) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? 'var(--color-red)'
    : focused
      ? 'var(--color-black)'
      : 'var(--color-border)';

  const bg = error
    ? 'var(--color-red-light)'
    : disabled
      ? 'var(--color-surface)'
      : 'var(--color-white)';

  return (
    <div style={{ width: '100%', ...style }} className={className}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-stone)',
            marginBottom: '6px',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {IconLeft && (
          <IconLeft
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--color-stone)',
              pointerEvents: 'none',
            }}
          />
        )}
        <input
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '10px 12px',
            paddingLeft: IconLeft ? '36px' : '12px',
            paddingRight: IconRight ? '36px' : '12px',
            borderRadius: 'var(--radius-md)',
            border: `${error ? '1px' : '0.5px'} solid ${borderColor}`,
            background: bg,
            color: 'var(--color-black)',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
            outline: 'none',
            transition: 'var(--transition-fast)',
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : undefined,
            ...inputStyle,
          }}
          {...props}
        />
        {IconRight && (
          <IconRight
            size={16}
            style={{
              position: 'absolute',
              right: '12px',
              color: 'var(--color-stone)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      {(helper || error) && (
        <p
          style={{
            fontSize: '12px',
            marginTop: '4px',
            color: error ? 'var(--color-red)' : 'var(--color-stone)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {error || helper}
        </p>
      )}
    </div>
  );
}
