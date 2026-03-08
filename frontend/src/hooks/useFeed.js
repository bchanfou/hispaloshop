import useSWR from 'swr';
import { api } from '../lib/api';

// Hook para obtener feed social
export function useFeed(params) {
  const { data, error, isLoading } = useSWR(
    ['feed', params],
    () => api.getFeed(params),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    posts: data?.items || [],
    nextCursor: data?.next_cursor,
    hasMore: data?.has_more,
    isLoading,
    error,
  };
}

// Hook para obtener feed de usuarios seguidos
export function useFollowingFeed(cursor) {
  const { data, error, isLoading } = useSWR(
    ['feed-following', cursor],
    () => api.getFeed({ source: 'following', cursor }),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    posts: data?.items || [],
    nextCursor: data?.next_cursor,
    hasMore: data?.has_more,
    isLoading,
    error,
  };
}

// Hook para trending
export function useTrendingFeed() {
  const { data, error, isLoading } = useSWR(
    'feed-trending',
    () => api.getTrendingFeed(),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    posts: data?.items || [],
    isLoading,
    error,
  };
}
