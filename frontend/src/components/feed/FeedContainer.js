import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ForYouFeed from './ForYouFeed';
import FollowingFeed from './FollowingFeed';
import OfflineIndicator from '../ui/OfflineIndicator';
import StoriesBar from './StoriesBar';
import StoryViewer from './StoryViewer';

/**
 * FeedContainer - Contenedor principal del feed con tabs
 * 
 * Estructura según ROADMAP 1.11:
 * - Tabs: Siguiendo | Para ti
 * - Solo contenido social: Posts, Reels, Stories
 * - Zero widgets/injections que no sean content social
 */
export default function FeedContainer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('for-you'); // 'for-you' | 'following'
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [storyViewerData, setStoryViewerData] = useState({ stories: [], initialIndex: 0 });

  const handleStoryClick = (stories, index) => {
    setStoryViewerData({ stories, initialIndex: index });
    setStoryViewerOpen(true);
  };

  const handleCreateStory = () => {
    navigate('/create/story');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Banner de estado offline */}
      <OfflineIndicator variant="banner" />

      {/* Tabs Navigation */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-100">
        <div className="flex items-center justify-center">
          <div className="flex items-center">
            {/* Siguiendo (Following) Tab */}
            <button
              onClick={() => setActiveTab('following')}
              className={`relative px-6 py-3 text-[15px] font-semibold transition-colors ${
                activeTab === 'following'
                  ? 'text-stone-950'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {t('feed.following', 'Siguiendo')}
              {activeTab === 'following' && (
                <motion.div
                  layoutId="feed-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-950"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>

            {/* Para ti (For You) Tab */}
            <button
              onClick={() => setActiveTab('for-you')}
              className={`relative px-6 py-3 text-[15px] font-semibold transition-colors ${
                activeTab === 'for-you'
                  ? 'text-stone-950'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {t('feed.forYou', 'Para ti')}
              {activeTab === 'for-you' && (
                <motion.div
                  layoutId="feed-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-stone-950"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Story Viewer Modal */}
      {storyViewerOpen && (
        <StoryViewer
          stories={storyViewerData.stories}
          initialUserIndex={storyViewerData.initialIndex}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}

      {/* Feed Content — StoriesBar rendered inside each feed's scroll container */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'following' ? (
          <FollowingFeed storiesHeader={<StoriesBar onStoryClick={handleStoryClick} onCreateStory={handleCreateStory} />} />
        ) : (
          <ForYouFeed storiesHeader={<StoriesBar onStoryClick={handleStoryClick} onCreateStory={handleCreateStory} />} />
        )}
      </div>
    </div>
  );
}
