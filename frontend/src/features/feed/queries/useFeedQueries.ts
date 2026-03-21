import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

interface FeedMediaItem {
  url: string;
  ratio?: string;
}

interface NormalizedFeedItem {
  id: string | null;
  post_id: string | null;
  user_id: string | null;
  user_name: string;
  user_profile_image: string | null;
  user_verified: boolean;
  caption: string;
  image_url: string | null;
  media: FeedMediaItem[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_liked: boolean;
  liked: boolean;
  product_tag: any;
  type: string | null;
  created_at: string | null;
  [key: string]: any;
}

interface NormalizedFeedPage {
  items: NormalizedFeedItem[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  limit: number;
  [key: string]: any;
}

interface FetchFeedPageParams {
  source?: string;
  categorySlug?: string;
  pageParam?: string | null;
  limit?: number;
}

interface LikePostVariables {
  postId: string;
  liked: boolean;
}

interface SavePostVariables {
  postId: string;
  saved: boolean;
}

interface FollowUserVariables {
  userId: string;
  following: boolean;
}

export const feedKeys = {
  following: ['feed', 'following'] as const,
  forYou: ['feed', 'foryou'] as const,
  category: (slug: string) => ['feed', 'category', slug] as const,
};

function normalizeFeedItem(item: any): NormalizedFeedItem {
  const normalizedId = item?.id || item?.post_id || item?._id || null;
  const media: FeedMediaItem[] = Array.isArray(item?.media)
    ? item.media
    : (item?.image_url || item?.thumbnail ? [{ url: item?.image_url || item?.thumbnail, ratio: '1:1' }] : []);

  return {
    ...item,
    id: normalizedId,
    post_id: item?.post_id || normalizedId,
    user_id: item?.user_id || item?.author_id || item?.user?.id || null,
    user_name: item?.user_name || item?.author_name || item?.user?.name || 'Usuario',
    user_profile_image: item?.user_profile_image || item?.author_avatar || item?.user?.avatar || null,
    user_verified: item?.user_verified ?? item?.user?.verified ?? false,
    caption: item?.caption || item?.content || '',
    image_url: item?.image_url || item?.thumbnail || media?.[0]?.url || null,
    media,
    likes_count: item?.likes_count ?? item?.likes ?? 0,
    comments_count: item?.comments_count ?? item?.comments ?? 0,
    shares_count: item?.shares_count ?? item?.shares ?? 0,
    is_liked: item?.is_liked ?? item?.liked ?? false,
    liked: item?.liked ?? item?.is_liked ?? false,
    product_tag: item?.product_tag || item?.productTag || item?.tagged_product || null,
    type: item?.type || item?.post_type || null,
    created_at: item?.created_at || item?.timestamp || null,
  };
}

function normalizeFeedPage(data: any, pageParam: string | null, limit: number = 20): NormalizedFeedPage {
  const rawItems: any[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.posts)
      ? data.posts
      : Array.isArray(data?.data?.posts)
        ? data.data.posts
        : [];
  const normalized = rawItems.map(normalizeFeedItem).filter((post) => Boolean(post.id));
  // Deduplicate within a single page response
  const seenIds = new Set<string>();
  const items = normalized.filter((post) => {
    const key = String(post.id);
    if (seenIds.has(key)) return false;
    seenIds.add(key);
    return true;
  });

  const hasMore = Boolean(
    data?.has_more ??
      data?.hasMore ??
      data?.data?.meta?.has_more ??
      data?.next_cursor ??
      data?.nextCursor,
  );

  return {
    ...data,
    items,
    nextCursor:
      data?.nextCursor ??
      data?.next_cursor ??
      (hasMore ? String(items.length + Number(pageParam || 0)) : null),
    prevCursor: data?.prevCursor ?? data?.prev_cursor ?? null,
    hasMore,
    limit,
  };
}

async function fetchFeedPage({ source, categorySlug, pageParam = null, limit = 20 }: FetchFeedPageParams): Promise<NormalizedFeedPage> {
  const primaryEndpoint =
    source === 'following'
      ? '/feed/following'
      : categorySlug
        ? `/feed/category/${categorySlug}`
        : '/feed/foryou';

  try {
    const data = await apiClient.get(primaryEndpoint, {
      params: {
        cursor: pageParam,
        limit,
      },
    });
    return normalizeFeedPage(data, pageParam ?? null, limit);
  } catch (primaryError) {
    if (!categorySlug) {
      try {
        const legacyScope = source === 'following' ? 'following' : 'hybrid';
        const legacyData = await apiClient.get('/feed', {
          params: {
            ...(pageParam ? { skip: pageParam } : {}),
            limit,
            scope: legacyScope,
          },
        });
        return normalizeFeedPage(legacyData, pageParam ?? null, limit);
      } catch (legacyError) {
        console.warn('[feed] /feed fallback failed', legacyError);
      }

      try {
        const page = Math.floor(Number(pageParam || 0) / limit) + 1;
        const type = source === 'following' ? 'following' : 'for_you';
        const modularData = await apiClient.get('/posts/feed', {
          params: { type, page, limit },
        });
        return normalizeFeedPage(modularData, pageParam ?? null, limit);
      } catch (modularError) {
        console.warn('[feed] /posts/feed fallback failed', modularError);
      }
    }

    console.error('[feed] all feed fallbacks failed', primaryError);
    return normalizeFeedPage(
      {
        items: [],
        has_more: false,
        next_cursor: null,
      },
      pageParam ?? null,
      limit,
    );
  }
}

export function useFollowingFeed() {
  return useInfiniteQuery({
    queryKey: feedKeys.following,
    queryFn: ({ pageParam = null }: { pageParam: string | null }) =>
      fetchFeedPage({ source: 'following', pageParam, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: NormalizedFeedPage) => lastPage?.nextCursor ?? null,
    getPreviousPageParam: (firstPage: NormalizedFeedPage) => firstPage?.prevCursor ?? null,
    staleTime: 2 * 60 * 1000,
  });
}

export function useForYouFeed() {
  return useInfiniteQuery({
    queryKey: feedKeys.forYou,
    queryFn: ({ pageParam = null }: { pageParam: string | null }) =>
      fetchFeedPage({ source: 'for_you', pageParam, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: NormalizedFeedPage) => lastPage?.nextCursor ?? null,
    getPreviousPageParam: (firstPage: NormalizedFeedPage) => firstPage?.prevCursor ?? null,
    staleTime: 3 * 60 * 1000,
  });
}

export function useCategoryFeed(categorySlug: string) {
  return useInfiniteQuery({
    queryKey: feedKeys.category(categorySlug),
    queryFn: ({ pageParam = null }: { pageParam: string | null }) =>
      fetchFeedPage({ categorySlug, pageParam, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: NormalizedFeedPage) => lastPage?.nextCursor ?? null,
    enabled: Boolean(categorySlug),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId }: LikePostVariables) => {
      // Legacy backend toggles like status via POST /posts/{id}/like.
      return apiClient.post(`/posts/${postId}/like`, {});
    },
    onMutate: async ({ postId, liked }: LikePostVariables) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });

      const previousForYou = queryClient.getQueryData(feedKeys.forYou);
      const previousFollowing = queryClient.getQueryData(feedKeys.following);

      const applyLikeUpdate = (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: any) => {
              if (
                String(item.id) === String(postId)
                || String(item.post_id) === String(postId)
                || String(item.postId) === String(postId)
              ) {
                return {
                  ...item,
                  liked: !liked,
                  is_liked: !liked,
                  likes: (item.likes || 0) + (liked ? -1 : 1),
                  likes_count: (item.likes_count || 0) + (liked ? -1 : 1),
                };
              }
              return item;
            }),
          })),
        };
      };

      queryClient.setQueryData(feedKeys.forYou, applyLikeUpdate);
      queryClient.setQueryData(feedKeys.following, applyLikeUpdate);

      return { previousForYou, previousFollowing };
    },
    onError: (_error: any, _variables: LikePostVariables, context: any) => {
      if (context?.previousForYou) {
        queryClient.setQueryData(feedKeys.forYou, context.previousForYou);
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(feedKeys.following, context.previousFollowing);
      }
    },
    onSettled: (_data: any, _error: any, variables: LikePostVariables) => {
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
    },
  });
}

export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId }: SavePostVariables) => {
      // Legacy backend exposes save/bookmark routes without explicit unsave endpoint.
      return apiClient.post(`/posts/${postId}/save`, {});
    },
    onMutate: async ({ postId, saved }: SavePostVariables) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      const previousForYou = queryClient.getQueryData(feedKeys.forYou);
      const previousFollowing = queryClient.getQueryData(feedKeys.following);

      const applySaveUpdate = (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((item: any) => {
              if (
                String(item.id) === String(postId)
                || String(item.post_id) === String(postId)
                || String(item.postId) === String(postId)
              ) {
                return { ...item, saved: !saved };
              }
              return item;
            }),
          })),
        };
      };

      queryClient.setQueryData(feedKeys.forYou, applySaveUpdate);
      queryClient.setQueryData(feedKeys.following, applySaveUpdate);

      return { previousForYou, previousFollowing };
    },
    onError: (_error: any, _variables: SavePostVariables, context: any) => {
      if (context?.previousForYou) {
        queryClient.setQueryData(feedKeys.forYou, context.previousForYou);
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(feedKeys.following, context.previousFollowing);
      }
    },
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, following }: FollowUserVariables) =>
      following
        ? apiClient.delete(`/users/${userId}/follow`)
        : apiClient.post(`/users/${userId}/follow`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
