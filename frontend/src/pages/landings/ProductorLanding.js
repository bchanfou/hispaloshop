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
  ShieldCheck,
  Star,
  Store,
  Truck,
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
  { label: 'Ventajas', href: '#benefits' },
  { label: 'Planes', href: '#plans' },
  { label: 'Pago', href: '#payment' },
  { label: 'Requisitos', href: '#requirements' },
];

const BENEFITS = [
  {
    icon: Store,
    title: 'Tienda operativa',
    description: 'Catalogo, pedidos y visibilidad en marketplace desde una sola cuenta.',
  },
  {
    icon: Globe,
    title: 'Venta directa',
    description: 'Menos intermediarios, mas control sobre precio, marca y margen.',
  },
  {
    icon: BarChart3,
    title: 'Panel con datos',
    description: 'Ventas, conversion, paises y rendimiento en tiempo real.',
  },
  {
    icon: Truck,
    title: 'Logistica flexible',
    description: 'Configuras envios, paises y operativa segun tu capacidad real.',
  },
];

const PAYMENT_STEPS = [
  {
    icon: Users,
    title: 'Alta de vendedor',
    description: 'Primero activas tu cuenta de productor o importador con el registro correcto.',
  },
  {
    icon: CreditCard,
    title: 'Suscripcion segura',
    description: 'Eliges plan y abrimos checkout de Stripe solo cuando toca pagar o cambiar de nivel.',
  },
  {
    icon: Wallet,
    title: 'Activacion del plan',
    description: 'Actualizamos tu comision y dejas listo el panel para vender, cobrar y escalar.',
  },
];

const REQUIREMENTS = [
  'Datos fiscales y bancarios al dia',
  'Catalogo listo para publicarse',
  'Politica de envios definida',
  'Compromiso con calidad y trazabilidad',
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

export default function ProductorLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const isSeller = user?.role === 'producer' || user?.role === 'importer';
  const sellerSignupPath = '/vender/registro?redirect=/pricing';

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
      navigate(sellerSignupPath);
      return;
    }

    if (isSeller) {
      navigate('/producer');
      return;
    }

    toast.error('Tu cuenta actual no es de vendedor. Te llevo al equipo para activarla.');
    navigate('/contact');
  };

  const handlePlanAction = async (planKey) => {
    if (!user) {
      navigate(sellerSignupPath);
      return;
    }

    if (!isSeller) {
      toast.error('Necesitas una cuenta de productor o importador para contratar un plan.');
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
      if (!user) return 'Crear cuenta';
      if (!isSeller) return 'Hablar con soporte';
      return currentPlan?.plan === 'FREE' ? 'Plan actual' : 'Pasar a FREE';
    }

    if (!user) return 'Registrarme y seguir';
    if (!isSeller) return 'Necesito activar vendedor';
    if (currentPlan?.plan === 'FREE' || !currentPlan?.stripe_subscription_id) return 'Suscribirme y pagar';
    return `Cambiar a ${planKey}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#1a1a1a]">
      <SEOHead
        title="Programa para productores Hispaloshop"
        description="Landing para productores e importadores con informacion de planes, suscripcion y pago seguro."
        keywords="productor hispaloshop, vender online, planes marketplace, suscripcion productor"
      />

      <NavbarLanding extraLinks={[{ label: 'Planes', href: '#plans' }, { label: 'Pago', href: '#payment' }]} />
      <LandingSectionNav items={NAV_ITEMS} />

      <main>
        <section id="hero" className="relative overflow-hidden bg-[#173025] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(230,165,50,0.25),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.20),_transparent_28%)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <motion.p {...fadeUp} className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80">
                  <Store className="h-4 w-4" />
                  Venta directa con suscripcion clara y checkout seguro
                </motion.p>
                <motion.h1 {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
                  Tu marca, tu catalogo y tu plan de venta en un solo sitio.
                </motion.h1>
                <motion.p {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="mt-5 max-w-2xl text-lg text-white/75">
                  Hispaloshop te deja publicar, vender, cobrar y escalar con planes reales para productor o importador.
                </motion.p>

                <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.15 }} className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleMainEntry}
                    className="rounded-full bg-[#e6a532] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#d4952b]"
                  >
                    {isSeller ? 'Ir a mi panel' : 'Crear mi cuenta'}
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTo('plans')}
                    className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Ver planes y pago
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
                    <p className="text-3xl font-bold">FREE</p>
                    <p className="mt-1 text-sm text-white/70">Entrada sin cuota para arrancar catalogo y operativa.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-3xl font-bold">PRO</p>
                    <p className="mt-1 text-sm text-white/70">Menor comision y herramientas avanzadas de crecimiento.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <p className="text-3xl font-bold">ELITE</p>
                    <p className="mt-1 text-sm text-white/70">Prioridad comercial, account manager y capa premium.</p>
                  </div>
                </motion.div>
              </div>

              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur">
                <div className="rounded-2xl bg-white p-5 text-[#111827] shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                    <div>
                      <p className="text-sm font-medium text-stone-500">Operacion simplificada</p>
                      <h2 className="mt-1 text-2xl font-bold">Del registro al cobro sin friccion rara</h2>
                    </div>
                    <div className="rounded-full bg-[#eef5ef] p-3 text-[#2d5a3d]">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-2xl bg-stone-50 p-4">
                      <span className="text-sm text-stone-600">Catalogo y tienda</span>
                      <span className="text-lg font-semibold">Desde FREE</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-stone-50 p-4">
                      <span className="text-sm text-stone-600">Pago de suscripcion</span>
                      <span className="text-lg font-semibold">Stripe Checkout</span>
                    </div>
                    <div className="rounded-2xl bg-[#111827] p-5 text-white">
                      <p className="text-sm text-white/65">Comision del marketplace</p>
                      <p className="mt-1 text-3xl font-bold">20% / 18% / 17%</p>
                      <p className="mt-2 text-sm text-white/70">Segun tu plan activo y el nivel de soporte que necesites.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollTo('payment')}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2d5a3d] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#234a31]"
                    >
                      Ver como funciona el pago
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

        <section id="benefits" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2d5a3d]">Ventajas</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Todo lo que necesitas para vender con orden</h2>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mt-10 grid gap-6 md:grid-cols-4">
              {BENEFITS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[24px] border border-stone-200 bg-[#faf7f2] p-6">
                    <div className="inline-flex rounded-2xl bg-[#2d5a3d] p-3 text-white">
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

        <section id="plans" className="bg-[#f5f1e8] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2d5a3d]">Planes</p>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Suscripcion y comision con datos reales</h2>
                <p className="mt-3 max-w-2xl text-sm text-stone-600">
                  Los precios y la comision salen del backend activo. Si ya eres vendedor, desde aqui puedes suscribirte, pagar o cambiar de plan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/pricing')}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d5a3d] transition-colors hover:text-[#234a31]"
              >
                Ver detalle completo
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            {loadingPlans ? (
              <div className="flex justify-center py-14">
                <Loader2 className="h-6 w-6 animate-spin text-[#2d5a3d]" />
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
                        isRecommended ? 'border-[#2d5a3d] bg-white shadow-lg' : 'border-stone-200 bg-white'
                      } ${isCurrent ? 'ring-2 ring-[#2d5a3d]/20' : ''}`}
                    >
                      {isRecommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2d5a3d] px-4 py-1 text-xs font-semibold text-white">
                          Recomendado
                        </div>
                      )}
                      {isCurrent && (
                        <div className="absolute -top-3 right-4 rounded-full bg-[#111827] px-3 py-1 text-xs font-semibold text-white">
                          Tu plan
                        </div>
                      )}

                      <Icon className={`h-8 w-8 ${isRecommended ? 'text-[#2d5a3d]' : 'text-stone-500'}`} />
                      <h3 className="mt-4 text-2xl font-semibold text-stone-900">{plan.label}</h3>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-stone-900">{plan.price === 0 ? 'Gratis' : `${plan.price} EUR`}</span>
                        {plan.price > 0 && <span className="text-sm text-stone-500">/mes + IVA</span>}
                      </div>
                      {plan.price_with_vat && <p className="mt-1 text-xs text-stone-500">Total estimado con IVA: {plan.price_with_vat.toFixed(2)} EUR</p>}
                      <p className="mt-3 text-sm font-medium text-[#2d5a3d]">Comision marketplace: {plan.commission}</p>

                      <ul className="mt-6 space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm text-stone-600">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2d5a3d]" />
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
                              : 'bg-[#111827] text-white hover:bg-[#202938]'
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
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2d5a3d]">Pago y activacion</p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Como funciona la suscripcion de verdad</h2>
              <p className="mx-auto mt-4 max-w-2xl text-stone-600">
                El flujo distingue entre alta, suscripcion, cambio de plan y pago seguro para no mandarte a pantallas equivocadas.
              </p>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mt-10 grid gap-6 md:grid-cols-3">
              {PAYMENT_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-[26px] border border-stone-200 bg-[#faf7f2] p-6">
                    <div className="inline-flex rounded-2xl bg-[#111827] p-3 text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{step.description}</p>
                  </div>
                );
              })}
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="mt-8 rounded-[30px] bg-[#111827] p-8 text-white">
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#e6a532]">Stripe Checkout</p>
                  <h3 className="mt-3 text-3xl font-bold">Pago seguro, cambio de plan y downgrade sin salirte del flujo valido</h3>
                  <div className="mt-6 space-y-3 text-sm text-white/75">
                    <p>Los planes de pago abren checkout de Stripe cuando todavia no existe suscripcion activa.</p>
                    <p>Si ya tienes suscripcion, el sistema usa cambio de plan en vez de crear otra compra paralela.</p>
                    <p>Si bajas a FREE, aplicamos downgrade correctamente en lugar de dejarte en un boton muerto.</p>
                  </div>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-sm text-white/70">Metodo de pago</span>
                    <span className="font-semibold">Tarjeta via Stripe</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-sm text-white/70">Facturacion</span>
                    <span className="font-semibold">Mensual</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-sm text-white/70">Respuesta</span>
                    <span className="font-semibold">Checkout inmediato</span>
                  </div>
                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => scrollTo('plans')}
                      className="rounded-full bg-[#e6a532] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#d4952b]"
                    >
                      Elegir plan ahora
                    </button>
                    <button
                      type="button"
                      onClick={handleMainEntry}
                      className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                    >
                      {isSeller ? 'Ir a mi panel' : 'Activar cuenta de vendedor'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="requirements" className="bg-[#f5f1e8] py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#2d5a3d]">Requisitos</p>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Lo minimo para arrancar con buen pie</h2>
                <p className="mt-4 text-sm leading-6 text-stone-600">
                  No hace falta una operacion gigante. Si tienes tu base legal y comercial ordenada, puedes entrar y escalar desde el panel.
                </p>
              </div>
              <div className="rounded-[30px] border border-stone-200 bg-white p-6">
                <div className="space-y-4">
                  {REQUIREMENTS.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2d5a3d]" />
                      <span className="text-sm text-stone-700">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-2xl bg-[#eef5ef] p-5">
                  <p className="text-sm font-semibold text-[#2d5a3d]">Siguiente paso recomendado</p>
                  <p className="mt-2 text-sm text-stone-700">
                    Crea tu cuenta, elige plan y deja listo tu metodo de cobro para publicar catalogo y activar pedidos.
                  </p>
                  <button
                    type="button"
                    onClick={handleMainEntry}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#2d5a3d] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#234a31]"
                  >
                    Empezar ahora
                    <ArrowRight className="h-4 w-4" />
                  </button>
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
