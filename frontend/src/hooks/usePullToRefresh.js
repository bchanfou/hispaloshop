import { useState, useRef, useCallback } from 'react';

const THRESHOLD = 80;
const MAX_PULL = 120;

export const usePullToRefresh = (onRefresh) => {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startY = useRef(0);
  const isDragging = useRef(false);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  const onTouchStart = useCallback((e) => {
    const el = e.currentTarget;
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!isDragging.current || refreshing) return;
    const el = e.currentTarget;
    if (el.scrollTop > 0) {
      isDragging.current = false;
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) return;
    const resistance = 1 - delta / (MAX_PULL * 3);
    const pull = Math.min(delta * resistance, MAX_PULL);
    setPullDistance(pull);
    setPulling(pull > 0);
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    isDragging.current = false;
    if (pullDistance >= THRESHOLD) {
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
  }, [pullDistance, onRefresh]);

  return {
    pulling,
    refreshing,
    pullDistance,
    progress,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
};
