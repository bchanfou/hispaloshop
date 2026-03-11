import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import LandingNavPills from './LandingNavPills';
import FollowingFeed from './FollowingFeed';
import ForYouFeed from './ForYouFeed';
import TabToggle from './TabToggle';
import StoriesCarousel from '../stories/StoriesCarousel';

function FeedContainer() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('feedTab') || 'foryou');
  const [selectedCategory] = useState('foryou');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    localStorage.setItem('feedTab', activeTab);
  }, [activeTab]);

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
    <div className="min-h-screen bg-stone-50">
      <TabToggle activeTab={activeTab} onChange={setActiveTab} />
      <LandingNavPills />
      <StoriesCarousel onCreateStory={handleCreateStory} onViewStory={handleViewStory} />

      {isRefreshing ? (
        <div className="bg-white py-4">
          <div className="flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
            <span className="ml-2 text-sm text-stone-500">{t('feed.refreshing', 'Actualizando...')}</span>
          </div>
        </div>
      ) : null}

      <div className="relative">
        {activeTab === 'following' ? (
          <FollowingFeed key={`following-${selectedCategory}-${isRefreshing}`} onRefresh={handleRefresh} />
        ) : (
          <ForYouFeed key={`foryou-${selectedCategory}-${isRefreshing}`} onRefresh={handleRefresh} />
        )}
      </div>
    </div>
  );
}

export default FeedContainer;
