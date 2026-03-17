import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * BackButton - A consistent back navigation button that preserves user context
 * Uses history.back() / navigate(-1) to return to actual previous view
 */
export default function BackButton({ 
  className = '', 
  label = 'Back',
  showLabel = true,
  size = 'default' // 'small', 'default', 'large'
}) {
  const navigate = useNavigate();

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
