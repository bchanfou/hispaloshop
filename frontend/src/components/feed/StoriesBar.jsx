import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { RefreshCw, Plus } from 'lucide-react';
import StoryRing from './StoryRing';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';

// Normalize backend story format → StoryViewer-compatible format
function normalizeStories(raw) {
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
    has_unseen: s.has_unseen ?? s.is_recent ?? true,
    // StoryViewer needs an `items` array with image_url/video_url
    items: s.preview ? [{
      id: `${s.user_id}_preview`,
      image_url: s.preview.image,
      caption: s.preview.text,
      type: s.preview.type,
      price: s.preview.price,
    }] : [],
  }));
}

export default function StoriesBar({ onStoryClick, onCreateStory }) {
  const { user: currentUser } = useAuth();
  const [loadingUserId, setLoadingUserId] = useState(null);

  const { data: storiesData, isLoading: loading, isError: error, refetch } = useQuery({
    queryKey: ['feed-stories'],
    queryFn: async () => {
      const res = await apiClient.get('/feed/stories');
      const normalized = normalizeStories(res);
      return normalized.filter(s => s.items && s.items.length > 0 && s.items[0].image_url);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const stories = storiesData || [];

  // Preload full story data for the first 3 users to warm the cache
  useEffect(() => {
    if (stories?.length > 0) {
      stories.slice(0, 3).forEach(s => {
        apiClient.get(`/stories/${s.user_id}`).catch(() => {});
      });
    }
  }, [stories]);

  // Hide the bar entirely when loading is done, there are no stories, and no
  // authenticated user (no self-ring to show either).
  if (!loading && !error && stories.length === 0 && !currentUser) {
    return null;
  }

  // Determine if the current user has an active story in the fetched list
  const selfStory = currentUser
    ? stories.find(s => s.user_id === currentUser.user_id || s.user_id === currentUser.id || s.user_id === currentUser._id)
    : null;
  const hasActiveStory = !!selfStory;

  return (
    <div
      className="scrollbar-hide flex gap-2.5 overflow-x-auto overscroll-x-contain snap-x snap-mandatory px-3 py-2"
      role="region"
      aria-label="Historias"
      tabIndex={0}
    >
      {/* Self ring — only when authenticated */}
      {currentUser && (
        <div className="relative shrink-0 snap-center">
          <StoryRing
            user={currentUser}
            isSelf
            hasUnseenStory={hasActiveStory}
            onClick={hasActiveStory
              ? async () => {
                  if (!onStoryClick || loadingUserId) return;
                  setLoadingUserId(currentUser.id || currentUser.user_id || 'self');
                  try {
                    const uid = currentUser.id || currentUser.user_id;
                    const res = await apiClient.get(`/stories/${uid}`);
                    const fullItems = Array.isArray(res) ? res : res?.items || res?.stories || [];
                    if (fullItems.length > 0) {
                      onStoryClick([{
                        ...selfStory,
                        items: fullItems.map(item => ({
                          id: item.id || item.story_id,
                          story_id: item.id || item.story_id,
                          image_url: item.image_url || item.media_url,
                          video_url: item.video_url,
                          caption: item.caption || item.text,
                          created_at: item.created_at,
                          products: item.products,
                        })),
                      }], 0);
                    }
                  } catch {
                    /* fallback: open story creator */
                    onCreateStory?.();
                  } finally {
                    setLoadingUserId(null);
                  }
                }
              : onCreateStory
            }
          />
          {/* + overlay when user has no active story */}
          {!hasActiveStory && (
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-0 right-0 w-5 h-5 bg-stone-950 rounded-full flex items-center justify-center pointer-events-none"
            >
              <Plus size={10} color="white" />
            </motion.div>
          )}
        </div>
      )}

      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex shrink-0 snap-center flex-col items-center gap-1 w-[58px]"
              aria-hidden="true"
            >
              <div
                className="animate-pulse h-[58px] w-[58px] rounded-full bg-stone-100"
              />
            </div>
          ))
        : error ? (
            <button
              onClick={() => refetch()}
              className="flex shrink-0 snap-center flex-col items-center gap-1 w-[58px] bg-transparent border-none cursor-pointer"
              aria-label="Reintentar cargar historias"
            >
              <div className="h-[58px] w-[58px] rounded-full bg-stone-100 flex items-center justify-center">
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
        : stories.filter(s => !currentUser || (s.user_id !== currentUser.user_id && s.user_id !== currentUser.id && s.user_id !== currentUser._id)).map((story, idx) => (
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
