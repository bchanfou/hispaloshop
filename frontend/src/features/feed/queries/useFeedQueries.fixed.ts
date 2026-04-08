import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';
import { toast } from 'sonner';

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
  if (!item || typeof item !== 'object') {
    console.warn('[feed] Invalid item:', item);
    return null as any;
  }
  
  const normalizedId = item?.id || item?.post_id || item?._id || null;
  if (!normalizedId) {
    console.warn('[feed] Item without ID:', item);
  }
  
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
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('[feed] Raw response:', { 
      hasData: !!data, 
      keys: data ? Object.keys(data) : [],
      itemsLength: data?.items?.length,
      postsLength: data?.posts?.length 
    });
  }

  const rawItems: any[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.posts)
      ? data.posts
      : Array.isArray(data?.data?.posts)
        ? data.data.posts
        : [];
        
  if (rawItems.length === 0) {
    console.warn('[feed] No items found in response:', data);
  }
        
  const normalized = rawItems.map(normalizeFeedItem).filter((post) => Boolean(post?.id));
  
  if (normalized.length === 0 && rawItems.length > 0) {
    console.warn('[feed] All items filtered out. Raw items:', rawItems.length);
  }
  
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[feed] Fetching:', primaryEndpoint, { pageParam, limit });
    }
    
    const data = await apiClient.get(primaryEndpoint, {
      params: {
        cursor: pageParam,
        limit,
      },
    });
    
    const normalized = normalizeFeedPage(data, pageParam ?? null, limit);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[feed] Normalized:', { 
        itemsCount: normalized.items.length, 
        hasMore: normalized.hasMore 
      });
    }
    
    return normalized;
  } catch (primaryError: any) {
    console.error('[feed] Primary endpoint failed:', primaryEndpoint, primaryError?.message);
    
    // Don't use fallbacks that return empty data - let the error propagate
    throw primaryError;
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
    retry: 2,
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
    retry: 2,
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
    retry: 2,
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId }: LikePostVariables) => {
      return apiClient.post(`/posts/${postId}/like`, {});
    },
    onMutate: async ({ postId, liked }: LikePostVariables) => {
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const previousFeedData = queryClient.getQueriesData<any>({ queryKey: ['feed'] });

      const applyLikeUpdate = (old: any) => {
        if (!old || !Array.isArray(old?.pages)) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => {
            if (!page || !Array.isArray(page?.items)) return page;
            return {
              ...page,
              items: page.items.map((item: any) => {
                if (!item) return item;
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
            };
          }),
        };
      };

      queryClient.setQueriesData<any>({ queryKey: ['feed'] }, applyLikeUpdate);
      return { previousFeedData };
    },
    onError: (_error: any, _variables: LikePostVariables, context: any) => {
      if (context?.previousFeedData) {
        for (const [queryKey, queryData] of context.previousFeedData) {
          queryClient.setQueryData(queryKey, queryData);
        }
      }
      toast.error('No se pudo procesar el like');
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
      return apiClient.post(`/posts/${postId}/save`, {});
    },
    onMutate: async ({ postId, saved }: SavePostVariables) => {
      const previousFeedData = queryClient.getQueriesData<any>({ queryKey: ['feed'] });

      const applySaveUpdate = (old: any) => {
        if (!old || !Array.isArray(old?.pages)) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => {
            if (!page || !Array.isArray(page?.items)) return page;
            return {
              ...page,
              items: page.items.map((item: any) => {
                if (!item) return item;
                if (
                  String(item.id) === String(postId)
                  || String(item.post_id) === String(postId)
                  || String(item.postId) === String(postId)
                ) {
                  return { ...item, saved: !saved, is_saved: !saved };
                }
                return item;
              }),
            };
          }),
        };
      };

      queryClient.setQueriesData<any>({ queryKey: ['feed'] }, applySaveUpdate);
      return { previousFeedData };
    },
    onError: (_error: any, _variables: SavePostVariables, context: any) => {
      if (context?.previousFeedData) {
        for (const [queryKey, queryData] of context.previousFeedData) {
          queryClient.setQueryData(queryKey, queryData);
        }
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
