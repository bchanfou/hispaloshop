import { useAuth } from '../../../context/AuthContext';
import { useStoreFollowStatus, useToggleStoreFollow } from '../queries';

export function useStoreFollow(storeSlug) {
  const { user } = useAuth();
  const followStatusQuery = useStoreFollowStatus(storeSlug, Boolean(user));
  const toggleFollowMutation = useToggleStoreFollow();

  return {
    isFollowing: Boolean(followStatusQuery.data?.following),
    followLoading: toggleFollowMutation.isPending,
    handleFollowStore: () =>
      toggleFollowMutation.mutateAsync({
        storeSlug,
        following: Boolean(followStatusQuery.data?.following),
      }),
  };
}

export default useStoreFollow;
