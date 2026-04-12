// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Globe, TrendingUp, Lock, MessageCircle, Loader2, Crown, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { useChatContext } from '../../context/chat/ChatProvider';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

export default function ImporterOpportunitiesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openConversation } = useChatContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fulfilledIds, setFulfilledIds] = useState(new Set());

  const handleFulfill = async (opp) => {
    const confirmMsg = t('importer.opportunities.fulfillConfirm', '¿Confirmar que {{product}} ya está disponible en {{country}}?')
      .replace('{{product}}', opp.product_name).replace('{{country}}', opp.consumer_country);
    if (!window.confirm(confirmMsg)) return;
    try {
      const res = await apiClient.post(`/market-requests/${opp.product_id}/fulfill`, { country: opp.consumer_country });
      const notified = res?.notified || res?.data?.notified || 0;
      setFulfilledIds(prev => new Set([...prev, opp.product_id]));
      toast.success(t('importer.opportunities.fulfilled', '{{n}} usuarios seran notificados').replace('{{n}}', notified));
      trackEvent('market_opportunity_fulfilled', { product_id: opp.product_id, country: opp.consumer_country, notified });
    } catch {
      toast.error('Error');
    }
  };

  useEffect(() => {
    apiClient.get('/market-requests/opportunities')
      .then(setData)
      .catch(() => setData({ opportunities: [], total: 0, plan: 'FREE', is_teaser: true }))
      .finally(() => setLoading(false));
    trackEvent('market_opportunities_viewed', { plan: user?.subscription?.plan || 'FREE', country: user?.country });
  }, []);

  const handleContact = async (opp) => {
    if (!user) return;
    trackEvent('market_opportunity_contacted', { product_id: opp.product_id, producer_id: opp.producer_id });
    try {
      const conv = await openConversation(opp.producer_id, 'b2b');
      const cid = conv?.id || conv?.conversation_id;
      if (cid) navigate(`/messages/${cid}`);
    } catch {
      toast.error('No se pudo abrir el chat');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-stone-500" />
      </div>
    );
  }

  const opps = data?.opportunities || [];
  const isTeaser = data?.is_teaser;
  const plan = (data?.plan || 'FREE').toUpperCase();
  const isElite = plan === 'ELITE';

  return (
    <div className="max-w-[975px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-950 flex items-center gap-2">
          <Globe className="w-6 h-6" /> {t('marketOpportunities.title', 'Oportunidades de mercado')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('marketOpportunities.subtitle', 'Productos que los consumidores de tu pais estan pidiendo.')}
        </p>
      </div>

      {isElite && (
        <div className="flex items-center gap-2 bg-stone-950 text-white rounded-2xl px-4 py-2.5">
          <Crown className="w-4 h-4" />
          <span className="text-xs font-semibold">{t('marketOpportunities.eliteAdvantage', 'Acceso prioritario: ves oportunidades 72h antes que el resto.')}</span>
        </div>
      )}

      {opps.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Globe className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-sm text-stone-500">{t('marketOpportunities.empty', 'No hay solicitudes en tu mercado todavia. Vuelve pronto.')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {opps.map((opp, i) => (
            <div key={`${opp.product_id}-${i}`} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
              {opp.product_image && <img src={opp.product_image} alt="" className="w-14 h-14 rounded-2xl object-cover shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-950 truncate">{opp.product_name}</p>
                <p className="text-xs text-stone-500">
                  {opp.count} solicitudes desde {opp.consumer_country}
                  {opp.producer_name && ` -- ${opp.producer_name}`}
                </p>
                {opp.consumer_notes && opp.consumer_notes.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {opp.consumer_notes.slice(0, 3).map((note, ni) => (
                      <span key={ni} className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                        "{note}"
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-lg font-bold text-stone-950">{opp.count}</span>
                {fulfilledIds.has(opp.product_id) ? (
                  <span className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-stone-400 bg-stone-100 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('importer.opportunities.done', 'Cumplida')}
                  </span>
                ) : <>
                  <button onClick={() => handleFulfill(opp)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-stone-100 text-stone-700 rounded-full hover:bg-stone-200 transition-colors min-h-[36px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('importer.opportunities.fulfill', 'Ya lo introduje')}
                  </button>
                  {opp.producer_id && (
                    <button onClick={() => handleContact(opp)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-stone-950 text-white rounded-full hover:bg-stone-800 transition-colors min-h-[36px]">
                      <MessageCircle className="w-3.5 h-3.5" /> {t('marketOpportunities.contact', 'Contactar')}
                    </button>
                  )}
                </>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isTeaser && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-stone-950 mb-2">{t('marketOpportunities.seeMore', 'Quieres ver todas las oportunidades?')}</p>
          <p className="text-xs text-stone-500 mb-4">{t('marketOpportunities.upgradeCta', 'Actualiza a PRO para ver la lista completa.')}</p>
          <Link to="/producer/plan" className="px-5 py-2.5 bg-stone-950 text-white rounded-full text-sm font-semibold hover:bg-stone-800 transition-colors inline-block no-underline">
            {t('marketOpportunities.viewPlans', 'Ver planes')}
          </Link>
        </div>
      )}
    </div>
  );
}
