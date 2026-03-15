import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FollowingFeed from './FollowingFeed';
import ForYouFeed from './ForYouFeed';
import StoriesCarousel from '../stories/StoriesCarousel';

/**
 * FeedContainer — recibe activeTab desde HomePage (via HomeHeader)
 * Si no se pasa prop, gestiona su propio estado (fallback).
 */
function FeedContainer({ activeTab: tabProp, onTabChange }) {
  // Fallback: estado propio si no llega prop (ej. uso fuera de HomePage)
  const [localTab, setLocalTab] = useState(
    () => localStorage.getItem('feedTab') || 'foryou'
  );

  const activeTab = tabProp ?? localTab;
  const setActiveTab = onTabChange ?? ((t) => {
    setLocalTab(t);
    localStorage.setItem('feedTab', t);
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  const handleCreateStory = () => {
    window.dispatchEvent(new CustomEvent('open-creator', { detail: { mode: 'story' } }));
  };

  const handleViewStory = () => {
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-cream)' }}>
      {/* Stories */}
      <StoriesCarousel onCreateStory={handleCreateStory} onViewStory={handleViewStory} />

      {/* Refresh indicator */}
      <AnimatePresence>
        {isRefreshing ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center gap-2 py-3"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
            <span className="text-[12px] font-medium text-stone-400">Actualizando</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Feed — crossfade al cambiar tab */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
        >
          {activeTab === 'following' ? (
            <FollowingFeed key={`following-${isRefreshing}`} onRefresh={handleRefresh} />
          ) : (
            <ForYouFeed key={`foryou-${isRefreshing}`} onRefresh={handleRefresh} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default FeedContainer;
