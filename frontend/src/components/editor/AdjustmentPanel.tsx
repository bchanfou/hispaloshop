import React, { useRef, useCallback } from 'react';
import { X } from 'lucide-react';

/* ─── Types ─── */
interface AdjustmentPanelProps {
  adjustments: Record<string, number>;
  onAdjustmentChange: (key: string, value: number) => void;
}

/* ─── Slider Definitions ─── */
const SLIDERS = [
  { key: 'brightness', label: 'Brillo', min: -100, max: 100, default: 0 },
  { key: 'contrast', label: 'Contraste', min: -100, max: 100, default: 0 },
  { key: 'saturation', label: 'Saturacion', min: -100, max: 100, default: 0 },
  { key: 'warmth', label: 'Calidez', min: -100, max: 100, default: 0 },
  { key: 'sharpness', label: 'Nitidez', min: 0, max: 100, default: 0 },
  { key: 'shadows', label: 'Sombras', min: -100, max: 100, default: 0 },
  { key: 'highlights', label: 'Luces', min: -100, max: 100, default: 0 },
  { key: 'vignette', label: 'Vineta', min: 0, max: 100, default: 0 },
] as const;

/* ─── Main Component ─── */
export default function AdjustmentPanel({
  adjustments,
  onAdjustmentChange,
}: AdjustmentPanelProps) {
  return (
    <div className="py-3 px-4 space-y-4 max-h-[300px] overflow-y-auto">
      {SLIDERS.map((slider) => (
        <AdjustmentSlider
          key={slider.key}
          sliderKey={slider.key}
          label={slider.label}
          min={slider.min}
          max={slider.max}
          defaultValue={slider.default}
          value={adjustments[slider.key] ?? slider.default}
          onChange={onAdjustmentChange}
        />
      ))}
    </div>
  );
}

/* ─── Individual Slider ─── */
interface AdjustmentSliderProps {
  sliderKey: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  value: number;
  onChange: (key: string, value: number) => void;
}

const AdjustmentSlider = React.memo(function AdjustmentSlider({
  sliderKey,
  label,
  min,
  max,
  defaultValue,
  value,
  onChange,
}: AdjustmentSliderProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(sliderKey, next);
      }, 100);
    },
    [sliderKey, onChange],
  );

  const handleReset = useCallback(() => {
    clearTimeout(timerRef.current);
    onChange(sliderKey, defaultValue);
  }, [sliderKey, defaultValue, onChange]);

  const showReset = value !== defaultValue;

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-stone-600 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        defaultValue={value}
        key={`${sliderKey}-${value}`}
        onChange={handleChange}
        className="flex-1 accent-stone-950"
      />
      <span className="w-8 text-right text-xs text-stone-400">{value}</span>
      {showReset ? (
        <button
          onClick={handleReset}
          className="w-5 h-5 flex items-center justify-center rounded-full bg-stone-100 hover:bg-stone-200 transition-colors shrink-0"
          aria-label={`Restablecer ${label}`}
        >
          <X size={12} className="text-stone-500" />
        </button>
      ) : (
        <div className="w-5 shrink-0" />
      )}
    </div>
  );
});
