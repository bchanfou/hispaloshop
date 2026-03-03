import React, { useState } from 'react';

export default function QuoteBuilder({ onSubmit }) {
  const [rows, setRows] = useState([{ product_id: '', qty_requested: 100, unit_price_quoted: 0 }]);

  const update = (idx, key, value) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [key]: value };
    setRows(next);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <div key={idx} className="grid grid-cols-3 gap-2">
          <input className="border p-2 rounded" placeholder="Product UUID" value={row.product_id} onChange={(e) => update(idx, 'product_id', e.target.value)} />
          <input className="border p-2 rounded" type="number" value={row.qty_requested} onChange={(e) => update(idx, 'qty_requested', Number(e.target.value))} />
          <input className="border p-2 rounded" type="number" value={row.unit_price_quoted} onChange={(e) => update(idx, 'unit_price_quoted', Number(e.target.value))} />
        </div>
      ))}
      <button className="border rounded px-3 py-1" onClick={() => setRows([...rows, { product_id: '', qty_requested: 100, unit_price_quoted: 0 }])}>Añadir línea</button>
      <button className="bg-black text-white rounded px-3 py-2 ml-2" onClick={() => onSubmit?.(rows)}>Enviar cotización</button>
    </div>
  );
}
