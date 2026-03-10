import React from 'react';
import { Link } from 'react-router-dom';

const ROLE_PILLS = [
  { id: 'info', label: 'Que es esto?', to: '/about' },
  { id: 'influencer', label: 'Soy Influencer', to: '/influencer' },
  { id: 'producer', label: 'Soy Productor', to: '/info/productor' },
  { id: 'importer', label: 'Soy Importador', to: '/importador' },
];

export default function RolePills() {
  return (
    <section className="pb-6 pt-1" data-testid="role-pills-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5">
          {ROLE_PILLS.map((pill) => (
            <Link
              key={pill.id}
              to={pill.to}
              className="group inline-flex min-h-[40px] items-center justify-center rounded-full border border-stone-200/80 bg-white/70 px-4 py-2 text-sm font-medium text-stone-600 transition-colors duration-200 hover:bg-white hover:text-primary"
              data-testid={`role-pill-${pill.id}`}
            >
              <span className="border-b border-transparent pb-0.5 transition-colors duration-200 group-hover:border-primary/35">
                {pill.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
