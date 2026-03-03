import useSWR from 'swr';
import { api } from '@/lib/api';

export function useInfluencerDashboard() {
  const { data, error, isLoading, mutate } = useSWR('/influencer/dashboard', () => api.getInfluencerDashboard(), {
    revalidateOnFocus: false,
  });

  return { dashboard: data, error, isLoading, refresh: mutate };
}
