// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { FileText, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Package, Loader2, ArrowUpDown, MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useInquiries, useReceivedRFQs } from '../../features/b2b/queries';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    color: 'bg-stone-100 text-stone-700',
    icon: Clock
  },
  answered: {
    label: 'Respondida',
    color: 'bg-stone-950 text-white',
    icon: CheckCircle
  },
  closed: {
    label: 'Cerrada',
    color: 'bg-stone-100 text-stone-500',
    icon: XCircle
  }
};
const TABS = [{
  value: '',
  label: 'Todas'
}, {
  value: 'pending',
  label: 'Pendientes'
}, {
  value: 'answered',
  label: 'Respondidas'
}, {
  value: 'closed',
  label: 'Cerradas'
}];
const SORT_OPTIONS = [{
  value: 'recent',
  label: "Más reciente"
}, {
  value: 'amount',
  label: 'Mayor importe'
}, {
  value: 'status',
  label: 'Por estado'
}];
const STATUS_ORDER = {
  pending: 0,
  answered: 1,
  closed: 2
};
function RFQCard({
  rfq,
  isProducer
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const status = STATUS_CONFIG[rfq.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  const date = rfq.created_at ? (() => {
    const d = new Date(rfq.created_at);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  })() : '';
  return <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
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
            {rfq.target_country && <p className="text-xs text-stone-500 mt-0.5">Destino: {rfq.target_country}</p>}
            {rfq.total_amount != null && <p className="text-sm font-bold text-stone-950 mt-1">
                {Number(rfq.total_amount).toFixed(2)} €
              </p>}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" />}
        </div>

        {rfq.product_ids?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">
            {rfq.product_ids.map(pid => <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 rounded-full text-xs text-stone-600">
                <Package className="w-3 h-3" />
                {pid}
              </span>)}
          </div>}
      </div>

      {/* Expandable detail */}
      <AnimatePresence>
        {expanded && <motion.div initial={{
        height: 0,
        opacity: 0
      }} animate={{
        height: 'auto',
        opacity: 1
      }} exit={{
        height: 0,
        opacity: 0
      }} transition={{
        duration: 0.2,
        ease: 'easeInOut'
      }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-stone-100 pt-3">
              {/* Products list */}
              {rfq.products?.length > 0 && <div className="mb-3">
                  <p className="text-xs text-stone-500 font-medium mb-1.5">Productos</p>
                  <div className="space-y-1.5">
                    {rfq.products.map((prod, i) => <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-stone-700">{prod.name || prod.product_id || `Producto ${i + 1}`}</span>
                        <span className="text-stone-500 text-xs">
                          {prod.quantity ? `${prod.quantity} ${prod.unit || 'uds'}` : ''}
                        </span>
                      </div>)}
                  </div>
                </div>}

              {/* Quantities (fallback if no products array) */}
              {!rfq.products?.length && rfq.quantity && <div className="mb-3">
                  <p className="text-xs text-stone-500 font-medium mb-1">Cantidad</p>
                  <p className="text-sm text-stone-700">{rfq.quantity} {rfq.unit || 'uds'}</p>
                </div>}

              {/* Pricing terms */}
              {rfq.pricing_terms && <div className="mb-3">
                  <p className="text-xs text-stone-500 font-medium mb-1">Condiciones de precio</p>
                  <p className="text-sm text-stone-700">{rfq.pricing_terms}</p>
                </div>}

              {/* Incoterm */}
              {rfq.incoterm && <div className="mb-3">
                  <p className="text-xs text-stone-500 font-medium mb-1">Incoterm</p>
                  <p className="text-sm text-stone-700">{rfq.incoterm}{rfq.incoterm_city ? ` — ${rfq.incoterm_city}` : ''}</p>
                </div>}

              {/* Dates */}
              <div className="flex gap-4 mb-3">
                {rfq.delivery_date && <div>
                    <p className="text-xs text-stone-500 font-medium mb-1">Entrega solicitada</p>
                    <p className="text-sm text-stone-700">
                      {(() => {
                  const d = new Date(rfq.delivery_date);
                  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                })()}
                    </p>
                  </div>}
                {rfq.expires_at && <div>
                    <p className="text-xs text-stone-500 font-medium mb-1">Expira</p>
                    <p className="text-sm text-stone-700">
                      {(() => {
                  const d = new Date(rfq.expires_at);
                  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                })()}
                    </p>
                  </div>}
              </div>

              {/* Message */}
              {rfq.message && <div className="mb-3">
                  <p className="text-xs text-stone-500 font-medium mb-1">Mensaje</p>
                  <p className="text-sm text-stone-700 whitespace-pre-line">{rfq.message}</p>
                </div>}

              {/* Response / answer */}
              {rfq.response && <div className="bg-stone-50 rounded-xl p-3 mb-3">
                  <p className="text-xs text-stone-500 font-medium mb-1">Respuesta del productor</p>
                  <p className="text-sm text-stone-700 whitespace-pre-line">{rfq.response}</p>
                </div>}

              {/* Producer: Respond button */}
              {isProducer && rfq.status === 'pending' && <button onClick={e => {
            e.stopPropagation();
            navigate(`/b2b/offer/new?quote_id=${rfq.rfq_id}`);
          }} className="w-full py-2.5 bg-stone-950 hover:bg-stone-800 text-white text-sm font-medium rounded-2xl transition-colors flex items-center justify-center gap-2 mt-1">
                  <MessageSquare className="w-4 h-4" />
                  Responder
                </button>}
            </div>
          </motion.div>}
      </AnimatePresence>
    </div>;
}
export default function B2BQuotesHistoryPage() {
  const {
    user
  } = useAuth();
  const isProducer = user?.role === 'producer';
  const [activeTab, setActiveTab] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const importerQuery = useInquiries(Boolean(user) && !isProducer);
  const producerQuery = useReceivedRFQs(Boolean(user) && isProducer);
  const activeQuery = isProducer ? producerQuery : importerQuery;
  const rfqs = activeQuery.data?.items || [];

  // Filter by status tab
  const filteredAndSorted = useMemo(() => {
    let result = rfqs;

    // Filter by tab
    if (activeTab) {
      result = result.filter(rfq => rfq.status === activeTab);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() || 0 : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() || 0 : 0;
        return dateB - dateA;
      }
      if (sortBy === 'amount') {
        return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
      }
      if (sortBy === 'status') {
        return (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
      }
      return 0;
    });
    return result;
  }, [rfqs, activeTab, sortBy]);
  return <div className="min-h-screen bg-stone-50">
      <div className="bg-white border-b border-stone-200 px-4 py-6">
        <h1 className="text-2xl font-bold text-stone-800">
          {isProducer ? 'Solicitudes recibidas' : 'Mis solicitudes de oferta'}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {isProducer ? i18n.t('b2_b_quotes_history.rfqsDeImportadoresInteresadosEnTus', 'RFQs de importadores interesados en tus productos') : i18n.t('b2_b_quotes_history.historialDeTusSolicitudesDeCotizaci', 'Historial de tus solicitudes de cotización mayorista')}
        </p>
      </div>

      <div className="p-4">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-3 overflow-x-auto" style={{
        scrollbarWidth: 'none'
      }}>
          {TABS.map(tab => <button key={tab.value} onClick={() => setActiveTab(tab.value)} className={`px-4 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${activeTab === tab.value ? 'bg-stone-950 text-white' : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'}`}>
              {tab.label}
            </button>)}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-2 py-1 rounded-xl border border-stone-200 text-xs bg-white text-stone-700 cursor-pointer focus:outline-none">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {activeQuery.isLoading ? <div className="space-y-3 py-4">
            {Array.from({
          length: 4
        }).map((_, i) => <div key={i} className="skeleton-shimmer rounded-2xl h-24" />)}
          </div> : activeQuery.isError ? <div className="text-center py-16 text-stone-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p className="font-medium">{i18n.t('b2_b_quotes_history.noSePudieronCargarLasSolicitudes', 'No se pudieron cargar las solicitudes')}</p>
            <p className="text-sm mt-1">
              {isProducer ? i18n.t('b2_b_quotes_history.soloDisponibleParaCuentasDeProducto', 'Solo disponible para cuentas de productor') : i18n.t('b2_b_quotes_history.soloDisponibleParaCuentasDeImportad', 'Solo disponible para cuentas de importador')}
            </p>
          </div> : filteredAndSorted.length === 0 ? <div className="text-center py-16 text-stone-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p className="font-medium">
              {activeTab ? `No hay solicitudes ${TABS.find(t => t.value === activeTab)?.label.toLowerCase() || ''}` : isProducer ? 'No hay solicitudes recibidas' : i18n.t('b2_b_quotes_history.noHasEnviadoSolicitudesAun', 'No has enviado solicitudes aún')}
            </p>
            {!isProducer && !activeTab && <p className="text-sm mt-1">
                Usa el Marketplace B2B para contactar productores
              </p>}
          </div> : <div className="space-y-3">
            <p className="text-xs text-stone-400 font-medium">
              {filteredAndSorted.length} solicitud{filteredAndSorted.length !== 1 ? 'es' : ''}
            </p>
            {filteredAndSorted.map(rfq => <RFQCard key={rfq.rfq_id} rfq={rfq} isProducer={isProducer} />)}
          </div>}
      </div>
    </div>;
}