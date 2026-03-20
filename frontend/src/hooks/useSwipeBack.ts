import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';

const EDGE_THRESHOLD = 30;   // px from left edge to activate
const COMMIT_DISTANCE = 80;  // px drag to trigger navigation

/**
 * useSwipeBack — iOS-style swipe-from-left-edge to go back.
 * Returns { bind, swipeProgress } where bind is spread onto the container element.
 * Respects data-no-swipe-back on ancestors (for carousels / horizontal scrolls).
 */
export function useSwipeBack() {
  const navigate = useNavigate();
  const startedAtEdge = useRef(false);
  const [swipeProgress, setSwipeProgress] = useState(0);

  const shouldIgnore = useCallback((target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    let el: HTMLElement | null = target;
    while (el) {
      if (el.dataset.noSwipeBack !== undefined) return true;
      el = el.parentElement;
    }
    return false;
  }, []);

  const bind = useDrag(
    ({ first, last, xy: [x], movement: [mx], cancel, event }) => {
      if (first) {
        startedAtEdge.current = x < EDGE_THRESHOLD && !shouldIgnore(event.target);
        if (!startedAtEdge.current) {
          cancel();
          return;
        }
      }

      if (!startedAtEdge.current) {
        cancel();
        return;
      }

      // Only allow rightward swipe
      if (mx < 0) {
        setSwipeProgress(0);
        if (last) startedAtEdge.current = false;
        return;
      }

      const progress = Math.min(mx / COMMIT_DISTANCE, 1);
      setSwipeProgress(progress);

      if (last) {
        startedAtEdge.current = false;
        setSwipeProgress(0);
        if (mx >= COMMIT_DISTANCE) {
          navigate(-1);
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  return { bind, swipeProgress };
}
