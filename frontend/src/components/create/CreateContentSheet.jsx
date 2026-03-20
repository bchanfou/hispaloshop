import React from 'react';
import { motion } from 'framer-motion';
import { ImagePlus, Video, Layers, ChefHat } from 'lucide-react';
import BottomSheet from '../motion/BottomSheet';

const CONTENT_TYPES = [
  {
    type: 'post',
    label: 'Post',
    icon: <ImagePlus size={22} color="white" />,
    iconBg: 'bg-stone-950',
  },
  {
    type: 'reel',
    label: 'Reel',
    icon: <Video size={22} color="white" />,
    iconBg: 'bg-stone-800',
  },
  {
    type: 'story',
    label: 'Story',
    icon: <Layers size={22} color="white" />,
    iconBg: 'bg-stone-700',
  },
  {
    type: 'recipe',
    label: 'Receta',
    icon: <ChefHat size={22} color="white" />,
    iconBg: 'bg-stone-600',
  },
];

export default function CreateContentSheet({ isOpen, onClose, onSelect }) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxHeight="auto">
      <div className="px-5 pb-6" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Title */}
        <p className="text-base font-semibold text-stone-950 mb-4">Crear</p>

        {/* 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {CONTENT_TYPES.map((opt, index) => (
            <motion.button
              key={opt.type}
              type="button"
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', damping: 20 }}
              onClick={() => {
                onClose();
                onSelect(opt.type);
              }}
              className="flex flex-col items-center justify-center gap-2 aspect-square rounded-2xl bg-stone-50 hover:bg-stone-100 active:scale-95 transition-all"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${opt.iconBg}`}>
                {opt.icon}
              </div>
              <span className="text-sm font-medium text-stone-700">{opt.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
