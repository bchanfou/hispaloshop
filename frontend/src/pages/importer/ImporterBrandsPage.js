import React from 'react';
import BrandCard from '../../components/b2b/BrandCard';

const brands = [{ brand_name: 'Iberica Foods', category: 'Aceites', brand_country: 'ES', exclusive_territory: ['ES', 'PT'] }];

export default function ImporterBrandsPage() {
  return <div className="p-6 space-y-4"><h1 className="text-2xl font-bold">Marcas representadas</h1>{brands.map((b, i) => <BrandCard key={i} brand={b} />)}</div>;
}
