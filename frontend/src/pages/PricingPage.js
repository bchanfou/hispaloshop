import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { CheckCircle, ArrowRight, Star, Loader2, Zap, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import apiClient from '../services/api/client';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const isSeller = user?.role === 'producer' || user?.role === 'importer';
  const sellerSignupPath = '/productor/registro';

  useEffect(() => {
    fetchPlans();
  }, [user, isSeller]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const plansData = await apiClient.get('/sellers/plans');
      setPlans(plansData.plans || []);
      if (isSeller) {
        const planData = await apiClient.get('/sellers/me/plan');
        setCurrentPlan(planData);
      } else {
        setCurrentPlan(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSellerEntry = () => {
    if (!user) {
      navigate(sellerSignupPath);
      return;
    }

    if (isSeller) {
      navigate('/producer');
      return;
    }

    navigate('/productor');
  };

  const handleSubscribe = async (planKey) => {
    if (!user) {
      navigate(sellerSignupPath);
      return;
    }

    if (!isSeller) {
      toast.error('Estos planes son solo para productores e importadores.');
      navigate('/productor');
      return;
    }

    setSubscribing(planKey);
    try {
      if (planKey === 'FREE') {
        if (currentPlan?.plan && currentPlan.plan !== 'FREE') {
          const data = await apiClient.post('/sellers/me/plan/change', { plan: 'FREE' });
          toast.success(data?.message || 'Plan cambiado a FREE.');
          await fetchPlans();
        } else {
          navigate('/producer');
        }
        return;
      }

      if (currentPlan?.stripe_subscription_id && currentPlan?.plan && currentPlan.plan !== 'FREE') {
        const data = await apiClient.post('/sellers/me/plan/change', { plan: planKey });
        toast.success(data?.message || `Plan actualizado a ${planKey}.`);
        await fetchPlans();
        return;
      }

      const data = await apiClient.post('/sellers/me/plan/subscribe', { plan: planKey });
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.error('No se pudo iniciar el pago. Intentalo otra vez.');
      }
    } catch (err) {
      toast.error(err.message || 'Error');
    } finally {
      setSubscribing(null);
    }
  };

  const getPlanActionLabel = (planKey) => {
    if (planKey === 'FREE') {
      if (!user) return 'Crear cuenta de vendedor';
      if (!isSeller) return 'Ver como vender';
      return currentPlan?.plan === 'FREE' ? t('pricing.currentPlanBtn') : 'Pasar a FREE';
    }

    if (!user) return 'Crear cuenta y continuar';
    if (!isSeller) return 'Ver planes para vender';
    if (currentPlan?.plan === 'FREE' || !currentPlan?.stripe_subscription_id) return 'Empezar prueba y pagar';
    return `Cambiar a ${planKey}`;
  };

  const icons = { FREE: Star, PRO: Zap, ELITE: Crown };

  if (loading) return (
    <div className="min-h-screen bg-stone-50"><Header /><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div></div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <BackButton />
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">{t('pricing.tagline')}</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-stone-950 mb-3">{t('pricing.title')}</h1>
          <p className="text-stone-500 text-sm max-w-lg mx-auto">{t('pricing.subtitle')}</p>
        </div>

        <div className="mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">Acceso a planes</p>
            <h2 className="mt-2 text-xl font-semibold text-stone-950">
              {isSeller
                ? 'Gestiona tu suscripción y cambia de plan cuando quieras.'
                : user
                  ? 'Tu cuenta actual no es de vendedor.'
                  : 'Crea una cuenta de vendedor para contratar un plan.'}
            </h2>
            <p className="mt-2 text-sm text-stone-500 max-w-2xl">
              {isSeller
                ? 'Si eliges un plan de pago, te llevamos directamente al checkout correspondiente.'
                : user
                  ? 'Estos planes están reservados para productores e importadores. Te llevo a la página de vendedor para que sigas el flujo correcto.'
                  : 'Los planes de esta página son para productores e importadores. El alta gratuita también arranca desde el registro de vendedor.'}
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row md:mt-0">
            <button
              type="button"
              onClick={handleSellerEntry}
              className="inline-flex items-center justify-center rounded-xl h-11 bg-stone-950 px-5 text-sm font-medium text-white transition-colors hover:bg-stone-800"
            >
              {isSeller ? 'Ir a mi panel' : user ? 'Ver página de vendedor' : 'Crear cuenta de vendedor'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="inline-flex items-center justify-center rounded-xl h-11 border border-stone-200 bg-white px-5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Hablar con ventas
            </button>
          </div>
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
                  isRecommended ? 'border-stone-950 shadow-lg scale-[1.02]' : 'border-stone-200'
                } ${isCurrent ? 'ring-2 ring-stone-950/20' : ''}`}
                data-testid={`plan-${plan.key}`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-950 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    {t('pricing.mostPopular')}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 bg-stone-700 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {t('pricing.currentPlan')}
                  </div>
                )}

                <div className="mb-4">
                  <Icon className={`w-8 h-8 mb-3 ${isRecommended ? 'text-stone-950' : 'text-stone-500'}`} />
                  <h3 className="text-xl font-semibold text-stone-950">{plan.label}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-stone-950">{plan.price === 0 ? 'Gratis' : `${plan.price} €`}</span>
                    {plan.price > 0 && <span className="text-sm text-stone-500">/{t('pricing.month')} + IVA</span>}
                  </div>
                  {plan.price_with_vat && (
                    <p className="text-xs text-stone-500 mt-0.5">~{plan.price_with_vat.toFixed(2)} € con IVA</p>
                  )}
                  <p className="text-sm text-stone-700 font-medium mt-1">{t('pricing.commission')}: {plan.commission}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-stone-950">
                      <CheckCircle className="w-4 h-4 text-stone-700 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl h-11 border border-stone-200 bg-white text-sm font-medium text-stone-400 opacity-60 cursor-not-allowed"
                  >
                    {t('pricing.currentPlanBtn')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={subscribing === plan.key}
                    className={`w-full inline-flex items-center justify-center gap-1 rounded-xl h-11 text-sm font-medium transition-colors disabled:opacity-60 ${
                      plan.key === 'FREE'
                        ? 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                        : 'bg-stone-950 text-white hover:bg-stone-800'
                    }`}
                  >
                    {subscribing === plan.key ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>{getPlanActionLabel(plan.key)} <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-sm font-semibold text-stone-950">1. Suscripción</p>
            <p className="mt-2 text-sm text-stone-500">Seleccionas plan, validamos tu rol de vendedor y abrimos el flujo correcto.</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-sm font-semibold text-stone-950">2. Pago seguro</p>
            <p className="mt-2 text-sm text-stone-500">Los planes de pago usan checkout seguro de Stripe con tarjeta y periodo de prueba si aplica.</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-sm font-semibold text-stone-950">3. Activación</p>
            <p className="mt-2 text-sm text-stone-500">Despues del pago o cambio de plan, actualizamos tu comisión y el panel queda listo para operar.</p>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-stone-500">
          <p>{t('pricing.trialNote')}</p>
          <p className="mt-1">{t('pricing.commissionNote')}</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
