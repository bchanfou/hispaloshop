import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient, { API_BASE_URL } from '../../../services/api/client';

interface UserProfile {
  user_id: string;
  name: string;
  bio: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following?: boolean;
  follow_request_pending?: boolean;
  profile_image?: string;
  [key: string]: any;
}

interface UserQueryOptions {
  bookmarked?: boolean;
  enabled?: boolean;
}

interface ToggleFollowVariables {
  userId: string;
  isFollowing: boolean;
}

interface UploadAvatarVariables {
  file: File;
  userId: string;
}

interface CreatePostVariables {
  file: File;
  caption: string;
}

export const userKeys = {
  profile: (userId: string) => ['user', 'profile', userId] as const,
  posts: (userId: string, options: UserQueryOptions = {}) => ['user', 'posts', userId, options.bookmarked ? 'bookmarked' : 'all'] as const,
  badges: (userId: string) => ['user', 'badges', userId] as const,
  products: (userId: string) => ['user', 'products', userId] as const,
  recipes: (userId: string) => ['user', 'recipes', userId] as const,
  highlights: (userId: string) => ['user', 'highlights', userId] as const,
};

function buildFallbackProfile(userId: string): UserProfile {
  return {
    user_id: userId,
    name: 'Usuario',
    bio: '',
    followers_count: 0,
    following_count: 0,
    posts_count: 0,
  };
}

function normalizeProfileResponse(data: any, userId: string): UserProfile {
  const profile =
    data?.profile ??
    data?.data?.profile ??
    data?.data ??
    data;

  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return null as any;
  }

  return {
    ...buildFallbackProfile(userId),
    ...profile,
    user_id: profile.user_id || profile.id || userId,
  };
}

function normalizeListResponse(data: any, candidates: string[] = []): any[] {
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

export function resolveUserImage(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

export function useUserProfileQuery(userId: string) {
  const normalizedUserId = String(userId || '').trim();
  const hasValidUserId = Boolean(
    normalizedUserId && normalizedUserId !== 'undefined' && normalizedUserId !== 'null'
  );

  return useQuery({
    queryKey: userKeys.profile(normalizedUserId || userId),
    queryFn: async (): Promise<UserProfile | null> => {
      if (!hasValidUserId) {
        return null;
      }

      try {
        const data = await apiClient.get(`/users/${normalizedUserId}/profile`);
        return normalizeProfileResponse(data, normalizedUserId);
      } catch (error: any) {
        if (error?.status === 404) {
          try {
            const me = await apiClient.get('/auth/me');
            const myId = me?.user_id || me?.id;
            const myUsername = me?.username;
            if (
              myId && (String(myId) === normalizedUserId || String(myUsername || '').toLowerCase() === normalizedUserId.toLowerCase())
            ) {
              return normalizeProfileResponse(me, normalizedUserId);
            }
          } catch {
            // Keep null fallback for true not-found users.
          }
          return null;
        }

        throw error;
      }
    },
    enabled: hasValidUserId,
  });
}

export function useUserPostsQuery(userId: string, options: UserQueryOptions = {}) {
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

export function useUserBadgesQuery(userId: string, options: UserQueryOptions = {}) {
  return useQuery({
    queryKey: userKeys.badges(userId),
    queryFn: () => apiClient.get(`/users/${userId}/badges`),
    enabled: Boolean(userId) && (options.enabled ?? true),
  });
}

export function useUserProductsQuery(userId: string, options: UserQueryOptions = {}) {
  return useQuery({
    queryKey: userKeys.products(userId),
    queryFn: async () => {
      const data = await apiClient.get(`/products?seller_id=${userId}`);
      return normalizeListResponse(data, ['products', 'items']);
    },
    enabled: Boolean(userId) && (options.enabled ?? true),
  });
}

export function useUserRecipesQuery(userId: string, options: UserQueryOptions = {}) {
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
    mutationFn: ({ userId, isFollowing }: ToggleFollowVariables) =>
      isFollowing
        ? apiClient.delete(`/users/${userId}/follow`)
        : apiClient.post(`/users/${userId}/follow`, {}),
    onSuccess: (data: any, { userId, isFollowing }: ToggleFollowVariables) => {
      queryClient.setQueryData(userKeys.profile(userId), (current: any) => {
        if (!current) {
          return current;
        }

        // Private accounts: backend returns {status: "pending"}
        if (!isFollowing && data?.status === 'pending') {
          return {
            ...current,
            follow_request_pending: true,
          };
        }

        return {
          ...current,
          is_following: !isFollowing,
          follow_request_pending: false,
          followers_count: Math.max(0, (current.followers_count || 0) + (isFollowing ? -1 : 1)),
        };
      });
      // Invalidate following feed so Home 'Siguiendo' tab updates
      queryClient.invalidateQueries({ queryKey: ["feed", "following"] });
    },
  });
}

export function useUploadUserAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file }: UploadAvatarVariables) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiClient.post('/users/upload-avatar', formData);
    },
    onSuccess: (data: any, { userId }: UploadAvatarVariables) => {
      queryClient.setQueryData(userKeys.profile(userId), (current: any) =>
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

export function useCreateUserPostMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, caption }: CreatePostVariables) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caption', caption);
      return apiClient.post('/posts', formData);
    },
    onSuccess: (newPost: any) => {
      queryClient.setQueryData(userKeys.posts(userId), (current: any) =>
        Array.isArray(current) ? [newPost, ...current] : [newPost],
      );
      queryClient.setQueryData(userKeys.profile(userId), (current: any) =>
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
    mutationFn: (userId: string) => apiClient.post(`/users/${userId}/badges/check`, {}),
    onSuccess: (_data: any, userId: string) => {
      queryClient.invalidateQueries({ queryKey: userKeys.badges(userId) });
    },
  });
}

export function useUserHighlightsQuery(userId: string) {
  return useQuery({
    queryKey: userKeys.highlights(userId),
    queryFn: async () => {
      const data = await apiClient.get(`/users/${userId}/highlights`);
      return normalizeListResponse(data, ['highlights', 'items']);
    },
    enabled: Boolean(userId),
  });
}
