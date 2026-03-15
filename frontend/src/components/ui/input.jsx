import React, { useState, forwardRef } from 'react';
import { Search } from 'lucide-react';

const Input = forwardRef(function Input({
  label,
  helperText,
  error,
  disabled = false,
  variant = 'default',
  style,
  className,
  ...props
}, ref) {
  const [focused, setFocused] = useState(false);
  const isSearch = variant === 'search';

  const borderColor = error
    ? 'var(--color-red)'
    : focused
      ? 'var(--color-black)'
      : isSearch && !focused
        ? 'transparent'
        : 'var(--color-border)';

  const bg = disabled
    ? 'var(--color-surface)'
    : isSearch
      ? 'var(--color-surface)'
      : 'var(--color-white)';

  const boxShadow = focused
    ? error
      ? '0 0 0 3px rgba(192,80,64,0.1)'
      : '0 0 0 3px rgba(10,10,10,0.06)'
    : 'none';

  return (
    <div style={{ width: '100%', ...style }} className={className}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-black)',
            marginBottom: 'var(--space-2)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {isSearch && (
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              color: 'var(--color-stone)',
              pointerEvents: 'none',
            }}
          />
        )}
        <input
          ref={ref}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            height: 44,
            padding: '0 12px',
            paddingLeft: isSearch ? 36 : 12,
            borderRadius: 'var(--radius-md)',
            border: `1.5px solid ${borderColor}`,
            background: bg,
            color: disabled ? 'var(--color-stone)' : 'var(--color-black)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-base)',
            outline: 'none',
            transition: `border-color var(--transition-fast)`,
            cursor: disabled ? 'not-allowed' : undefined,
            boxShadow,
          }}
          {...props}
        />
      </div>
      {(error || helperText) && (
        <p
          style={{
            fontSize: 'var(--text-xs)',
            marginTop: 'var(--space-1)',
            color: error ? 'var(--color-red)' : 'var(--color-stone)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
});

export default Input;

export function Textarea({
  label,
  helperText,
  error,
  disabled = false,
  style,
  className,
  ...props
}) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? 'var(--color-red)'
    : focused
      ? 'var(--color-black)'
      : 'var(--color-border)';

  const boxShadow = focused
    ? error
      ? '0 0 0 3px rgba(192,80,64,0.1)'
      : '0 0 0 3px rgba(10,10,10,0.06)'
    : 'none';

  return (
    <div style={{ width: '100%', ...style }} className={className}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--color-black)',
            marginBottom: 'var(--space-2)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </label>
      )}
      <textarea
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          minHeight: 96,
          padding: 12,
          borderRadius: 'var(--radius-md)',
          border: `1.5px solid ${borderColor}`,
          background: disabled ? 'var(--color-surface)' : 'var(--color-white)',
          color: disabled ? 'var(--color-stone)' : 'var(--color-black)',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-base)',
          outline: 'none',
          resize: 'vertical',
          transition: `border-color var(--transition-fast)`,
          cursor: disabled ? 'not-allowed' : undefined,
          boxShadow,
        }}
        {...props}
      />
      {(error || helperText) && (
        <p
          style={{
            fontSize: 'var(--text-xs)',
            marginTop: 'var(--space-1)',
            color: error ? 'var(--color-red)' : 'var(--color-stone)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {error || helperText}
        </p>
      )}
    </div>
  );
}
