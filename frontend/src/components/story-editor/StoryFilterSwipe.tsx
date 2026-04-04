import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STORY_FILTERS } from '../../utils/editor/constants';

interface StoryFilterSwipeProps {
  /** Currently selected filter index */
  filterIndex: number;
  /** Intensity 0-100 */
  intensity: number;
  onFilterChange: (index: number) => void;
  onIntensityChange: (value: number) => void;
  /** Set false to disable swipe (e.g. when draw tool is active) */
  enabled?: boolean;
}

const SWIPE_THRESHOLD = 40;

export default function StoryFilterSwipe({
  filterIndex,
  intensity,
  onFilterChange,
  onIntensityChange,
  enabled = true,
}: StoryFilterSwipeProps) {
  const [showName, setShowName] = useState(false);
  const [showIntensity, setShowIntensity] = useState(false);
  const nameTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const pointerStartTime = useRef<number>(0);
  const isLongPress = useRef(false);

  const filter = STORY_FILTERS[filterIndex];

  // Show filter name briefly when filter changes
  useEffect(() => {
    if (filterIndex === 0) return; // Don't show for "Natural"
    setShowName(true);
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => setShowName(false), 1200);
    return () => {
      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    };
  }, [filterIndex]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      pointerStartX.current = e.clientX;
      pointerStartY.current = e.clientY;
      pointerStartTime.current = Date.now();
      isLongPress.current = false;

      // Long press → show intensity slider
      longPressTimerRef.current = setTimeout(() => {
        isLongPress.current = true;
        setShowIntensity(true);
      }, 500);
    },
    [enabled],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || pointerStartX.current === null) return;

      // If long-pressing, adjust intensity by vertical movement
      if (isLongPress.current && pointerStartY.current !== null) {
        const deltaY = pointerStartY.current - e.clientY;
        const newIntensity = Math.max(
          0,
          Math.min(100, intensity + deltaY * 0.5),
        );
        onIntensityChange(Math.round(newIntensity));
        pointerStartY.current = e.clientY;
        return;
      }

      const deltaX = e.clientX - pointerStartX.current;
      // Cancel long press if significant horizontal movement
      if (Math.abs(deltaX) > 15) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    },
    [enabled, intensity, onIntensityChange],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isLongPress.current) {
        isLongPress.current = false;
        setShowIntensity(false);
        pointerStartX.current = null;
        pointerStartY.current = null;
        return;
      }

      if (pointerStartX.current === null) return;
      const deltaX = e.clientX - pointerStartX.current;
      const elapsed = Date.now() - pointerStartTime.current;

      if (Math.abs(deltaX) > SWIPE_THRESHOLD && elapsed < 500) {
        if (deltaX < 0) {
          // Swipe left → next filter
          const next = Math.min(filterIndex + 1, STORY_FILTERS.length - 1);
          if (next !== filterIndex) onFilterChange(next);
        } else {
          // Swipe right → previous filter
          const prev = Math.max(filterIndex - 1, 0);
          if (prev !== filterIndex) onFilterChange(prev);
        }
      }

      pointerStartX.current = null;
      pointerStartY.current = null;
    },
    [enabled, filterIndex, onFilterChange],
  );

  const handlePointerCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isLongPress.current = false;
    setShowIntensity(false);
    pointerStartX.current = null;
    pointerStartY.current = null;
  }, []);

  return (
    <>
      {/* Invisible swipe overlay — sits on top of the media preview */}
      <div
        className="absolute inset-0 z-[6] touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ touchAction: 'none' }}
      />

      {/* Filter name overlay */}
      <AnimatePresence>
        {showName && filter && filter.key !== 'natural' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[7] pointer-events-none"
          >
            <span className="bg-black/60 backdrop-blur-sm text-white text-lg font-semibold px-5 py-2.5 rounded-full">
              {filter.name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intensity slider (shown on long press) */}
      <AnimatePresence>
        {showIntensity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-[7] flex flex-col items-center gap-2 pointer-events-none"
          >
            <div className="w-1 h-32 rounded-full bg-white/20 relative overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 bg-white rounded-full"
                style={{ height: `${intensity}%` }}
              />
            </div>
            <span className="text-xs text-white font-semibold">
              {intensity}%
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[7] flex gap-1.5 pointer-events-none">
        {STORY_FILTERS.map((f, i) => (
          <div
            key={f.key}
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
              i === filterIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </>
  );
}