// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function DiscoverSearchBar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => navigate('/search')}
      aria-label={t('discover.searchPlaceholder', 'Buscar productos, tiendas, recetas...')}
      className="mx-4 mt-2 mb-1 flex items-center gap-3 h-12 px-4 rounded-2xl bg-stone-100 text-stone-400 text-sm transition-colors hover:bg-stone-200 border-none cursor-pointer w-[calc(100%-32px)]"
      data-testid="discover-search-bar"
    >
      <Search size={18} className="shrink-0" />
      <span className="truncate">{t('discover.searchPlaceholder', 'Buscar productos, tiendas, recetas...')}</span>
    </button>
  );
}
