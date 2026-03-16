import React, { useState, useEffect } from 'react';
import StoryRing from './StoryRing';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';

export default function StoriesBar({ onStoryClick, onCreateStory }) {
  const { user: currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchStories() {
      try {
        const res = await apiClient.get('/api/stories/feed');
        if (!cancelled) {
          setStories(Array.isArray(res) ? res : res?.data || []);
        }
      } catch {
        if (!cancelled) setStories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStories();
    return () => { cancelled = true; };
  }, []);

  const skeletonKeyframes = `
    @keyframes storyPulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
  `;

  return (
    <>
      {loading && <style>{skeletonKeyframes}</style>}
      <div
        className="scrollbar-hide"
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          padding: '12px 16px',
        }}
      >
        {/* Self ring */}
        <StoryRing
          user={currentUser}
          isSelf
          hasUnseenStory={false}
          onClick={onCreateStory}
        />

        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  width: 68,
                }}
              >
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: '50%',
                    background: 'var(--color-surface)',
                    animation: 'storyPulse 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            ))
          : stories.map((story, idx) => (
              <StoryRing
                key={story.user?.id || idx}
                user={story.user}
                isSelf={false}
                hasUnseenStory={story.has_unseen !== false}
                onClick={() => onStoryClick && onStoryClick(stories, idx)}
              />
            ))}
      </div>
    </>
  );
}
