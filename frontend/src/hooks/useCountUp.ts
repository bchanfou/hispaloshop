import { useState, useEffect, useRef, RefObject } from 'react';

interface UseCountUpReturn {
  count: number;
  ref: RefObject<HTMLElement | null>;
}

export const useCountUp = (
  end: number,
  duration: number = 1500,
  start: number = 0,
): UseCountUpReturn => {
  const [count, setCount] = useState(start);
  const hasAnimated = useRef(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          let startTime: number | null = null;
          const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(start + (end - start) * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration, start]);

  return { count, ref: elementRef };
};
