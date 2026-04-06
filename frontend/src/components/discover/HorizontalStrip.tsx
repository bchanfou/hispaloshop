// @ts-nocheck
/**
 * Shared horizontal scrollable strip used by Seasonal, NearYou, Communities,
 * Recipes, NewProducers, TrendingCreators sections. Each section passes its
 * own renderItem function.
 */
import React from 'react';

export default function HorizontalStrip({ items, renderItem, gap = 'gap-3', className = '' }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`flex overflow-x-auto scrollbar-hide px-4 ${gap} snap-x snap-mandatory ${className}`}>
      {items.map((item, index) => (
        <div key={item.id || item.user_id || item.slug || index} className="snap-start shrink-0">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}
