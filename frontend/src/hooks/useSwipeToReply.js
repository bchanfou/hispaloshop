import { useRef, useCallback } from 'react';

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE = 80;

export function useSwipeToReply(onReply) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const dragging = useRef(false);
  const activated = useRef(false);
  const elRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    dragging.current = true;
    activated.current = false;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!dragging.current) return;
    const delta = e.touches[0].clientX - startX.current;
    if (delta < 0) return;

    const clamped = Math.min(delta * 0.55, MAX_SWIPE);
    currentX.current = clamped;

    if (elRef.current) {
      elRef.current.style.transform = `translateX(${clamped}px)`;
      elRef.current.style.transition = 'none';
    }

    if (clamped >= SWIPE_THRESHOLD && !activated.current) {
      activated.current = true;
      if (navigator.vibrate) navigator.vibrate(10);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    dragging.current = false;
    if (elRef.current) {
      elRef.current.style.transform = 'translateX(0)';
      elRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    if (activated.current) {
      onReply();
      activated.current = false;
    }
  }, [onReply]);

  return { elRef, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
}
