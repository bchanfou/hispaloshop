import React, { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  CircleDollarSign,
  Globe2,
  Handshake,
  Languages,
  PackageX,
  Rocket,
  Store,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SEOHead from '../../components/landings/SEOHead';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRoute } from '../../lib/navigation';
import OnboardingModal from '../../components/importer/OnboardingModal';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55 },
};

const painPoints = [
  { icon: PackageX, text: 'Capital congelado en stock sin salida' },
  { icon: CircleDollarSign, text: 'Dependencia de distribuidores que te exprimen' },
  { icon: Globe2, text: 'Cero visibilidad en mercados que no dominas' },
  { icon: Languages, text: 'Barreras idiomaticas y culturales' },
  { icon: BrainCircuit, text: 'Marketing costoso y sin retorno garantizado' },
  { icon: TrendingUp, text: 'Riesgo total, control nulo' },
];

const solutionCards = [
  {
    icon: Store,
    title: 'Venta Directa al Consumidor',
    body: 'Tu margen real, sin distribuidores intermedios.',
  },
  {
    icon: BrainCircuit,
    title: 'Matching Inteligente',
    body: 'Conectamos tu producto con influencers locales que ya venden a tu publico objetivo.',
  },
  {
    icon: Rocket,
    title: 'Infraestructura Lista',
    body: 'Logistica, pagos y marketing automatizado. Tu solo gestionas el producto.',
  },
  {
    icon: TrendingUp,
    title: 'Escalabilidad Real',
    body: 'Empieza con un pallet y crece hasta contenedores mensuales.',
  },
];

const planCards = [
  {
    id: 'free',
    badge: 'Empieza hoy',
    name: 'FREE',
    price: '0€/mes',
    audience: 'Testing de mercado, primeras ventas y validacion de producto.',
    cta: 'Comenzar Gratis',
    accent: 'border-slate-200',
    features: [
      'Tienda virtual personalizada',
      'Hasta 50 SKUs',
      'Acceso a catalogo B2B de productores',
      'Comision del 20% por transaccion',
    ],
  },
  {
    id: 'pro',
    badge: 'Recomendado',
    name: 'PRO',
    price: '79€ + IVA/mes',
    audience: 'Importadores serios que quieren escalar.',
    cta: 'Elegir PRO',
    accent: 'border-blue-500 shadow-[0_18px_45px_-18px_rgba(59,130,246,0.4)]',
    features: [
      'IA para marketing: copy e imagenes',
      'Recomendaciones dinamicas de precio por mercado',
      'Analitica avanzada de ventas',
      'Matching automatico con influencers (5 activos/mes)',
      'Comision reducida al 18%',
    ],
  },
  {
    id: 'elite',
    badge: 'Empresas',
    name: 'ELITE',
    price: '149€ + IVA/mes',
    audience: 'Operaciones multinacionales y volumen alto.',
    cta: 'Contactar Ventas',
    accent: 'border-slate-900',
    features: [
      'IA avanzada de analisis de mercado por pais',
      'Prediccion de demanda con machine learning',
      'Deteccion de riesgo de desabastecimiento',
      'Prioridad absoluta en visibilidad dentro de la plataforma',
      'Analitica global comparativa por pais',
      'Comision reducida al 17%',
      'Soporte prioritario 24/7',
    ],
  },
];

function normalizePlan(plan) {
  const value = String(plan || 'free').toLowerCase();
  if (value === 'pro' || value === 'elite') return value;
  return 'free';
}

export default function ImporterLanding() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const onboardingOpen = searchParams.get('onboarding') === '1';
  const selectedPlan = normalizePlan(searchParams.get('plan'));
  const currentRoute = useMemo(
    () => getDefaultRoute(user, user?.onboarding_completed ?? user?.onboardingCompleted),
    [user]
  );

  const updateSearch = (updates) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        nextParams.delete(key);
        return;
      }
      nextParams.set(key, value);
    });
    setSearchParams(nextParams, { replace: true });
  };

  const openOnboarding = (plan = 'free') => {
    if (user) {
      if (user.role === 'importer') {
        navigate(currentRoute);
        return;
      }

      toast.error('Ya tienes una cuenta activa. Te llevo a tu panel actual.');
      navigate(currentRoute);
      return;
    }

    updateSearch({ onboarding: '1', plan: normalizePlan(plan) });
  };

  const closeOnboarding = () => {
    updateSearch({ onboarding: null, plan: null });
  };

  const scrollToPlans = () => {
    document.getElementById('importer-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SEOHead
        title="Importa y vende sin intermediarios | Hispaloshop"
        description="Como importar alimentos a Europa, vender productos importados online e importar sin distribuidor intermediario desde una sola infraestructura comercial."
        keywords="como importar alimentos a Europa, vender productos importados online, importar sin distribuidor intermediario, marketplace B2B alimentacion, exportar productos españoles al mundo, importacion directa al consumidor"
      />

      <Header />

      <main>
        <section className="relative overflow-hidden bg-[#1a1a1a] text-[#f5f5f5]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_28%),radial-gradient(circle_at_85%_15%,_rgba(59,130,246,0.16),_transparent_22%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(26,26,26,0.96))]" />
          <div className="absolute inset-0 opacity-20" aria-hidden="true">
            <div className="absolute left-[10%] top-[14%] h-48 w-48 rounded-full border border-white/10" />
            <div className="absolute right-[14%] top-[24%] h-32 w-32 rounded-full border border-white/10" />
            <div className="absolute bottom-[16%] left-[28%] h-24 w-24 rounded-full bg-amber-500/15 blur-3xl" />
          </div>

          <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="max-w-3xl">
                <motion.span
                  {...fadeUp}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-500"
                >
                  Lo he sufrido yo
                </motion.span>
                <motion.h1
                  {...fadeUp}
                  transition={{ duration: 0.55, delay: 0.05 }}
                  className="mt-6 max-w-4xl text-4xl font-extrabold leading-[0.94] tracking-[-0.03em] sm:text-5xl lg:text-[56px]"
                >
                  Importar no es un negocio. Es una ruleta rusa donde apuestas tu capital, tu tiempo y tu sueño.
                </motion.h1>
                <motion.p
                  {...fadeUp}
                  transition={{ duration: 0.55, delay: 0.1 }}
                  className="mt-6 max-w-3xl text-lg leading-8 text-white/88 sm:text-2xl"
                >
                  Arriesgas miles de euros en stock. Pagas almacenes, aduanas y transporte. Y luego llega el silencio:
                  nadie conoce tu producto, no tienes canal de venta, no hablas el idioma y ves como tu inversion se
                  pudre literalmente en tu casa.
                </motion.p>
                <motion.div
                  {...fadeUp}
                  transition={{ duration: 0.55, delay: 0.15 }}
                  className="mt-8 flex flex-col gap-3 sm:flex-row"
                >
                  <button
                    type="button"
                    onClick={() => openOnboarding('free')}
                    className="inline-flex items-center justify-center rounded-full bg-amber-500 px-7 py-4 text-base font-semibold text-[#1a1a1a] transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_-16px_rgba(245,158,11,0.65)]"
                  >
                    Comenzar Gratis
                  </button>
                  <button
                    type="button"
                    onClick={scrollToPlans}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
                  >
                    Ver planes
                  </button>
                </motion.div>
              </div>

              <motion.aside
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="rounded-[28px] border border-amber-500/40 bg-white/[0.04] p-6 shadow-[0_22px_65px_-38px_rgba(245,158,11,0.6)] backdrop-blur-sm lg:p-8"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500">Mi historia</p>
                <p className="mt-4 text-[17px] leading-8 text-white/88">
                  A los 25 anos embarque un container de palomitas organicas espanolas rumbo a Corea del Sur. Inverti
                  todos mis ahorros. Al llegar, la pesadilla: ferias comerciales sin hablar coreano, distribuidores que
                  pedian margen antes de vender una sola caja e influencers que ni siquiera respondian.
                </p>
                <p className="mt-4 text-[17px] leading-8 text-white/88">
                  Durante 6 meses, esas palomitas se quedaron en mi salon de Seul, expirando dia a dia, mientras yo
                  debatia entre tirarlas o seguir perdiendo dinero en almacenaje. Perdi 15.000€. Pero gane la leccion
                  que cambia todo: el problema no era el producto. Era la falta de infraestructura.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-2xl font-bold text-amber-500">15.000€</p>
                    <p className="mt-1 text-sm text-white/70">Perdidos antes de encontrar una salida real</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-2xl font-bold text-white">6 meses</p>
                    <p className="mt-1 text-sm text-white/70">Con stock muriendo dentro de casa</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-2xl font-bold text-white">1 leccion</p>
                    <p className="mt-1 text-sm text-white/70">Sin canal y sin estructura, importas a ciegas</p>
                  </div>
                </div>
              </motion.aside>
            </div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {painPoints.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.text}
                    className="flex min-h-[108px] items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4"
                  >
                    <div className="mt-1 rounded-full bg-[#ef4444]/15 p-2 text-red-500">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <p className="text-sm font-medium leading-6 text-white/88">{item.text}</p>
                  </article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="solucion" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">La revelacion</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-4xl">
                Hispaloshop no es un marketplace. Es tu infraestructura comercial global lista para usar.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                A mis 26 anos construi lo que yo necesitaba entonces: un canal donde tu producto llegue directo al
                consumidor final desde el dia uno. Sin depender de un distribuidor que te haga el favor de ponerte en
                una estanteria perdida. Si te preguntas como importar alimentos a Europa, vender productos importados
                online o importar sin distribuidor intermediario, esto es exactamente lo que queria tener yo.
              </p>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Tienes influencers locales de cualquier pais al alcance de un click, productores honestos dispuestos a
                exportar y una comunidad que busca lo que traes. Marketplace B2B alimentacion, importacion directa al
                consumidor y una ruta real para exportar productos espanoles al mundo sin quedarte atascado en la
                primera frontera.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {solutionCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.article
                    key={card.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_-26px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(15,23,42,0.28)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="importer-plans" className="bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3b82f6]">Planes y accion</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-4xl">
                Empieza con stock pequeño. Escala cuando el mercado te responda.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Sin humo. Sin promesas vacias. Solo tres formas de entrar segun el riesgo que quieras asumir hoy.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-6 xl:grid-cols-3">
              {planCards.map((plan, index) => (
                <motion.article
                  key={plan.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className={`flex h-full flex-col rounded-[30px] border bg-white p-7 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.25)] transition duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-[0_28px_60px_-32px_rgba(15,23,42,0.3)] ${plan.accent}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${plan.id === 'pro' ? 'bg-blue-100 text-blue-600' : plan.id === 'elite' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {plan.badge}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">{plan.name}</span>
                  </div>
                  <p className="mt-6 text-4xl font-extrabold tracking-[-0.03em] text-slate-900">{plan.price}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{plan.audience}</p>
                  <ul className="mt-8 space-y-3 text-sm text-slate-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => openOnboarding(plan.id)}
                    className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition ${plan.id === 'pro' ? 'bg-[#3b82f6] text-white hover:bg-[#2563eb]' : plan.id === 'elite' ? 'bg-slate-900 text-white hover:bg-slate-950' : 'bg-amber-500 text-[#1a1a1a] hover:bg-amber-400'}`}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <OnboardingModal
        open={onboardingOpen}
        initialPlan={selectedPlan}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeOnboarding();
            return;
          }
          updateSearch({ onboarding: '1', plan: selectedPlan });
        }}
      />
    </div>
  );
}
