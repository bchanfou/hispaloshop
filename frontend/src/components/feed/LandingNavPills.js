import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Video, UserCircle, Building2, Sparkles } from 'lucide-react';

const LANDING_ITEMS = [
  { 
    id: 'que-es', 
    label: '¿Qué es Hispaloshop?', 
    icon: Sparkles, 
    color: 'var(--color-warning)',
    bgColor: '#FEF3C7',
    path: '/que-es'
  },
  { 
    id: 'influencer', 
    label: 'Soy Influencer', 
    icon: Video, 
    color: '#EC4899',
    bgColor: '#FCE7F3',
    path: '/influencer'
  },
  { 
    id: 'productor', 
    label: 'Soy Productor', 
    icon: Store, 
    color: 'var(--color-accent)',
    bgColor: '#DCFCE7',
    path: '/productor'
  },
  { 
    id: 'importador', 
    label: 'Soy Importador', 
    icon: Building2, 
    color: 'var(--color-info)',
    bgColor: '#DBEAFE',
    path: '/importador'
  },
];

const LandingNavPills = () => {
  const navigate = useNavigate();

  return (
    <div className="relative bg-white py-3 border-b border-stone-100">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
      
      <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide snap-x snap-mandatory">
        {LANDING_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full flex-shrink-0 snap-start transition-all hover:shadow-md"
              style={{ backgroundColor: item.bgColor }}
            >
              <Icon className="w-4 h-4" style={{ color: item.color }} />
              <span className="text-sm font-medium whitespace-nowrap" style={{ color: item.color }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default LandingNavPills;
