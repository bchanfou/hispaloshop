import { useUserProfileQuery } from '../queries';

export function useUserProfile(userId) {
  const profileQuery = useUserProfileQuery(userId);

  return {
    profile: profileQuery.data ?? null,
    isLoading: profileQuery.isLoading,
    isFetching: profileQuery.isFetching,
    isError: profileQuery.isError,
    error: profileQuery.error,
    refetch: profileQuery.refetch,
  };
}

export default useUserProfile;
