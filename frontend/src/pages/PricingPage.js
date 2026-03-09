import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Button } from '../components/ui/button';
import { CheckCircle, ArrowRight, Star, Loader2, Zap, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { API } from '../utils/api';

export default function PricingPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API}/sellers/plans`);
      setPlans(res.data.plans || []);
      if (user?.role === 'producer' || user?.role === 'importer') {
        const planRes = await axios.get(`${API}/sellers/me/plan`, { withCredentials: true });
        setCurrentPlan(planRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planKey) => {
    if (!user) { window.location.href = '/register'; return; }
    if (planKey === 'FREE') return;
    setSubscribing(planKey);
    try {
      const res = await axios.post(`${API}/sellers/me/plan/subscribe`, { plan: planKey }, { withCredentials: true });
      if (res.data.checkout_url) window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    } finally {
      setSubscribing(null);
    }
  };

  const icons = { FREE: Star, PRO: Zap, ELITE: Crown };

  if (loading) return (
    <div className="min-h-screen bg-[#FAF7F2]"><Header /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div></div>
  );

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <BackButton />
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-[#2D5A27] uppercase tracking-widest mb-2">{t('pricing.tagline')}</p>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-[#1C1C1C] mb-3">{t('pricing.title')}</h1>
          <p className="text-[#666] text-sm max-w-lg mx-auto">{t('pricing.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" data-testid="pricing-grid">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.plan === plan.key;
            const isRecommended = plan.recommended;
            const Icon = icons[plan.key] || Star;

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col ${
                  isRecommended ? 'border-[#2D5A27] shadow-lg scale-[1.02]' : 'border-stone-200'
                } ${isCurrent ? 'ring-2 ring-[#2D5A27]/30' : ''}`}
                data-testid={`plan-${plan.key}`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2D5A27] text-white text-xs font-semibold px-4 py-1 rounded-full">
                    {t('pricing.mostPopular')}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {t('pricing.currentPlan')}
                  </div>
                )}

                <div className="mb-4">
                  <Icon className={`w-8 h-8 mb-3 ${isRecommended ? 'text-[#2D5A27]' : 'text-[#666]'}`} />
                  <h3 className="font-heading text-xl font-semibold text-[#1C1C1C]">{plan.label}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-[#1C1C1C]">{plan.price === 0 ? 'Gratis' : `${plan.price} €`}</span>
                    {plan.price > 0 && <span className="text-sm text-[#666]">/{t('pricing.month')} + IVA</span>}
                  </div>
                  {plan.price_with_vat && (
                    <p className="text-xs text-[#999] mt-0.5">~{plan.price_with_vat.toFixed(2)} € con IVA</p>
                  )}
                  <p className="text-sm text-[#2D5A27] font-medium mt-1">{t('pricing.commission')}: {plan.commission}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#444]">
                      <CheckCircle className="w-4 h-4 text-[#2D5A27] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full rounded-xl h-11 opacity-60">{t('pricing.currentPlanBtn')}</Button>
                ) : plan.key === 'FREE' ? (
                  <Link to={user ? '/producer' : '/register'}>
                    <Button variant="outline" className="w-full rounded-xl h-11">
                      {user ? t('pricing.switchToFree') : t('pricing.createFreeAccount')}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={subscribing === plan.key}
                    className={`w-full rounded-xl h-11 ${isRecommended ? 'bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white' : 'bg-[#1C1C1C] hover:bg-[#333] text-white'}`}
                  >
                    {subscribing === plan.key ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>{currentPlan ? t('pricing.upgrade') : t('pricing.freeTrial')} <ArrowRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center text-xs text-[#999]">
          <p>{t('pricing.trialNote')}</p>
          <p className="mt-1">{t('pricing.commissionNote')}</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
