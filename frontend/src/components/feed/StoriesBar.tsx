import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ChefHat } from 'lucide-react';
import StoryCard from './StoryCard';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import i18n from '../../locales/i18n';

// ── Types ────────────────────────────────────────────────────────
interface StoryPreview {
  type?: string;
  image?: string;
  video?: string;
  text?: string;
  price?: number;
}

interface NormalizedStory {
  user_id: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
    profile_image?: string;
  };
  preview?: StoryPreview;
  is_recent?: boolean;
  is_followed?: boolean;
  has_unseen: boolean;
  stories_count: number;
  items: Array<{
    id: string;
    image_url?: string;
    video_url?: string;
    caption?: string;
    type?: string;
    price?: number;
  }>;
}

interface StoriesBarProps {
  onStoryClick?: (stories: NormalizedStory[], index: number) => void;
  onCreateStory?: () => void;
}

// ── Normalize backend story format → viewer-compatible ───────────
function normalizeStories(raw: unknown): NormalizedStory[] {
  const list = Array.isArray(raw) ? raw : (raw as any)?.data || [];
  return list.map((s: any) => ({
    user_id: s.user_id,
    user: {
      id: s.user_id,
      name: s.name,
      username: s.username,
      avatar_url: s.avatar,
      profile_image: s.avatar,
    },
    preview: s.preview || undefined,
    is_recent: s.is_recent,
    is_followed: s.is_followed,
    has_unseen: s.has_unseen ?? s.is_recent ?? true,
    stories_count: s.stories_count ?? 1,
    items: s.preview
      ? [
          {
            id: `${s.user_id}_preview`,
            image_url: s.preview.image,
            video_url: s.preview.video,
            caption: s.preview.text,
            type: s.preview.type,
            price: s.preview.price,
          },
        ]
      : [],
  }));
}

// ── Normalize full story items from /stories/{userId} ───────────
function normalizeFullItems(res: any) {
  const fullItems = Array.isArray(res) ? res : res?.items || res?.stories || [];
  return fullItems.map((item: any) => ({
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
  }));
}

// ── Component ────────────────────────────────────────────────────
export default function StoriesBar({ onStoryClick, onCreateStory }: StoriesBarProps) {
  const { user: currentUser } = useAuth() as any;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  // P-10: Contextual recipe ring — time of day + user diet preferences
  const tzOffset = new Date().getTimezoneOffset();
  const { data: featuredRecipe } = useQuery({
    queryKey: ['featured-recipe', tzOffset],
    queryFn: async () => {
      const res = await apiClient.get('/recipes/featured', {
        params: { tz_offset: tzOffset },
      });
      if (!res || !(res as any).recipe_id) return null;
      return res as any;
    },
    staleTime: 600_000,
  });

  const {
    data: storiesData,
    isLoading: loading,
    isError: error,
    refetch,
  } = useQuery({
    queryKey: ['feed-stories'],
    queryFn: async () => {
      const res = await apiClient.get('/feed/stories');
      const normalized = normalizeStories(res);
      return normalized.filter(
        (s) =>
          s.items &&
          s.items.length > 0 &&
          (s.items[0].image_url || s.items[0].video_url),
      );
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Current user's active stories (self card)
  const { data: myStories } = useQuery({
    queryKey: ['stories-mine'],
    queryFn: () => apiClient.get('/stories/mine'),
    enabled: !!currentUser,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const hasActiveStory = Array.isArray(myStories) ? myStories.length > 0 : false;
  const myPreview =
    hasActiveStory && Array.isArray(myStories) && myStories.length > 0
      ? {
          image: myStories[0].image_url || myStories[0].media_url,
          video: myStories[0].video_url,
          text: myStories[0].caption,
        }
      : undefined;
  const stories = storiesData || [];

  // Preload full story data for the first 3 users to warm the React Query cache
  const preloadedRef = useRef(false);
  useEffect(() => {
    if (preloadedRef.current || !stories?.length) return;
    preloadedRef.current = true;
    stories.slice(0, 3).forEach((s) => {
      queryClient.prefetchQuery({
        queryKey: ['user-stories', s.user_id],
        queryFn: () => apiClient.get(`/stories/${s.user_id}`),
        staleTime: 30_000,
      });
    });
  }, [stories, queryClient]);

  // Hide bar entirely when no stories and no authenticated user
  if (!loading && !error && stories.length === 0 && !currentUser) {
    return null;
  }

  // ── Click handler: fetch full items then open viewer ──────────
  const handleStoryClick = async (story: NormalizedStory) => {
    if (!onStoryClick || loadingUserId) return;
    setLoadingUserId(story.user_id);
    try {
      const res = await apiClient.get(`/stories/${story.user_id}`);
      const fullItems = normalizeFullItems(res);
      if (fullItems.length > 0) {
        const enrichedStories = stories.map((s) =>
          s.user_id === story.user_id ? { ...s, items: fullItems } : s,
        );
        const actualIdx = enrichedStories.findIndex(
          (s) => s.user_id === story.user_id,
        );
        onStoryClick(enrichedStories, actualIdx >= 0 ? actualIdx : 0);
      } else {
        const fallbackIdx = stories.findIndex(
          (s) => s.user_id === story.user_id,
        );
        onStoryClick(stories, fallbackIdx >= 0 ? fallbackIdx : 0);
      }
    } catch {
      const fallbackIdx = stories.findIndex(
        (s) => s.user_id === story.user_id,
      );
      onStoryClick(stories, fallbackIdx >= 0 ? fallbackIdx : 0);
    } finally {
      setLoadingUserId(null);
    }
  };

  // ── Self card click: view own story or create ─────────────────
  const handleSelfClick = async () => {
    if (!hasActiveStory) {
      onCreateStory?.();
      return;
    }
    if (!onStoryClick || loadingUserId) return;
    const uid = currentUser.id || currentUser.user_id;
    setLoadingUserId(uid);
    try {
      const res = await apiClient.get(`/stories/${uid}`);
      const fullItems = normalizeFullItems(res);
      if (fullItems.length > 0) {
        const selfStory = stories.find(
          (s) =>
            s.user_id === currentUser.user_id ||
            s.user_id === currentUser.id ||
            s.user_id === currentUser._id,
        );
        const storyEnvelope: NormalizedStory = selfStory ?? {
          user_id: uid,
          user: {
            id: uid,
            name:
              currentUser.name ||
              currentUser.company_name ||
              currentUser.username,
            username: currentUser.username,
            avatar_url:
              currentUser.profile_image ||
              currentUser.avatar_url ||
              currentUser.avatar,
          },
          has_unseen: true,
          stories_count: fullItems.length,
          items: [],
        };
        onStoryClick([{ ...storyEnvelope, items: fullItems }], 0);
      }
    } catch {
      onCreateStory?.();
    } finally {
      setLoadingUserId(null);
    }
  };

  // Filter out current user from feed stories (self card is rendered separately)
  const feedStories = stories.filter(
    (s) =>
      !currentUser ||
      (s.user_id !== currentUser.user_id &&
        s.user_id !== currentUser.id &&
        s.user_id !== currentUser._id),
  );

  return (
    <div
      className="scrollbar-hide flex gap-2.5 overflow-x-auto overscroll-x-contain snap-x snap-mandatory px-3 py-2"
      role="region"
      aria-label="Historias"
      tabIndex={0}
    >
      {/* Self card */}
      {currentUser && (
        <StoryCard
          user={currentUser}
          preview={myPreview}
          isSelf
          hasActiveStory={hasActiveStory}
          hasUnseen={hasActiveStory}
          storiesCount={Array.isArray(myStories) ? myStories.length : 0}
          isLoading={
            loadingUserId ===
            (currentUser.id || currentUser.user_id || 'self')
          }
          onClick={handleSelfClick}
          layoutId={`story-${currentUser.id || currentUser.user_id}`}
        />
      )}

      {/* Featured recipe card */}
      {featuredRecipe && (
        <StoryCard
          user={{
            id: 'recipe',
            name: featuredRecipe._meal_type_label || 'Receta',
            username: 'receta',
          }}
          preview={{
            image: featuredRecipe.image_url,
          }}
          hasUnseen
          storiesCount={1}
          onClick={() =>
            navigate(
              `/recipes/${featuredRecipe.recipe_id || featuredRecipe.id}`,
            )
          }
          layoutId="story-recipe"
        />
      )}

      {/* Loading skeletons */}
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[100px] w-[80px] shrink-0 snap-center animate-pulse rounded-xl bg-stone-100"
              aria-hidden="true"
            />
          ))
        : error
          ? (
            <button
              onClick={() => refetch()}
              className="flex h-[100px] w-[80px] shrink-0 snap-center cursor-pointer flex-col items-center justify-center rounded-xl border-none bg-stone-50"
              aria-label="Reintentar cargar historias"
            >
              <RefreshCw size={18} className="text-stone-400" />
              <span className="mt-1 text-[10px] text-stone-400">
                Reintentar
              </span>
            </button>
          )
          : feedStories.length === 0 && !currentUser
            ? (
              <div className="flex items-center px-2">
                <span className="text-xs text-stone-400">
                  No hay historias recientes
                </span>
              </div>
            )
            : feedStories.map((story) => (
              <StoryCard
                key={story.user_id}
                user={story.user}
                preview={story.preview}
                hasUnseen={story.has_unseen ?? true}
                storiesCount={story.stories_count || 1}
                isLoading={loadingUserId === story.user_id}
                onClick={() => handleStoryClick(story)}
                layoutId={`story-${story.user_id}`}
              />
            ))}
    </div>
  );
}
