import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Sparkles, Store, Video } from 'lucide-react';

const LANDING_ITEMS = [
  {
    id: 'que-es',
    label: 'Qué es Hispaloshop',
    icon: Sparkles,
    path: '/que-es',
  },
  {
    id: 'influencer',
    label: 'Soy influencer',
    icon: Video,
    path: '/influencer',
  },
  {
    id: 'productor',
    label: 'Soy productor',
    icon: Store,
    path: '/productor',
  },
  {
    id: 'importador',
    label: 'Soy importador',
    icon: Building2,
    path: '/importador',
  },
];

const LandingNavPills = () => {
  const navigate = useNavigate();

  return (
    <div className="border-b border-stone-100 bg-white px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Accesos rápidos
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {LANDING_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.path)}
                className="flex shrink-0 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50 hover:text-stone-950"
              >
                <Icon className="h-4 w-4 text-stone-700" />
                <span className="whitespace-nowrap">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LandingNavPills;
