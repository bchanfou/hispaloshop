import React, { useState } from 'react';

function Badge({ label, variant }) {
  const styles = {
    accepted: 'bg-stone-100 text-stone-950',
    declined: 'bg-stone-100 text-stone-500',
  };
  return (
    <span className={`inline-block text-[10px] font-medium rounded-full px-2.5 py-1 ${styles[variant] || styles.declined}`}>
      {label}
    </span>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between mt-2">
      <span className="text-[11px] text-stone-500">{label}</span>
      <span className="text-[13px] font-medium text-stone-950">{value}</span>
    </div>
  );
}

export default function CollabProposalCard({
  proposal,
  isReceiver,
  onAccept,
  onDecline,
  onGenerateLink,
}) {
  const { product_name, product_image, commission_percent, duration_days, include_sample, status } =
    proposal;
  const [busy, setBusy] = useState(false);

  const handleAction = async (fn) => {
    if (busy || !fn) return;
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-[280px] rounded-2xl overflow-hidden border border-stone-200">
      {/* Header */}
      <div className="bg-stone-950 px-4 py-3 rounded-t-2xl">
        <span className="text-[13px] font-semibold text-white">
          Propuesta de colaboración
        </span>
      </div>

      {/* Body */}
      <div className="bg-white p-3.5 border-x border-stone-200">
        {/* Product row */}
        <div className="flex items-center gap-3">
          {product_image && (
            <img
              src={product_image}
              alt={product_name}
              className="object-cover w-10 h-10 rounded-xl shrink-0"
            />
          )}
          <span className="text-[13px] font-medium text-stone-950">
            {product_name}
          </span>
        </div>

        <InfoRow label="Comisión especial" value={`${commission_percent}%`} />
        <InfoRow label="Duración" value={`${duration_days} días`} />
        <InfoRow label="Entrega de muestra" value={include_sample ? 'Sí' : 'No'} />
      </div>

      {/* Footer */}
      <div className="p-3 border-x border-b border-stone-200 rounded-b-2xl bg-white">
        {status === 'pending' && isReceiver && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAction(onAccept)}
              disabled={busy}
              className="flex-1 flex items-center justify-center h-9 bg-stone-950 text-white border-none rounded-full text-[13px] font-semibold cursor-pointer disabled:opacity-40"
            >
              ✓ Aceptar
            </button>
            <button
              type="button"
              onClick={() => handleAction(onDecline)}
              disabled={busy}
              className="h-9 bg-transparent text-stone-500 border-none text-[13px] font-medium cursor-pointer px-3 disabled:opacity-40"
            >
              Declinar
            </button>
          </div>
        )}

        {status === 'accepted' && (
          <div>
            <Badge label="Aceptada" variant="accepted" />
            <button
              type="button"
              onClick={() => handleAction(onGenerateLink)}
              disabled={busy}
              className="w-full flex items-center justify-center h-9 bg-stone-950 text-white border-none rounded-full text-[13px] font-semibold cursor-pointer mt-2 disabled:opacity-40"
            >
              Generar link exclusivo
            </button>
          </div>
        )}

        {status === 'declined' && (
          <Badge label="Declinada" variant="declined" />
        )}
      </div>
    </div>
  );
}
