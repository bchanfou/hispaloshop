import React, { useCallback, useState } from 'react';
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
    const event = new CustomEvent('open-creator', { detail: { mode: 'story' } });
    window.dispatchEvent(event);
  };

  const handleViewStory = () => {
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Stories — pegadas al header, sin padding extra */}
      <StoriesCarousel onCreateStory={handleCreateStory} onViewStory={handleViewStory} />

      {/* Spinner de refresh */}
      {isRefreshing ? (
        <div className="py-4">
          <div className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
            <span className="text-[13px] text-stone-400">Actualizando...</span>
          </div>
        </div>
      ) : null}

      {/* Feed */}
      <div className="relative">
        {activeTab === 'following' ? (
          <FollowingFeed key={`following-${isRefreshing}`} onRefresh={handleRefresh} />
        ) : (
          <ForYouFeed key={`foryou-${isRefreshing}`} onRefresh={handleRefresh} />
        )}
      </div>
    </div>
  );
}

export default FeedContainer;
