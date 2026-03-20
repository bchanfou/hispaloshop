import React, { useCallback, useState } from 'react';
import ForYouFeed from './ForYouFeed';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';

/**
 * FeedContainer — unified feed (always ForYouFeed with recommended + followed content)
 */
function FeedContainer() {
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
    <div className="min-h-screen bg-white">
      {/* Stories */}
      <StoriesBar onCreateStory={handleCreateStory} onStoryClick={handleStoryClick} />

      {/* Unified Feed */}
      <ForYouFeed />

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
