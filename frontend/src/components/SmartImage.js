import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

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
      'bg-amber-100 text-amber-700',
      'bg-emerald-100 text-emerald-700',
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-rose-100 text-rose-700',
      'bg-orange-100 text-orange-700',
      'bg-teal-100 text-teal-700',
      'bg-indigo-100 text-indigo-700',
    ];
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (error || !src) {
    return (
      <div 
        className={`flex items-center justify-center ${getColor()} ${className} ${fallbackClassName}`}
        title={alt}
        role="img"
        aria-label={alt}
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
        src={src}
        alt={alt}
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
