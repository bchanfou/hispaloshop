import { useCreateUserPostMutation, useUserPostsQuery } from '../queries';

export function useUserPosts(userId) {
  const postsQuery = useUserPostsQuery(userId);
  const createPostMutation = useCreateUserPostMutation(userId);

  return {
    posts: postsQuery.data ?? [],
    isLoading: postsQuery.isLoading,
    isFetching: postsQuery.isFetching,
    createPost: ({ file, caption }) => createPostMutation.mutateAsync({ file, caption }),
    creatingPost: createPostMutation.isPending,
    refetch: postsQuery.refetch,
  };
}

export default useUserPosts;
