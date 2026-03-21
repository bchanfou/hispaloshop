import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag, UtensilsCrossed, Crown, Image, Megaphone,
  MessageCircle, Heart, ChefHat, Flame, Star, Compass, Lock, LucideIcon
} from 'lucide-react';

interface Badge {
  badge_id: string;
  icon: string;
  category: string;
  name_key: string;
  name_default: string;
  description_key: string;
  description_default: string;
  earned: boolean;
  current: number;
  threshold: number;
  awarded_at?: string;
}

interface ColorSet {
  bg: string;
  border: string;
  text: string;
  ring: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  'shopping-bag': ShoppingBag,
  'utensils-crossed': UtensilsCrossed,
  'crown': Crown,
  'image': Image,
  'megaphone': Megaphone,
  'message-circle': MessageCircle,
  'heart': Heart,
  'chef-hat': ChefHat,
  'flame': Flame,
  'star': Star,
  'compass': Compass,
};

const CATEGORY_COLORS: Record<string, ColorSet> = {
  shopping: { bg: 'bg-stone-50', border: 'border-stone-200', text: 'text-stone-700', ring: 'ring-stone-400' },
  social: { bg: 'bg-stone-100', border: 'border-stone-200', text: 'text-stone-700', ring: 'ring-stone-400' },
  recipes: { bg: 'bg-stone-50', border: 'border-stone-200', text: 'text-stone-600', ring: 'ring-stone-300' },
  reviews: { bg: 'bg-stone-100', border: 'border-stone-200', text: 'text-stone-700', ring: 'ring-stone-400' },
  explore: { bg: 'bg-stone-50', border: 'border-stone-200', text: 'text-stone-600', ring: 'ring-stone-300' },
};

interface BadgeItemProps {
  key?: string;
  badge: Badge;
}

function BadgeItem({ badge }: BadgeItemProps) {
  const { t } = useTranslation();
  const Icon = ICON_MAP[badge.icon] || Star;
  const colors = CATEGORY_COLORS[badge.category] || CATEGORY_COLORS.shopping;
  const progress = badge.threshold > 0 ? Math.min((badge.current / badge.threshold) * 100, 100) : 0;
  const name = t(badge.name_key, badge.name_default);
  const description = t(badge.description_key, badge.description_default);

  return (
    <div
      className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all ${
        badge.earned
          ? `${colors.bg} ${colors.border} shadow-sm`
          : 'bg-stone-50 border-stone-200 opacity-60'
      }`}
      data-testid={`badge-${badge.badge_id}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
        badge.earned
          ? `${colors.bg} ring-2 ${colors.ring}`
          : 'bg-stone-100'
      }`}>
        {badge.earned ? (
          <Icon className={`w-6 h-6 ${colors.text}`} strokeWidth={1.5} />
        ) : (
          <Lock className="w-5 h-5 text-stone-400" strokeWidth={1.5} />
        )}
      </div>
      <p className={`text-xs font-semibold text-center leading-tight ${
        badge.earned ? 'text-stone-900' : 'text-stone-500'
      }`}>
        {name}
      </p>
      <p className="text-[10px] text-stone-500 text-center mt-0.5 leading-tight">
        {description}
      </p>
      {!badge.earned && (
        <div className="w-full mt-2">
          <div className="h-1 rounded-full bg-stone-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colors.text.replace('text-', 'bg-')}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[9px] text-stone-400 text-center mt-0.5">
            {badge.current}/{badge.threshold}
          </p>
        </div>
      )}
      {badge.earned && badge.awarded_at && (
        <p className="text-[9px] text-stone-400 mt-1">
          {new Date(badge.awarded_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
        </p>
      )}
    </div>
  );
}

interface BadgeGridProps {
  badges: Badge[];
  compact?: boolean;
}

export default function BadgeGrid({ badges, compact = false }: BadgeGridProps) {
  const { t } = useTranslation();
  const earnedBadges = badges.filter(b => b.earned);
  const unearnedBadges = badges.filter(b => !b.earned);

  if (compact) {
    // Show only earned badges in a single row
    if (earnedBadges.length === 0) return null;
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" data-testid="badges-compact">
        {earnedBadges.map(b => {
          const Icon = ICON_MAP[b.icon] || Star;
          const colors = CATEGORY_COLORS[b.category] || CATEGORY_COLORS.shopping;
          return (
            <div
              key={b.badge_id}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg} ${colors.border} border`}
              title={t(b.name_key, b.name_default)}
              data-testid={`badge-compact-${b.badge_id}`}
            >
              <Icon className={`w-3.5 h-3.5 ${colors.text}`} strokeWidth={1.5} />
              <span className={`text-[10px] font-semibold ${colors.text}`}>
                {t(b.name_key, b.name_default)}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div data-testid="badges-grid">
      {earnedBadges.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            {t('badges.earned', 'Logros obtenidos')} ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {earnedBadges.map(b => <BadgeItem key={b.badge_id} badge={b} />)}
          </div>
        </div>
      )}
      {unearnedBadges.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
            {t('badges.inProgress', 'En progreso')} ({unearnedBadges.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {unearnedBadges.map(b => <BadgeItem key={b.badge_id} badge={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}
