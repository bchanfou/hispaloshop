// @ts-nocheck
import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { Loader2, Package, Truck, X, Check } from 'lucide-react';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}

function StatusBadge({ status }) {
  const cfg = {
    pending:               { label: 'Nueva',      bg: 'bg-stone-950', text: 'text-white' },
    confirmed_by_producer: { label: 'Ofertada',   bg: 'bg-stone-200', text: 'text-stone-700' },
    rejected_by_producer:  { label: 'Rechazada',  bg: 'bg-stone-100', text: 'text-stone-500' },
    rejected_by_importer:  { label: 'Declinada',  bg: 'bg-stone-100', text: 'text-stone-500' },
    paid:                  { label: 'Pagado',     bg: 'bg-stone-950', text: 'text-white' },
    preparing:             { label: 'Preparando', bg: 'bg-stone-200', text: 'text-stone-700' },
    shipped:               { label: 'Enviado',    bg: 'bg-stone-200', text: 'text-stone-700' },
    delivered:             { label: 'Entregado',  bg: 'bg-stone-100', text: 'text-stone-600' },
  }[status] || { label: status, bg: 'bg-stone-100', text: 'text-stone-500' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function ShipForm({ requestId, onSuccess }) {
  const [show, setShow] = useState(false);
  const [tracking, setTracking] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!tracking.trim()) {
      toast.error('Introduce el número de tracking');
      return;
    }
    if (trackUrl.trim() && !/^https?:\/\/.+/.test(trackUrl.trim())) {
      toast.error('URL de tracking no válida. Debe empezar con http:// o https://');
      return;
    }
    setSaving(true);
    try {
      await apiClient.put(`/b2b/producer/requests/${requestId}/ship`, {
        tracking_number: tracking.trim(),
        tracking_url: trackUrl.trim(),
      });
      toast.success('Envío registrado');
      onSuccess();
    } catch {
      toast.error('Error al registrar el envío');
    } finally {
      setSaving(false);
    }
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-1.5 px-4 py-2 bg-stone-950 text-white rounded-2xl text-sm font-semibold hover:bg-stone-800 transition-colors"
      >
        <Truck className="w-4 h-4" /> Registrar envío
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={tracking}
        onChange={e => setTracking(e.target.value)}
        placeholder="Número de tracking"
        className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-stone-950"
      />
      <input
        type="text"
        value={trackUrl}
        onChange={e => setTrackUrl(e.target.value)}
        placeholder="URL de seguimiento (opcional)"
        className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-stone-950"
      />
      <div className="flex gap-2">
        <button
          onClick={() => setShow(false)}
          className="flex-1 px-3 py-2 border border-stone-200 text-stone-600 rounded-2xl text-sm hover:bg-stone-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="flex-1 px-3 py-2 bg-stone-950 text-white rounded-2xl text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmar envío'}
        </button>
      </div>
    </div>
  );
}

function RequestCard({ request, onAction }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmedPrice, setConfirmedPrice] = useState(request.unit_price || '');
  const [notes, setNotes] = useState('');
  const [estimatedDays, setEstimatedDays] = useState(7);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [processing, setProcessing] = useState(false);

  const confirm = async () => {
    if (!confirmedPrice || parseFloat(confirmedPrice) <= 0) {
      toast.error('Introduce el precio por unidad');
      return;
    }
    setProcessing(true);
    try {
      await apiClient.put(`/b2b/producer/requests/${request.id}/confirm`, {
        confirmed_unit_price: parseFloat(confirmedPrice),
        notes: notes.trim(),
        estimated_days: estimatedDays,
        estimated_delivery_date: estimatedDeliveryDate || undefined,
      });
      toast.success('Oferta enviada al importador');
      setShowConfirm(false);
      onAction();
    } catch {
      toast.error('Error al confirmar');
    } finally {
      setProcessing(false);
    }
  };

  const reject = async () => {
    setProcessing(true);
    try {
      await apiClient.put(`/b2b/producer/requests/${request.id}/reject`);
      toast.success('Solicitud rechazada');
      onAction();
    } catch {
      toast.error('Error al rechazar');
    } finally {
      setProcessing(false);
    }
  };

  const totalEstimado = request.quantity * (request.unit_price || 0);
  const totalConfirmado = request.quantity * parseFloat(confirmedPrice || 0);

  return (
    <div className={`bg-white rounded-2xl border ${request.status === 'pending' ? 'border-stone-950' : 'border-stone-200'} overflow-hidden mb-3`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${request.status === 'pending' ? 'bg-stone-50 border-stone-200' : 'bg-white border-stone-100'}`}>
        <div>
          <span className="text-sm font-bold text-stone-950">{request.importer_username}</span>
          {request.importer_country && (
            <span className="text-xs text-stone-400 ml-2">{request.importer_country}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-stone-400">{formatRelativeTime(request.created_at)}</span>
          <StatusBadge status={request.status} />
        </div>
      </div>

      <div className="p-4">
        {/* Product */}
        <div className="flex gap-3 mb-3">
          <img
            src={request.product_image || '/placeholder.png'}
            alt={request.product_name}
            className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-stone-950 truncate">{request.product_name}</p>
            <div className="flex gap-4 mt-1">
              <div>
                <p className="text-[10px] text-stone-400 uppercase tracking-wider">Cantidad</p>
                <p className="text-sm font-extrabold text-stone-950">{request.quantity} {request.unit}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 uppercase tracking-wider">Precio ref.</p>
                <p className="text-sm font-extrabold text-stone-700">{request.unit_price?.toFixed(2)}€/{request.unit}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400 uppercase tracking-wider">Total est.</p>
                <p className="text-sm font-extrabold text-stone-950">{totalEstimado.toFixed(2)}€</p>
              </div>
            </div>
            {request.product_moq != null && request.quantity < request.product_moq && (
              <p className="text-xs text-stone-500 mt-1.5 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                Cantidad menor al MOQ del producto ({request.product_moq} unidades)
              </p>
            )}
          </div>
        </div>

        {/* Importer notes */}
        {request.notes && (
          <div className="bg-stone-50 rounded-2xl p-3 mb-3 border-l-3 border-stone-200">
            <p className="text-[11px] font-bold text-stone-500 mb-1">Nota del importador:</p>
            <p className="text-sm text-stone-700">"{request.notes}"</p>
          </div>
        )}

        {/* Confirm form */}
        {request.status === 'pending' && showConfirm && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-3">
            <p className="text-sm font-bold text-stone-950 mb-3">Confirmar disponibilidad</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Precio/unidad (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={confirmedPrice}
                  onChange={e => setConfirmedPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-stone-950"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Plazo (días)</label>
                <input
                  type="number"
                  value={estimatedDays}
                  onChange={e => setEstimatedDays(parseInt(e.target.value) || 7)}
                  min="1"
                  max="90"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-stone-950"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs font-semibold text-stone-600 block mb-1">Fecha estimada de entrega</label>
              <input
                type="date"
                value={estimatedDeliveryDate}
                onChange={e => setEstimatedDeliveryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:border-stone-950"
              />
            </div>
            <div className="mb-3">
              <label className="text-xs font-semibold text-stone-600 block mb-1">Nota (opcional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej: Stock disponible. Mínimo 100kg por pedido."
                rows={2}
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-sm resize-none focus:outline-none focus:border-stone-950"
              />
            </div>
            <div className="bg-white rounded-2xl p-2.5 mb-3 text-xs text-stone-500">
              El importador verá: <strong className="text-stone-950">
                {request.quantity} {request.unit} × {parseFloat(confirmedPrice || 0).toFixed(2)}€ = {totalConfirmado.toFixed(2)}€
              </strong> + 3% comisión Hispaloshop
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 py-2 border border-stone-200 text-stone-600 rounded-2xl text-sm hover:bg-stone-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirm}
                disabled={processing}
                className="flex-1 px-3 py-2 bg-stone-950 text-white rounded-2xl text-sm font-semibold hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Enviar oferta'}
              </button>
            </div>
          </div>
        )}

        {/* Actions by status */}
        {request.status === 'pending' && !showConfirm && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirm(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-stone-950 text-white rounded-2xl text-sm font-semibold hover:bg-stone-800 transition-colors"
            >
              <Check className="w-4 h-4" /> Confirmar
            </button>
            <button
              onClick={reject}
              disabled={processing}
              className="px-4 py-2.5 border border-stone-200 text-stone-500 rounded-2xl text-sm hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              Rechazar
            </button>
          </div>
        )}

        {request.status === 'confirmed_by_producer' && (
          <div className="bg-stone-50 rounded-2xl p-3 text-sm text-stone-600">
            Oferta enviada. Esperando aprobación y pago del importador.
            {request.confirmed_unit_price && (
              <p className="font-bold text-stone-950 mt-1">
                Precio ofertado: {(Number(request.confirmed_unit_price) || 0).toFixed(2)}€/{request.unit}
              </p>
            )}
          </div>
        )}

        {(request.status === 'paid' || request.status === 'preparing') && (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3">
            <p className="text-sm font-bold text-stone-950 mb-2">Pago recibido — Preparar y enviar</p>
            <ShipForm requestId={request.id} onSuccess={onAction} />
          </div>
        )}

        {request.status === 'shipped' && request.tracking_number && (
          <div className="bg-stone-50 rounded-2xl p-3 text-sm">
            <p className="font-semibold text-stone-950">Enviado</p>
            <p className="text-stone-500 mt-1">Tracking: {request.tracking_number}</p>
            {request.tracking_url && (
              <a href={request.tracking_url} target="_blank" rel="noopener noreferrer" className="text-stone-950 underline text-xs mt-1 block">
                Ver seguimiento
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProducerB2BRequestsPage() {
  const [filter, setFilter] = useState('pending');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['producer-b2b-requests', filter],
    queryFn: () => apiClient.get(`/b2b/producer/requests?status=${filter}&limit=30`),
  });

  const requests = data?.requests || [];
  const pendingCount = data?.pending_count || 0;

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['producer-b2b-requests'] });
  }, [queryClient]);

  const filters = [
    { id: 'pending',   label: 'Nuevas' },
    { id: 'confirmed', label: 'Confirmadas' },
    { id: 'rejected',  label: 'Rechazadas' },
    { id: 'paid',      label: 'Pagadas' },
    { id: 'all',       label: 'Todas' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-stone-950">
          Solicitudes mayoristas
          {pendingCount > 0 && (
            <span className="ml-2 text-sm font-extrabold bg-stone-950 text-white px-2.5 py-0.5 rounded-full align-middle">
              {pendingCount}
            </span>
          )}
        </h1>
      </div>
      <p className="text-sm text-stone-500 mb-5">Gestiona las solicitudes B2B de importadores</p>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
              filter === f.id
                ? 'bg-stone-950 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-500">
            Sin solicitudes {filter === 'pending' ? 'pendientes' : ''}
          </p>
          {filter === 'pending' && (
            <p className="text-xs text-stone-400 mt-1">
              Activa el modo B2B en tus productos para recibir solicitudes
            </p>
          )}
        </div>
      ) : (
        requests.map(req => (
          <RequestCard key={req.id} request={req} onAction={refetch} />
        ))
      )}
    </div>
  );
}
