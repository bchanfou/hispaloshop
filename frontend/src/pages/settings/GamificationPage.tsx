// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Flame, Target, Loader2, Sprout, TreePine, Mountain } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

const LEVEL_CONFIG = [
  { name: 'Semilla', Icon: Sprout, min: 0 },
  { name: 'Brote', Icon: Sprout, min: 100 },
  { name: 'Planta', Icon: Sprout, min: 300 },
  { name: 'Arbol', Icon: TreePine, min: 700 },
  { name: 'Bosque', Icon: TreePine, min: 1500 },
  { name: 'Montana', Icon: Mountain, min: 3000 },
];

function getLevelInfo(xp: number) {
  let current = LEVEL_CONFIG[0];
  let next = LEVEL_CONFIG[1];
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_CONFIG[i].min) {
      current = LEVEL_CONFIG[i];
      next = LEVEL_CONFIG[i + 1] || null;
      break;
    }
  }
  return { current, next, levelIndex: LEVEL_CONFIG.indexOf(current) + 1 };
}

export default function GamificationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['gamification', 'profile'],
    queryFn: () => apiClient.get('/gamification/profile'),
    staleTime: 60 * 1000,
  });

  React.useEffect(() => {
    trackEvent('settings_section_opened', { section: 'gamification' });
  }, []);

  const xp = profile?.xp || profile?.total_xp || 0;
  const streak = profile?.streak || profile?.current_streak || 0;
  const weeklySpent = profile?.weekly_spent || 0;
  const weeklyGoal = profile?.weekly_goal || 20;
  const { current, next, levelIndex } = getLevelInfo(xp);
  const LevelIcon = current.Icon;

  const progressPct = next ? Math.min(100, Math.round(((xp - current.min) / (next.min - current.min)) * 100)) : 100;
  const weeklyPct = weeklyGoal > 0 ? Math.min(100, Math.round((weeklySpent / weeklyGoal) * 100)) : 0;

  // Streak week dots (Mon-Sun)
  const today = new Date().getDay(); // 0=Sun
  const streakDays = profile?.streak_days || [];

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate('/settings')} className="bg-transparent border-none cursor-pointer p-1 flex">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950">
          {t('settings_gam.title', 'Nivel y XP')}
        </span>
      </div>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-[100px]">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={28} className="text-stone-500 animate-spin" /></div>
        ) : (
          <>
            {/* Level card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
                  <LevelIcon size={24} className="text-stone-950" />
                </div>
                <div>
                  <p className="text-lg font-bold text-stone-950">
                    {t('settings_gam.level', 'Nivel')} {levelIndex}: {current.name}
                  </p>
                  <p className="text-[13px] text-stone-500">{xp} XP</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-3 bg-stone-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-stone-950 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-stone-400">
                <span>{current.min} XP</span>
                {next ? (
                  <span>{t('settings_gam.next', 'Siguiente')}: {next.name} ({next.min} XP)</span>
                ) : (
                  <span>{t('settings_gam.max_level', 'Nivel maximo')}</span>
                )}
              </div>
            </div>

            {/* Streak card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Flame size={18} className="text-stone-950" />
                <span className="text-sm font-semibold text-stone-950">
                  {t('settings_gam.streak', 'Racha')}: {streak} {t('settings_gam.days', 'dias consecutivos')}
                </span>
              </div>
              {/* Week dots */}
              <div className="flex gap-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, i) => {
                  const dayIdx = i + 1; // 1=Mon
                  const adjustedToday = today === 0 ? 7 : today;
                  const isActive = streakDays.includes(dayIdx) || (dayIdx <= adjustedToday && dayIdx > adjustedToday - streak);
                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                        isActive ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-400'
                      }`}>
                        {isActive ? '\u2713' : day}
                      </div>
                      <span className="text-[10px] text-stone-400">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly goal */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target size={18} className="text-stone-950" />
                <span className="text-sm font-semibold text-stone-950">
                  {t('settings_gam.weekly_goal', 'Objetivo semanal')}
                </span>
              </div>
              <div className="h-3 bg-stone-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-stone-950 rounded-full transition-all duration-500" style={{ width: `${weeklyPct}%` }} />
              </div>
              <p className="text-[13px] text-stone-500">
                {weeklySpent.toFixed(2)} / {weeklyGoal.toFixed(2)} {t('settings_gam.spent', 'gastado esta semana')}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
