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
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 16px 4px',
        background: 'var(--color-cream)',
      }}
      data-testid="home-header"
    >
      <div
        className="flex items-center p-[3px]"
        style={{ borderRadius: 'var(--radius-full)', background: 'var(--color-surface)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className="transition-all duration-200"
            style={{
              borderRadius: 'var(--radius-full)',
              padding: '5px 16px',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontFamily: 'var(--font-sans)',
              background: activeTab === tab.id ? 'var(--color-white)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-black)' : 'var(--color-stone)',
              boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
