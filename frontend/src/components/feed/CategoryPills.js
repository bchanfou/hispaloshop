import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  Droplets, 
  Package, 
  Milk, 
  Beef, 
  Croissant, 
  Wine,
  Coffee,
  Baby,
  Dog,
  Cookie,
  Leaf,
  Wheat
} from 'lucide-react';

const CATEGORIES = [
  { id: 'aceites', label: 'Aceites', icon: Droplets, color: '#16A34A', bgColor: '#DCFCE7' },
  { id: 'conservas', label: 'Conservas', icon: Package, color: '#B45309', bgColor: '#FEF3C7' },
  { id: 'quesos', label: 'Quesos', icon: Milk, color: '#B45309', bgColor: '#FEF3C7' },
  { id: 'embutidos', label: 'Embutidos', icon: Beef, color: '#BE123C', bgColor: '#FFE4E6' },
  { id: 'panaderia', label: 'Panadería', icon: Croissant, color: '#C2410C', bgColor: '#FFF7ED' },
  { id: 'bebidas', label: 'Bebidas', icon: Wine, color: '#9333EA', bgColor: '#F3E8FF' },
  { id: 'cafe', label: 'Café', icon: Coffee, color: '#374151', bgColor: '#F3F4F6' },
  { id: 'bebes', label: 'Bebés', icon: Baby, color: '#DB2777', bgColor: '#FCE7F3' },
  { id: 'mascotas', label: 'Mascotas', icon: Dog, color: '#059669', bgColor: '#D1FAE5' },
  { id: 'snacks', label: 'Snacks', icon: Cookie, color: '#EA580C', bgColor: '#FFF7ED' },
  { id: 'organico', label: 'Orgánico', icon: Leaf, color: '#16A34A', bgColor: '#DCFCE7' },
  { id: 'singluten', label: 'Sin gluten', icon: Wheat, color: '#CA8A04', bgColor: '#FEF9C3' },
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

  const canScrollLeft = scrollRef.current?.scrollLeft > 0;
  const canScrollRight = scrollRef.current 
    ? scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth
    : true;

  return (
    <div className="relative bg-white py-4">
      {/* Left Arrow */}
      <button
        onClick={() => scroll('left')}
        className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center shadow-lg transition-opacity ${
          canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Categories */}
      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto px-6 scrollbar-hide scroll-smooth"
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
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isSelected ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  backgroundColor: category.bgColor,
                  ringColor: isSelected ? category.color : 'transparent'
                }}
              >
                <Icon 
                  className="w-7 h-7" 
                  style={{ color: category.color }}
                  strokeWidth={1.5}
                />
              </div>
              <span 
                className="text-sm font-medium whitespace-nowrap"
                style={{ color: isSelected ? category.color : '#1A1A1A' }}
              >
                {category.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scroll('right')}
        className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#6B7280] text-white flex items-center justify-center shadow-lg transition-opacity ${
          canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export default CategoryPills;
