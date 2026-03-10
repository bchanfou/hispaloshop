import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

function TabToggle({ activeTab, onChange }) {
  const { t } = useTranslation();

  const tabs = [
    { id: 'following', label: t('feed.following', 'Siguiendo') },
    { id: 'foryou', label: t('feed.forYou', 'Para ti') },
  ];

  return (
    <div className="sticky top-16 z-30 border-b border-stone-200/80 bg-white/95 px-4 py-3 backdrop-blur-xl md:top-[76px]">
      <div className="mx-auto max-w-3xl">
        <div className="grid grid-cols-2 rounded-full bg-stone-100 p-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`relative rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'text-white' : 'text-stone-600 hover:text-stone-950'
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="feed-tab-pill"
                    className="absolute inset-0 rounded-full bg-stone-950"
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                ) : null}
                <span className="relative z-[1]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TabToggle;
