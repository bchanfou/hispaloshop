import { useState } from 'react';

const placeholderImages = {
  product: 'https://via.placeholder.com/400x400?text=Producto',
  avatar: 'https://via.placeholder.com/100x100?text=User',
  store: 'https://via.placeholder.com/800x400?text=Tienda',
  banner: 'https://via.placeholder.com/1200x400?text=Banner',
};

export function ImageWithFallback({ 
  src, 
  alt, 
  type = 'product',
  className,
  ...props 
}) {
  const [error, setError] = useState(false);

  return (
    <img
      src={error ? placeholderImages[type] : (src || placeholderImages[type])}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      {...props}
    />
  );
}

export default ImageWithFallback;
