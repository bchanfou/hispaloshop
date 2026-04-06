// @ts-nocheck
import React, { useState } from 'react';
import { AtSign, Link2, MapPin, HelpCircle, Leaf, Trophy, Award, Shield, WheatOff, Sprout } from 'lucide-react';
import {
  STORY_EMOJI_CATEGORIES,
  STORY_CERTIFICATIONS,
  STORY_PHRASES,
} from '../../utils/editor/constants';
import i18n from '../../locales/i18n';

const EMOJI_CATEGORY_KEYS = Object.keys(STORY_EMOJI_CATEGORIES);

interface StoryStickerToolProps {
  onAddSticker: (content: string, type: string, extra?: any) => void;
  onAddPoll: (question: string, options: string[]) => void;
  onAddQuestion: (question: string) => void;
}

export default function StoryStickerTool({
  onAddSticker,
  onAddPoll,
  onAddQuestion,
}: StoryStickerToolProps) {
  const [stickerTab, setStickerTab] = useState('emojis');
  const [emojiCategory, setEmojiCategory] = useState('Comida');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');
  const [mentionDraft, setMentionDraft] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [locationDraft, setLocationDraft] = useState('');
  const [questionDraft, setQuestionDraft] = useState('');

  const TABS = [
    { key: 'emojis', label: 'Emojis' },
    { key: 'certificaciones', label: 'Certificados' },
    { key: 'frases', label: 'Frases' },
    { key: 'encuesta', label: 'Encuesta' },
    { key: 'mencion', label: '@Mención' },
    { key: 'enlace', label: 'Enlace' },
    { key: 'ubicacion', label: i18n.t('store.location', 'Ubicación') },
    { key: 'pregunta', label: 'Pregunta' },
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] rounded-t-hs-xl z-20 flex flex-col gap-3 max-h-[50vh] overflow-auto">
      {/* Tabs */}
      <div
        className="flex border-b border-white/15 overflow-x-auto"
        role="tablist"
        aria-label="Tipo de sticker"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={stickerTab === tab.key}
            onClick={() => setStickerTab(tab.key)}
            className={`bg-transparent border-none text-[13px] px-3.5 py-2 cursor-pointer border-b-2 ${
              stickerTab === tab.key
                ? 'text-white font-semibold border-white'
                : 'text-white/40 font-normal border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      {stickerTab === 'emojis' && (
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {EMOJI_CATEGORY_KEYS.map((cat) => (
              <button
                key={cat}
                onClick={() => setEmojiCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium cursor-pointer whitespace-nowrap border-none transition-colors ${
                  emojiCategory === cat
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {(STORY_EMOJI_CATEGORIES[emojiCategory] || []).map((emoji) => (
              <button
                key={emoji}
                onClick={() => onAddSticker(emoji, 'emoji')}
                className="bg-white/[0.08] border-none rounded-2xl py-2 text-[26px] cursor-pointer transition-colors hover:bg-white/15"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Certificaciones */}
      {stickerTab === 'certificaciones' && (
        <div className="grid grid-cols-2 gap-2 p-2">
          {STORY_CERTIFICATIONS.map((cert) => {
            const IconMap: Record<string, React.ComponentType<any>> = { Leaf, Trophy, Award, Shield, WheatOff, Sprout };
            const Icon = IconMap[cert.icon];
            return (
              <button
                key={cert.label}
                onClick={() =>
                  onAddSticker(cert.label, 'badge')
                }
                className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors border-none cursor-pointer"
              >
                {Icon && <Icon size={16} className="text-stone-400 shrink-0" />}
                {cert.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Frases */}
      {stickerTab === 'frases' && (
        <div className="flex flex-col gap-1.5">
          {STORY_PHRASES.map((frase) => (
            <button
              key={frase}
              onClick={() => onAddSticker(frase, 'phrase')}
              className="bg-white/[0.08] text-white border-none rounded-xl px-3.5 py-3 text-sm text-left cursor-pointer transition-colors hover:bg-white/15"
            >
              "{frase}"
            </button>
          ))}
        </div>
      )}

      {/* Encuesta */}
      {stickerTab === 'encuesta' && (
        <div className="flex flex-col gap-2">
          <input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value.slice(0, 80))}
            placeholder={i18n.t('create_story.quePrefieres', '¿Qué prefieres?')}
            className="bg-white/10 text-white border border-white/20 rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-white/30 font-sans"
          />
          <div className="flex gap-2">
            <input
              value={pollOption1}
              onChange={(e) => setPollOption1(e.target.value.slice(0, 30))}
              placeholder={i18n.t('create_story.opcion1', 'Opción 1')}
              className="flex-1 bg-white/10 text-white border border-white/20 rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-white/30 font-sans"
            />
            <input
              value={pollOption2}
              onChange={(e) => setPollOption2(e.target.value.slice(0, 30))}
              placeholder={i18n.t('create_story.opcion2', 'Opción 2')}
              className="flex-1 bg-white/10 text-white border border-white/20 rounded-2xl px-3 py-2.5 text-sm outline-none placeholder:text-white/30 font-sans"
            />
          </div>
          <button
            onClick={() => {
              if (
                !pollQuestion.trim() ||
                !pollOption1.trim() ||
                !pollOption2.trim()
              )
                return;
              onAddPoll(pollQuestion, [pollOption1, pollOption2]);
              setPollQuestion('');
              setPollOption1('');
              setPollOption2('');
            }}
            disabled={
              !pollQuestion.trim() ||
              !pollOption1.trim() ||
              !pollOption2.trim()
            }
            className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${
              !pollQuestion.trim() ||
              !pollOption1.trim() ||
              !pollOption2.trim()
                ? 'opacity-40'
                : ''
            }`}
          >
            Añadir encuesta
          </button>
        </div>
      )}

      {/* Mención */}
      {stickerTab === 'mencion' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2.5">
            <AtSign size={16} className="text-white/40 shrink-0" />
            <input
              value={mentionDraft}
              onChange={(e) =>
                setMentionDraft(e.target.value.replace(/\s/g, '').slice(0, 30))
              }
              placeholder="nombre_de_usuario"
              className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
            />
          </div>
          <button
            onClick={() => {
              if (!mentionDraft.trim()) return;
              onAddSticker(
                `@${mentionDraft.replace(/^@/, '')}`,
                'mention',
              );
              setMentionDraft('');
            }}
            disabled={!mentionDraft.trim()}
            className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${
              !mentionDraft.trim() ? 'opacity-40' : ''
            }`}
          >
            Añadir mención
          </button>
        </div>
      )}

      {/* Enlace */}
      {stickerTab === 'enlace' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2.5">
            <Link2 size={16} className="text-white/40 shrink-0" />
            <input
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value.slice(0, 200))}
              placeholder="https://..."
              className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
            />
          </div>
          <button
            onClick={() => {
              if (!linkDraft.trim()) return;
              onAddSticker(
                linkDraft.startsWith('http')
                  ? linkDraft
                  : `https://${linkDraft}`,
                'link',
              );
              setLinkDraft('');
            }}
            disabled={!linkDraft.trim()}
            className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${
              !linkDraft.trim() ? 'opacity-40' : ''
            }`}
          >
            Añadir enlace
          </button>
        </div>
      )}

      {/* Ubicación */}
      {stickerTab === 'ubicacion' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2.5">
            <MapPin size={16} className="text-white/40 shrink-0" />
            <input
              value={locationDraft}
              onChange={(e) => setLocationDraft(e.target.value.slice(0, 60))}
              placeholder={i18n.t(
                'create_story.sevillaEspana',
                'Sevilla, España',
              )}
              className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
            />
          </div>
          <button
            onClick={() => {
              if (!locationDraft.trim()) return;
              onAddSticker(locationDraft, 'location');
              setLocationDraft('');
            }}
            disabled={!locationDraft.trim()}
            className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${
              !locationDraft.trim() ? 'opacity-40' : ''
            }`}
          >
            Añadir ubicación
          </button>
        </div>
      )}

      {/* Pregunta */}
      {stickerTab === 'pregunta' && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2.5">
            <HelpCircle size={16} className="text-white/40 shrink-0" />
            <input
              value={questionDraft}
              onChange={(e) => setQuestionDraft(e.target.value.slice(0, 80))}
              placeholder="Hazme una pregunta..."
              className="flex-1 bg-transparent text-white border-none outline-none text-sm placeholder:text-white/30 font-sans"
            />
          </div>
          <button
            onClick={() => {
              if (!questionDraft.trim()) return;
              onAddQuestion(questionDraft);
              setQuestionDraft('');
            }}
            disabled={!questionDraft.trim()}
            className={`bg-stone-950 text-white border-none rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors ${
              !questionDraft.trim() ? 'opacity-40' : ''
            }`}
          >
            Añadir pregunta
          </button>
        </div>
      )}
    </div>
  );
}
