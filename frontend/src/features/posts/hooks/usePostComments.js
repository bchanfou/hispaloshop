import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../services/api/client';

const postKeys = {
  comments: (postId) => ['posts', postId, 'comments'],
};

export function usePostComments(postId) {
  const queryClient = useQueryClient();

  const commentsQuery = useQuery({
    queryKey: postKeys.comments(postId),
    queryFn: () => apiClient.get(`/posts/${postId}/comments`),
    enabled: Boolean(postId),
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const submitMutation = useMutation({
    mutationFn: (text) => apiClient.post(`/posts/${postId}/comments`, { text }),
    onSuccess: (newComment) => {
      queryClient.setQueryData(postKeys.comments(postId), (current) =>
        Array.isArray(current) ? [newComment, ...current] : [newComment],
      );
    },
  });

  return {
    comments: commentsQuery.data ?? [],
    isLoading: commentsQuery.isLoading,
    submitComment: (text) => submitMutation.mutateAsync(text),
    isSubmitting: submitMutation.isPending,
  };
}
