import React, { useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Package, Loader2 } from 'lucide-react';
import { useInquiries, useReceivedRFQs } from '../../features/b2b/queries';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  answered: { label: 'Respondida', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'Cerrada', color: 'bg-stone-100 text-stone-500', icon: XCircle },
};

function RFQCard({ rfq }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[rfq.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const date = rfq.created_at ? new Date(rfq.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </span>
              <span className="text-xs text-stone-400">{date}</span>
            </div>
            <p className="text-xs text-stone-500 font-mono truncate">ID: {rfq.rfq_id}</p>
            {rfq.target_country && (
              <p className="text-xs text-stone-500 mt-0.5">Destino: {rfq.target_country}</p>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" />
          )}
        </div>

        {rfq.product_ids?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {rfq.product_ids.map((pid) => (
              <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 rounded-full text-xs text-stone-600">
                <Package className="w-3 h-3" />
                {pid}
              </span>
            ))}
          </div>
        )}
      </div>

      {expanded && rfq.message && (
        <div className="px-4 pb-4 border-t border-stone-100 pt-3">
          <p className="text-xs text-stone-500 font-medium mb-1">Mensaje enviado</p>
          <p className="text-sm text-stone-700 whitespace-pre-line">{rfq.message}</p>
        </div>
      )}
    </div>
  );
}

export default function B2BQuotesHistoryPage() {
  const { user } = useAuth();
  const isProducer = user?.role === 'producer';

  const importerQuery = useInquiries(Boolean(user) && !isProducer);
  const producerQuery = useReceivedRFQs(Boolean(user) && isProducer);

  const activeQuery = isProducer ? producerQuery : importerQuery;
  const rfqs = activeQuery.data?.items || [];

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200 px-4 py-6">
        <h1 className="text-2xl font-bold text-stone-800">
          {isProducer ? 'Solicitudes recibidas' : 'Mis solicitudes de oferta'}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {isProducer
            ? 'RFQs de importadores interesados en tus productos'
            : 'Historial de tus solicitudes de cotizacion mayorista'}
        </p>
      </div>

      <div className="p-4">
        {activeQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
          </div>
        ) : activeQuery.isError ? (
          <div className="text-center py-16 text-stone-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p className="font-medium">No se pudieron cargar las solicitudes</p>
            <p className="text-sm mt-1">
              {isProducer
                ? 'Solo disponible para cuentas de productor'
                : 'Solo disponible para cuentas de importador'}
            </p>
          </div>
        ) : rfqs.length === 0 ? (
          <div className="text-center py-16 text-stone-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p className="font-medium">
              {isProducer ? 'No hay solicitudes recibidas' : 'No has enviado solicitudes aun'}
            </p>
            {!isProducer && (
              <p className="text-sm mt-1">
                Usa el Marketplace B2B para contactar productores
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-stone-400 font-medium">{rfqs.length} solicitud{rfqs.length !== 1 ? 'es' : ''}</p>
            {rfqs.map((rfq) => (
              <RFQCard key={rfq.rfq_id} rfq={rfq} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
