import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sparkles, Droplets, Package, Cheese, Beef, Croissant, Coffee, Baby, Dog, Nut, Leaf, Wheat } from 'lucide-react';

const CATEGORIES = [
  { id: 'foryou', label: 'Para ti', icon: Sparkles, color: '#2D5A3D' },
  { id: 'aceites', label: 'Aceites', icon: Droplets, color: '#E6A532' },
  { id: 'conservas', label: 'Conservas', icon: Package, color: '#DC2626' },
  { id: 'quesos', label: 'Quesos', icon: Cheese, color: '#F59E0B' },
  { id: 'embutidos', label: 'Embutidos', icon: Beef, color: '#991B1B' },
  { id: 'panaderia', label: 'Panadería', icon: Croissant, color: '#D97706' },
  { id: 'bebidas', label: 'Bebidas', icon: Coffee, color: '#7C3AED' },
  { id: 'bebes', label: 'Bebés', icon: Baby, color: '#EC4899' },
  { id: 'mascotas', label: 'Mascotas', icon: Dog, color: '#059669' },
  { id: 'snacks', label: 'Snacks', icon: Nut, color: '#EA580C' },
  { id: 'organico', label: 'Orgánico', icon: Leaf, color: '#16A34A' },
  { id: 'singluten', label: 'Sin gluten', icon: Wheat, color: '#CA8A04' },
];

function CategoryPills({ selectedCategory, onSelect }) {
  const { t } = useTranslation();

  return (
    <div className="sticky top-[107px] z-30 bg-white py-3 border-b border-stone-100">
      <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide scroll-smooth snap-x">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          
          return (
            <motion.button
              key={category.id}
              onClick={() => onSelect(category.id)}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap snap-start transition-all ${
                isSelected
                  ? 'text-white shadow-md'
                  : 'bg-stone-100 text-[#6B7280] hover:bg-stone-200'
              }`}
              style={{
                backgroundColor: isSelected ? category.color : undefined,
              }}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryPills;
