import React, { useState, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { sanitizeImageUrl } from '../utils/helpers';

/**
 * SmartImage - Image component with fallback and lazy loading
 * Shows a placeholder with initials when the image fails to load
 */
export default function SmartImage({ 
  src, 
  alt, 
  className = '', 
  fallbackText = '',
  fallbackClassName = '',
  ...props 
}) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const safeSrc = sanitizeImageUrl(src);

  // Reset error/loading states when src changes
  useEffect(() => {
    setError(false);
    setLoading(true);
  }, [safeSrc]);

  // Generate initials from alt text or fallbackText
  const getInitials = () => {
    const text = fallbackText || alt || '';
    const words = text.split(' ').filter(w => w.length > 0);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  // Generate consistent color from text
  const getColor = () => {
    const text = fallbackText || alt || '';
    const colors = [
      'bg-stone-100 text-stone-700',
      'bg-stone-200 text-stone-800',
      'bg-stone-100 text-stone-600',
      'bg-stone-200 text-stone-700',
      'bg-stone-100 text-stone-700',
      'bg-stone-200 text-stone-600',
      'bg-stone-100 text-stone-800',
      'bg-stone-200 text-stone-700',
    ];
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (error || !safeSrc) {
    return (
      <div
        className={`flex items-center justify-center ${getColor()} ${className} ${fallbackClassName}`}
        title={alt || 'Imagen'}
        role="img"
        aria-label={alt || 'Imagen'}
      >
        <span className="font-semibold text-lg select-none">
          {getInitials()}
        </span>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className={`flex items-center justify-center bg-stone-100 animate-pulse ${className}`}>
          <ImageOff className="w-6 h-6 text-stone-300" />
        </div>
      )}
      <img
        src={safeSrc}
        alt={alt || 'Imagen'}
        className={`${className} ${loading ? 'hidden' : ''}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        loading="lazy"
        {...props}
      />
    </>
  );
}

/**
 * ProductImage - Specialized image component for products
 */
export function ProductImage({ 
  src, 
  productName, 
  className = '',
  ...props 
}) {
  return (
    <SmartImage
      src={src}
      alt={productName}
      fallbackText={productName}
      className={className}
      {...props}
    />
  );
}

/**
 * StoreImage - Specialized image component for store logos
 */
export function StoreImage({ 
  src, 
  storeName, 
  className = '',
  ...props 
}) {
  return (
    <SmartImage
      src={src}
      alt={storeName}
      fallbackText={storeName}
      className={`rounded-full ${className}`}
      {...props}
    />
  );
}

/**
 * UserAvatar - Specialized image component for user avatars
 */
export function UserAvatar({ 
  src, 
  userName, 
  className = 'w-10 h-10',
  ...props 
}) {
  return (
    <SmartImage
      src={src}
      alt={userName}
      fallbackText={userName}
      className={`rounded-full ${className}`}
      {...props}
    />
  );
}
