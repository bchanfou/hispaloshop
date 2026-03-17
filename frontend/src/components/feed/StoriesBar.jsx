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
        const res = await apiClient.get('/feed/stories');
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

  return (
    <div
      className="scrollbar-hide flex gap-3 overflow-x-auto px-4 py-3"
      role="region"
      aria-label="Historias"
      tabIndex={0}
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
              className="flex shrink-0 flex-col items-center gap-1 w-[68px]"
              aria-hidden="true"
            >
              <div
                className="animate-pulse-slow h-[62px] w-[62px] rounded-full bg-stone-100"
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
  );
}
