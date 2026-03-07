import React from 'react';
import { motion } from 'framer-motion';

const TABS = [
  { id: 'store', label: 'Tienda' },
  { id: 'posts', label: 'Posts' },
  { id: 'info', label: 'Info' },
];

function ProfileTabs({ activeTab, onChange }) {
  return (
    <div className="sticky top-0 bg-white border-b border-stone-100 z-10">
      <div className="flex">
        {TABS.map((tab) => (
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
                layoutId="activeProfileTab"
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

export default ProfileTabs;
