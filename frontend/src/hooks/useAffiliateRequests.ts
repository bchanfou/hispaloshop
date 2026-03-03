import useSWR from 'swr';
import { api } from '@/lib/api';

export function useAffiliateRequests() {
  const { data, error, isLoading, mutate } = useSWR('/producer/affiliate/requests', () => api.getAffiliateRequests(), {
    revalidateOnFocus: false,
  });

  const approve = async (requestId: string) => {
    const result = await api.approveAffiliateRequest(requestId);
    await mutate();
    return result;
  };

  const reject = async (requestId: string, reason?: string) => {
    const result = await api.rejectAffiliateRequest(requestId, reason);
    await mutate();
    return result;
  };

  return { requests: data?.pending || [], stats: data?.stats, error, isLoading, approve, reject };
}
