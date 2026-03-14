import { useState, useEffect, useRef } from 'react';

export function useScrollDirection(threshold = 10) {
  const [direction, setDirection] = useState('idle');
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

export function useContainerScrollDirection(containerRef, threshold = 10) {
  const [direction, setDirection] = useState('idle');
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
