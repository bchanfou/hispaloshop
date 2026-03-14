/**
 * @deprecated Legacy SWR feed hooks.
 * Prefer `features/feed/queries` for React Query-based fetching.
 */

import useSWR from 'swr';
import apiClient from '../services/api/client';

function buildFeedParams(params = {}) {
  const qp = new URLSearchParams();
  if (params.cursor) qp.set('skip', params.cursor);
  if (params.limit) qp.set('limit', params.limit);
  if (params.source === 'following') qp.set('scope', 'following');
  const qs = qp.toString();
  return qs ? `?${qs}` : '';
}

// Hook para obtener feed social
export function useFeed(params) {
  const { data, error, isLoading } = useSWR(
    ['feed', params],
    () => apiClient.get(`/feed${buildFeedParams(params)}`),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    posts: data?.items || [],
    nextCursor: data?.next_cursor,
    hasMore: Boolean(data?.has_more),
    isLoading,
    error,
  };
}

// Hook para obtener feed de usuarios seguidos
export function useFollowingFeed(cursor) {
  const { data, error, isLoading } = useSWR(
    ['feed-following', cursor],
    () => apiClient.get(`/feed${buildFeedParams({ source: 'following', cursor })}`),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    posts: data?.items || [],
    nextCursor: data?.next_cursor,
    hasMore: Boolean(data?.has_more),
    isLoading,
    error,
  };
}

// Hook para trending
export function useTrendingFeed() {
  const { data, error, isLoading } = useSWR(
    'feed-trending',
    () => apiClient.get('/feed/trending'),
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
