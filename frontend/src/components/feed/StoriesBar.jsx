import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
import StoryRing from './StoryRing';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';

export default function StoriesBar({ onStoryClick, onCreateStory }) {
  const { user: currentUser } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState(null);

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
      const normalized = normalizeStories(res);
      // Filter out stories with no viewable items
      setStories(normalized.filter(s => s.items && s.items.length > 0 && s.items[0].image_url));
    } catch {
      setStories([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [normalizeStories]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Hide the bar entirely when loading is done, there are no stories, and no
  // authenticated user (no self-ring to show either).
  if (!loading && !error && stories.length === 0 && !currentUser) {
    return null;
  }

  // Determine if the current user has an active story in the fetched list
  const selfStory = currentUser
    ? stories.find(s => s.user_id === currentUser.id || s.user_id === currentUser._id)
    : null;
  const hasActiveStory = !!selfStory;

  return (
    <div
      className="scrollbar-hide flex gap-3 overflow-x-auto overscroll-x-contain px-3 py-2"
      role="region"
      aria-label="Historias"
      tabIndex={0}
    >
      {/* Self ring — only when authenticated */}
      {currentUser && (
        <div className="relative shrink-0">
          <StoryRing
            user={currentUser}
            isSelf
            hasUnseenStory={false}
            onClick={onCreateStory}
          />
          {/* + overlay when user has no active story */}
          {!hasActiveStory && (
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-stone-950 rounded-full flex items-center justify-center pointer-events-none">
              <Plus size={10} color="white" />
            </div>
          )}
        </div>
      )}

      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex shrink-0 flex-col items-center gap-1 w-16"
              aria-hidden="true"
            >
              <div
                className="animate-pulse-slow h-16 w-16 rounded-full bg-stone-100"
              />
            </div>
          ))
        : error ? (
            <button
              onClick={fetchStories}
              className="flex shrink-0 flex-col items-center gap-1 w-16 bg-transparent border-none cursor-pointer"
              aria-label="Reintentar cargar historias"
            >
              <div className="h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center">
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
              isLoading={loadingUserId === story.user_id}
              onClick={async () => {
                if (!onStoryClick || loadingUserId) return;
                // Fetch all stories for this user to get full items, not just preview
                setLoadingUserId(story.user_id);
                try {
                  const res = await apiClient.get(`/stories/${story.user_id}`);
                  const fullItems = Array.isArray(res) ? res : res?.items || res?.stories || [];
                  if (fullItems.length > 0) {
                    const enrichedStories = stories.map((s, i) => {
                      if (i === idx) {
                        return {
                          ...s,
                          items: fullItems.map(item => ({
                            id: item.id || item.story_id,
                            story_id: item.id || item.story_id,
                            image_url: item.image_url || item.media_url,
                            video_url: item.video_url,
                            caption: item.caption || item.text,
                            created_at: item.created_at,
                            products: item.products,
                          })),
                        };
                      }
                      return s;
                    });
                    onStoryClick(enrichedStories, idx);
                  } else {
                    // Fallback: use preview
                    onStoryClick(stories, idx);
                  }
                } catch {
                  // Fallback: use preview
                  onStoryClick(stories, idx);
                } finally {
                  setLoadingUserId(null);
                }
              }}
            />
          ))}
    </div>
  );
}
