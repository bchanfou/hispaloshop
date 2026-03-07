/**
 * Hooks para Posts, Reels y Stories
 * CRUD, comentarios, interacciones
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

const POST_KEYS = {
  detail: (id) => ['post', id],
  comments: (id) => ['post', id, 'comments'],
  reels: ['reels'],
  stories: ['stories'],
  userStories: (userId) => ['stories', 'user', userId],
};

// ==========================================
// POSTS
// ==========================================

/**
 * Hook para detalle de post
 */
export function usePost(postId) {
  return useQuery({
    queryKey: POST_KEYS.detail(postId),
    queryFn: () => api.get(`/posts/${postId}`),
    enabled: !!postId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para crear post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postData) => api.post('/posts', postData),
    
    onSuccess: () => {
      // Invalidar feeds para mostrar nuevo post
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

/**
 * Hook para editar post
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, data }) => api.put(`/posts/${postId}`, data),
    
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: POST_KEYS.detail(variables.postId) 
      });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

/**
 * Hook para eliminar post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (postId) => api.delete(`/posts/${postId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

// ==========================================
// COMENTARIOS
// ==========================================

/**
 * Hook para comentarios de un post
 */
export function usePostComments(postId) {
  return useInfiniteQuery({
    queryKey: POST_KEYS.comments(postId),
    queryFn: ({ pageParam }) => 
      api.get(`/posts/${postId}/comments`, { 
        cursor: pageParam, 
        limit: 20 
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!postId,
    staleTime: 1 * 60 * 1000,
  });
}

/**
 * Hook para añadir comentario
 */
export function useAddComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ postId, content, parentId }) => 
      api.post(`/posts/${postId}/comments`, { 
        content, 
        parent_id: parentId 
      }),
    
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: POST_KEYS.comments(variables.postId) 
      });
      // También actualizar contador en el post
      queryClient.invalidateQueries({ 
        queryKey: POST_KEYS.detail(variables.postId) 
      });
    },
  });
}

// ==========================================
// REELS
// ==========================================

/**
 * Hook para lista de reels
 */
export function useReels() {
  return useInfiniteQuery({
    queryKey: POST_KEYS.reels,
    queryFn: ({ pageParam }) => 
      api.get('/reels', { cursor: pageParam, limit: 10 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para detalle de reel
 */
export function useReel(reelId) {
  return useQuery({
    queryKey: ['reel', reelId],
    queryFn: () => api.get(`/reels/${reelId}`),
    enabled: !!reelId,
  });
}

/**
 * Hook para subir reel
 */
export function useUploadReel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData) => api.post('/reels', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.reels });
    },
  });
}

/**
 * Hook para registrar vista de reel
 */
export function useViewReel() {
  return useMutation({
    mutationFn: (reelId) => api.post(`/reels/${reelId}/view`),
  });
}

// ==========================================
// STORIES
// ==========================================

/**
 * Hook para stories activas (siguiendo)
 */
export function useStories() {
  return useQuery({
    queryKey: POST_KEYS.stories,
    queryFn: () => api.get('/stories'),
    staleTime: 30 * 1000, // 30 seg
    refetchInterval: 60 * 1000, // Refetch cada minuto
  });
}

/**
 * Hook para stories de un usuario específico
 */
export function useUserStories(userId) {
  return useQuery({
    queryKey: POST_KEYS.userStories(userId),
    queryFn: () => api.get(`/stories/${userId}`),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook para crear story
 */
export function useCreateStory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (formData) => api.post('/stories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.stories });
    },
  });
}

/**
 * Hook para eliminar story
 */
export function useDeleteStory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (storyId) => api.delete(`/stories/${storyId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POST_KEYS.stories });
    },
  });
}

/**
 * Hook para estadísticas de views de story
 */
export function useStoryViews(storyId) {
  return useQuery({
    queryKey: ['story', storyId, 'views'],
    queryFn: () => api.get(`/stories/${storyId}/views`),
    enabled: !!storyId,
  });
}

/**
 * Hook para reaccionar a story
 */
export function useReactToStory() {
  return useMutation({
    mutationFn: ({ storyId, reaction }) => 
      api.post(`/stories/${storyId}/reaction`, { reaction }),
  });
}

/**
 * Hook para obtener archivo de stories
 */
export function useStoriesArchive() {
  return useQuery({
    queryKey: ['stories', 'archive'],
    queryFn: () => api.get('/stories/archive'),
  });
}

/**
 * Hook para crear highlight
 */
export function useCreateHighlight() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ title, storyIds }) => 
      api.post('/stories/highlights', { title, story_ids: storyIds }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories', 'archive'] });
    },
  });
}
