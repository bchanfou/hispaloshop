// @ts-nocheck
/**
 * Horizontal filter chips for DiscoverPage.
 * Todo | Productos | Tiendas | Comunidades | Recetas | Creators
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

const CHIPS = [
  { key: 'all',          labelKey: 'discover.chipAll',          fallback: 'Todo' },
  { key: 'products',     labelKey: 'discover.chipProducts',     fallback: 'Productos' },
  { key: 'stores',       labelKey: 'discover.chipStores',       fallback: 'Tiendas' },
  { key: 'communities',  labelKey: 'discover.chipCommunities',  fallback: 'Comunidades' },
  { key: 'recipes',      labelKey: 'discover.chipRecipes',      fallback: 'Recetas' },
  { key: 'creators',     labelKey: 'discover.chipCreators',     fallback: 'Creators' },
];

export default function DiscoverChips({ active, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-hide" role="tablist">
      {CHIPS.map((chip) => {
        const selected = active === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => {
              onChange(chip.key);
              trackEvent('discover_chip_changed', { chip: chip.key });
            }}
            className={`relative shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              selected
                ? 'bg-stone-950 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
            data-testid={`discover-chip-${chip.key}`}
          >
            {selected && (
              <motion.div
                layoutId="discover-chip-bg"
                className="absolute inset-0 bg-stone-950 rounded-full"
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              />
            )}
            <span className="relative z-10">{t(chip.labelKey, chip.fallback)}</span>
          </button>
        );
      })}
    </div>
  );
}
