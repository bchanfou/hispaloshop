import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Droplets, Cookie, Beef, Croissant, CupSoda, Baby, Dog, 
  Cherry, Leaf, WheatOff, Gift, Flame 
} from 'lucide-react';

export const MINI_CATEGORIES = [
  { id: 'aceites', label: 'Aceites', icon: Droplets, color: '#2D5A3D' },
  { id: 'quesos', label: 'Quesos', icon: Cookie, color: '#E6A532' },
  { id: 'embutidos', label: 'Embutidos', icon: Beef, color: '#DC2626' },
  { id: 'panaderia', label: 'Panadería', icon: Croissant, color: '#D97706' },
  { id: 'bebidas', label: 'Bebidas', icon: CupSoda, color: '#0891B2' },
  { id: 'bebes', label: 'Bebés', icon: Baby, color: '#EC4899' },
  { id: 'mascotas', label: 'Mascotas', icon: Dog, color: '#7C3AED' },
  { id: 'snacks', label: 'Snacks', icon: Cherry, color: '#EA580C' },
  { id: 'organico', label: 'Orgánico', icon: Leaf, color: '#16A34A' },
  { id: 'singluten', label: 'Sin gluten', icon: WheatOff, color: '#65A30D' },
  { id: 'packs', label: 'Packs', icon: Gift, color: '#0891B2' },
  { id: 'trending', label: 'Trending', icon: Flame, color: '#DC2626' },
];

const MiniCategoryPills = ({ selectedCategory, onSelect }) => {
  const navigate = useNavigate();

  const handleClick = (categoryId) => {
    if (onSelect) {
      onSelect(categoryId);
    } else {
      navigate(`/category/${categoryId}`);
    }
  };

  return (
    <div className="relative py-2">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#F5F1E8] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#F5F1E8] to-transparent z-10 pointer-events-none" />
      
      <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory">
        {MINI_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          
          return (
            <motion.button
              key={category.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick(category.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0 snap-start transition-all ${
                isSelected 
                  ? 'bg-[#2D5A3D] text-white' 
                  : 'bg-white text-[#1A1A1A] hover:bg-stone-100'
              }`}
            >
              <Icon 
                className="w-3.5 h-3.5" 
                style={{ color: isSelected ? 'white' : category.color }} 
              />
              <span className="text-xs font-medium whitespace-nowrap">
                {category.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCategoryPills;
