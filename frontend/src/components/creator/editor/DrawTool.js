import React from 'react';
import { Eraser, Highlighter, Pencil, Trash2, Undo2 } from 'lucide-react';

const DRAW_TOOLS = [
  { id: 'pen', icon: Pencil, label: 'Pluma' },
  { id: 'highlighter', icon: Highlighter, label: 'Resaltador' },
  { id: 'eraser', icon: Eraser, label: 'Borrador' },
];

const COLORS = [
  '#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00',
  '#34C759', '#007AFF', '#AF52DE', '#FF2D55', '#5856D6',
  '#A2845E', '#8E8E93',
];

const SIZES = [
  { value: 2, label: 'XS' },
  { value: 4, label: 'S' },
  { value: 8, label: 'M' },
  { value: 14, label: 'L' },
  { value: 24, label: 'XL' },
];

function DrawTool({ drawColor, drawSize, drawTool, onColorChange, onSizeChange, onToolChange, paths, onClear, onUndo }) {
  return (
    <div className="space-y-4 p-4">
      {/* Tool selector */}
      <div className="flex items-center justify-center gap-2">
        {DRAW_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = drawTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onToolChange(tool.id)}
              className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tool.label}
            </button>
          );
        })}
      </div>

      {/* Color picker */}
      {drawTool !== 'eraser' && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-stone-400">Color</p>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onColorChange(color)}
                className={`h-8 w-8 rounded-full border-2 transition-transform ${
                  drawColor === color ? 'scale-110 border-stone-950' : 'border-stone-200 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                aria-label={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Size selector */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-stone-400">Grosor</p>
        <div className="flex items-end justify-center gap-3">
          {SIZES.map((size) => (
            <button
              key={size.value}
              type="button"
              onClick={() => onSizeChange(size.value)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={`rounded-full transition-colors ${
                  drawSize === size.value ? 'bg-stone-950' : 'bg-stone-300'
                }`}
                style={{ width: size.value + 6, height: size.value + 6 }}
              />
              <span className={`text-[10px] font-medium ${
                drawSize === size.value ? 'text-stone-950' : 'text-stone-400'
              }`}>
                {size.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={paths.length === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-100 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" />
          Deshacer
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={paths.length === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-stone-100 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" />
          Limpiar
        </button>
      </div>

      {/* Stroke count */}
      <div className="rounded-xl bg-stone-50 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Trazos</span>
          <span className="font-semibold text-stone-950">{paths.length}</span>
        </div>
      </div>
    </div>
  );
}

export default DrawTool;
