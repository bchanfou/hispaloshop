import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

function TabToggle({ activeTab, onChange }) {
  const { t } = useTranslation();

  // Persistir preferencia en localStorage
  useEffect(() => {
    localStorage.setItem('feedTab', activeTab);
  }, [activeTab]);

  const tabs = [
    { id: 'following', label: t('feed.following', 'Siguiendo') },
    { id: 'foryou', label: t('feed.forYou', 'Para ti') },
  ];

  return (
    <div className="sticky top-14 z-40 bg-white border-b border-stone-100">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? 'text-[#1A1A1A]' : 'text-[#6B7280]'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2D5A3D]"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TabToggle;
