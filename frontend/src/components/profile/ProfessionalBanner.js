import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, ChevronRight, TrendingUp } from 'lucide-react';

const ROLE_CONFIG = {
  producer: {
    label: 'Panel para productores',
    insightsRoute: '/producer/insights',
    accent: '#2D5A3D',
    accentLight: '#f0f7f2',
    accentBorder: '#c6dece',
  },
  importer: {
    label: 'Panel para importadores',
    insightsRoute: '/importer/dashboard',
    accent: '#1a4a6b',
    accentLight: '#eef4f9',
    accentBorder: '#bdd4e7',
  },
  influencer: {
    label: 'Panel para influencers',
    insightsRoute: '/influencer/insights',
    accent: '#6b2d8b',
    accentLight: '#f6f0fa',
    accentBorder: '#d9bfec',
  },
};

/**
 * ProfessionalBanner
 * Visible únicamente en el propio perfil de usuarios con rol profesional.
 * Muestra las visualizaciones del perfil en los últimos 30 días y permite
 * navegar al panel de análisis con un click.
 *
 * Props:
 *   role         — 'producer' | 'importer' | 'influencer'
 *   viewCount    — número de visualizaciones (puede ser null/undefined)
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
      className="group w-full text-left transition-opacity active:opacity-80"
      aria-label={`Ir al ${config.label}`}
    >
      <div
        className="flex items-center gap-3 rounded-2xl border px-4 py-3"
        style={{
          backgroundColor: config.accentLight,
          borderColor: config.accentBorder,
        }}
      >
        {/* Icono */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: config.accent }}
        >
          {hasViews ? (
            <TrendingUp className="h-4 w-4 text-white" strokeWidth={2} />
          ) : (
            <BarChart2 className="h-4 w-4 text-white" strokeWidth={2} />
          )}
        </div>

        {/* Texto */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight text-stone-950">
            {config.label}
          </p>
          <p className="mt-0.5 text-[12px] leading-tight text-stone-500">
            {hasViews
              ? `${formattedViews} visualizaciones en los últimos 30 días`
              : 'Ver tus estadísticas y rendimiento'}
          </p>
        </div>

        {/* Chevron */}
        <ChevronRight
          className="h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={2}
        />
      </div>
    </button>
  );
}
