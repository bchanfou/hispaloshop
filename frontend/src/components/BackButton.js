import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * BackButton - A consistent back navigation button that preserves user context
 * Uses history.back() / navigate(-1) to return to actual previous view.
 * On mobile (<768px), also supports swipe-right-from-left-edge to go back.
 */
export default function BackButton({
  className = '',
  label = 'Back',
  showLabel = true,
  size = 'default' // 'small', 'default', 'large'
}) {
  const navigate = useNavigate();
  const touchStartX = useRef(null);

  useEffect(() => {
    if (window.innerWidth >= 768) return;

    const handleTouchStart = (e) => {
      const x = e.touches[0].clientX;
      touchStartX.current = x < 20 ? x : null;
    };

    const handleTouchEnd = (e) => {
      if (touchStartX.current === null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      if (deltaX > 60) {
        navigate(-1);
      }
      touchStartX.current = null;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate]);

  const handleBack = () => {
    // Use navigate(-1) to go back in history, preserving context
    navigate(-1);
  };

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-base',
    large: 'px-5 py-2.5 text-lg'
  };

  const iconSizes = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6'
  };

  return (
    <button
      onClick={handleBack}
      className={`
        inline-flex items-center gap-2
        text-stone-600 hover:text-stone-950
        transition-colors duration-200
        font-medium rounded-xl
        hover:bg-stone-100
        focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-1
        ${sizeClasses[size]}
        ${className}
      `}
      data-testid="back-button"
      aria-label={label}
    >
      <ArrowLeft className={iconSizes[size]} />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
