import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { API_BASE_URL } from '../../../services/api/client';

export const userKeys = {
  profile: (userId) => ['user', 'profile', userId],
  posts: (userId, options = {}) => ['user', 'posts', userId, options.bookmarked ? 'bookmarked' : 'all'],
  badges: (userId) => ['user', 'badges', userId],
  products: (userId) => ['user', 'products', userId],
  recipes: (userId) => ['user', 'recipes', userId],
  highlights: (userId) => ['user', 'highlights', userId],
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

function normalizeProfileResponse(data, userId) {
  const profile =
    data?.profile ??
    data?.data?.profile ??
    data?.data ??
    data;

  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return buildFallbackProfile(userId);
  }

  return {
    ...buildFallbackProfile(userId),
    ...profile,
    user_id: profile.user_id || profile.id || userId,
  };
}

function normalizeListResponse(data, candidates = []) {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of candidates) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
    if (Array.isArray(data?.data?.[key])) {
      return data.data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

export function resolveUserImage(url) {
  if (!url) {
    return null;
  }

  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

export function useUserProfileQuery(userId) {
  return useQuery({
    queryKey: userKeys.profile(userId),
    queryFn: async () => {
      try {
        const data = await apiClient.get(`/users/${userId}/profile`);
        return normalizeProfileResponse(data, userId);
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
    queryFn: async () => {
      const suffix = options.bookmarked ? '?bookmarked=true' : '';
      const data = await apiClient.get(`/users/${userId}/posts${suffix}`);
      return normalizeListResponse(data, ['posts', 'items']);
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
      return normalizeListResponse(data, ['products', 'items']);
    },
    enabled: Boolean(userId) && (options.enabled ?? true),
  });
}

export function useUserRecipesQuery(userId, options = {}) {
  return useQuery({
    queryKey: userKeys.recipes(userId),
    queryFn: async () => {
      const data = await apiClient.get(`/users/${userId}/recipes`);
      return normalizeListResponse(data, ['recipes', 'items']);
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

export function useUserHighlightsQuery(userId) {
  return useQuery({
    queryKey: userKeys.highlights(userId),
    queryFn: async () => {
      const data = await apiClient.get(`/users/${userId}/highlights`);
      return normalizeListResponse(data, ['highlights', 'items']);
    },
    enabled: Boolean(userId),
  });
}
