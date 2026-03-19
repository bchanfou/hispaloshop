import React from 'react';

export default function B2BProductCard({ product }) {
  const pricing = product.b2b_pricing || {};
  return (
    <div className="border rounded p-3 bg-white">
      <h4 className="font-semibold">{product.name}</h4>
      <p className="text-sm">Base: €{((product.price_cents || 0) / 100).toFixed(2)}</p>
      <div className="text-xs mt-2">
        {Object.entries(pricing).filter(([k]) => k.startsWith('tier_')).map(([tier, value]) => (
          <div key={tier}>{value.min_qty}u: ${value.unit_price}</div>
        ))}
      </div>
    </div>
  );
}
