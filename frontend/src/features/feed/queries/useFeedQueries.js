import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const feedKeys = {
  following: ['feed', 'following'],
  forYou: ['feed', 'foryou'],
  category: (slug) => ['feed', 'category', slug],
};

function normalizeFeedItem(item) {
  const normalizedId = item?.id || item?.post_id || item?._id || null;
  const media = Array.isArray(item?.media)
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

function normalizeFeedPage(data, pageParam, limit = 20) {
  const rawItems = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.posts)
      ? data.posts
      : Array.isArray(data?.data?.posts)
        ? data.data.posts
        : [];
  const items = rawItems.map(normalizeFeedItem).filter((post) => Boolean(post.id));

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

async function fetchFeedPage({ source, categorySlug, pageParam = null, limit = 20 }) {
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
    return normalizeFeedPage(data, pageParam, limit);
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
        return normalizeFeedPage(legacyData, pageParam, limit);
      } catch (legacyError) {
        console.warn('[feed] /feed fallback failed', legacyError);
      }

      try {
        const page = Math.floor(Number(pageParam || 0) / limit) + 1;
        const type = source === 'following' ? 'following' : 'for_you';
        const modularData = await apiClient.get('/posts/feed', {
          params: { type, page, limit },
        });
        return normalizeFeedPage(modularData, pageParam, limit);
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
      pageParam,
      limit,
    );
  }
}

export function useFollowingFeed() {
  return useInfiniteQuery({
    queryKey: feedKeys.following,
    queryFn: ({ pageParam = null }) =>
      fetchFeedPage({ source: 'following', pageParam, limit: 20 }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
    getPreviousPageParam: (firstPage) => firstPage?.prevCursor ?? null,
    staleTime: 2 * 60 * 1000,
  });
}

export function useForYouFeed() {
  return useInfiniteQuery({
    queryKey: feedKeys.forYou,
    queryFn: ({ pageParam = null }) =>
      fetchFeedPage({ source: 'for_you', pageParam, limit: 20 }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
    getPreviousPageParam: (firstPage) => firstPage?.prevCursor ?? null,
    staleTime: 3 * 60 * 1000,
  });
}

export function useCategoryFeed(categorySlug) {
  return useInfiniteQuery({
    queryKey: feedKeys.category(categorySlug),
    queryFn: ({ pageParam = null }) =>
      fetchFeedPage({ categorySlug, pageParam, limit: 20 }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? null,
    enabled: Boolean(categorySlug),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, liked }) =>
      apiClient.post(`/posts/${postId}/${liked ? 'unlike' : 'like'}`, {}),
    onMutate: async ({ postId, liked }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });

      const previousForYou = queryClient.getQueryData(feedKeys.forYou);
      const previousFollowing = queryClient.getQueryData(feedKeys.following);

      const applyLikeUpdate = (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
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
    onError: (error, variables, context) => {
      if (context?.previousForYou) {
        queryClient.setQueryData(feedKeys.forYou, context.previousForYou);
      }
      if (context?.previousFollowing) {
        queryClient.setQueryData(feedKeys.following, context.previousFollowing);
      }
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
    },
  });
}

export function useSavePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, saved }) =>
      apiClient.post(`/posts/${postId}/${saved ? 'unsave' : 'save'}`, {}),
    onMutate: async ({ postId, saved }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      const previousFeed = queryClient.getQueryData(feedKeys.forYou);

      queryClient.setQueryData(feedKeys.forYou, (old) => {
        if (!old) {
          return old;
        }

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
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
      });

      return { previousFeed };
    },
    onError: (error, variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(feedKeys.forYou, context.previousFeed);
      }
    },
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, following }) =>
      apiClient.post(`/users/${userId}/${following ? 'unfollow' : 'follow'}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
