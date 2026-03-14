import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, Hash, HelpCircle, MapPin, MessageCircle, Search, Sparkles, Tag, Trash2 } from 'lucide-react';

const UTILITY_STICKERS = [
  { id: 'price',    label: 'Precio',    icon: Tag,            requiresInput: true,  placeholder: '12,90' },
  { id: 'location', label: 'Ubicación', icon: MapPin,         requiresInput: true,  placeholder: 'Reus, Spain' },
  { id: 'new',      label: 'Novedad',   icon: Sparkles,       requiresInput: false },
  { id: 'poll',     label: 'Encuesta',  icon: MessageCircle,  requiresInput: false },
  { id: 'question', label: 'Pregunta',  icon: HelpCircle,     requiresInput: false },
  { id: 'mention',  label: 'Mención',   icon: AtSign,         requiresInput: true,  placeholder: 'usuario' },
  { id: 'hashtag',  label: 'Hashtag',   icon: Hash,           requiresInput: true,  placeholder: 'tendencia' },
];

const EMOJI_GROUPS = [
  { label: 'Emociones', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','😍','🥰','😘','🥺','🔥','✨','💫','⭐'] },
  { label: 'Celebrar',  emojis: ['🎉','🎊','🥳','🎈','🎁','🏆','🥂','🍾','👑','💎','💍','🌟'] },
  { label: 'Naturaleza',emojis: ['🌹','🌸','🌺','🌻','🌿','🍃','🌙','☀️','🌊','🌈','❄️','🦋'] },
  { label: 'Comida',    emojis: ['☕','🍵','🍷','🍓','🍉','🍑','🍋','🫐','🌮','🍕','🍜','🧁'] },
];

const TABS = [
  { id: 'emoji', label: 'Emoji' },
  { id: 'gif',   label: 'GIF' },
  { id: 'sello', label: 'Sellos' },
];

const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'; // GIPHY public beta key

function StickerTool({ stickers, onAdd, onRemove }) {
  const [tab, setTab]             = useState('emoji');
  const [selectedType, setType]   = useState('price');
  const [content, setContent]     = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions]   = useState(['Sí', 'No']);
  const [questionText, setQuestionText] = useState('');

  // GIF search state
  const [gifQuery, setGifQuery]   = useState('');
  const [gifs, setGifs]           = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const searchTimeoutRef = useRef(null);

  const nonProductStickers = useMemo(
    () => stickers.filter((s) => s.type !== 'product'),
    [stickers],
  );

  const selectedSticker = UTILITY_STICKERS.find((s) => s.id === selectedType);

  // ── GIF search via GIPHY API ───────────────────────────────────────────
  const searchGifs = useCallback(async (query) => {
    setGifLoading(true);
    try {
      const endpoint = query.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`;
      const res = await fetch(endpoint);
      const json = await res.json();
      setGifs(json.data || []);
    } catch {
      setGifs([]);
    }
    setGifLoading(false);
  }, []);

  // Load trending on tab mount
  useEffect(() => {
    if (tab === 'gif' && gifs.length === 0) searchGifs('');
  }, [tab, gifs.length, searchGifs]);

  // Debounced search
  useEffect(() => {
    if (tab !== 'gif') return;
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchGifs(gifQuery), 400);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [gifQuery, tab, searchGifs]);

  const handleAddGif = (gif) => {
    const src = gif.images?.fixed_width?.url || gif.images?.original?.url;
    if (!src) return;
    onAdd('gif', { x: 60, y: 80, src, alt: gif.title || 'GIF' });
  };

  const handleAddUtility = () => {
    if (!selectedSticker) return;

    if (selectedType === 'poll') {
      onAdd('poll', {
        x: 60, y: 80,
        question: pollQuestion || 'Encuesta',
        options: pollOptions.filter(Boolean),
      });
      setPollQuestion('');
      setPollOptions(['Sí', 'No']);
      return;
    }

    if (selectedType === 'question') {
      onAdd('question', { x: 60, y: 80, text: questionText || 'Hazme una pregunta' });
      setQuestionText('');
      return;
    }

    if (selectedType === 'mention') {
      if (!content.trim()) return;
      onAdd('mention', { x: 80, y: 100, username: content.trim() });
      setContent('');
      return;
    }

    if (selectedType === 'hashtag') {
      if (!content.trim()) return;
      onAdd('hashtag', { x: 80, y: 100, tag: content.trim() });
      setContent('');
      return;
    }

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
        {TABS.map(({ id, label }) => (
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

      {/* ── GIF search ─────────────────────────────────────────────────── */}
      {tab === 'gif' && (
        <div className="px-4 py-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={gifQuery}
              onChange={(e) => setGifQuery(e.target.value)}
              placeholder="Buscar GIFs…"
              className="h-10 w-full rounded-xl bg-stone-100 pl-9 pr-4 text-[14px] text-stone-950 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-stone-950"
            />
          </div>

          {gifLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-stone-950" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleAddGif(gif)}
                  className="overflow-hidden rounded-xl bg-stone-100 active:opacity-80"
                >
                  <img
                    src={gif.images?.fixed_width_small?.url || gif.images?.fixed_width?.url}
                    alt={gif.title || 'GIF'}
                    className="h-auto w-full"
                    loading="lazy"
                  />
                </button>
              ))}
              {gifs.length === 0 && !gifLoading && (
                <p className="col-span-2 py-8 text-center text-sm text-stone-400">Sin resultados</p>
              )}
            </div>
          )}

          <p className="mt-2 text-center text-[10px] text-stone-300">Powered by GIPHY</p>
        </div>
      )}

      {/* ── Utility stickers ───────────────────────────────────────────── */}
      {tab === 'sello' && (
        <div className="space-y-3 px-4 py-3">
          {/* Type selector */}
          <div className="flex flex-wrap gap-2">
            {UTILITY_STICKERS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setType(id); setContent(''); }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-medium transition-colors ${
                  selectedType === id
                    ? 'bg-stone-950 text-white'
                    : 'bg-stone-100 text-stone-600 active:bg-stone-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Poll input */}
          {selectedType === 'poll' && (
            <div className="space-y-2">
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Pregunta de la encuesta"
                className="h-10 w-full rounded-xl bg-stone-100 px-4 text-[14px] text-stone-950 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-stone-950"
              />
              {pollOptions.map((opt, i) => (
                <input
                  key={i}
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...pollOptions];
                    next[i] = e.target.value;
                    setPollOptions(next);
                  }}
                  placeholder={`Opción ${i + 1}`}
                  className="h-9 w-full rounded-xl bg-stone-50 px-4 text-[13px] text-stone-950 outline-none placeholder:text-stone-400"
                />
              ))}
              {pollOptions.length < 4 && (
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-[12px] font-medium text-stone-500 active:text-stone-950"
                >
                  + Añadir opción
                </button>
              )}
            </div>
          )}

          {/* Question input */}
          {selectedType === 'question' && (
            <input
              type="text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Hazme una pregunta"
              className="h-10 w-full rounded-xl bg-stone-100 px-4 text-[14px] text-stone-950 outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-stone-950"
            />
          )}

          {/* Standard text input for price, location, mention, hashtag */}
          {selectedSticker?.requiresInput && selectedType !== 'poll' && selectedType !== 'question' && (
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
            disabled={
              selectedSticker?.requiresInput &&
              selectedType !== 'poll' &&
              selectedType !== 'question' &&
              !content.trim()
            }
            className="w-full rounded-xl bg-stone-950 py-2.5 text-[14px] font-semibold text-white active:bg-stone-800 disabled:opacity-40"
          >
            Añadir {selectedSticker?.label?.toLowerCase() || 'sello'}
          </button>

          {/* Active stickers */}
          {nonProductStickers.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-stone-400">Activos</p>
              {nonProductStickers.map((s) => {
                const info = UTILITY_STICKERS.find((u) => u.id === s.type);
                const Icon = info?.icon ?? Tag;
                const displayLabel = s.type === 'mention' ? `@${s.username || ''}` :
                  s.type === 'hashtag' ? `#${s.tag || ''}` :
                  s.type === 'poll' ? s.question || 'Encuesta' :
                  s.type === 'question' ? s.text || 'Pregunta' :
                  s.type === 'gif' ? 'GIF' :
                  s.content || info?.label || 'Sello';
                return (
                  <div key={s.id} className="flex items-center gap-2 rounded-xl bg-stone-50 px-3 py-2">
                    <Icon className="h-4 w-4 shrink-0 text-stone-500" />
                    <span className="flex-1 truncate text-[13px] text-stone-700">{displayLabel}</span>
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
