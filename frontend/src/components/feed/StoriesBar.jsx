import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import StoryRing from './StoryRing';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';

export default function StoriesBar({ onStoryClick, onCreateStory }) {
  const { user: currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Normalize backend story format → StoryViewer-compatible format
  const normalizeStories = useCallback((raw) => {
    const list = Array.isArray(raw) ? raw : raw?.data || [];
    return list.map((s) => ({
      user_id: s.user_id,
      user: {
        id: s.user_id,
        name: s.name,
        avatar_url: s.avatar,
        profile_image: s.avatar,
      },
      is_recent: s.is_recent,
      is_followed: s.is_followed,
      has_unseen: s.is_recent,
      // StoryViewer needs an `items` array with image_url/video_url
      items: s.preview ? [{
        id: `${s.user_id}_preview`,
        image_url: s.preview.image,
        caption: s.preview.text,
        type: s.preview.type,
        price: s.preview.price,
      }] : [],
    }));
  }, []);

  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiClient.get('/feed/stories');
      setStories(normalizeStories(res));
    } catch {
      setStories([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [normalizeStories]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiClient.get('/feed/stories');
        if (!cancelled) setStories(normalizeStories(res));
      } catch {
        if (!cancelled) { setStories([]); setError(true); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [normalizeStories]);

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
        : error ? (
            <button
              onClick={fetchStories}
              className="flex shrink-0 flex-col items-center gap-1 w-[68px] bg-transparent border-none cursor-pointer"
              aria-label="Reintentar cargar historias"
            >
              <div className="h-[62px] w-[62px] rounded-full bg-stone-100 flex items-center justify-center">
                <RefreshCw size={18} className="text-stone-400" />
              </div>
              <span className="text-[10px] text-stone-400">Reintentar</span>
            </button>
          )
        : stories.length === 0 ? (
            <div className="flex items-center px-2">
              <span className="text-xs text-stone-400">No hay historias recientes</span>
            </div>
          )
        : stories.map((story, idx) => (
            <StoryRing
              key={story.user_id || idx}
              user={story.user}
              isSelf={false}
              hasUnseenStory={story.has_unseen ?? true}
              itemsCount={story.items?.length || 1}
              onClick={() => onStoryClick && onStoryClick(stories, idx)}
            />
          ))}
    </div>
  );
}
