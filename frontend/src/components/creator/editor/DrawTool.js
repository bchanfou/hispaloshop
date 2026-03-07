import React from 'react';
import { Trash2, Pencil, Eraser, Undo2 } from 'lucide-react';

function DrawTool({ paths, onAddPath, onClear }) {
  return (
    <div className="p-4 space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 p-3 bg-[#2D5A3D]/10 rounded-xl text-[#2D5A3D]">
          <Pencil className="w-5 h-5" />
          <span className="text-sm font-medium">Modo dibujo activado</span>
        </div>
        <p className="text-xs text-stone-500 mt-2">
          Dibuja directamente sobre la imagen
        </p>
      </div>

      {/* Controles */}
      <div className="flex gap-2">
        <button
          onClick={onClear}
          disabled={paths.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Limpiar todo
        </button>
      </div>

      {/* Info de trazos */}
      <div className="p-3 bg-stone-50 rounded-xl">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Trazos dibujados</span>
          <span className="font-semibold text-[#2D5A3D]">{paths.length}</span>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="space-y-2 text-xs text-stone-500">
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#2D5A3D] rounded-full" />
          Selecciona el color y grosor desde el panel inferior del canvas
        </p>
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#2D5A3D] rounded-full" />
          Haz clic y arrastra para dibujar
        </p>
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#2D5A3D] rounded-full" />
          Los trazos se guardan automáticamente
        </p>
      </div>
    </div>
  );
}

export default DrawTool;
