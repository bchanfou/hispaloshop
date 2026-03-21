import React from 'react';
import { motion } from 'framer-motion';
import { Image, Clapperboard, CirclePlus, ChefHat } from 'lucide-react';
import BottomSheet from '../motion/BottomSheet';

const CONTENT_TYPES = [
  { type: 'post',   label: 'Post',   Icon: Image },
  { type: 'reel',   label: 'Reel',   Icon: Clapperboard },
  { type: 'story',  label: 'Story',  Icon: CirclePlus },
  { type: 'recipe', label: 'Receta', Icon: ChefHat },
];

export default function CreateContentSheet({ isOpen, onClose, onSelect }) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="auto">
      <div
        className="px-5 pb-6"
        style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Title */}
        <p className="text-base font-semibold text-stone-950 mb-4">Crear</p>

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
                {opt.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
