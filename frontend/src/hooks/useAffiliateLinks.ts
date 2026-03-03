import useSWR from 'swr';
import { AffiliateLinkCreateRequest, api } from '@/lib/api';

export function useAffiliateLinks(params?: { status?: string; page?: number }) {
  const { data, error, isLoading, mutate } = useSWR(['/influencer/affiliate-links', params], ([, p]) => api.getAffiliateLinks(p), {
    revalidateOnFocus: false,
  });

  const createLink = async (payload: AffiliateLinkCreateRequest) => {
    const result = await api.createAffiliateLink(payload);
    await mutate();
    return result;
  };

  const deactivateLink = async (linkId: string) => {
    const result = await api.deactivateAffiliateLink(linkId);
    await mutate();
    return result;
  };

  return { links: data?.items || [], total: data?.total || 0, error, isLoading, createLink, deactivateLink };
}
