import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Baby,
  Beef,
  Cherry,
  Cookie,
  Croissant,
  CupSoda,
  Dog,
  Droplets,
  Flame,
  Gift,
  Leaf,
  WheatOff,
} from 'lucide-react';

export const MINI_CATEGORIES = [
  { id: 'aceites', label: 'Aceites', icon: Droplets },
  { id: 'quesos', label: 'Quesos', icon: Cookie },
  { id: 'embutidos', label: 'Embutidos', icon: Beef },
  { id: 'panaderia', label: t('onboarding.panaderia', 'Panadería'), icon: Croissant },
  { id: 'bebidas', label: 'Bebidas', icon: CupSoda },
  { id: 'bebes', label: 'Bebés', icon: Baby },
  { id: 'mascotas', label: 'Mascotas', icon: Dog },
  { id: 'snacks', label: 'Snacks', icon: Cherry },
  { id: 'organico', label: t('home.organic', 'Orgánico'), icon: Leaf },
  { id: 'singluten', label: 'Sin gluten', icon: WheatOff },
  { id: 'packs', label: 'Packs', icon: Gift },
  { id: 'trending', label: 'Tendencia', icon: Flame },
];

const MiniCategoryPills = ({ selectedCategory, onSelect }) => {
  const navigate = useNavigate();

  const handleClick = (categoryId) => {
    if (onSelect) {
      onSelect(categoryId);
      return;
    }
    navigate(`/category/${categoryId}`);
  };

  return (
    <div className="relative py-2">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-6 bg-gradient-to-r from-stone-50 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-6 bg-gradient-to-l from-stone-50 to-transparent" />

      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 scrollbar-hide">
        {MINI_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;

          return (
            <motion.button
              key={category.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick(category.id)}
              className={`flex flex-shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 py-2 transition-all ${
                isSelected
                  ? 'border-stone-950 bg-stone-950 text-white'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="whitespace-nowrap text-xs font-medium">{category.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCategoryPills;
