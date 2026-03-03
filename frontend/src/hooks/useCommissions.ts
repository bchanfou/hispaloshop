import useSWR from 'swr';
import { api } from '@/lib/api';

export function useCommissions(status?: string) {
  const { data, error, isLoading, mutate } = useSWR(['/influencer/commissions', status], ([, st]) => api.getCommissions(st ? { status: st } : undefined), {
    revalidateOnFocus: false,
  });

  const requestPayout = async () => {
    const payout = await api.requestPayout();
    await mutate();
    return payout;
  };

  return { commissions: data?.items || [], summary: data?.summary, error, isLoading, requestPayout };
}
