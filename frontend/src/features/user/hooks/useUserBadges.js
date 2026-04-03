import { useEffect } from 'react';
import { useCheckUserBadgesMutation, useUserBadgesQuery } from '../queries';

export function useUserBadges(userId, shouldCheck) {
  const badgesQuery = useUserBadgesQuery(userId);
  const checkBadgesMutation = useCheckUserBadgesMutation();

  useEffect(() => {
    if (shouldCheck && userId) {
      checkBadgesMutation.mutate(userId);
    }
    // TanStack keeps mutate stable; the mutation object itself is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldCheck, userId]);

  return {
    badges: badgesQuery.data ?? [],
    isLoading: badgesQuery.isLoading,
    isFetching: badgesQuery.isFetching,
    isError: badgesQuery.isError || checkBadgesMutation.isError,
    error: badgesQuery.error || checkBadgesMutation.error,
    refetch: badgesQuery.refetch,
  };
}

export default useUserBadges;
