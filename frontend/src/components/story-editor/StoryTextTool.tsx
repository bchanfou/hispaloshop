// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { STORY_FONTS_MAP, STORY_COLOR_DOTS } from '../../utils/editor/constants';
import i18n from '../../locales/i18n';

interface StoryTextToolProps {
  onAddText: (overlay: {
    text: string;
    font: string;
    color: string;
    size: number;
    style: string;
  }) => void;
}

export default function StoryTextTool({ onAddText }: StoryTextToolProps) {
  const [textDraft, setTextDraft] = useState('');
  const [selectedFont, setSelectedFont] = useState('Sans');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [textStyle, setTextStyle] = useState('clean');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const handleConfirm = () => {
    if (!textDraft.trim()) return;
    onAddText({
      text: textDraft.trim(),
      font: selectedFont,
      color: selectedColor,
      size: textSize,
      style: textStyle,
    });
    setTextDraft('');
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] rounded-t-hs-xl z-20 flex flex-col gap-3">
      <textarea
        value={textDraft}
        onChange={(e) => setTextDraft(e.target.value)}
        placeholder={i18n.t('create_story.escribeAqui', 'Escribe aquí...')}
        rows={2}
        aria-label={i18n.t('create_story.textoParaLaHistoria', 'Texto para la historia')}
        className="bg-transparent text-white border-none text-lg outline-none resize-none font-sans w-full placeholder:text-white/30"
        autoFocus
      />

      {/* Font pills */}
      <div className="flex gap-1.5">
        {Object.keys(STORY_FONTS_MAP).map((f) => (
          <button
            key={f}
            onClick={() => setSelectedFont(f)}
            aria-label={`Fuente ${f}`}
            aria-pressed={selectedFont === f}
            className={`border-none rounded-full px-3.5 py-2.5 text-xs font-medium cursor-pointer min-h-[44px] ${
              selectedFont === f
                ? 'bg-white text-black'
                : 'bg-white/15 text-white'
            }`}
            style={{ fontFamily: STORY_FONTS_MAP[f] }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Color dots */}
      <div className="flex gap-1 items-center">
        {STORY_COLOR_DOTS.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedColor(c)}
            aria-label={`Color ${c}`}
            className="w-11 h-11 rounded-full cursor-pointer p-0 shrink-0 flex items-center justify-center bg-transparent border-none"
          >
            <span
              className={`w-7 h-7 rounded-full shrink-0 ${
                selectedColor === c
                  ? 'ring-[3px] ring-white ring-offset-2 ring-offset-black'
                  : 'border-2 border-white/30'
              }`}
              style={{ background: c }}
            />
          </button>
        ))}
      </div>

      {/* Text style */}
      <div className="flex gap-1.5">
        {[
          { key: 'clean', label: 'Limpio' },
          { key: 'box', label: 'Caja' },
          { key: 'outline', label: 'Contorno' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setTextStyle(s.key)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold cursor-pointer transition-colors ${
              textStyle === s.key
                ? 'bg-white text-black'
                : 'bg-white/15 text-white'
            }`}
            aria-pressed={textStyle === s.key}
          >
            <span
              style={
                s.key === 'outline'
                  ? { WebkitTextStroke: '1px white', color: 'transparent' }
                  : s.key === 'box'
                    ? {
                        background: 'rgba(255,255,255,0.2)',
                        padding: '1px 4px',
                        borderRadius: 3,
                      }
                    : {}
              }
            >
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* Size slider */}
      <div className="flex items-center gap-2">
        <span className="text-white/50 text-[11px]">A</span>
        <input
          type="range"
          min={14}
          max={48}
          value={textSize}
          onChange={(e) => setTextSize(Number(e.target.value))}
          className="flex-1 accent-white"
        />
        <span className="text-white text-base font-bold">A</span>
      </div>

      {/* Confirm */}
      <button
        onClick={handleConfirm}
        className="bg-stone-950 text-white border-none rounded-full py-3 text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5 hover:bg-stone-800 transition-colors"
      >
        <Check size={16} />
        Confirmar
      </button>
    </div>
  );
}
