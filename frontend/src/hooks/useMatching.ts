import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

export function useMatching() {
  const [producerMatches, setProducerMatches] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any>(null);

  const fetchProducerMatches = useCallback(async (limit: number = 10) => {
    const response = await api.getProducerMatches(limit);
    setProducerMatches(response);
    return response;
  }, []);

  const fetchInfluencerOpportunities = useCallback(async (category?: string) => {
    const response = await api.getInfluencerOpportunities(category);
    setOpportunities(response);
    return response;
  }, []);

  return { producerMatches, opportunities, fetchProducerMatches, fetchInfluencerOpportunities };
}
