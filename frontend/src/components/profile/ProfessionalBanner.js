import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, ChevronRight, TrendingUp } from 'lucide-react';

const ROLE_CONFIG = {
  producer:   { label: 'Panel para productores',  insightsRoute: '/producer/insights' },
  importer:   { label: 'Panel para importadores', insightsRoute: '/importer/dashboard' },
  influencer: { label: 'Panel para influencers',  insightsRoute: '/influencer/insights' },
};

/**
 * ProfessionalBanner — B&W Premium
 * Visible únicamente en el propio perfil de usuarios con rol profesional.
 * Navega al panel de análisis correspondiente al hacer click.
 */
export default function ProfessionalBanner({ role, viewCount }) {
  const navigate = useNavigate();
  const config = ROLE_CONFIG[role];

  if (!config) return null;

  const hasViews = typeof viewCount === 'number' && viewCount > 0;
  const formattedViews = hasViews
    ? viewCount >= 1000
      ? `${(viewCount / 1000).toFixed(1).replace('.0', '')}K`
      : viewCount.toLocaleString('es-ES')
    : null;

  return (
    <button
      onClick={() => navigate(config.insightsRoute)}
      className="group w-full text-left"
      aria-label={`Ir al ${config.label}`}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-stone-950 px-4 py-3.5 transition-opacity active:opacity-80">

        {/* Icono */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
          {hasViews ? (
            <TrendingUp className="h-4 w-4 text-white" strokeWidth={1.8} />
          ) : (
            <BarChart2 className="h-4 w-4 text-white" strokeWidth={1.8} />
          )}
        </div>

        {/* Texto */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-white">
            {config.label}
          </p>
          <p className="mt-0.5 text-[11px] font-medium leading-tight text-white/50">
            {hasViews
              ? `${formattedViews} visualizaciones · últimos 30 días`
              : 'Ver estadísticas y rendimiento'}
          </p>
        </div>

        {/* Chevron */}
        <ChevronRight
          className="h-4 w-4 shrink-0 text-white/30 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </div>
    </button>
  );
}
