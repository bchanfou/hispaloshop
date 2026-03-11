import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const DEFAULT_ITEMS = [
  { label: 'Descubrir', href: '/discover' },
  { label: 'Ser Influencer', href: '/influencer' },
  { label: 'Ser Productor', href: '/productor' },
  { label: 'Historia', href: '/que-es#historia' },
];

export default function LandingSectionNav({ items = DEFAULT_ITEMS }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (href) => {
    if (href.startsWith('#')) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      if (location.pathname === path) {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.location.href = href;
      }
      return;
    }

    navigate(href);
  };

  return (
    <div className="border-b border-stone-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleClick(item.href)}
              className="shrink-0 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
