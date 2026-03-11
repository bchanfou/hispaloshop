import React, { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  MessageSquareText,
  Plus,
  RotateCw,
  Square,
  Trash2,
  Type,
} from 'lucide-react';
import { FONT_OPTIONS } from '../types/editor.types';

const TEXT_PRESETS = [
  {
    id: 'clean',
    name: 'Clean',
    hint: 'Ligero y editorial',
    fontFamily: 'minimal',
    fontSize: 32,
    fontWeight: 400,
    color: '#FFFFFF',
    backgroundColor: 'rgba(15,23,42,0.22)',
    hasBackground: false,
    hasOutline: true,
    letterSpacing: 0.2,
  },
  {
    id: 'headline',
    name: 'Headline',
    hint: 'Titular con presencia',
    fontFamily: 'bold',
    fontSize: 42,
    fontWeight: 700,
    color: '#FFFFFF',
    backgroundColor: 'rgba(12,10,9,0.52)',
    hasBackground: false,
    hasOutline: true,
    letterSpacing: 0.4,
  },
  {
    id: 'card',
    name: 'Card',
    hint: 'Etiqueta limpia',
    fontFamily: 'sans',
    fontSize: 28,
    fontWeight: 600,
    color: '#0c0a09',
    backgroundColor: 'rgba(255,255,255,0.82)',
    hasBackground: true,
    hasOutline: false,
    letterSpacing: 0,
  },
  {
    id: 'story',
    name: 'Story',
    hint: 'Mas emocional',
    fontFamily: 'handwritten',
    fontSize: 38,
    fontWeight: 600,
    color: '#FFF7ED',
    backgroundColor: 'rgba(124,45,18,0.32)',
    hasBackground: false,
    hasOutline: true,
    letterSpacing: 0,
  },
  {
    id: 'serif',
    name: 'Serif',
    hint: 'Mas sofisticado',
    fontFamily: 'serif',
    fontSize: 34,
    fontWeight: 600,
    color: '#F8FAFC',
    backgroundColor: 'rgba(30,41,59,0.38)',
    hasBackground: false,
    hasOutline: true,
    letterSpacing: 0.1,
  },
  {
    id: 'label',
    name: 'Label',
    hint: 'Compacto y util',
    fontFamily: 'sans',
    fontSize: 24,
    fontWeight: 600,
    color: '#FFFFFF',
    backgroundColor: 'rgba(12,10,9,0.68)',
    hasBackground: true,
    hasOutline: false,
    letterSpacing: 0.8,
  },
];

const COLOR_OPTIONS = [
  { id: 'light', label: 'Claro', color: '#FFFFFF', backgroundColor: 'rgba(28,25,23,0.42)' },
  { id: 'dark', label: 'Oscuro', color: '#0c0a09', backgroundColor: 'rgba(255,255,255,0.74)' },
  { id: 'soft', label: 'Suave', color: '#f5f5f4', backgroundColor: 'rgba(12,10,9,0.28)' },
  { id: 'sun', label: 'Solar', color: '#FFF7ED', backgroundColor: 'rgba(154,52,18,0.34)' },
];

const ALIGN_OPTIONS = [
  { id: 'left', label: 'Izq', icon: AlignLeft },
  { id: 'center', label: 'Centro', icon: AlignCenter },
  { id: 'right', label: 'Der', icon: AlignRight },
];

function RangeField({ label, value, min, max, step = 1, onChange, suffix = '' }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="text-stone-500">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-stone-950"
      />
    </div>
  );
}

function TextTool({ texts, onAdd, onUpdate, onRemove }) {
  const [draft, setDraft] = useState('');
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('clean');

  const selectedText = useMemo(
    () => texts.find((item) => item.id === selectedTextId) || null,
    [selectedTextId, texts],
  );
  const selectedPreset = TEXT_PRESETS.find((item) => item.id === selectedPresetId) || TEXT_PRESETS[0];

  const handleAdd = () => {
    if (!draft.trim()) return;
    onAdd(draft, {
      x: 72,
      y: 96,
      ...selectedPreset,
      scale: 1,
      rotation: 0,
      textAlign: 'left',
    });
    setDraft('');
    setShowComposer(false);
  };

  const applyPresetToSelected = (preset) => {
    if (!selectedText) return;
    onUpdate(selectedText.id, {
      presetId: preset.id,
      fontFamily: preset.fontFamily,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      color: preset.color,
      backgroundColor: preset.backgroundColor,
      hasBackground: preset.hasBackground,
      hasOutline: preset.hasOutline,
      letterSpacing: preset.letterSpacing,
    });
  };

  return (
    <div className="space-y-5 p-4">
      <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-stone-950 shadow-sm ring-1 ring-stone-200">
            <MessageSquareText className="h-[18px] w-[18px]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-950">Texto</h3>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-stone-500">Estilos</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPresetId(preset.id)}
                className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                  selectedPresetId === preset.id ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
              >
                <p className="text-sm font-semibold">{preset.name}</p>
                <p className={`mt-1 text-xs ${selectedPresetId === preset.id ? 'text-white/70' : 'text-stone-500'}`}>
                  {preset.hint}
                </p>
              </button>
            ))}
          </div>
        </div>

        {!showComposer ? (
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
          >
            <Plus className="h-4 w-4" />
            Anadir
          </button>
        ) : (
          <div className="mt-4 space-y-3 rounded-2xl border border-stone-200 bg-white p-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribe..."
              className="h-24 w-full resize-none rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-950 outline-none ring-1 ring-transparent transition-colors placeholder:text-stone-400 focus:ring-stone-950"
              autoFocus
            />
            <div className="rounded-2xl bg-stone-50 p-3">
              <p className="text-xs font-medium text-stone-700">{selectedPreset.name}</p>
            </div>
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
                Listo
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-stone-950">Capas</h4>
            </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {texts.length}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {texts.length === 0 ? (
            <div className="rounded-2xl bg-stone-50 px-4 py-5 text-sm text-stone-500">
              Sin texto.
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
                  <p className="truncate text-sm font-medium">
                    {text.text}
                  </p>
                  <p className={`mt-1 text-xs ${selectedTextId === text.id ? 'text-white/70' : 'text-stone-500'}`}>Mover y ajustar.</p>
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
            <h4 className="text-sm font-semibold text-stone-950">Ajustes</h4>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
              <Type className="h-3.5 w-3.5" />
              Tipografia
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
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Presets rapidos</label>
            <div className="grid grid-cols-2 gap-2">
              {TEXT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPresetToSelected(preset)}
                  className={`rounded-2xl border px-3 py-3 text-left transition-colors ${
                    selectedText.presetId === preset.id ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-100 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <p className="text-sm font-semibold">{preset.name}</p>
                  <p className={`mt-1 text-xs ${selectedText.presetId === preset.id ? 'text-white/70' : 'text-stone-500'}`}>
                    {preset.hint}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <RangeField
            label="Tamano"
            value={selectedText.fontSize}
            min={18}
            max={84}
            onChange={(event) => onUpdate(selectedText.id, { fontSize: parseInt(event.target.value, 10) })}
          />

          <RangeField
            label="Escala"
            value={selectedText.scale || 1}
            min={0.7}
            max={2}
            step={0.05}
            suffix="x"
            onChange={(event) => onUpdate(selectedText.id, { scale: parseFloat(event.target.value) })}
          />

          <RangeField
            label="Rotacion"
            value={selectedText.rotation || 0}
            min={-30}
            max={30}
            suffix=" deg"
            onChange={(event) => onUpdate(selectedText.id, { rotation: parseInt(event.target.value, 10) })}
          />

          <RangeField
            label="Tracking"
            value={selectedText.letterSpacing || 0}
            min={0}
            max={2}
            step={0.1}
            onChange={(event) => onUpdate(selectedText.id, { letterSpacing: parseFloat(event.target.value) })}
          />

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Estilo</label>
            <div className="grid grid-cols-2 gap-2">
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

          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">Alineacion</label>
            <div className="grid grid-cols-3 gap-2">
              {ALIGN_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = (selectedText.textAlign || 'left') === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onUpdate(selectedText.id, { textAlign: option.id })}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
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

          <div className="rounded-2xl bg-stone-50 px-4 py-3 text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <RotateCw className="h-3.5 w-3.5" />
              Colocalo con drag y usa la rotacion solo como acento, no como gesto principal.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default TextTool;
