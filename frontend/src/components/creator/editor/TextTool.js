import React, { useRef, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, Plus, Trash2 } from 'lucide-react';

const FONT_STYLES = [
  { id: 'sans',   label: 'Modern', family: 'ui-sans-serif, system-ui, sans-serif', weight: 400 },
  { id: 'bold',   label: 'Bold',   family: 'ui-sans-serif, system-ui, sans-serif', weight: 700 },
  { id: 'serif',  label: 'Serif',  family: 'ui-serif, Georgia, serif',             weight: 400 },
  { id: 'script', label: 'Script', family: 'cursive',                              weight: 400 },
  { id: 'mono',   label: 'Mono',   family: 'ui-monospace, monospace',              weight: 400 },
];

const COLOR_DOTS = [
  '#FFFFFF', '#000000', '#A8A29E',
  '#EF4444', '#F97316', '#FACC15',
  '#22C55E', '#3B82F6', '#EC4899',
];

const ALIGN_OPTIONS = [
  { value: 'left',   Icon: AlignLeft   },
  { value: 'center', Icon: AlignCenter },
  { value: 'right',  Icon: AlignRight  },
];

function TextTool({ texts, onAdd, onUpdate, onRemove }) {
  const [composing, setComposing]   = useState(false);
  const [draft, setDraft]           = useState('');
  const [fontId, setFontId]         = useState('sans');
  const [color, setColor]           = useState('#FFFFFF');
  const [align, setAlign]           = useState('center');
  const [selectedId, setSelectedId] = useState(null);
  const textareaRef = useRef(null);

  const currentFont = FONT_STYLES.find((f) => f.id === fontId) ?? FONT_STYLES[0];
  const selectedText = texts.find((t) => t.id === selectedId) ?? null;

  const cycleFont = () => {
    const next = FONT_STYLES[(FONT_STYLES.findIndex((f) => f.id === fontId) + 1) % FONT_STYLES.length];
    setFontId(next.id);
    if (selectedText) onUpdate(selectedText.id, { fontFamily: next.family, fontWeight: next.weight });
  };

  const cycleAlign = () => {
    const next = ALIGN_OPTIONS[(ALIGN_OPTIONS.findIndex((a) => a.value === align) + 1) % ALIGN_OPTIONS.length].value;
    setAlign(next);
    if (selectedText) onUpdate(selectedText.id, { textAlign: next });
  };

  const setColorAndSync = (c) => {
    setColor(c);
    if (selectedText) onUpdate(selectedText.id, { color: c });
  };

  const openCompose = () => {
    setDraft('');
    setComposing(true);
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const handleDone = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onAdd(trimmed, {
        x: 72, y: 120,
        fontFamily: currentFont.family,
        fontWeight: currentFont.weight,
        fontSize: 32,
        color,
        textAlign: align,
        scale: 1,
        rotation: 0,
      });
    }
    setDraft('');
    setComposing(false);
  };

  const AlignIcon = ALIGN_OPTIONS.find((a) => a.value === align)?.Icon ?? AlignCenter;

  // ── Full-screen compose overlay ────────────────────────────────────────
  if (composing) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-black/80">
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
        >
          <button
            type="button"
            onClick={() => { setDraft(''); setComposing(false); }}
            className="text-[15px] text-white/80 active:opacity-50"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={cycleFont}
              className="rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-medium text-white active:bg-white/25"
              style={{ fontFamily: currentFont.family, fontWeight: currentFont.weight }}
            >
              Aa
            </button>
            <button
              type="button"
              onClick={cycleAlign}
              className="rounded-full bg-white/15 p-2 text-white active:bg-white/25"
            >
              <AlignIcon className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleDone}
            className="rounded-full bg-white px-4 py-1.5 text-[14px] font-semibold text-stone-950 active:opacity-80"
          >
            Listo
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-8">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe algo…"
            rows={4}
            className="w-full resize-none bg-transparent text-[32px] leading-tight outline-none placeholder:text-white/35"
            style={{
              color,
              fontFamily: currentFont.family,
              fontWeight: currentFont.weight,
              textAlign: align,
            }}
          />
        </div>

        <div
          className="flex justify-center gap-3 pt-4"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}
        >
          {COLOR_DOTS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className="h-7 w-7 rounded-full border-2 transition-transform active:scale-90"
              style={{
                backgroundColor: c,
                borderColor: color === c ? '#fff' : 'rgba(255,255,255,0.25)',
                transform: color === c ? 'scale(1.2)' : 'scale(1)',
                boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px rgba(255,255,255,0.4)' : undefined,
              }}
              aria-label={c}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Tool panel ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 px-4 py-3">
      {/* Color row */}
      <div className="flex items-center gap-2">
        {COLOR_DOTS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColorAndSync(c)}
            className="h-6 w-6 shrink-0 rounded-full border-2"
            style={{
              backgroundColor: c,
              borderColor: color === c ? '#1c1917' : 'rgba(0,0,0,0.12)',
              transform: color === c ? 'scale(1.15)' : 'scale(1)',
              boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : undefined,
            }}
            aria-label={c}
          />
        ))}
      </div>

      {/* Font + Align row */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FONT_STYLES.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                setFontId(f.id);
                if (selectedText) onUpdate(selectedText.id, { fontFamily: f.family, fontWeight: f.weight });
              }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                fontId === f.id
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-600 active:bg-stone-200'
              }`}
              style={{ fontFamily: f.family, fontWeight: f.weight }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 overflow-hidden rounded-full border border-stone-200">
          {ALIGN_OPTIONS.map(({ value, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setAlign(value);
                if (selectedText) onUpdate(selectedText.id, { textAlign: value });
              }}
              className={`px-2.5 py-2 transition-colors ${
                align === value ? 'bg-stone-950 text-white' : 'text-stone-500 active:bg-stone-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={openCompose}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-stone-950 py-2.5 text-[14px] font-semibold text-white active:bg-stone-800"
      >
        <Plus className="h-4 w-4" />
        Añadir texto
      </button>

      {/* Layer list */}
      {texts.length > 0 && (
        <div className="space-y-1 pt-1">
          {texts.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
                selectedId === t.id ? 'bg-stone-100' : 'active:bg-stone-50'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
                className="flex-1 truncate text-left text-[13px] text-stone-700"
                style={{ fontFamily: t.fontFamily, fontWeight: t.fontWeight }}
              >
                {t.text || <span className="italic text-stone-400">vacío</span>}
              </button>
              <button
                type="button"
                onClick={() => { onRemove(t.id); if (selectedId === t.id) setSelectedId(null); }}
                className="shrink-0 rounded-full p-1 text-stone-400 active:bg-stone-200"
                aria-label="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TextTool;
