import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FollowingFeed from './FollowingFeed';
import ForYouFeed from './ForYouFeed';
import StoriesBar from './StoriesBar';

/**
 * FeedContainer — recibe activeTab desde HomePage (via HomeHeader)
 * Si no se pasa prop, gestiona su propio estado (fallback).
 */
function FeedContainer({ activeTab: tabProp, onTabChange }) {
  // Fallback: estado propio si no llega prop (ej. uso fuera de HomePage)
  const [localTab, setLocalTab] = useState(() => {
    try { return localStorage.getItem('feedTab') || 'foryou'; }
    catch { return 'foryou'; }
  });

  const activeTab = tabProp ?? localTab;
  const setActiveTab = onTabChange ?? ((t) => {
    setLocalTab(t);
    localStorage.setItem('feedTab', t);
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Feed components handle their own refetch via usePullToRefresh + React Query.
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => setIsRefreshing(false), 600);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);

  const handleCreateStory = () => {
    window.dispatchEvent(new CustomEvent('open-creator', { detail: { mode: 'story' } }));
  };

  const handleViewStory = () => {
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      {/* Stories */}
      <StoriesBar onCreateStory={handleCreateStory} onStoryClick={handleViewStory} />

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
