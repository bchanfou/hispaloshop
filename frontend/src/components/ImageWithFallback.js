import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export function ImageWithFallback({
  src,
  alt,
  type = 'product',
  className,
  ...props
}) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-stone-100 ${className || ''}`}
        aria-label={alt || type}
        role="img"
      >
        <ImageOff className="h-6 w-6 text-stone-400" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      {...props}
    />
  );
}

export default ImageWithFallback;
