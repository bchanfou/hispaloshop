import React from 'react';

/**
 * HomeHeader v3 — only the Para ti / Siguiendo pill toggle
 * Logo + bell + cart are already in AppHeader
 */
export default function HomeHeader({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'foryou', label: 'Para ti' },
    { id: 'following', label: 'Siguiendo' },
  ];

  return (
    <div
      className="flex items-center justify-center bg-[var(--color-cream)] px-4 pb-1 pt-2"
      data-testid="home-header"
    >
      <div className="flex items-center rounded-full bg-[var(--color-surface)] p-[3px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`min-h-[44px] rounded-full px-4 text-[13px] font-sans transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--color-white)] font-semibold text-[var(--color-black)] shadow-sm'
                  : 'bg-transparent font-normal text-[var(--color-stone)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
