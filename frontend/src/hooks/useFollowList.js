import { useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '../services/api/client';

export function useFollowers(userId, search) {
  return useInfiniteQuery({
    queryKey: ['followers', userId, search],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get(
        `/users/${userId}/followers?page=${pageParam}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
    getNextPageParam: (last) =>
      last.users.length === 20 ? last.page + 1 : undefined,
    enabled: Boolean(userId),
  });
}

export function useFollowing(userId, search) {
  return useInfiniteQuery({
    queryKey: ['following', userId, search],
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get(
        `/users/${userId}/following?page=${pageParam}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      ),
    getNextPageParam: (last) =>
      last.users.length === 20 ? last.page + 1 : undefined,
    enabled: Boolean(userId),
  });
}
