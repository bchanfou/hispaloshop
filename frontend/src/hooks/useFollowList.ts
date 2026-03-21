import { useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../services/api/client';

interface FollowListPage {
  users: any[];
  page: number;
  [key: string]: any;
}

export function useFollowers(userId: string, search?: string) {
  return useInfiniteQuery({
    queryKey: ['followers', userId, search],
    queryFn: ({ pageParam }: { pageParam: any }) =>
      apiClient.get(
        `/users/${userId}/followers?page=${pageParam}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ) as Promise<FollowListPage>,
    initialPageParam: 1 as any,
    getNextPageParam: (last: FollowListPage) =>
      last.users.length === 20 ? last.page + 1 : undefined,
    enabled: Boolean(userId),
  });
}

export function useFollowing(userId: string, search?: string) {
  return useInfiniteQuery({
    queryKey: ['following', userId, search],
    queryFn: ({ pageParam }: { pageParam: any }) =>
      apiClient.get(
        `/users/${userId}/following?page=${pageParam}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ) as Promise<FollowListPage>,
    initialPageParam: 1 as any,
    getNextPageParam: (last: FollowListPage) =>
      last.users.length === 20 ? last.page + 1 : undefined,
    enabled: Boolean(userId),
  });
}
