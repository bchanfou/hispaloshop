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
  { icon: PackageX, text: 'Capital inmovilizado en stock sin salida.' },
  { icon: CircleDollarSign, text: 'Costes que llegan antes que la demanda.' },
  { icon: Globe2, text: 'Mercados que no conoces y decisiones tomadas a ciegas.' },
  { icon: Languages, text: 'Barreras de idioma, red y contexto comercial.' },
];

const solutionCards = [
  { icon: Store, title: 'Canal directo', body: 'Validas mejor lo que mueves y reduces la parte ciega del proceso.' },
  { icon: BrainCircuit, title: 'Mejor contexto', body: 'Cruzas producto, creadores y demanda con más orden.' },
  { icon: Rocket, title: 'Infraestructura base', body: 'No tienes que improvisar cada paso por separado.' },
  { icon: TrendingUp, title: 'Escala con señales', body: 'Primero claridad. Luego crecimiento. No al revés.' },
];

const planCards = [
  { id: 'free', badge: 'Empieza hoy', name: 'FREE', price: '0 EUR/mes', audience: 'Para probar demanda y entender el mercado con poco riesgo.', cta: 'Comenzar', accent: 'border-stone-200', features: ['Tienda base', 'Hasta 50 SKUs', 'Acceso al catálogo B2B', 'Comisión del 20%'] },
  { id: 'pro', badge: 'Recomendado', name: 'PRO', price: '79 EUR + IVA/mes', audience: 'Para importadores que ya quieren operar con más criterio.', cta: 'Elegir PRO', accent: 'border-stone-900', features: ['IA para contenido', 'Analítica ampliada', 'Matching con creadores', 'Comisión del 18%'] },
  { id: 'elite', badge: 'Empresas', name: 'ELITE', price: '149 EUR + IVA/mes', audience: 'Para operaciones más complejas y trabajo multinacional.', cta: 'Contactar', accent: 'border-stone-900', features: ['Análisis de mercado', 'Predicción de demanda', 'Prioridad interna', 'Comisión del 17%'] },
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
    <div className="min-h-screen bg-white text-stone-950">
      <SEOHead
        title="Importa y vende sin intermediarios | Hispaloshop"
        description="Landing para importadores que quieren validar mejor, comprar con más contexto y reducir decisiones a ciegas."
        keywords="importadores, validar mercado, infraestructura comercial, alimentos, Hispaloshop"
      />

      <Header />

      <main>
        <section className="relative overflow-hidden bg-stone-950 text-white">
          <div className="absolute inset-0 opacity-20" aria-hidden="true">
            <div className="absolute left-[10%] top-[14%] h-48 w-48 rounded-full border border-white/10" />
            <div className="absolute right-[14%] top-[24%] h-32 w-32 rounded-full border border-white/10" />
          </div>

          <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="max-w-3xl">
                <motion.span {...fadeUp} className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
                  Lo perdí en primera persona
                </motion.span>
                <motion.h1 {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="mt-6 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
                  No monté Hispaloshop porque importar me pareciera glamuroso. Lo monté después de perder dinero por hacerlo a ciegas.
                </motion.h1>
                <motion.p {...fadeUp} transition={{ duration: 0.55, delay: 0.1 }} className="mt-6 max-w-2xl text-lg leading-8 text-white/80 sm:text-2xl">
                  Cuando importas sin canal, sin validación y sin red local, cualquier pedido puede convertirse en stock muerto. Lo viví en primera persona y no quiero romantizarlo.
                </motion.p>
                <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => openOnboarding('free')} className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-7 py-4 text-base font-semibold text-stone-950 transition hover:-translate-y-0.5">
                    Comenzar
                  </button>
                  <button type="button" onClick={scrollToPlans} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10">
                    Ver planes
                  </button>
                </motion.div>
              </div>

              <motion.aside {...fadeUp} transition={{ duration: 0.55, delay: 0.12 }} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-md backdrop-blur-sm lg:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">Mi historia</p>
                <p className="mt-4 text-[17px] leading-8 text-white/80">
                  A los 25 años embarqué un contenedor de palomitas ecológicas españolas rumbo a Corea del Sur. Invertí dinero prestado, tiempo y demasiada ingenuidad.
                </p>
                <p className="mt-4 text-[17px] leading-8 text-white/80">
                  Durante meses ese stock se quedó en mi salón de Seúl mientras intentaba abrir puertas sin idioma, sin red y sin una infraestructura comercial real. Perdí 15.000 EUR.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/80 p-4">
                    <p className="text-2xl font-bold text-white">15.000 EUR</p>
                    <p className="mt-1 text-sm text-white/70">Perdidos antes de encontrar una salida real</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/80 p-4">
                    <p className="text-2xl font-bold text-white">6 meses</p>
                    <p className="mt-1 text-sm text-white/70">Con stock muriendo dentro de casa</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/80 p-4">
                    <p className="text-2xl font-bold text-white">1 lección</p>
                    <p className="mt-1 text-sm text-white/70">Sin canal y sin estructura, importas a ciegas</p>
                  </div>
                </div>
              </motion.aside>
            </div>

            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.2 }} className="mt-10 grid gap-3 sm:grid-cols-2">
              {painPoints.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.text} className="flex min-h-[108px] items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4">
                    <div className="mt-1 rounded-full bg-white/10 p-2 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium leading-6 text-white/80">{item.text}</p>
                  </article>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section id="solucion" className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">La solución</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Lo que estoy construyendo aquí es la infraestructura que yo habría necesitado antes de meter un solo euro.
              </h2>
              <p className="mt-6 text-lg leading-8 text-stone-700">
                Hispaloshop te deja validar productos, conectar con productores, abrir canal directo y reducir la parte ciega del proceso. No elimina el riesgo, pero evita tomar decisiones sin contexto.
              </p>
              <p className="mt-4 text-lg leading-8 text-stone-700">
                Puedes probar demanda, hablar con productores e identificar compradores con más orden. Para mí eso vale más que cualquier promesa grandilocuente.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {solutionCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.article key={card.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: index * 0.08 }} className="group rounded-2xl border border-stone-100 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-stone-950">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-700">{card.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="importer-plans" className="bg-stone-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">Planes y acción</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Empieza pequeño. Escala cuando el mercado responda de verdad.
              </h2>
              <p className="mt-5 text-lg leading-8 text-stone-700">
                Nada de promesas vacías. Tres niveles y un riesgo más visible desde el principio.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-6 xl:grid-cols-3">
              {planCards.map((plan, index) => (
                <motion.article key={plan.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: index * 0.08 }} className={`flex h-full flex-col rounded-2xl border bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:scale-[1.01] ${plan.accent}`}>
                  <div className="flex items-center justify-between gap-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${plan.id === 'pro' ? 'bg-stone-200 text-stone-900' : 'bg-stone-900 text-white'}`}>
                      {plan.badge}
                    </span>
                    <span className="text-sm font-semibold text-stone-500">{plan.name}</span>
                  </div>
                  <p className="mt-6 text-4xl font-semibold tracking-tight text-stone-950">{plan.price}</p>
                  <p className="mt-3 text-sm leading-7 text-stone-700">{plan.audience}</p>
                  <ul className="mt-8 space-y-3 text-sm text-stone-700">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Handshake className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => openOnboarding(plan.id)} className="mt-8 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-4 text-sm font-semibold text-white transition hover:bg-stone-800">
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
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
