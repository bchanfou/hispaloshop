export type InfluencerTier = 'hercules' | 'atenea' | 'zeus';

export const TIER_CONFIG: Record<InfluencerTier, { name: string; percentage: number; minGMV: number }> = {
  hercules: { name: 'Hercules', percentage: 3, minGMV: 0 },
  atenea: { name: 'Atenea', percentage: 5, minGMV: 5000 },
  zeus: { name: 'Zeus', percentage: 7, minGMV: 20000 },
};
