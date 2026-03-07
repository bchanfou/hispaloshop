import React, { useState, useEffect, useCallback, useRef } from 'react';
import TabToggle from './TabToggle';
import CategoryPills from './CategoryPills';
import FollowingFeed from './FollowingFeed';
import ForYouFeed from './ForYouFeed';
import StoriesCarousel from '../stories/StoriesCarousel';
import { useTranslation } from 'react-i18next';

function FeedContainer() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('feedTab') || 'foryou';
  });
  const [selectedCategory, setSelectedCategory] = useState('foryou');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Persistir tab seleccionado
  useEffect(() => {
    localStorage.setItem('feedTab', activeTab);
  }, [activeTab]);

  // Swipe detection nativo
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // mínimo swipe

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && activeTab === 'following') {
        // Swipe left: Siguiendo -> Para ti
        setActiveTab('foryou');
      } else if (diff < 0 && activeTab === 'foryou') {
        // Swipe right: Para ti -> Siguiendo
        setActiveTab('following');
      }
    }
  };

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  }, []);

  // Manejar creación de historia
  const handleCreateStory = () => {
    const event = new CustomEvent('open-creator', { detail: { mode: 'story' } });
    window.dispatchEvent(event);
  };

  // Manejar ver historia
  const handleViewStory = (story) => {
    console.log('View story:', story);
  };

  return (
    <div 
      className="min-h-screen bg-[#FAFAFA]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Toggle Siguiendo/Para ti */}
      <TabToggle activeTab={activeTab} onChange={setActiveTab} />

      {/* Categorías */}
      <CategoryPills
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {/* Stories */}
      <StoriesCarousel
        onCreateStory={handleCreateStory}
        onViewStory={handleViewStory}
      />

      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-4 bg-white">
          <div className="w-5 h-5 border-2 border-stone-200 border-t-[#2D5A3D] rounded-full animate-spin" />
          <span className="ml-2 text-sm text-[#6B7280]">{t('feed.refreshing', 'Actualizando...')}</span>
        </div>
      )}

      {/* Feed content */}
      <div className="relative">
        {activeTab === 'following' ? (
          <FollowingFeed key={`following-${selectedCategory}`} />
        ) : (
          <ForYouFeed key={`foryou-${selectedCategory}`} />
        )}
      </div>
    </div>
  );
}

export default FeedContainer;
