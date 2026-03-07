/**
 * Hook del Feed
 * Feed Following, For You y por categoría con infinite scroll
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { optimisticUpdate, rollbackQuery } from '../../lib/queryClient';

const FEED_KEYS = {
  following: ['feed', 'following'],
  foryou: ['feed', 'foryou'],
  category: (slug) => ['feed', 'category', slug],
};

/**
 * Hook para feed Following
 */
export function useFollowingFeed() {
  return useInfiniteQuery({
    queryKey: FEED_KEYS.following,
    queryFn: ({ pageParam }) => 
      api.get('/feed/following', { cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (firstPage) => firstPage.prevCursor,
    staleTime: 2 * 60 * 1000, // 2 min
  });
}

/**
 * Hook para feed For You (algoritmo HI AI)
 */
export function useForYouFeed() {
  return useInfiniteQuery({
    queryKey: FEED_KEYS.foryou,
    queryFn: ({ pageParam }) => 
      api.get('/feed/foryou', { cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    getPreviousPageParam: (firstPage) => firstPage.prevCursor,
    staleTime: 3 * 60 * 1000, // 3 min
  });
}

/**
 * Hook para feed por categoría
 */
export function useCategoryFeed(categorySlug) {
  return useInfiniteQuery({
    queryKey: FEED_KEYS.category(categorySlug),
    queryFn: ({ pageParam }) => 
      api.get(`/feed/category/${categorySlug}`, { 
        cursor: pageParam, 
        limit: 20 
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!categorySlug,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Hook para like/unlike de posts
 */
export function useLikePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, liked }) => 
      api.post(`/posts/${postId}/${liked ? 'unlike' : 'like'}`),
    
    // Optimistic update
    onMutate: async ({ postId, liked }) => {
      // Cancelar queries en vuelo
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      
      // Snapshot del estado anterior
      const previousFeed = queryClient.getQueryData(['feed', 'foryou']);
      
      // Actualizar optimistamente
      queryClient.setQueryData(['feed', 'foryou'], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            items: page.items.map(item => {
              if (item.id === postId || item.postId === postId) {
                return {
                  ...item,
                  liked: !liked,
                  likes: (item.likes || 0) + (liked ? -1 : 1),
                };
              }
              return item;
            }),
          })),
        };
      });
      
      return { previousFeed };
    },
    
    // Rollback en error
    onError: (err, variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['feed', 'foryou'], context.previousFeed);
      }
    },
    
    // Refetch en background
    onSettled: (data, error, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

/**
 * Hook para guardar/quitar post
 */
export function useSavePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, saved }) => 
      api.post(`/posts/${postId}/${saved ? 'unsave' : 'save'}`),
    
    onMutate: async ({ postId, saved }) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      
      const previousFeed = queryClient.getQueryData(['feed', 'foryou']);
      
      queryClient.setQueryData(['feed', 'foryou'], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            items: page.items.map(item => {
              if (item.id === postId) {
                return { ...item, saved: !saved };
              }
              return item;
            }),
          })),
        };
      });
      
      return { previousFeed };
    },
    
    onError: (err, variables, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(['feed', 'foryou'], context.previousFeed);
      }
    },
  });
}

/**
 * Hook para seguir/dejar de seguir usuario
 */
export function useFollowUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, following }) => 
      api.post(`/users/${userId}/${following ? 'unfollow' : 'follow'}`),
    
    onSuccess: () => {
      // Invalidar feed para actualizar relaciones
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
