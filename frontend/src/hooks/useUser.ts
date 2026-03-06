import useSWR from 'swr';
import { api } from '@/lib/api';
import { useCallback } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  bio?: string;
  role: 'customer' | 'producer' | 'influencer' | 'admin' | 'importer';
  avatar_url?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_verified?: boolean;
}

export interface UserPost {
  id: string;
  user_id: string;
  caption: string;
  image_url: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

// Hook para obtener perfil de usuario
export function useUser(userId: string) {
  const { data, error, isLoading } = useSWR(
    userId ? ['user', userId] : null,
    () => api.getUserProfile(userId),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    user: data,
    isLoading,
    error,
  };
}

// Hook para obtener posts de usuario
export function useUserPosts(userId: string) {
  const { data, error, isLoading } = useSWR(
    userId ? ['user-posts', userId] : null,
    () => api.getUserPosts(userId),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    posts: data?.posts || [],
    isLoading,
    error,
  };
}

// Hook para actualizar perfil
export function useUpdateProfile() {
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const response = await api.updateMe(data);
    return response;
  }, []);

  return { updateProfile };
}
