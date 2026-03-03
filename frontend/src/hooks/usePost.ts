import { api } from '@/lib/api';

export function usePost() {
  return {
    createPost: (data: FormData) => api.createPost(data),
    getPost: (postId: string) => api.getPost(postId),
    deletePost: (postId: string) => api.deletePost(postId),
  };
}
