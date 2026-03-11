import React, { useMemo, useState } from 'react';
import { MessageSquareText, Plus, Square, Trash2, Type } from 'lucide-react';
import { FONT_OPTIONS } from '../types/editor.types';

const COLOR_OPTIONS = [
  { id: 'light', label: 'Claro', color: '#FFFFFF', backgroundColor: 'rgba(28,25,23,0.42)' },
  { id: 'dark', label: 'Oscuro', color: '#0c0a09', backgroundColor: 'rgba(255,255,255,0.74)' },
  { id: 'soft', label: 'Suave', color: '#f5f5f4', backgroundColor: 'rgba(12,10,9,0.28)' },
];

function TextTool({ texts, onAdd, onUpdate, onRemove }) {
  const [draft, setDraft] = useState('');
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);

  const selectedText = useMemo(
    () => texts.find((item) => item.id === selectedTextId) || null,
    [selectedTextId, texts],
  );

  const handleAdd = () => {
    if (!draft.trim()) return;
    onAdd(draft, {
      x: 72,
      y: 96,
      fontSize: 34,
      fontFamily: 'sans',
      color: '#FFFFFF',
      backgroundColor: 'rgba(28,25,23,0.42)',
      hasBackground: false,
      hasOutline: true,
    });
    setDraft('');
    setShowComposer(false);
  };

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-stone-950 shadow-sm ring-1 ring-stone-200">
            <MessageSquareText className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-950">Texto libre</h3>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Escribe texto, emojis, hashtags y menciones de forma natural. Después puedes mover cada capa directamente sobre el lienzo.
            </p>
          </div>
        </div>

        {!showComposer ? (
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
          >
            <Plus className="h-4 w-4" />
            Añadir texto
          </button>
        ) : (
          <div className="mt-4 space-y-3 rounded-2xl border border-stone-200 bg-white p-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribe texto, emojis, hashtags o menciones."
              className="h-24 w-full resize-none rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-950 outline-none ring-1 ring-transparent transition-colors placeholder:text-stone-400 focus:ring-stone-950"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft('');
                  setShowComposer(false);
                }}
                className="flex-1 rounded-full bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!draft.trim()}
                className="flex-1 rounded-full bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Insertar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-stone-950">Capas de texto</h4>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Selecciona una capa para ajustar tono, tamaño y presencia visual.
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {texts.length}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {texts.length === 0 ? (
            <div className="rounded-2xl bg-stone-50 px-4 py-5 text-sm text-stone-500">
              Aún no has añadido texto.
            </div>
          ) : (
            texts.map((text) => (
              <button
                key={text.id}
                type="button"
                onClick={() => setSelectedTextId(text.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  selectedTextId === text.id ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-100 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ fontFamily: text.fontFamily }}>
                    {text.text}
                  </p>
                  <p className={`mt-1 text-xs ${selectedTextId === text.id ? 'text-white/70' : 'text-stone-500'}`}>
                    Arrástralo sobre la imagen para colocarlo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(text.id);
                    if (selectedTextId === text.id) {
                      setSelectedTextId(null);
                    }
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    selectedTextId === text.id ? 'bg-white/12 text-white hover:bg-white/18' : 'bg-white text-stone-500 ring-1 ring-stone-200 hover:text-stone-950'
                  }`}
                  aria-label="Eliminar texto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedText ? (
        <div className="space-y-4 rounded-2xl border border-stone-100 bg-white p-4">
          <div>
            <h4 className="text-sm font-semibold text-stone-950">Ajustes de texto</h4>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Mantén contraste alto y añade fondo solo cuando la imagen lo necesite.
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
              <Type className="h-3.5 w-3.5" />
              Tipografía
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => onUpdate(selectedText.id, { fontFamily: font.id })}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    selectedText.fontFamily === font.id ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                  style={{ fontFamily: font.id }}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Tamaño</label>
            <input
              type="range"
              min="18"
              max="84"
              value={selectedText.fontSize}
              onChange={(event) => onUpdate(selectedText.id, { fontSize: parseInt(event.target.value, 10) })}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Estilo</label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdate(selectedText.id, { color: option.color, backgroundColor: option.backgroundColor })}
                  className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                    selectedText.color === option.color ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-100 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span className="text-xs font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUpdate(selectedText.id, { hasOutline: !selectedText.hasOutline })}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                selectedText.hasOutline ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              Mejor contraste
            </button>
            <button
              type="button"
              onClick={() => onUpdate(selectedText.id, { hasBackground: !selectedText.hasBackground })}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                selectedText.hasBackground ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Square className="h-4 w-4" />
              Fondo sutil
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TextTool;
