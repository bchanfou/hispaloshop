import React from 'react';

export default function BrandCard({ brand }) {
  return (
    <div className="border rounded p-3 bg-white">
      <h3 className="font-semibold">{brand.brand_name}</h3>
      <p className="text-sm text-gray-600">{brand.category || 'Sin categoría'} · {brand.brand_country || '--'}</p>
      <p className="text-xs mt-1">Territorio: {(brand.exclusive_territory || []).join(', ') || 'No exclusivo'}</p>
    </div>
  );
}
