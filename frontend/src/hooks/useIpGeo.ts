// @ts-nocheck
import { useEffect, useState } from 'react';
import apiClient from '../services/api/client';

export interface IpGeoResult {
  country: string | null;
  city: string | null;
  source: 'ipapi' | 'cache' | 'fallback' | 'localhost';
}

/**
 * Lightweight hook that calls GET /api/config/geo to resolve the visitor's
 * country and city from their IP. Fails gracefully: on any error, returns
 * {country: null, city: null, source: 'fallback'} so the UI can show the
 * full country dropdown without pre-selection. Never blocks rendering.
 */
export function useIpGeo(): { geo: IpGeoResult | null; loading: boolean } {
  const [geo, setGeo] = useState<IpGeoResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.get('/config/geo');
        if (!cancelled) {
          setGeo({
            country: data?.country ?? null,
            city: data?.city ?? null,
            source: data?.source ?? 'fallback',
          });
        }
      } catch {
        if (!cancelled) {
          setGeo({ country: null, city: null, source: 'fallback' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { geo, loading };
}
