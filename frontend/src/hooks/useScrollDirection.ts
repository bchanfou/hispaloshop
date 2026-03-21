import { useState, useEffect, useRef, RefObject } from 'react';

type ScrollDirection = 'idle' | 'up' | 'down';

export function useScrollDirection(threshold: number = 10): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('idle');
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const current = window.scrollY;
        const delta = current - lastScrollY.current;

        if (Math.abs(delta) >= threshold) {
          setDirection(delta > 0 ? 'down' : 'up');
          lastScrollY.current = current;
        }
        ticking.current = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return direction;
}

export function useContainerScrollDirection(
  containerRef: RefObject<HTMLElement | null>,
  threshold: number = 10,
): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('idle');
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const current = el.scrollTop;
        const delta = current - lastScrollY.current;

        if (Math.abs(delta) >= threshold) {
          setDirection(delta > 0 ? 'down' : 'up');
          lastScrollY.current = current;
        }
        ticking.current = false;
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [containerRef, threshold]);

  return direction;
}
