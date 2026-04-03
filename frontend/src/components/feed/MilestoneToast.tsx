// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Bookmark, Star, Flame } from 'lucide-react';
import i18n from '../../locales/i18n';

const MILESTONES = {
  'first_10_likes': { icon: Heart, title: i18n.t('milestone_toast.10MeGusta', { defaultValue: '¡10 me gusta!' }), subtitle: 'Tu publicación está gustando', threshold: 10 },
  'first_save': { icon: Bookmark, title: i18n.t('milestone_toast.alguienTeGuardo', { defaultValue: '¡Alguien te guardó!' }), subtitle: 'Tu contenido inspira', threshold: 1 },
  'first_50_likes': { icon: Star, title: i18n.t('milestone_toast.50MeGusta', { defaultValue: '¡50 me gusta!' }), subtitle: 'Estás en racha', threshold: 50 },
  'streak_7': { icon: Flame, title: i18n.t('milestone_toast.7DiasSeguidos', { defaultValue: '¡7 días seguidos!' }), subtitle: 'Racha de publicación', threshold: 7 },
};

export function checkMilestone(type, count) {
  const config = MILESTONES[type];
  if (!config || count < config.threshold) return null;
  const key = `milestone_${type}`;
  if (localStorage.getItem(key)) return null; // Already shown
  localStorage.setItem(key, Date.now().toString());
  return config;
}

export default function MilestoneToast({ milestone, onClose }) {
  if (!milestone) return null;
  const Icon = milestone.icon;

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ y: -80, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="fixed top-[max(20px,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[200] bg-stone-950 text-white rounded-2xl px-5 py-3 shadow-xl flex items-center gap-3 min-w-[260px]"
    >
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm font-bold">{milestone.title}</p>
        <p className="text-xs text-white/60">{milestone.subtitle}</p>
      </div>
    </motion.div>
  );
}
