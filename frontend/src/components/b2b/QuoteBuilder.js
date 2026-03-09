import React, { useState } from 'react';
import { toast } from 'sonner';
import { useCreateInquiry } from '../../hooks/api/useImporter';

export default function QuoteBuilder() {
  const createInquiry = useCreateInquiry();
  const [producerId, setProducerId] = useState('');
  const [targetCountry, setTargetCountry] = useState('ES');
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState([{ product_id: '', qty_requested: 100 }]);

  const update = (idx, key, value) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [key]: value };
    setRows(next);
  };

  const handleSubmit = async () => {
    const normalizedRows = rows
      .map((row) => ({
        product_id: row.product_id.trim(),
        qty_requested: Number(row.qty_requested) || 0,
      }))
      .filter((row) => row.product_id);

    if (!producerId.trim() || !targetCountry.trim() || !message.trim() || normalizedRows.length === 0) {
      toast.error('Completa productor, pais destino, mensaje y al menos un producto.');
      return;
    }

    const requestedLines = normalizedRows
      .map((row) => `- ${row.product_id}: ${row.qty_requested} uds`)
      .join('\n');

    try {
      const response = await createInquiry.mutateAsync({
        producerId: producerId.trim(),
        productIds: normalizedRows.map((row) => row.product_id),
        message: `${message.trim()}\n\nProductos solicitados:\n${requestedLines}`,
        targetCountry: targetCountry.trim().toUpperCase(),
      });
      toast.success(`RFQ enviada${response?.email_sent ? ' y notificada por email' : ''}.`);
      setProducerId('');
      setTargetCountry('ES');
      setMessage('');
      setRows([{ product_id: '', qty_requested: 100 }]);
    } catch (error) {
      toast.error(error?.message || 'No se pudo enviar la RFQ.');
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="border p-2 rounded"
          placeholder="Producer ID"
          value={producerId}
          onChange={(e) => setProducerId(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Pais destino (ES)"
          value={targetCountry}
          onChange={(e) => setTargetCountry(e.target.value.toUpperCase())}
          maxLength={2}
        />
      </div>

      <textarea
        className="min-h-[110px] w-full border p-3 rounded"
        placeholder="Describe volumen, formatos, certificaciones o requisitos logisticos."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-2">
            <input
              className="border p-2 rounded"
              placeholder="Product ID"
              value={row.product_id}
              onChange={(e) => update(idx, 'product_id', e.target.value)}
            />
            <input
              className="border p-2 rounded"
              type="number"
              min="1"
              value={row.qty_requested}
              onChange={(e) => update(idx, 'qty_requested', Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="border rounded px-3 py-1"
          onClick={() => setRows([...rows, { product_id: '', qty_requested: 100 }])}
        >
          Anadir producto
        </button>
        <button
          type="button"
          className="bg-black text-white rounded px-3 py-2"
          onClick={handleSubmit}
          disabled={createInquiry.isPending}
        >
          {createInquiry.isPending ? 'Enviando...' : 'Enviar RFQ'}
        </button>
      </div>
    </div>
  );
}
