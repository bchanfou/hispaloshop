import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Zap, TrendingUp, Eye, Clock } from 'lucide-react';
import apiClient from '../../services/api/client';

export default function SocialProofBar({ productId }) {
  const { data: signals } = useQuery({
    queryKey: ['product-signals', productId],
    queryFn: () => apiClient.get(`/products/${productId}/signals`),
    enabled: !!productId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  if (!signals) return null;

  const hasContent =
    (signals.is_low_stock && signals.stock_units > 0) ||
    signals.purchases_today > 0 ||
    signals.viewers_now > 1 ||
    (signals.last_purchase_minutes != null && signals.last_purchase_minutes < 120);

  if (!hasContent) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-3 mb-1">
      {/* FOMO — low stock */}
      {signals.is_low_stock && signals.stock_units > 0 && (
        <p className="fomo-stock">
          <Zap className="w-3.5 h-3.5 inline mr-1" />
          Solo quedan {signals.stock_units} unidades
        </p>
      )}

      {/* Purchases today — show only if ≥5 (avoids low-trust signals like "1 person bought") */}
      {signals.purchases_today >= 5 && (
        <p className="flex items-center gap-1.5 text-xs text-stone-500">
          <TrendingUp className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>{signals.purchases_today} personas compraron esto hoy</span>
        </p>
      )}

      {/* Active viewers (exclude self = show only if > 1) */}
      {signals.viewers_now > 1 && (
        <p className="flex items-center gap-1.5 text-xs text-stone-500">
          <Eye className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>{signals.viewers_now} personas lo están viendo ahora</span>
        </p>
      )}

      {/* Last purchase recency */}
      {signals.last_purchase_minutes != null && signals.last_purchase_minutes < 120 && (
        <p className="flex items-center gap-1.5 text-xs text-stone-500">
          <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>
            Última compra hace{' '}
            {signals.last_purchase_minutes < 60
              ? `${signals.last_purchase_minutes} min`
              : `${Math.round(signals.last_purchase_minutes / 60)}h`}
          </span>
        </p>
      )}
    </div>
  );
}
