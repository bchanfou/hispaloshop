import useSWR from 'swr';
import { api } from '@/lib/api';

export function useFeed(params?: { cursor?: string; limit?: number; source?: string }) {
  const { data, error, isLoading, mutate } = useSWR(['/posts', params], ([, query]) => api.getFeed(query), {
    revalidateOnFocus: false,
  });

  return {
    feed: data?.items || [],
    nextCursor: data?.next_cursor,
    hasMore: data?.has_more || false,
    isLoading,
    error,
    refresh: mutate,
  };
}
