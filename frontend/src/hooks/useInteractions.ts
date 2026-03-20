import { api } from '../lib/api';

export function useInteractions() {
  return {
    toggleLike: (postId: string) => api.toggleLikePost(postId),
    getLikes: (postId: string, limit = 20) => api.getPostLikes(postId, { limit }),
    createComment: (postId: string, content: string, parent_id?: string | null) =>
      api.createComment(postId, { content, parent_id }),
    getComments: (postId: string) => api.getPostComments(postId),
    toggleSave: (postId: string) => api.toggleSavePost(postId),
    getSavedPosts: (collection?: string) => api.getSavedPosts(collection),
  };
}
