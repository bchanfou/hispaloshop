import React, { useEffect, useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { sanitizeImageUrl } from '../../utils/helpers';

type ImageLike =
  | string
  | {
      url?: string | null;
      thumbnail_url?: string | null;
      image_url?: string | null;
      secure_url?: string | null;
      src?: string | null;
      alt_text?: string | null;
    }
  | null
  | undefined;

type ProductImageProps = React.HTMLAttributes<HTMLDivElement> & {
  src?: ImageLike;
  alt?: string;
  productName?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  preferThumbnail?: boolean;
};

const FALLBACK_GRADIENTS = [
  'from-amber-200 via-orange-100 to-rose-200',
  'from-emerald-200 via-lime-100 to-teal-200',
  'from-sky-200 via-cyan-100 to-indigo-200',
  'from-fuchsia-200 via-rose-100 to-orange-100',
  'from-violet-200 via-purple-100 to-sky-100',
  'from-yellow-200 via-amber-100 to-lime-100',
];

const getInitials = (value: string) => {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
};

const getGradient = (value: string) => {
  const hash = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length];
};

const resolveSource = (src: ImageLike, preferThumbnail: boolean) => {
  if (!src) return null;

  if (typeof src === 'string') {
    return sanitizeImageUrl(src);
  }

  const candidates = preferThumbnail
    ? [src.thumbnail_url, src.url, src.image_url, src.secure_url, src.src]
    : [src.url, src.image_url, src.secure_url, src.thumbnail_url, src.src];

  for (const candidate of candidates) {
    const safe = sanitizeImageUrl(candidate);
    if (safe) return safe;
  }

  return null;
};

export default function ProductImage({
  src,
  alt,
  productName,
  className = '',
  imageClassName = '',
  sizes,
  preferThumbnail = true,
  ...props
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const label = alt || productName || 'Producto';

  const normalizedSrc = useMemo(() => resolveSource(src, preferThumbnail), [preferThumbnail, src]);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [normalizedSrc]);

  const initials = getInitials(label);
  const gradient = getGradient(label);
  const showFallback = hasError || !normalizedSrc;

  return (
    <div
      className={`relative overflow-hidden bg-stone-100 ${className}`}
      data-image-state={showFallback ? 'fallback' : isLoaded ? 'loaded' : 'loading'}
      {...props}
    >
      {showFallback ? (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
          role="img"
          aria-label={label}
          title={label}
        >
          <div className="flex flex-col items-center gap-2 text-stone-700/90">
            <span className="select-none text-2xl font-semibold tracking-[0.18em] sm:text-3xl">{initials}</span>
            <ImageOff className="h-5 w-5 opacity-60" />
          </div>
        </div>
      ) : (
        <>
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              isLoaded ? 'opacity-0' : 'opacity-100'
            }`}
            aria-hidden="true"
          >
            <div
              className={`h-full w-full scale-110 bg-cover bg-center blur-xl ${normalizedSrc ? '' : `bg-gradient-to-br ${gradient}`}`}
              style={normalizedSrc ? { backgroundImage: `url(${normalizedSrc})` } : undefined}
            />
            <div className="absolute inset-0 bg-white/35 backdrop-blur-sm" />
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-transparent to-stone-300/20" />
          </div>
          <img
            src={normalizedSrc}
            alt={label}
            loading="lazy"
            decoding="async"
            sizes={sizes}
            className={`h-full w-full object-cover transition duration-500 ${
              isLoaded ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'
            } ${imageClassName}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(false);
            }}
          />
        </>
      )}
    </div>
  );
}
