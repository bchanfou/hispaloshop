import useSWR from 'swr';
import { api } from '../lib/api';

export function useProfile(username?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    username ? `/profiles/${username}` : null,
    () => api.getPublicProfile(username as string),
    { revalidateOnFocus: false }
  );

  return {
    profile: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
