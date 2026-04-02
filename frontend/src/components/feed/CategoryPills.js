import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Baby,
  Beef,
  Cherry,
  Croissant,
  CupSoda,
  Dog,
  Droplets,
  Flame,
  Gift,
  Leaf,
  MapPin,
  Milk,
  Sparkle,
  Sparkles,
  WheatOff,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'para-ti', label: 'Para ti', icon: Sparkles, badge: null },
  { id: 'aceites', label: 'Aceites', icon: Droplets, badge: null },
  { id: 'quesos', label: 'Quesos', icon: Milk, badge: null },
  { id: 'embutidos', label: 'Embutidos', icon: Beef, badge: null },
  { id: 'panaderia', label: t('onboarding.panaderia', 'Panadería'), icon: Croissant, badge: null },
  { id: 'bebidas', label: 'Bebidas', icon: CupSoda, badge: null },
  { id: 'bebes', label: 'Bebés', icon: Baby, badge: null },
  { id: 'mascotas', label: 'Mascotas', icon: Dog, badge: null },
  { id: 'snacks', label: 'Snacks', icon: Cherry, badge: null },
  { id: 'organico', label: t('home.organic', 'Orgánico'), icon: Leaf, badge: null },
  { id: 'singluten', label: 'Sin gluten', icon: WheatOff, badge: null },
  { id: 'packs', label: 'Packs', icon: Gift, badge: null },
  { id: 'novedades', label: 'Novedades', icon: Sparkle, badge: 'Nuevo' },
  { id: 'trending', label: 'Tendencia', icon: Flame, badge: 'Hoy' },
  { id: 'locales', label: 'Locales', icon: MapPin, badge: null },
];

function CategoryPills({ selectedCategory, onSelect }) {
  const scrollRef = useRef(null);

  return (
    <div className="relative bg-white py-3">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" />

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scrollbar-hide scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none' }}
      >
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;

          return (
            <motion.button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              whileTap={!isSelected ? { scale: 0.95 } : {}}
              aria-pressed={isSelected}
              aria-label={category.label}
              className={`flex flex-shrink-0 snap-start flex-col items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-1 rounded-2xl ${
                isSelected ? 'scale-105' : ''
              }`}
            >
              <div
                className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl border transition-all duration-200 md:h-20 md:w-20 ${
                  isSelected
                    ? 'border-stone-950 bg-stone-950 text-white shadow-[0_12px_26px_-20px_rgba(10,10,10,0.3)]'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Icon className="h-7 w-7 md:h-8 md:w-8" strokeWidth={1.5} />

                {category.badge ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-950">
                    {category.badge}
                  </span>
                ) : null}
              </div>

              <span className={`whitespace-nowrap text-xs font-medium md:text-sm ${isSelected ? 'text-stone-950' : 'text-stone-700'}`}>
                {category.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryPills;
export { CATEGORIES };
