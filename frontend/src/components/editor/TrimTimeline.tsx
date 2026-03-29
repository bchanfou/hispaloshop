// @ts-nocheck
import React, { useRef, useCallback, useEffect } from 'react';

/* ─── Types ─── */
interface TrimTimelineProps {
  duration: number;
  trimStart: number;
  trimEnd: number;
  currentTime: number;
  frames: string[];
  onTrimChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

interface DragState {
  side: 'left' | 'right' | null;
  startX: number;
  startVal: number;
}

/* ─── Component ─── */
const TrimTimeline: React.FC<TrimTimelineProps> = ({
  duration,
  trimStart,
  trimEnd,
  currentTime,
  frames,
  onTrimChange,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<DragState>({ side: null, startX: 0, startVal: 0 });
  const rafRef = useRef<number>(0);
  const localTrimRef = useRef({ start: trimStart, end: trimEnd });

  // Keep local ref in sync with props
  useEffect(() => {
    localTrimRef.current = { start: trimStart, end: trimEnd };
  }, [trimStart, trimEnd]);

  const getContainerWidth = useCallback(() => {
    return containerRef.current?.getBoundingClientRect().width ?? 1;
  }, []);

  const pxToTime = useCallback(
    (px: number) => {
      const w = getContainerWidth();
      if (w <= 0 || duration <= 0) return 0;
      return (px / w) * duration;
    },
    [duration, getContainerWidth]
  );

  const timeToPercent = useCallback(
    (time: number) => (duration > 0 ? (time / duration) * 100 : 0),
    [duration]
  );

  /* ─── Pointer handlers (RAF-optimized) ─── */
  const onPointerDown = useCallback(
    (e: React.PointerEvent, side: 'left' | 'right') => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleRef.current = {
        side,
        startX: e.clientX,
        startVal: side === 'left' ? localTrimRef.current.start : localTrimRef.current.end,
      };
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = handleRef.current;
      if (!drag.side) return;

      const dx = e.clientX - drag.startX;
      const dt = pxToTime(dx);
      const newVal = Math.max(0, Math.min(duration, drag.startVal + dt));

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) return;

        if (drag.side === 'left') {
          const clamped = Math.min(newVal, localTrimRef.current.end - 0.5);
          localTrimRef.current.start = Math.max(0, clamped);
        } else {
          const clamped = Math.max(newVal, localTrimRef.current.start + 0.5);
          localTrimRef.current.end = Math.min(duration, clamped);
        }

        // Update DOM directly for smooth dragging
        const leftDim = el.querySelector<HTMLElement>('[data-dim="left"]');
        const rightDim = el.querySelector<HTMLElement>('[data-dim="right"]');
        const leftHandle = el.querySelector<HTMLElement>('[data-handle="left"]');
        const rightHandle = el.querySelector<HTMLElement>('[data-handle="right"]');

        const startPct = timeToPercent(localTrimRef.current.start);
        const endPct = timeToPercent(localTrimRef.current.end);

        if (leftDim) leftDim.style.width = `${startPct}%`;
        if (rightDim) rightDim.style.width = `${100 - endPct}%`;
        if (leftHandle) leftHandle.style.left = `${startPct}%`;
        if (rightHandle) rightHandle.style.left = `${endPct}%`;
      });
    },
    [duration, pxToTime, timeToPercent]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!handleRef.current.side) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      handleRef.current.side = null;
      cancelAnimationFrame(rafRef.current);
      onTrimChange(localTrimRef.current.start, localTrimRef.current.end);
    },
    [onTrimChange]
  );

  /* ─── Tap to seek ─── */
  const onTapSeek = useCallback(
    (e: React.MouseEvent) => {
      if (handleRef.current.side) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const time = (x / rect.width) * duration;
      const clamped = Math.max(trimStart, Math.min(trimEnd, time));
      onSeek(clamped);
    },
    [duration, trimStart, trimEnd, onSeek]
  );

  /* ─── Cleanup ─── */
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  /* ─── Derived positions ─── */
  const startPct = timeToPercent(trimStart);
  const endPct = timeToPercent(trimEnd);
  const playheadPct = timeToPercent(currentTime);

  return (
    <div
      ref={containerRef}
      className="relative h-[52px] rounded-xl overflow-hidden bg-stone-900 select-none touch-none"
      onClick={onTapSeek}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* ─── Frame thumbnails ─── */}
      <div className="flex h-full w-full">
        {(frames.length > 0 ? frames : Array(9).fill(null)).slice(0, 9).map((src, i) => (
          <div key={i} className="flex-1 h-full overflow-hidden">
            {src ? (
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-stone-800" />
            )}
          </div>
        ))}
      </div>

      {/* ─── Left dimmed region ─── */}
      <div
        data-dim="left"
        className="absolute top-0 left-0 h-full bg-black/50 pointer-events-none"
        style={{ width: `${startPct}%` }}
      />

      {/* ─── Right dimmed region ─── */}
      <div
        data-dim="right"
        className="absolute top-0 right-0 h-full bg-black/50 pointer-events-none"
        style={{ width: `${100 - endPct}%` }}
      />

      {/* ─── Left handle ─── */}
      <div
        data-handle="left"
        className="absolute top-0 h-full w-4 flex items-center justify-center cursor-ew-resize z-10 -translate-x-1/2"
        style={{ left: `${startPct}%` }}
        onPointerDown={(e) => onPointerDown(e, 'left')}
      >
        <div className="w-4 h-8 bg-white rounded-sm flex flex-col items-center justify-center gap-[3px] shadow-lg">
          <div className="w-[2px] h-2 bg-stone-400 rounded-full" />
          <div className="w-[2px] h-2 bg-stone-400 rounded-full" />
        </div>
      </div>

      {/* ─── Right handle ─── */}
      <div
        data-handle="right"
        className="absolute top-0 h-full w-4 flex items-center justify-center cursor-ew-resize z-10 -translate-x-1/2"
        style={{ left: `${endPct}%` }}
        onPointerDown={(e) => onPointerDown(e, 'right')}
      >
        <div className="w-4 h-8 bg-white rounded-sm flex flex-col items-center justify-center gap-[3px] shadow-lg">
          <div className="w-[2px] h-2 bg-stone-400 rounded-full" />
          <div className="w-[2px] h-2 bg-stone-400 rounded-full" />
        </div>
      </div>

      {/* ─── Playhead ─── */}
      <div
        className="absolute top-0 h-full w-[2px] bg-white pointer-events-none z-20 -translate-x-1/2"
        style={{ left: `${playheadPct}%` }}
      />
    </div>
  );
};

export default TrimTimeline;
