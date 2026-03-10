import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      const res = await axios.get(`${API}/sellers/plans`);
      setPlans(res.data.plans || []);
      if (isSeller) {
        const planRes = await axios.get(`${API}/sellers/me/plan`, { withCredentials: true });
        setCurrentPlan(planRes.data);
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
      navigate(`/productor/registro?plan=${String(planKey || 'free').toLowerCase()}`);
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
          const res = await axios.post(`${API}/sellers/me/plan/change`, { plan: 'FREE' }, { withCredentials: true });
          toast.success(res.data?.message || 'Plan cambiado a FREE.');
          await fetchPlans();
        } else {
          navigate('/producer');
        }
        return;
      }

      if (currentPlan?.stripe_subscription_id && currentPlan?.plan && currentPlan.plan !== 'FREE') {
        const res = await axios.post(`${API}/sellers/me/plan/change`, { plan: planKey }, { withCredentials: true });
        toast.success(res.data?.message || `Plan actualizado a ${planKey}.`);
        await fetchPlans();
        return;
      }

      const res = await axios.post(`${API}/sellers/me/plan/subscribe`, { plan: planKey }, { withCredentials: true });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        toast.error('No se pudo iniciar el pago. Intentalo otra vez.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
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
          <p className="text-xs font-semibold text-accent uppercase tracking-widest mb-2">{t('pricing.tagline')}</p>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-primary mb-3">{t('pricing.title')}</h1>
          <p className="text-text-muted text-sm max-w-lg mx-auto">{t('pricing.subtitle')}</p>
        </div>

        <div className="mb-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Acceso a planes</p>
            <h2 className="mt-2 text-xl font-semibold text-primary">
              {isSeller
                ? 'Gestiona tu suscripcion y cambia de plan cuando quieras.'
                : user
                  ? 'Tu cuenta actual no es de vendedor.'
                  : 'Crea una cuenta de vendedor para contratar un plan.'}
            </h2>
            <p className="mt-2 text-sm text-text-muted max-w-2xl">
              {isSeller
                ? 'Si eliges un plan de pago, te llevamos directamente al checkout correspondiente.'
                : user
                  ? 'Estos planes estan reservados para productores e importadores. Te llevo a la pagina de vendedor para que sigas el flujo correcto.'
                  : 'Los planes de esta pagina son para productores e importadores. El alta gratuita tambien arranca desde el registro de vendedor.'}
            </p>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Button onClick={handleSellerEntry} className="rounded-xl h-11 bg-primary hover:bg-primary-hover text-white">
              {isSeller ? 'Ir a mi panel' : user ? 'Ver pagina de vendedor' : 'Crear cuenta de vendedor'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/contact')} className="rounded-xl h-11">
              Hablar con ventas
            </Button>
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
                  isRecommended ? 'border-accent shadow-lg scale-[1.02]' : 'border-stone-200'
                } ${isCurrent ? 'ring-2 ring-accent/30' : ''}`}
                data-testid={`plan-${plan.key}`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-semibold px-4 py-1 rounded-full">
                    {t('pricing.mostPopular')}
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {t('pricing.currentPlan')}
                  </div>
                )}

                <div className="mb-4">
                  <Icon className={`w-8 h-8 mb-3 ${isRecommended ? 'text-accent' : 'text-text-muted'}`} />
                  <h3 className="font-heading text-xl font-semibold text-primary">{plan.label}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-bold text-primary">{plan.price === 0 ? 'Gratis' : `${plan.price} €`}</span>
                    {plan.price > 0 && <span className="text-sm text-text-muted">/{t('pricing.month')} + IVA</span>}
                  </div>
                  {plan.price_with_vat && (
                    <p className="text-xs text-text-muted mt-0.5">~{plan.price_with_vat.toFixed(2)} € con IVA</p>
                  )}
                  <p className="text-sm text-accent font-medium mt-1">{t('pricing.commission')}: {plan.commission}</p>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                      <CheckCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full rounded-xl h-11 opacity-60">{t('pricing.currentPlanBtn')}</Button>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={subscribing === plan.key}
                    variant={plan.key === 'FREE' ? 'outline' : 'default'}
                    className={`w-full rounded-xl h-11 ${plan.key === 'FREE' ? '' : isRecommended ? 'bg-primary hover:bg-primary-hover text-white' : 'bg-primary hover:bg-primary-hover text-white'}`}
                  >
                    {subscribing === plan.key ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>{getPlanActionLabel(plan.key)} <ArrowRight className="w-4 h-4 ml-1" /></>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-sm font-semibold text-primary">1. Suscripcion</p>
            <p className="mt-2 text-sm text-text-muted">Seleccionas plan, validamos tu rol de vendedor y abrimos el flujo correcto.</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-sm font-semibold text-primary">2. Pago seguro</p>
            <p className="mt-2 text-sm text-text-muted">Los planes de pago usan checkout seguro de Stripe con tarjeta y periodo de prueba si aplica.</p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-5">
            <p className="text-sm font-semibold text-primary">3. Activacion</p>
            <p className="mt-2 text-sm text-text-muted">Despues del pago o cambio de plan, actualizamos tu comision y el panel queda listo para operar.</p>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-text-muted">
          <p>{t('pricing.trialNote')}</p>
          <p className="mt-1">{t('pricing.commissionNote')}</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
