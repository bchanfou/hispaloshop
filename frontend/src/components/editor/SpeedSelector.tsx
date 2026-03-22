// @ts-nocheck
import React, { useCallback } from 'react';

/* ─── Types ─── */
interface SpeedSelectorProps {
  value: number;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [0.3, 0.5, 1, 2, 3] as const;

/* ─── Component ─── */
const SpeedSelector: React.FC<SpeedSelectorProps> = ({ value, onSpeedChange }) => {
  const handleSelect = useCallback(
    (speed: number) => {
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
      onSpeedChange(speed);
    },
    [onSpeedChange]
  );

  return (
    <div className="flex gap-2 items-center justify-center">
      {SPEEDS.map((speed) => {
        const isActive = value === speed;
        return (
          <button
            key={speed}
            type="button"
            onClick={() => handleSelect(speed)}
            className={`
              px-3 py-1.5 text-xs font-semibold rounded-full min-h-[44px] min-w-[44px]
              transition-colors duration-150
              ${
                isActive
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-500 active:bg-stone-200'
              }
            `}
            aria-label={`Velocidad ${speed}x`}
            aria-pressed={isActive}
          >
            {speed}x
          </button>
        );
      })}
    </div>
  );
};

export default SpeedSelector;
