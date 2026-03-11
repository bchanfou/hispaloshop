import React, { useMemo, useState } from 'react';
import { MapPin, Tag, Sparkles, Trash2 } from 'lucide-react';

const UTILITY_STICKERS = [
  {
    id: 'price',
    label: 'Precio',
    description: 'Anade un precio simple y sobrio.',
    icon: Tag,
    requiresInput: true,
    placeholder: '12,90',
  },
  {
    id: 'location',
    label: 'Ubicacion',
    description: 'Situa el contenido con una etiqueta discreta.',
    icon: MapPin,
    requiresInput: true,
    placeholder: 'Reus, Espana',
  },
  {
    id: 'new',
    label: 'Novedad',
    description: 'Marca algo nuevo sin anadir ruido.',
    icon: Sparkles,
    requiresInput: false,
  },
];

function StickerTool({ stickers, onAdd, onRemove }) {
  const [selectedType, setSelectedType] = useState('price');
  const [content, setContent] = useState('');

  const nonProductStickers = useMemo(
    () => stickers.filter((item) => item.type !== 'product'),
    [stickers],
  );

  const selectedSticker = UTILITY_STICKERS.find((item) => item.id === selectedType);

  const handleAdd = () => {
    if (!selectedSticker) return;
    if (selectedSticker.requiresInput && !content.trim()) return;

    onAdd(selectedSticker.id, {
      x: 72,
      y: 84,
      content: selectedSticker.requiresInput ? content.trim() : undefined,
    });
    setContent('');
  };

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
        <h3 className="text-sm font-semibold text-stone-950">Sellos utiles</h3>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          Solo se muestran overlays que aportan contexto real.
        </p>

        <div className="mt-4 space-y-2">
          {UTILITY_STICKERS.map((sticker) => {
            const Icon = sticker.icon;
            const isActive = selectedType === sticker.id;

            return (
              <button
                key={sticker.id}
                type="button"
                onClick={() => setSelectedType(sticker.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  isActive ? 'border-stone-950 bg-white' : 'border-stone-100 bg-white hover:border-stone-200'
                }`}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  isActive ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700'
                }`}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-950">{sticker.label}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{sticker.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {selectedSticker?.requiresInput ? (
          <div className="mt-4 rounded-2xl border border-stone-100 bg-white p-3">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
              Contenido
            </label>
            <input
              type="text"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={selectedSticker.placeholder}
              className="mt-2 h-12 w-full rounded-2xl bg-stone-50 px-4 text-sm text-stone-950 outline-none ring-1 ring-transparent transition-colors placeholder:text-stone-400 focus:ring-stone-950"
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleAdd}
          disabled={selectedSticker?.requiresInput && !content.trim()}
          className="mt-4 w-full rounded-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anadir sello
        </button>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-stone-950">Sellos activos</h4>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Tambien puedes arrastrarlos en el lienzo.
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {nonProductStickers.length}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {nonProductStickers.length === 0 ? (
            <div className="rounded-2xl bg-stone-50 px-4 py-5 text-sm text-stone-500">
              No hay sellos activos todavia.
            </div>
          ) : (
            nonProductStickers.map((sticker) => {
              const typeInfo = UTILITY_STICKERS.find((item) => item.id === sticker.type);
              const Icon = typeInfo?.icon || Tag;

              return (
                <div key={sticker.id} className="flex items-center justify-between gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-stone-950 shadow-sm ring-1 ring-stone-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-950">
                        {typeInfo?.label || 'Sello'}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {sticker.content || 'Sin texto adicional'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(sticker.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-500 ring-1 ring-stone-200 transition-colors hover:text-stone-950"
                    aria-label="Eliminar sello"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default StickerTool;
