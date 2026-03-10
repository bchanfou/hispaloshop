import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

export const feedKeys = {
  following: ['feed', 'following'],
  forYou: ['feed', 'foryou'],
  category: (slug) => ['feed', 'category', slug],
};

function normalizeFeedPage(data, pageParam, limit = 20) {
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.posts)
      ? data.posts
      : Array.isArray(data?.data?.posts)
        ? data.data.posts
        : [];

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

    throw primaryError;
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
              if (item.id === postId || item.postId === postId) {
                return {
                  ...item,
                  liked: !liked,
                  likes: (item.likes || 0) + (liked ? -1 : 1),
                };
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
              if (item.id === postId) {
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
