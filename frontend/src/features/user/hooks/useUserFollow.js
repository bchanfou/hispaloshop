import { useToggleUserFollowMutation } from '../queries';

export function useUserFollow(userId, profile) {
  const followMutation = useToggleUserFollowMutation();

  return {
    isFollowing: Boolean(profile?.is_following),
    followersCount: profile?.followers_count || 0,
    followingCount: profile?.following_count || 0,
    followLoading: followMutation.isPending,
    toggleFollow: () =>
      followMutation.mutateAsync({
        userId,
        isFollowing: Boolean(profile?.is_following),
      }),
  };
}

export default useUserFollow;
