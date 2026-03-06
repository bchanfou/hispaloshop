import useSWR from 'swr';
import { api } from '@/lib/api';

export interface FeedPost {
  id: string;
  user_id: string;
  user_name: string;
  user_profile_image?: string;
  caption: string;
  image_url: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked?: boolean;
  is_bookmarked?: boolean;
}

// Hook para obtener feed social
export function useFeed(params?: { category?: string; cursor?: string }) {
  const queryString = new URLSearchParams();
  if (params?.category) queryString.append('category', params.category);
  if (params?.cursor) queryString.append('cursor', params.cursor);

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
export function useFollowingFeed(cursor?: string) {
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
