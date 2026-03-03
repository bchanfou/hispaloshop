import React from 'react';
import B2BProductCard from '../../components/b2b/B2BProductCard';

const demo = [{ name: 'Aceite Premium', price_cents: 900, b2b_pricing: { tier_1: { min_qty: 100, unit_price: 8.5 }, tier_2: { min_qty: 500, unit_price: 7.9 } } }];

export default function ImporterCatalogPage() {
  return <div className="p-6 space-y-4"><h1 className="text-2xl font-bold">Catálogo B2B</h1>{demo.map((p) => <B2BProductCard key={p.name} product={p} />)}</div>;
}
