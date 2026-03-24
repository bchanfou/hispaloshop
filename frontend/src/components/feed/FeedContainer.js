import React, { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import ForYouFeed from './ForYouFeed';
import FollowingFeed from './FollowingFeed';
import HomeHeader from './HomeHeader';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';
import WeeklyGoalBar from '../gamification/WeeklyGoalBar';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/api/client';

/**
 * FeedContainer — "Para ti" / "Siguiendo" tabbed feed with stories bar
 */
function FeedContainer() {
  const { user } = useAuth();
  // Feed tab state
  const [feedTab, setFeedTab] = useState('foryou');

  // Gamification profile for weekly goal
  const { data: gamifProfile } = useQuery({
    queryKey: ['gamification', 'profile'],
    queryFn: () => apiClient.get('/gamification/profile'),
    enabled: !!user,
    staleTime: 60_000,
  });

  // Story viewer state
  const [storyViewer, setStoryViewer] = useState(null);
  const queryClient = useQueryClient();

  const handleCreateStory = () => {
    window.dispatchEvent(new CustomEvent('open-creator', { detail: { mode: 'story' } }));
  };

  const handleStoryClick = useCallback((stories, index) => {
    if (stories?.length > 0) {
      setStoryViewer({ stories, initialIndex: index });
    }
  }, []);

  const handleCloseStoryViewer = useCallback(() => {
    setStoryViewer(null);
    queryClient.invalidateQueries({ queryKey: ['feed-stories'] });
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header with tab toggle */}
      <HomeHeader activeTab={feedTab} onTabChange={setFeedTab} />

      {/* Stories */}
      <StoriesBar onCreateStory={handleCreateStory} onStoryClick={handleStoryClick} />

      {/* Weekly healthy goal */}
      {gamifProfile && gamifProfile.weekly_goal_cents > 0 && (
        <WeeklyGoalBar spent={gamifProfile.weekly_spent_cents} goal={gamifProfile.weekly_goal_cents} />
      )}

      {/* Tabbed Feed — centered on tablet to prevent full-width stretch */}
      <div className="md:max-w-[500px] md:mx-auto lg:max-w-[470px]">
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

      {/* Story Viewer (fullscreen modal) */}
      {storyViewer && (
        <StoryViewer
          stories={storyViewer.stories}
          initialIndex={storyViewer.initialIndex}
          onClose={handleCloseStoryViewer}
        />
      )}
    </div>
  );
}

export default React.memo(FeedContainer);
