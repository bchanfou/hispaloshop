import React, { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FollowingFeed from './FollowingFeed';
import ForYouFeed from './ForYouFeed';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';

/**
 * FeedContainer — recibe activeTab desde HomePage (via HomeHeader)
 * Si no se pasa prop, gestiona su propio estado (fallback).
 */
function FeedContainer({ activeTab: tabProp }) {
  // Fallback: estado propio si no llega prop (ej. uso fuera de HomePage)
  const [localTab, setLocalTab] = useState(() => {
    try { return localStorage.getItem('feedTab') || 'foryou'; }
    catch { return 'foryou'; }
  });

  const activeTab = tabProp ?? localTab;

  // Story viewer state
  const [storyViewer, setStoryViewer] = useState(null);

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
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      {/* Stories */}
      <StoriesBar onCreateStory={handleCreateStory} onStoryClick={handleStoryClick} />

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
            <FollowingFeed />
          ) : (
            <ForYouFeed />
          )}
        </motion.div>
      </AnimatePresence>

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

export default FeedContainer;
