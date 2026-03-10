import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { API_BASE_URL } from '../../../services/api/client';

export const userKeys = {
  profile: (userId) => ['user', 'profile', userId],
  posts: (userId, options = {}) => ['user', 'posts', userId, options.bookmarked ? 'bookmarked' : 'all'],
  badges: (userId) => ['user', 'badges', userId],
  products: (userId) => ['user', 'products', userId],
};

function buildFallbackProfile(userId) {
  return {
    user_id: userId,
    name: 'Usuario',
    bio: '',
    followers_count: 0,
    following_count: 0,
    posts_count: 0,
  };
}

export function resolveUserImage(url) {
  if (!url) {
    return null;
  }

  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

export function useUserProfileQuery(userId) {
  return useQuery({
    queryKey: userKeys.profile(userId),
    queryFn: async () => {
      try {
        return await apiClient.get(`/users/${userId}/profile`);
      } catch (error) {
        if (error?.status === 404) {
          return buildFallbackProfile(userId);
        }

        throw error;
      }
    },
    enabled: Boolean(userId),
  });
}

export function useUserPostsQuery(userId, options = {}) {
  return useQuery({
    queryKey: userKeys.posts(userId, options),
    queryFn: () => {
      const suffix = options.bookmarked ? '?bookmarked=true' : '';
      return apiClient.get(`/users/${userId}/posts${suffix}`);
    },
    enabled: Boolean(userId) && (options.enabled ?? true),
  });
}

export function useUserBadgesQuery(userId, options = {}) {
  return useQuery({
    queryKey: userKeys.badges(userId),
    queryFn: () => apiClient.get(`/users/${userId}/badges`),
    enabled: Boolean(userId) && (options.enabled ?? true),
  });
}

export function useUserProductsQuery(userId, options = {}) {
  return useQuery({
    queryKey: userKeys.products(userId),
    queryFn: async () => {
      const data = await apiClient.get(`/products?seller_id=${userId}`);
      return data?.products || data || [];
    },
    enabled: Boolean(userId) && (options.enabled ?? true),
  });
}

export function useToggleUserFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isFollowing }) =>
      isFollowing
        ? apiClient.delete(`/users/${userId}/follow`)
        : apiClient.post(`/users/${userId}/follow`, {}),
    onSuccess: (_data, { userId, isFollowing }) => {
      queryClient.setQueryData(userKeys.profile(userId), (current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          is_following: !isFollowing,
          followers_count: Math.max(0, (current.followers_count || 0) + (isFollowing ? -1 : 1)),
        };
      });
    },
  });
}

export function useUploadUserAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('/users/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (data, { userId }) => {
      queryClient.setQueryData(userKeys.profile(userId), (current) =>
        current
          ? {
              ...current,
              profile_image: data?.image_url || current.profile_image,
            }
          : current,
      );
    },
  });
}

export function useCreateUserPostMutation(userId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, caption }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption);
      return apiClient.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (newPost) => {
      queryClient.setQueryData(userKeys.posts(userId), (current) =>
        Array.isArray(current) ? [newPost, ...current] : [newPost],
      );
      queryClient.setQueryData(userKeys.profile(userId), (current) =>
        current
          ? {
              ...current,
              posts_count: (current.posts_count || 0) + 1,
            }
          : current,
      );
    },
  });
}

export function useCheckUserBadgesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => apiClient.post(`/users/${userId}/badges/check`, {}),
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: userKeys.badges(userId) });
    },
  });
}
