import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Check, X, Inbox, AlertCircle } from 'lucide-react';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import i18n from '../../locales/i18n';

interface ChatRequest {
  request_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  preview: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export default function ChatRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/internal-chat/requests?status=pending');
      setRequests(data?.requests || []);
    } catch (e) {
      // Silent error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user, loadRequests]);

  const handleAccept = async (requestId: string) => {
    if (processing.has(requestId)) return;
    
    setProcessing(prev => new Set(prev).add(requestId));
    try {
      const data = await apiClient.post(`/internal-chat/requests/${requestId}/accept`, {});
      
      if (data?.conversation_id) {
        toast.success(i18n.t('chat.requestAccepted', 'Solicitud aceptada'));
        // Remove from list
        setRequests(prev => prev.filter(r => r.request_id !== requestId));
        // Navigate to conversation
        navigate(`/messages/${data.conversation_id}`, { replace: true });
      }
    } catch (e) {
      toast.error(i18n.t('chat.errorAcceptingRequest', 'Error al aceptar la solicitud'));
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const handleDecline = async (requestId: string) => {
    if (processing.has(requestId)) return;
    
    setProcessing(prev => new Set(prev).add(requestId));
    try {
      await apiClient.post(`/internal-chat/requests/${requestId}/decline`, {});
      
      toast.success(i18n.t('chat.requestDeclined', 'Solicitud rechazada'));
      // Remove from list
      setRequests(prev => prev.filter(r => r.request_id !== requestId));
    } catch (e) {
      toast.error(i18n.t('chat.errorDecliningRequest', 'Error al rechazar la solicitud'));
    } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return i18n.t('common.yesterday', 'Ayer');
    }
    if (diffDays < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    }
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white font-apple md:static md:min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-100 bg-white/95 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-stone-950 active:bg-stone-100"
            aria-label="Volver"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-stone-950">
            {i18n.t('chat.messageRequests', 'Solicitudes de mensajes')}
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100">
              <Inbox size={32} className="text-stone-400" />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-stone-950">
              {i18n.t('chat.noRequests', 'Sin solicitudes')}
            </h2>
            <p className="mt-2 max-w-[280px] text-sm text-stone-500">
              {i18n.t('chat.requestsDescription', 'Los mensajes de personas que no sigues aparecerán aquí')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            <AnimatePresence mode="popLayout">
              {requests.map((request) => (
                <motion.div
                  key={request.request_id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex items-start gap-3 px-4 py-4"
                >
                  {/* Avatar */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-stone-200">
                    {request.sender_avatar ? (
                      <img
                        src={request.sender_avatar}
                        alt={request.sender_name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-stone-500">
                        {(request.sender_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-stone-950">
                        {request.sender_name}
                      </span>
                      <span className="shrink-0 text-xs text-stone-400">
                        {formatTime(request.created_at)}
                      </span>
                    </div>
                    
                    <p className="mt-1 line-clamp-2 text-sm text-stone-600">
                      {request.preview}
                    </p>

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(request.request_id)}
                        disabled={processing.has(request.request_id)}
                        className="flex items-center gap-1.5 rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white active:opacity-75 disabled:opacity-50"
                      >
                        <Check size={16} />
                        {i18n.t('common.accept', 'Aceptar')}
                      </button>
                      <button
                        onClick={() => handleDecline(request.request_id)}
                        disabled={processing.has(request.request_id)}
                        className="flex items-center gap-1.5 rounded-full bg-stone-200 px-4 py-2 text-sm font-medium text-stone-700 active:bg-stone-300 disabled:opacity-50"
                      >
                        <X size={16} />
                        {i18n.t('common.decline', 'Rechazar')}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Info footer */}
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-stone-400">
              <AlertCircle size={14} />
              <span>
                {i18n.t('chat.requestsAutoDelete', 'Las solicitudes expiran después de 30 días')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
