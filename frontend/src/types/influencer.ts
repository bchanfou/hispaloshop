export type InfluencerTier = 'perseo' | 'aquiles' | 'hercules' | 'apolo' | 'zeus';

export const TIER_CONFIG: Record<InfluencerTier, { name: string; percentage: number; minGMV: number }> = {
  perseo: { name: 'Perseo', percentage: 3, minGMV: 0 },
  aquiles: { name: 'Aquiles', percentage: 4, minGMV: 500 },
  hercules: { name: 'Hercules', percentage: 5, minGMV: 2000 },
  apolo: { name: 'Apolo', percentage: 6, minGMV: 7500 },
  zeus: { name: 'Zeus', percentage: 7, minGMV: 20000 },
};

