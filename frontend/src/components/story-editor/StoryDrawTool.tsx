import React from 'react';

interface StoryDrawToolProps {
  drawColor: string;
  drawWidth: number;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onUndo: () => void;
  onDone: () => void;
}

// Paleta stone-only alineada con DNA (B&W). Herramienta creativa limitada
// a gris/negro/blanco para mantener consistencia visual en stories.
const DRAW_COLORS = [
  '#0c0a09', // stone-950
  '#44403c', // stone-700
  '#78716c', // stone-500
  '#a8a29e', // stone-400
  '#d6d3d1', // stone-300
  '#e7e5e4', // stone-200
  '#f5f5f4', // stone-100
  '#ffffff',
];

const WIDTH_OPTIONS = [
  { w: 2, label: 'Fino' },
  { w: 4, label: 'Medio' },
  { w: 8, label: 'Grueso' },
];

export default function StoryDrawTool({
  drawColor,
  drawWidth,
  onColorChange,
  onWidthChange,
  onUndo,
  onDone,
}: StoryDrawToolProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl p-4 rounded-t-hs-xl z-20 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Dibujar</span>
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            className="text-white/60 text-xs bg-white/10 rounded-full px-3 py-1.5 border-none cursor-pointer"
          >
            &#8617; Deshacer
          </button>
          <button
            onClick={onDone}
            className="text-black text-xs bg-white rounded-full px-3 py-1.5 border-none cursor-pointer font-semibold"
          >
            Listo
          </button>
        </div>
      </div>

      {/* Colors */}
      <div className="flex gap-2">
        {DRAW_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`w-11 h-11 rounded-full border-2 cursor-pointer p-0 shrink-0 flex items-center justify-center ${
              drawColor === c
                ? 'border-white ring-2 ring-white/50'
                : 'border-transparent'
            }`}
            aria-label={`Color ${c}`}
          >
            <span
              className="w-7 h-7 rounded-full shrink-0 border-2 border-white/30"
              style={{ background: c }}
            />
          </button>
        ))}
      </div>

      {/* Width */}
      <div className="flex gap-3 items-center">
        {WIDTH_OPTIONS.map((opt) => (
          <button
            key={opt.w}
            onClick={() => onWidthChange(opt.w)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs cursor-pointer border-none ${
              drawWidth === opt.w
                ? 'bg-white text-black font-semibold'
                : 'bg-white/10 text-white'
            }`}
          >
            <span
              className="rounded-full bg-current"
              style={{ width: opt.w * 2, height: opt.w * 2 }}
            />
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
