import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';

function DrawTool({ paths, onClear }) {
  return (
    <div className="space-y-4 p-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-xl bg-stone-100 p-3 text-stone-950">
          <Pencil className="h-5 w-5" />
          <span className="text-sm font-medium">Modo dibujo activado</span>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          Dibuja directamente sobre la imagen
        </p>
      </div>

      <button
        type="button"
        onClick={onClear}
        disabled={paths.length === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-100 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
        Limpiar trazos
      </button>

      <div className="rounded-xl bg-stone-50 p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Trazos dibujados</span>
          <span className="font-semibold text-stone-950">{paths.length}</span>
        </div>
      </div>

      <div className="space-y-2 text-xs text-stone-500">
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
          Selecciona el color y grosor desde el panel inferior del canvas
        </p>
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
          Haz clic y arrastra para dibujar
        </p>
        <p className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
          Los trazos se guardan automáticamente
        </p>
      </div>
    </div>
  );
}

export default DrawTool;
