import React, { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import ForYouFeed from './ForYouFeed';
import FollowingFeed from './FollowingFeed';
import HomeHeader from './HomeHeader';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';
import WeeklyGoalBar from '../gamification/WeeklyGoalBar';
import ProductCard from '../ProductCard';
import { useAuth } from '../../context/AuthContext';
import { useFeedTab } from '../../context/FeedTabContext';
import apiClient from '../../services/api/client';

/**
 * FeedContainer — "Para ti" / "Siguiendo" tabbed feed with stories bar
 */
function FeedContainer() {
  const { user } = useAuth();
  // Feed tab state — persisted across navigations via context
  const { activeTab: feedTab, setActiveTab: setFeedTab } = useFeedTab();

  // Gamification profile for weekly goal
  const { data: gamifProfile } = useQuery({
    queryKey: ['gamification', 'profile'],
    queryFn: () => apiClient.get('/gamification/profile'),
    enabled: !!user,
    staleTime: 60_000,
  });

  // Personalized product recommendations (graceful — hidden on error)
  const { data: forYouProducts } = useQuery({
    queryKey: ['products-for-you'],
    queryFn: () => apiClient.get('/products/for-you?limit=10'),
    enabled: !!user,
    staleTime: 30 * 60_000,
    retry: 1,
  });

  // Story viewer state
  const [storyViewer, setStoryViewer] = useState(null);
  const queryClient = useQueryClient();

  const handleCreateStory = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-creator', { detail: { mode: 'story' } }));
  }, []);

  const handleStoryClick = useCallback((stories, index) => {
    if (stories?.length > 0) {
      setStoryViewer({ stories, initialIndex: index });
    }
  }, []);

  const handleCloseStoryViewer = useCallback(() => {
    setStoryViewer(null);
    // Force immediate refetch so story rings update (seen → grey ring)
    queryClient.refetchQueries({ queryKey: ['feed-stories'] });
    // Sync own-story ring state in case user viewed/deleted their own story
    queryClient.invalidateQueries({ queryKey: ['stories-mine'] });
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto md:max-w-[500px] lg:max-w-[470px]">
      {/* Header with tab toggle */}
      <HomeHeader activeTab={feedTab} onTabChange={setFeedTab} />

      {/* Stories */}
      <StoriesBar onCreateStory={handleCreateStory} onStoryClick={handleStoryClick} />

      {/* Weekly healthy goal */}
      {gamifProfile && gamifProfile.weekly_goal_cents > 0 && (
        <WeeklyGoalBar spent={gamifProfile.weekly_spent_cents} goal={gamifProfile.weekly_goal_cents} />
      )}

      {/* Personalized product carousel */}
      {Array.isArray(forYouProducts) && forYouProducts.length > 0 && (
        <div className="pb-2">
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-sm font-semibold text-stone-950">Para ti</span>
          </div>
          <div
            className="flex gap-3 overflow-x-auto px-4 pb-1"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
          >
            {forYouProducts.map((product) => (
              <div key={product.product_id || product.id} className="shrink-0 w-[140px]" style={{ scrollSnapAlign: 'start' }}>
                <ProductCard product={product} variant="compact" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabbed Feed */}
      <div>
        <AnimatePresence mode="wait">
          {feedTab === 'foryou' ? (
            <motion.div
              key="foryou"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            >
              <ForYouFeed />
            </motion.div>
          ) : (
            <motion.div
              key="following"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            >
              <FollowingFeed />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>{/* end max-w container */}

      {/* Story Viewer (fullscreen modal — outside max-w so it's truly fullscreen) */}
      <AnimatePresence>
        {storyViewer && (
          <StoryViewer
            key="story-viewer"
            stories={storyViewer.stories}
            initialIndex={storyViewer.initialIndex}
            onClose={handleCloseStoryViewer}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(FeedContainer);
