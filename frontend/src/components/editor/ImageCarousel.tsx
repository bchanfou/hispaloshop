// @ts-nocheck
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ImageCarouselProps {
  images: string[];
  activeIndex: number;
  filter: string;
  onIndexChange: (index: number) => void;
  onDoubleTap?: () => void;
}

export default function ImageCarousel({
  images,
  activeIndex,
  filter,
  onIndexChange,
  onDoubleTap,
}: ImageCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Sync scroll position when activeIndex changes externally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !containerWidth) return;
    const target = activeIndex * containerWidth;
    if (Math.abs(el.scrollLeft - target) > 2) {
      el.scrollTo({ left: target, behavior: 'smooth' });
    }
  }, [activeIndex, containerWidth]);

  // Detect which image is snapped to after scroll ends
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !containerWidth) return;
    const newIndex = Math.round(el.scrollLeft / containerWidth);
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < images.length) {
      onIndexChange(newIndex);
    }
  }, [containerWidth, activeIndex, images.length, onIndexChange]);

  // Debounced scroll-end detection
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScrollCapture = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(handleScroll, 80);
  }, [handleScroll]);

  // Double-tap detection
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onDoubleTap?.();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onDoubleTap]);

  const total = images.length;
  const maxDots = 5;

  // Calculate visible dot window
  const getVisibleDots = () => {
    if (total <= maxDots) {
      return Array.from({ length: total }, (_, i) => i);
    }
    let start = activeIndex - Math.floor(maxDots / 2);
    start = Math.max(0, Math.min(start, total - maxDots));
    return Array.from({ length: maxDots }, (_, i) => start + i);
  };

  const visibleDots = getVisibleDots();

  return (
    <div className="relative rounded-2xl overflow-hidden bg-stone-100">
      {/* Scrollable image strip */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        onScroll={onScrollCapture}
        onClick={handleTap}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="snap-center w-full flex-shrink-0"
          >
            <img
              src={src}
              alt={`Imagen ${i + 1}`}
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{ filter }}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Counter badge — top right */}
      {total > 1 && (
        <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-stone-950/70 text-white text-xs font-medium tabular-nums">
          {activeIndex + 1}/{total}
        </div>
      )}

      {/* Dot indicators — bottom center */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {visibleDots.map((dotIndex) => (
            <motion.div
              key={dotIndex}
              className="rounded-full"
              animate={{
                width: dotIndex === activeIndex ? 8 : 6,
                height: dotIndex === activeIndex ? 8 : 6,
                backgroundColor: dotIndex === activeIndex ? '#ffffff' : 'rgba(255,255,255,0.5)',
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
