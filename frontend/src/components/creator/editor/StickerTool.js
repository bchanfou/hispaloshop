import React, { useMemo, useState } from 'react';
import { MapPin, Sparkles, Tag, Trash2 } from 'lucide-react';

const UTILITY_STICKERS = [
  { id: 'price',    label: 'Precio',    icon: Tag,      requiresInput: true,  placeholder: '12,90'      },
  { id: 'location', label: 'Ubicación', icon: MapPin,   requiresInput: true,  placeholder: 'Reus, Spain'},
  { id: 'new',      label: 'Novedad',   icon: Sparkles, requiresInput: false },
];

const EMOJI_GROUPS = [
  { label: 'Emociones', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','😍','🥰','😘','🥺','🔥','✨','💫','⭐'] },
  { label: 'Celebrar',  emojis: ['🎉','🎊','🥳','🎈','🎁','🏆','🥂','🍾','👑','💎','💍','🌟'] },
  { label: 'Naturaleza',emojis: ['🌹','🌸','🌺','🌻','🌿','🍃','🌙','☀️','🌊','🌈','❄️','🦋'] },
  { label: 'Comida',    emojis: ['☕','🍵','🍷','🍓','🍉','🍑','🍋','🫐','🌮','🍕','🍜','🧁'] },
];

function StickerTool({ stickers, onAdd, onRemove }) {
  const [tab, setTab]             = useState('emoji');
  const [selectedType, setType]   = useState('price');
  const [content, setContent]     = useState('');

  const nonProductStickers = useMemo(
    () => stickers.filter((s) => s.type !== 'product'),
    [stickers],
  );

  const selectedSticker = UTILITY_STICKERS.find((s) => s.id === selectedType);

  const handleAddUtility = () => {
    if (!selectedSticker) return;
    if (selectedSticker.requiresInput && !content.trim()) return;
    onAdd(selectedSticker.id, { x: 72, y: 84, content: selectedSticker.requiresInput ? content.trim() : undefined });
    setContent('');
  };

  const handleAddEmoji = (emoji) => {
    onAdd('emoji', { x: 80, y: 100, content: emoji });
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-stone-100">
        {[['emoji', 'Emoji'], ['sello', 'Sellos']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 py-3 text-[13px] font-semibold transition-colors ${
              tab === id
                ? 'border-b-2 border-stone-950 text-stone-950'
                : 'text-stone-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Emoji grid ─────────────────────────────────────────────────── */}
      {tab === 'emoji' && (
        <div className="space-y-3 px-4 py-3">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-stone-400">
                {group.label}
              </p>
              <div className="grid grid-cols-8 gap-1">
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleAddEmoji(emoji)}
                    className="flex aspect-square items-center justify-center rounded-xl text-[22px] active:bg-stone-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Utility stickers ───────────────────────────────────────────── */}
      {tab === 'sello' && (
        <div className="space-y-3 px-4 py-3">
          {/* Type selector */}
          <div className="flex gap-2">
            {UTILITY_STICKERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setType(id)}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 text-[12px] font-medium transition-colors ${
                  selectedType === id
                    ? 'bg-stone-950 text-white'
                    : 'bg-stone-100 text-stone-600 active:bg-stone-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Input */}
          {selectedSticker?.requiresInput && (
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={selectedSticker.placeholder}
              className="h-11 w-full rounded-xl bg-stone-100 px-4 text-[14px] text-stone-950 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-stone-950"
            />
          )}

          {/* Add button */}
          <button
            type="button"
            onClick={handleAddUtility}
            disabled={selectedSticker?.requiresInput && !content.trim()}
            className="w-full rounded-xl bg-stone-950 py-2.5 text-[14px] font-semibold text-white active:bg-stone-800 disabled:opacity-40"
          >
            Añadir sello
          </button>

          {/* Active stickers */}
          {nonProductStickers.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-stone-400">Activos</p>
              {nonProductStickers.map((s) => {
                const info = UTILITY_STICKERS.find((u) => u.id === s.type);
                const Icon = info?.icon ?? Tag;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-stone-500" />
                    <span className="flex-1 truncate text-[13px] text-stone-700">
                      {s.content || info?.label || 'Sello'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(s.id)}
                      className="rounded-full p-1 text-stone-400 active:bg-stone-200"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StickerTool;
