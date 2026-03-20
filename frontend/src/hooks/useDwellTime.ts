import { useEffect, useRef } from 'react';
import apiClient from '../services/api/client';

export function useDwellTime(contentId: string, contentType: 'post' | 'reel' = 'post') {
  const startTimeRef = useRef<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || !contentId) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startTimeRef.current = Date.now();
        } else if (startTimeRef.current) {
          const dwellMs = Date.now() - startTimeRef.current;
          if (dwellMs > 1000) { // Only track > 1 second
            apiClient.post('/track/social-event', {
              event_type: `view_${contentType}`,
              content_id: contentId,
              metadata: { dwell_time_seconds: Math.round(dwellMs / 1000) },
            }).catch(() => {});
          }
          startTimeRef.current = null;
        }
      },
      { threshold: 0.5 },
    );

    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [contentId, contentType]);

  return elementRef;
}
