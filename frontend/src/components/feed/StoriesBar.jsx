import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
      username: s.username,
      avatar_url: s.avatar,
      profile_image: s.avatar,
    },
    is_recent: s.is_recent,
    is_followed: s.is_followed,
    has_unseen: s.has_unseen ?? s.is_recent ?? true,
    stories_count: s.stories_count ?? 1,
    // StoryViewer needs an `items` array with image_url/video_url
    items: s.preview ? [{
      id: `${s.user_id}_preview`,
      image_url: s.preview.image,
      video_url: s.preview.video,
      caption: s.preview.text,
      type: s.preview.type,
      price: s.preview.price,
    }] : [],
  }));
}

export default function StoriesBar({ onStoryClick, onCreateStory }) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [loadingUserId, setLoadingUserId] = useState(null);

  const { data: storiesData, isLoading: loading, isError: error, refetch } = useQuery({
    queryKey: ['feed-stories'],
    queryFn: async () => {
      const res = await apiClient.get('/feed/stories');
      const normalized = normalizeStories(res);
      return normalized.filter(s => s.items && s.items.length > 0 && (s.items[0].image_url || s.items[0].video_url));
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Separate query to know if the current user has an active story.
  // /feed/stories intentionally excludes the current user, so we check /stories/mine.
  const { data: myStories } = useQuery({
    queryKey: ['stories-mine'],
    queryFn: () => apiClient.get('/stories/mine'),
    enabled: !!currentUser,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const hasActiveStory = Array.isArray(myStories) ? myStories.length > 0 : false;

  const stories = storiesData || [];

  // Preload full story data for the first 3 users to warm the React Query cache (once only)
  const preloadedRef = useRef(false);
  useEffect(() => {
    if (preloadedRef.current || !stories?.length) return;
    preloadedRef.current = true;
    stories.slice(0, 3).forEach(s => {
      queryClient.prefetchQuery({
        queryKey: ['user-stories', s.user_id],
        queryFn: () => apiClient.get(`/stories/${s.user_id}`),
        staleTime: 30_000,
      });
    });
  }, [stories, queryClient]);

  // Hide the bar entirely when loading is done, there are no stories, and no
  // authenticated user (no self-ring to show either).
  if (!loading && !error && stories.length === 0 && !currentUser) {
    return null;
  }

  // selfStory is used when the user taps their own ring to open the viewer
  const selfStory = currentUser
    ? stories.find(s => s.user_id === currentUser.user_id || s.user_id === currentUser.id || s.user_id === currentUser._id)
    : null;

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
                      // selfStory may be null (backend excludes current user from feed),
                      // so build the story envelope directly from currentUser if needed.
                      const storyEnvelope = selfStory ?? {
                        user_id: uid,
                        user: {
                          id: uid,
                          name: currentUser.name || currentUser.company_name || currentUser.username,
                          username: currentUser.username,
                          avatar_url: currentUser.profile_image || currentUser.avatar_url || currentUser.avatar,
                        },
                        has_unseen: true,
                      };
                      onStoryClick([{
                        ...storyEnvelope,
                        items: fullItems.map(item => ({
                          id: item.id || item.story_id,
                          story_id: item.story_id || item.id,
                          image_url: item.image_url || item.media_url,
                          video_url: item.video_url,
                          caption: item.caption || item.text,
                          created_at: item.created_at,
                          products: item.products,
                          view_count: item.view_count,
                          is_liked: item.is_liked ?? false,
                          overlays: item.overlays,
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
              itemsCount={story.stories_count || 1}
              isLoading={loadingUserId === story.user_id}
              onClick={async () => {
                if (!onStoryClick || loadingUserId) return;
                // Fetch all stories for this user to get full items, not just preview
                setLoadingUserId(story.user_id);
                try {
                  const res = await apiClient.get(`/stories/${story.user_id}`);
                  const fullItems = Array.isArray(res) ? res : res?.items || res?.stories || [];
                  // Find correct index by user_id, not by filtered idx
                  const targetUserId = story.user_id;
                  if (fullItems.length > 0) {
                    const enrichedStories = stories.map((s) => {
                      if (s.user_id === targetUserId) {
                        return {
                          ...s,
                          items: fullItems.map(item => ({
                            id: item.id || item.story_id,
                            story_id: item.story_id || item.id,
                            image_url: item.image_url || item.media_url,
                            video_url: item.video_url,
                            caption: item.caption || item.text,
                            created_at: item.created_at,
                            products: item.products,
                            view_count: item.view_count ?? 0,
                            is_liked: item.is_liked ?? false,
                            overlays: item.overlays,
                          })),
                        };
                      }
                      return s;
                    });
                    const actualIdx = enrichedStories.findIndex(s => s.user_id === targetUserId);
                    onStoryClick(enrichedStories, actualIdx >= 0 ? actualIdx : 0);
                  } else {
                    const fallbackIdx = stories.findIndex(s => s.user_id === targetUserId);
                    onStoryClick(stories, fallbackIdx >= 0 ? fallbackIdx : 0);
                  }
                } catch {
                  const fallbackIdx = stories.findIndex(s => s.user_id === story.user_id);
                  onStoryClick(stories, fallbackIdx >= 0 ? fallbackIdx : 0);
                } finally {
                  setLoadingUserId(null);
                }
              }}
            />
          ))}
    </div>
  );
}
