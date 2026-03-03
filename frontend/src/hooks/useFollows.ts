import { api } from '@/lib/api';

export function useFollows() {
  return {
    toggleFollow: (userId: string) => api.toggleFollow(userId),
    getFollowers: (userId: string, limit = 20) => api.getUserFollowers(userId, { limit }),
    getFollowing: (userId: string, limit = 20) => api.getUserFollowing(userId, { limit }),
    getUserPosts: (userId: string, limit = 20) => api.getUserPosts(userId, { limit }),
  };
}
