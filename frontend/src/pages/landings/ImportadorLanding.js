import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Globe,
  Loader2,
  Search,
  ShieldCheck,
  Ship,
  Star,
  Store,
  Users,
  Wallet,
  Zap,
  Crown,
} from 'lucide-react';
import SEOHead from '../../components/landings/SEOHead';
import NavbarLanding from '../../components/landings/NavbarLanding';
import FooterLanding from '../../components/landings/FooterLanding';
import LandingSectionNav from '../../components/landings/LandingSectionNav';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { API } from '../../utils/api';

const NAV_ITEMS = [
  { label: 'Resumen', href: '#hero' },
  { label: 'Sourcing', href: '#sourcing' },
  { label: 'Planes', href: '#plans' },
  { label: 'Pago', href: '#payment' },
  { label: 'Requisitos', href: '#requirements' },
];

const SOURCING_BENEFITS = [
  {
    icon: Search,
    title: 'Busqueda con criterio',
    description: 'Encuentra productores filtrando categoria, pais, capacidad y encaje comercial.',
  },
  {
    icon: Globe,
    title: 'Red de origen',
    description: 'Opera con productores verificados para sourcing nacional o internacional.',
  },
  {
    icon: BarChart3,
    title: 'Decision informada',
    description: 'Compara oportunidades y aterriza mejor cada compra o ampliacion de catalogo.',
  },
  {
    icon: Ship,
    title: 'Operativa B2B',
    description: 'Tu equipo centraliza contactos, documentos y seguimiento desde la plataforma.',
  },
];

const PAYMENT_STEPS = [
  {
    icon: Users,
    title: 'Alta de importador',
    description: 'Primero activas una cuenta importador con el registro valido y tus datos de empresa.',
  },
  {
    icon: CreditCard,
    title: 'Suscripcion segura',
    description: 'Si eliges un plan de pago, abrimos checkout de Stripe o aplicamos cambio de plan segun tu estado.',
  },
  {
    icon: Wallet,
    title: 'Acceso activado',
    description: 'El plan queda asociado a tu cuenta y gestionas comision, panel y operativa desde el dashboard.',
  },
];

const REQUIREMENTS = [
  'Empresa registrada y datos fiscales completos',
  'Perfil comercial y mercados objetivo definidos',
  'Capacidad para validar proveedores y pedidos',
  'Flujo documental y financiero ordenado',
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5 },
};

const PLAN_ICONS = {
  FREE: Star,
  PRO: Zap,
  ELITE: Crown,
};

export default function ImportadorLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const isSeller = user?.role === 'producer' || user?.role === 'importer';
  const isImporter = user?.role === 'importer';
  const importerSignupPath = '/importer/register?redirect=/pricing';

  useEffect(() => {
    fetchPlans();
  }, [user, isSeller]);

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await axios.get(`${API}/sellers/plans`);
      setPlans(res.data.plans || []);
      if (isSeller) {
        const planRes = await axios.get(`${API}/sellers/me/plan`, { withCredentials: true });
        setCurrentPlan(planRes.data);
      } else {
        setCurrentPlan(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleMainEntry = () => {
    if (!user) {
      navigate(importerSignupPath);
      return;
    }

    if (isSeller) {
      navigate('/producer');
      return;
    }

    toast.error('Tu cuenta actual no tiene acceso comercial. Te llevo al equipo para activarla.');
    navigate('/contact');
  };

  const handleCatalogEntry = () => {
    if (!user) {
      navigate(importerSignupPath);
      return;
    }

    if (isImporter) {
      navigate('/b2b/marketplace');
      return;
    }

    if (isSeller) {
      navigate('/producer');
      return;
    }

    navigate('/contact');
  };

  const handlePlanAction = async (planKey) => {
    if (!user) {
      navigate(importerSignupPath);
      return;
    }

    if (!isSeller) {
      toast.error('Necesitas una cuenta comercial para contratar un plan.');
      navigate('/contact');
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
        toast.error('No se pudo abrir el checkout. Intentalo otra vez.');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar la suscripcion.');
    } finally {
      setSubscribing(null);
    }
  };

  const getPlanActionLabel = (planKey) => {
    if (planKey === 'FREE') {
      if (!user) return 'Crear cuenta importador';
      if (!isSeller) return 'Hablar con soporte';
      return currentPlan?.plan === 'FREE' ? 'Plan actual' : 'Pasar a FREE';
    }

    if (!user) return 'Registrarme y seguir';
    if (!isSeller) return 'Activar acceso comercial';
    if (currentPlan?.plan === 'FREE' || !currentPlan?.stripe_subscription_id) return 'Suscribirme y pagar';
    return `Cambiar a ${planKey}`;
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-[#142132]">
      <SEOHead
        title="Programa para importadores Hispaloshop"
        description="Landing para importadores con sourcing, planes, suscripcion y pago seguro."
        keywords="importador hispaloshop, sourcing b2b, suscripcion importador, pago stripe marketplace"
      />

      <NavbarLanding extraLinks={[{ label: 'Planes', href: '#plans' }, { label: 'Pago', href: '#payment' }]} />
      <LandingSectionNav items={NAV_ITEMS} />

      <main>
        <section id="hero" className="relative overflow-hidden bg-[#0b2e4f] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(230,165,50,0.18),_transparent_30%)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div>
                <motion.p {...fadeUp} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
                  <Globe className="h-4 w-4" />
                  Sourcing B2B con suscripcion clara y flujo comercial ordenado
                </motion.p>
                <motion.h1 {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                  Encuentra proveedores validos y gestiona tu plan comercial sin friccion.
                </motion.h1>
                <motion.p {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="mt-5 max-w-2xl text-lg text-white/75">
                  Hispaloshop te permite descubrir productores, activar cuenta importador y contratar tu plan con checkout seguro.
                </motion.p>

                <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }} className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCatalogEntry}
                    className="rounded-full bg-[#22c1d6] px-6 py-3 font-semibold text-[#0b2e4f] transition-colors hover:bg-[#39d3e6]"
                  >
                    {isImporter ? 'Ver marketplace B2B' : 'Crear cuenta importador'}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTo('plans')}
                    className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Ver suscripcion y pago
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/contact')}
                    className="rounded-full border border-transparent px-6 py-3 font-semibold text-white/80 transition-colors hover:text-white"
                  >
                    Hablar con equipo
                  </button>
                </motion.div>

                <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.2 }} className="mt-10 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-3xl font-bold">B2B</p>
                    <p className="mt-1 text-sm text-white/70">Sourcing, contacto y seguimiento desde una sola cuenta.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-3xl font-bold">FREE</p>
                    <p className="mt-1 text-sm text-white/70">Entrada inicial para activar cuenta y evaluar operativa.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-3xl font-bold">Stripe</p>
                    <p className="mt-1 text-sm text-white/70">Pago seguro cuando subes a plan de pago o cambias de nivel.</p>
                  </div>
                </motion.div>
              </div>

              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur">
                <div className="rounded-2xl bg-white p-5 text-[#142132] shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <div>
                      <p className="text-sm font-medium text-stone-500">Ruta comercial</p>
                      <h2 className="mt-1 text-2xl font-bold">Alta, plan y acceso operativo</h2>
                    </div>
                    <div className="rounded-full bg-[#e0f7fa] p-3 text-[#0b7285]">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-2xl bg-stone-50 p-4">
                      <span className="text-sm text-stone-600">Registro importador</span>
                      <span className="text-lg font-semibold">Ruta activa</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-stone-50 p-4">
                      <span className="text-sm text-stone-600">Suscripcion de pago</span>
                      <span className="text-lg font-semibold">Stripe Checkout</span>
                    </div>
                    <div className="rounded-2xl bg-[#142132] p-5 text-white">
                      <p className="text-sm text-white/65">Cambio de plan</p>
                      <p className="mt-1 text-3xl font-bold">FREE / PRO / ELITE</p>
                      <p className="mt-2 text-sm text-white/70">El sistema decide si toca checkout nuevo o cambio sobre una suscripcion existente.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollTo('payment')}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0b7285] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#095e6d]"
                    >
                      Ver como pagas
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/55">
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </div>
        </section>

        <section id="sourcing" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0b7285]">Sourcing</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Lo que un importador necesita para decidir mejor</h2>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mt-10 grid gap-6 md:grid-cols-4">
              {SOURCING_BENEFITS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[24px] border border-stone-200 bg-[#f4f6fb] p-6">
                    <div className="inline-flex rounded-2xl bg-[#0b2e4f] p-3 text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="plans" className="bg-[#f4f6fb] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0b7285]">Planes</p>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Suscripcion importador con datos del backend</h2>
                <p className="mt-3 max-w-2xl text-sm text-stone-600">
                  Los precios, la comision y el flujo de alta salen del sistema activo. Desde aqui puedes arrancar o cambiar el plan directamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#0b7285] transition-colors hover:text-[#095e6d]"
              >
                Ver detalle completo
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            {loadingPlans ? (
              <div className="flex justify-center py-14">
                <Loader2 className="h-6 w-6 animate-spin text-[#0b7285]" />
              </div>
            ) : (
              <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mt-10 grid gap-5 lg:grid-cols-3">
                {plans.map((plan) => {
                  const Icon = PLAN_ICONS[plan.key] || Star;
                  const isCurrent = currentPlan?.plan === plan.key;
                  const isRecommended = plan.recommended;

                  return (
                    <article
                      key={plan.key}
                      className={`relative rounded-[28px] border p-6 ${
                        isRecommended ? 'border-[#0b7285] bg-white shadow-lg' : 'border-stone-200 bg-white'
                      } ${isCurrent ? 'ring-2 ring-[#0b7285]/20' : ''}`}
                    >
                      {isRecommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#0b7285] px-4 py-1 text-xs font-semibold text-white">
                          Recomendado
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-3 right-4 rounded-full bg-[#142132] px-3 py-1 text-xs font-semibold text-white">
                          Tu plan
                        </div>
                      )}

                      <Icon className={`h-8 w-8 ${isRecommended ? 'text-[#0b7285]' : 'text-stone-500'}`} />
                      <h3 className="mt-4 text-2xl font-semibold text-stone-900">{plan.label}</h3>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-stone-900">{plan.price === 0 ? 'Gratis' : `${plan.price} EUR`}</span>
                        {plan.price > 0 && <span className="text-sm text-stone-500">/mes + IVA</span>}
                      </div>
                      {plan.price_with_vat && <p className="mt-1 text-xs text-stone-500">Total estimado con IVA: {plan.price_with_vat.toFixed(2)} EUR</p>}
                      <p className="mt-3 text-sm font-medium text-[#0b7285]">Comision en plataforma: {plan.commission}</p>

                      <ul className="mt-6 space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm text-stone-600">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0b7285]" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        type="button"
                        onClick={() => !isCurrent && handlePlanAction(plan.key)}
                        disabled={isCurrent || subscribing === plan.key}
                        className={`mt-8 w-full rounded-full px-5 py-3 font-semibold transition-colors ${
                          isCurrent
                            ? 'cursor-not-allowed bg-stone-100 text-stone-400'
                            : plan.key === 'FREE'
                              ? 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
                              : 'bg-[#142132] text-white hover:bg-[#1b2f48]'
                        }`}
                      >
                        {subscribing === plan.key ? 'Procesando...' : getPlanActionLabel(plan.key)}
                      </button>
                    </article>
                  );
                })}
              </motion.div>
            )}
          </div>
        </section>

        <section id="payment" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0b7285]">Pago y suscripcion</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Como funciona el cobro del plan comercial</h2>
              <p className="mx-auto mt-4 max-w-2xl text-stone-600">
                No dejamos botones mudos ni rutas falsas: el sistema distingue entre alta, suscripcion nueva y cambio de plan.
              </p>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mt-10 grid gap-6 md:grid-cols-3">
              {PAYMENT_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-[26px] border border-stone-200 bg-[#f4f6fb] p-6">
                    <div className="inline-flex rounded-2xl bg-[#142132] p-3 text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{step.description}</p>
                  </div>
                );
              })}
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="mt-8 rounded-[30px] bg-[#142132] p-8 text-white">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#22c1d6]">Checkout real</p>
                  <h3 className="mt-3 text-3xl font-bold">Stripe procesa el pago cuando hace falta y el sistema reutiliza tu suscripcion cuando ya existe</h3>
                  <div className="mt-6 space-y-3 text-sm text-white/75">
                    <p>Si todavia no tienes suscripcion activa, el plan de pago abre checkout de Stripe.</p>
                    <p>Si ya estabas en PRO o ELITE, cambiamos de plan sin forzarte otra compra duplicada.</p>
                    <p>Si bajas a FREE, el downgrade se registra correctamente en vez de dejar un enlace muerto.</p>
                  </div>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-sm text-white/70">Metodo</span>
                    <span className="font-semibold">Tarjeta via Stripe</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-sm text-white/70">Cambio de plan</span>
                    <span className="font-semibold">Sin duplicar suscripcion</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-sm text-white/70">Destino</span>
                    <span className="font-semibold">Panel comercial</span>
                  </div>
                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => scrollTo('plans')}
                      className="rounded-full bg-[#22c1d6] px-5 py-3 font-semibold text-[#0b2e4f] transition-colors hover:bg-[#39d3e6]"
                    >
                      Elegir plan ahora
                    </button>
                    <button
                      type="button"
                      onClick={handleMainEntry}
                      className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      {isSeller ? 'Ir a mi panel' : 'Activar cuenta comercial'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="requirements" className="bg-[#f4f6fb] py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0b7285]">Requisitos</p>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Lo minimo para operar como importador sin ruido</h2>
                <p className="mt-4 text-sm leading-6 text-stone-600">
                  Si tu empresa y tu flujo financiero estan ordenados, puedes entrar, revisar proveedores y activar plan sin desviarte del camino.
                </p>
              </div>
              <div className="rounded-[30px] border border-stone-200 bg-white p-6">
                <div className="space-y-4">
                  {REQUIREMENTS.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0b7285]" />
                      <span className="text-sm text-stone-700">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-2xl bg-[#eaf6fa] p-5">
                  <p className="text-sm font-semibold text-[#0b7285]">Siguiente paso recomendado</p>
                  <p className="mt-2 text-sm text-stone-700">
                    Activa tu cuenta de importador, revisa planes y deja el checkout preparado para cuando subas a PRO o ELITE.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleMainEntry}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0b7285] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#095e6d]"
                    >
                      Empezar ahora
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCatalogEntry}
                      className="rounded-full border border-stone-300 px-5 py-3 font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                    >
                      Ver flujo B2B
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <FooterLanding />
    </div>
  );
}
