import React, { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import ForYouFeed from './ForYouFeed';
import FollowingFeed from './FollowingFeed';
import HomeHeader from './HomeHeader';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';
import { useAuth } from '../../context/AuthContext';
import { useFeedTab } from '../../context/FeedTabContext';
import { trackEvent } from '../../utils/analytics';

/**
 * FeedContainer — "Para ti" / "Siguiendo" tabbed feed with stories bar
 */
function FeedContainer() {
  const { user } = useAuth();
  // Feed tab state — persisted across navigations via context
  const { activeTab: feedTab, setActiveTab: rawSetFeedTab } = useFeedTab();
  const setFeedTab = useCallback((tab) => {
    trackEvent('feed_tab_changed', { from: feedTab, to: tab });
    rawSetFeedTab(tab);
  }, [feedTab, rawSetFeedTab]);

  // Story viewer state
  const [storyViewer, setStoryViewer] = useState(null);
  const queryClient = useQueryClient();

  const handleCreateStory = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-creator', { detail: { mode: 'story' } }));
  }, []);

  const handleStoryClick = useCallback((stories, index) => {
    if (stories?.length > 0 && index >= 0 && index < stories.length) {
      const targetUserId = stories[index]?.user_id;
      setStoryViewer({ stories, initialIndex: index, originUserId: targetUserId });
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
      <div className="mx-auto lg:max-w-[680px]">
      {/* Header with tab toggle */}
      <HomeHeader activeTab={feedTab} onTabChange={setFeedTab} />

      {/* Stories */}
      <StoriesBar onCreateStory={handleCreateStory} onStoryClick={handleStoryClick} />

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
            originLayoutId={storyViewer.originUserId ? `story-${storyViewer.originUserId}` : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(FeedContainer);
