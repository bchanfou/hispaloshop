import { useToggleUserFollowMutation } from '../queries';

export function useUserFollow(userId, profile) {
  const followMutation = useToggleUserFollowMutation();

  // Treat pending request as "following" for toggle purposes (cancel request)
  const effectivelyFollowing = Boolean(profile?.is_following) || Boolean(profile?.follow_request_pending);

  return {
    isFollowing: Boolean(profile?.is_following),
    followersCount: profile?.followers_count || 0,
    followingCount: profile?.following_count || 0,
    followLoading: followMutation.isPending,
    toggleFollow: () =>
      followMutation.mutateAsync({
        userId,
        isFollowing: effectivelyFollowing,
      }),
  };
}

export default useUserFollow;
