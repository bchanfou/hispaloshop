import React from 'react';
import { motion } from 'framer-motion';

/**
 * SlideTabIndicator — tab bar with a sliding active indicator.
 *
 * Props:
 *   tabs       — [{ id, label, icon?: Component }]
 *   activeTab  — current tab id
 *   onTabChange — (tabId) => void
 *   layoutId   — shared layoutId for the sliding pill (default 'tab-indicator')
 *   className  — extra classes for the container
 *   variant    — 'underline' (default) | 'pill'
 */
export default function SlideTabIndicator({
  tabs,
  activeTab,
  onTabChange,
  layoutId = 'tab-indicator',
  className = '',
  variant = 'underline',
  showLabels = false,
}) {
  return (
    <div role="tablist" className={`flex overflow-x-auto scrollbar-hide ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const TabIcon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex min-w-[44px] flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors duration-150 bg-transparent border-none cursor-pointer ${
              isActive ? 'text-stone-950' : 'text-stone-400'
            }`}
          >
            {TabIcon && <TabIcon size={variant === 'pill' ? 16 : 24} />}
            {variant === 'pill' && <span>{tab.label}</span>}
            {showLabels && variant !== 'pill' && (
              <span className="hidden lg:inline text-xs uppercase tracking-wider">{tab.label}</span>
            )}

            {isActive && variant === 'underline' && (
              <motion.div
                layoutId={layoutId}
                className="absolute top-0 left-0 right-0 h-[2px] bg-stone-950"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            {isActive && variant === 'pill' && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-stone-950/10 -z-10"
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
