// Section 3.6.6 — F-04
// Reusable product tag with thumbnail + price. Three sizes (sm/md/lg) for
// inline feed, story stickers, and recipe detail. Stone palette, rounded-xl.
// Cat A-06 already established the pattern in PostCard (32px thumbnail +
// price bolder). This component unifies it as a single import.

import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useLocale } from '../../context/LocaleContext';

const SIZE_CONFIG = {
  sm: { img: 32, textSize: 'text-[11px]', priceSize: 'text-[12px]', gap: 'gap-1.5', px: 'px-2 py-1.5', rounded: 'rounded-xl' },
  md: { img: 48, textSize: 'text-[12px]', priceSize: 'text-[13px]', gap: 'gap-2', px: 'px-2.5 py-2', rounded: 'rounded-xl' },
  lg: { img: 64, textSize: 'text-[13px]', priceSize: 'text-[15px]', gap: 'gap-3', px: 'px-3 py-2.5', rounded: 'rounded-2xl' },
};

export default function ProductTag({
  productId,
  name,
  imageUrl,
  price,
  currency = 'EUR',
  size = 'sm',
  onClick,
  className = '',
  variant = 'light', // 'light' (white bg) or 'overlay' (glass bg for reels/stories)
}) {
  const { convertAndFormatPrice } = useLocale();
  const cfg = SIZE_CONFIG[size] || SIZE_CONFIG.sm;

  const imgStyle = { width: cfg.img, height: cfg.img };

  const bgClass = variant === 'overlay'
    ? 'bg-white/15 backdrop-blur-xl border-white/10'
    : 'bg-white border-stone-200';

  const textClass = variant === 'overlay' ? 'text-white' : 'text-stone-950';
  const priceClass = variant === 'overlay' ? 'text-white/80' : 'text-stone-700';

  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
      className={`inline-flex items-center ${cfg.gap} ${cfg.px} ${cfg.rounded} border cursor-pointer transition-colors hover:opacity-90 ${bgClass} ${className}`}
      aria-label={name ? `Ver producto: ${name}` : 'Ver producto'}
    >
      <div
        className={`${cfg.rounded} overflow-hidden bg-stone-100 shrink-0 flex items-center justify-center`}
        style={imgStyle}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name || 'Producto'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <ShoppingBag size={cfg.img * 0.35} className="text-stone-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {name && (
          <p className={`${cfg.textSize} font-semibold ${textClass} truncate leading-tight`}>
            {name}
          </p>
        )}
        {price != null && (
          <p className={`${cfg.priceSize} font-bold ${priceClass} leading-tight`}>
            {convertAndFormatPrice(price, currency)}
          </p>
        )}
      </div>
    </div>
  );
}
