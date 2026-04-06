import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Image, Video, Square, ChefHat, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BottomSheet from '../motion/BottomSheet';

const CONTENT_TYPES = [
  { type: 'post',   labelKey: 'content_selector.post',   fallback: 'Post',   Icon: Image },
  { type: 'reel',   labelKey: 'content_selector.reel',   fallback: 'Reel',   Icon: Video },
  { type: 'story',  labelKey: 'content_selector.story',  fallback: 'Story',  Icon: Square },
  { type: 'recipe', labelKey: 'content_selector.recipe', fallback: 'Receta', Icon: ChefHat },
];

const DRAFT_KEYS = ['post_draft', 'reel_draft', 'story_draft'];
const MAX_AGE = 24 * 60 * 60 * 1000;

export default function CreateContentSheet({ isOpen, onClose, onSelect }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    let count = 0;
    for (const key of DRAFT_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const draft = JSON.parse(raw);
        if (Date.now() - (draft.savedAt || 0) < MAX_AGE) count++;
      } catch { /* ignore */ }
    }
    setDraftCount(count);
  }, [isOpen]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="auto">
      <div
        className="px-5 pb-6"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Title */}
        <p className="text-base font-semibold text-stone-950 mb-4">{t('content_selector.title', 'Crear')}</p>

        {/* 2×2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {CONTENT_TYPES.map((opt, index) => (
            <motion.button
              key={opt.type}
              type="button"
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, type: 'spring', damping: 22, stiffness: 300 }}
              onClick={() => {
                onClose();
                onSelect(opt.type);
              }}
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-stone-50 hover:bg-stone-100 active:bg-stone-100 transition-colors"
              style={{ height: 120, width: '100%' }}
            >
              <opt.Icon
                size={28}
                strokeWidth={1.6}
                className="text-stone-500"
              />
              <span className="text-sm font-semibold text-stone-950">
                {t(opt.labelKey, opt.fallback)}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Borradores link */}
        {draftCount > 0 && (
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/drafts');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-stone-500 hover:text-stone-950 bg-transparent border-none cursor-pointer transition-colors"
          >
            <FileText size={16} />
            <span>{t('content_selector.drafts', 'Borradores')}</span>
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-stone-200 text-stone-700 text-[11px] font-semibold px-1">
              {draftCount}
            </span>
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
