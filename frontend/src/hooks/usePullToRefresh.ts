import { useState, useRef, useCallback, TouchEvent } from 'react';
import { useHaptics } from './useHaptics';

const THRESHOLD = 80;
const MAX_PULL = 120;

interface PullToRefreshHandlers {
  onTouchStart: (e: TouchEvent<HTMLElement>) => void;
  onTouchMove: (e: TouchEvent<HTMLElement>) => void;
  onTouchEnd: () => Promise<void>;
}

interface PullToRefreshReturn {
  pulling: boolean;
  refreshing: boolean;
  pullDistance: number;
  progress: number;
  handlers: PullToRefreshHandlers;
}

export const usePullToRefresh = (onRefresh: () => Promise<void>): PullToRefreshReturn => {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const { trigger } = useHaptics();

  const startY = useRef(0);
  const isDragging = useRef(false);
  const hapticFired = useRef(false);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  // Find the actual scroll container — Virtuoso renders [data-virtuoso-scroller],
  // falling back to the element itself. The outer motion.div wrapper is never the scroller.
  const getScroller = (el: HTMLElement): HTMLElement => {
    const inner = el.querySelector<HTMLElement>('[data-virtuoso-scroller]');
    return inner ?? el;
  };

  const onTouchStart = useCallback((e: TouchEvent<HTMLElement>) => {
    const scroller = getScroller(e.currentTarget);
    if (scroller.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
    hapticFired.current = false;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent<HTMLElement>) => {
    if (!isDragging.current || refreshing) return;
    const scroller = getScroller(e.currentTarget);
    if (scroller.scrollTop > 0) {
      isDragging.current = false;
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) return;
    const resistance = 1 - delta / (MAX_PULL * 3);
    const pull = Math.min(delta * resistance, MAX_PULL);
    setPullDistance(pull);
    setPulling(pull > 0);

    // Haptic feedback when crossing threshold
    if (pull >= THRESHOLD && !hapticFired.current) {
      hapticFired.current = true;
      trigger('medium');
    } else if (pull < THRESHOLD) {
      hapticFired.current = false;
    }
  }, [refreshing, trigger]);

  const onTouchEnd = useCallback(async () => {
    isDragging.current = false;
    if (pullDistance >= THRESHOLD) {
      trigger('success');
      setRefreshing(true);
      setPullDistance(0);
      setPulling(false);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
      setPulling(false);
    }
  }, [pullDistance, onRefresh, trigger]);

  return {
    pulling,
    refreshing,
    pullDistance,
    progress,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
};
