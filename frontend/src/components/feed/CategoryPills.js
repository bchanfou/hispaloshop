import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Droplets, Milk, Beef, Croissant, CupSoda, Baby, Dog, Cherry, Leaf, WheatOff, Gift, Flame, MapPin, Sparkle } from 'lucide-react';

const CATEGORIES = [
  { id: 'para-ti', label: 'Para ti', icon: Sparkles, color: '#FFFFFF', bgColor: '#2D5A3D', textColor: '#FFFFFF', isSpecial: true },
  { id: 'aceites', label: 'Aceites', icon: Droplets, color: 'var(--color-accent)', bgColor: '#F5F1E8', textColor: '#1A1A1A' },
  { id: 'quesos', label: 'Quesos', icon: Milk, color: '#D97706', bgColor: '#FEF3C7', textColor: '#1A1A1A' },
  { id: 'embutidos', label: 'Embutidos', icon: Beef, color: 'var(--color-error)', bgColor: '#FEE2E2', textColor: '#1A1A1A' },
  { id: 'panadería', label: 'Panadería', icon: Croissant, color: '#D97706', bgColor: '#FEF3C7', textColor: '#1A1A1A' },
  { id: 'bebidas', label: 'Bebidas', icon: CupSoda, color: '#2563EB', bgColor: '#DBEAFE', textColor: '#1A1A1A' },
  { id: 'bebes', label: 'Bebés', icon: Baby, color: '#DB2777', bgColor: '#FCE7F3', textColor: '#1A1A1A' },
  { id: 'mascotas', label: 'Mascotas', icon: Dog, color: '#4F46E5', bgColor: '#E0E7FF', textColor: '#1A1A1A' },
  { id: 'snacks', label: 'Snacks', icon: Cherry, color: '#D97706', bgColor: '#FEF3C7', textColor: '#1A1A1A' },
  { id: 'orgánico', label: 'Orgánico', icon: Leaf, color: 'var(--color-success)', bgColor: '#DCFCE7', textColor: '#1A1A1A' },
  { id: 'singluten', label: 'Sin gluten', icon: WheatOff, color: '#9333EA', bgColor: '#F3E8FF', textColor: '#1A1A1A' },
  { id: 'packs', label: 'Packs', icon: Gift, color: 'var(--color-warning)', bgColor: '#F5F1E8', textColor: '#1A1A1A' },
  { id: 'novedades', label: 'Novedades', icon: Sparkle, color: 'var(--color-accent)', bgColor: '#F5F1E8', textColor: '#1A1A1A', badge: 'Nuevo' },
  { id: 'trending', label: 'Trending', icon: Flame, color: 'var(--color-error)', bgColor: '#FEE2E2', textColor: '#1A1A1A', badge: 'Hot' },
  { id: 'locales', label: 'Locales', icon: MapPin, color: 'var(--color-success)', bgColor: '#DCFCE7', textColor: '#1A1A1A' },
];

function CategoryPills({ selectedCategory, onSelect }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="relative bg-white py-3">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

      {/* Categories */}
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-4 scrollbar-hide scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          
          return (
            <motion.button
              key={category.id}
              onClick={() => onSelect(category.id)}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center gap-1.5 flex-shrink-0 snap-start ${
                isSelected ? 'scale-105' : ''
              }`}
            >
              <div
                className={`relative w-[72px] h-[72px] md:w-20 md:h-20 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-offset-2' : 'hover:scale-105 hover:shadow-md'
                }`}
                style={{
                  backgroundColor: isSelected ? '#2D5A3D' : category.bgColor,
                  ringColor: isSelected ? '#E6A532' : 'transparent'
                }}
              >
                <Icon 
                  className="w-7 h-7 md:w-8 md:h-8" 
                  style={{ color: isSelected ? '#FFFFFF' : category.color }}
                  strokeWidth={1.5}
                />
                
                {/* Badge */}
                {category.badge && (
                  <span className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    category.badge === 'Hot' ? 'bg-red-500 text-white' : 'bg-accent text-white'
                  }`}>
                    {category.badge}
                  </span>
                )}
              </div>
              
              <span 
                className={`text-xs md:text-sm font-medium whitespace-nowrap ${
                  isSelected ? 'text-accent' : 'text-gray-900'
                }`}
              >
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
