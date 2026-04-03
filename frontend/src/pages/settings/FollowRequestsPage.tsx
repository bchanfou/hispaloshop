// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import i18n from "../../locales/i18n";
export default function FollowRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(new Set());
  useEffect(() => {
    let active = true;
    apiClient.get('/users/me/follow-requests').then(data => {
      if (active) setRequests(data?.requests || []);
    }).catch(() => {
      if (active) toast.error('Error al cargar solicitudes');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);
  const handleAction = useCallback(async (requestId, action) => {
    setProcessing(prev => new Set([...prev, requestId]));
    try {
      await apiClient.post(`/users/me/follow-requests/${requestId}/${action}`);
      setRequests(prev => prev.filter(r => r.request_id !== requestId));
      toast.success(action === 'accept' ? 'Solicitud aceptada' : 'Solicitud rechazada');
    } catch {
      toast.error(i18n.t('follow_requests.errorAlProcesarLaSolicitud', 'Error al procesar la solicitud'));
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  }, []);
  return <div className="min-h-screen bg-[#fafaf9]">
      {/* Topbar */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-950">
          <ArrowLeft size={22} />
        </button>
        <span className="text-[17px] font-bold text-stone-950">Solicitudes de seguimiento</span>
      </div>

      <div className="mx-auto max-w-[600px] px-4 py-4">
        {loading ? <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-stone-400" />
          </div> : requests.length === 0 ? <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100">
              <UserPlus size={28} className="text-stone-400" />
            </div>
            <p className="text-[15px] font-semibold text-stone-950">Sin solicitudes pendientes</p>
            <p className="mt-1 text-[13px] text-stone-500">
              Cuando alguien quiera seguirte, aparecerá aquí
            </p>
          </div> : <div className="flex flex-col gap-2">
            {requests.map(req => {
          const u = req.requester;
          const isProcessing = processing.has(req.request_id);
          return <div key={req.request_id} className="flex items-center gap-3 rounded-2xl shadow-sm bg-white px-4 py-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-stone-100">
                    {u.profile_image ? <img loading="lazy" src={u.profile_image} alt={u.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-sm font-bold text-stone-400">
                        {(u.name || '?')[0].toUpperCase()}
                      </div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-stone-950">{u.name}</p>
                    <p className="text-[11px] text-stone-500">@{u.username || 'usuario'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction(req.request_id, 'accept')} disabled={isProcessing} aria-label={`Aceptar solicitud de ${u.name}`} className="flex min-h-[44px] items-center gap-1 rounded-full bg-stone-950 px-4 text-[12px] font-semibold text-white border-none cursor-pointer hover:bg-stone-800 disabled:opacity-50 transition-colors">
                      {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Aceptar
                    </button>
                    <button onClick={() => handleAction(req.request_id, 'reject')} disabled={isProcessing} aria-label={`Rechazar solicitud de ${u.name}`} className="flex min-h-[44px] items-center justify-center rounded-full border border-stone-200 bg-white px-3 text-stone-500 cursor-pointer hover:bg-stone-50 disabled:opacity-50 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                </div>;
        })}
          </div>}
      </div>
    </div>;
}