import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Store } from 'lucide-react';

const ROLE_CONFIG = {
  producer:   { storeRoute: '/producer/store-profile', insightsRoute: '/producer/insights'  },
  importer:   { storeRoute: '/importer/catalog',       insightsRoute: '/importer/dashboard' },
  influencer: { storeRoute: '/influencer/dashboard',   insightsRoute: '/influencer/insights' },
};

function fmt(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K` : n.toLocaleString('es-ES');
}

export default function ProfessionalBanner({ role, viewCount, followersCount }) {
  const navigate = useNavigate();
  const config = ROLE_CONFIG[role];

  if (!config) return null;

  const hasViews     = typeof viewCount     === 'number' && viewCount     > 0;
  const hasFollowers = typeof followersCount === 'number' && followersCount > 0;

  return (
    <div className="rounded-2xl border border-stone-100 bg-stone-50 p-4">

      {/* Header + stat pills */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="flex-1 text-[13px] font-semibold text-stone-950">Panel profesional</p>
        {hasViews && (
          <span className="rounded-full border border-stone-100 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600">
            {fmt(viewCount)} visitas
          </span>
        )}
        {hasFollowers && (
          <span className="rounded-full border border-stone-100 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-600">
            {fmt(followersCount)} seguidores
          </span>
        )}
      </div>

      {/* 2-column action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => navigate(config.storeRoute)}
          className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-white px-3 py-3 text-left transition-colors active:bg-stone-50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-100">
            <Store className="h-4 w-4 text-stone-700" strokeWidth={1.8} />
          </div>
          <span className="text-[12px] font-semibold leading-tight text-stone-800">Editar tienda</span>
        </button>

        <button
          type="button"
          onClick={() => navigate(config.insightsRoute)}
          className="flex items-center gap-2.5 rounded-xl border border-stone-100 bg-white px-3 py-3 text-left transition-colors active:bg-stone-50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-stone-100">
            <BarChart2 className="h-4 w-4 text-stone-700" strokeWidth={1.8} />
          </div>
          <span className="text-[12px] font-semibold leading-tight text-stone-800">Ver estadísticas</span>
        </button>
      </div>
    </div>
  );
}
