import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  CircleDollarSign,
  HeartHandshake,
  Leaf,
  Plane,
  Wheat,
} from 'lucide-react';
import { toast } from 'sonner';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import SEO from '../../components/SEO';
import SignupModal, { PRODUCER_PLANS, normalizeProducerPlan } from '../../components/producer/SignupModal';
import { useAuth } from '../../context/AuthContext';
import { getDefaultRoute } from '../../lib/navigation';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55 },
};

const painPoints = [
  'Distribuidores que pagan tarde y aprietan margen desde el principio.',
  'Ferias caras donde vendes menos de lo que gastas.',
  'Stock parado mientras buscas a quien debería estar buscándote a ti.',
  'Tu historia y tu origen quedan fuera de la decisión de compra.',
];

const valueCards = [
  { icon: CircleDollarSign, title: 'Venta directa', body: 'Quiero que puedas vender con más margen y menos intermediarios innecesarios.' },
  { icon: HeartHandshake, title: 'Tu historia delante', body: 'El producto no aparece solo como una ficha fría. Aparece con origen, contexto y comunidad.' },
  { icon: Plane, title: 'Ruta B2B más clara', body: 'Si quieres abrir mercado fuera, la plataforma también te acerca a conversaciones más ordenadas.' },
  { icon: BrainCircuit, title: 'Herramientas útiles', body: 'Contenido, traducción y mejor presentación sin obligarte a montar un equipo entero.' },
];

function HeroStory({ expanded, onToggle }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-black/15 p-5 shadow-[0_22px_60px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-7">
      <div className="border-l-4 border-white/30 pl-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-300">Verano de 2024</p>
        <p className="mt-4 text-sm leading-7 text-stone-50/88 sm:text-[15px]">
          Recorrí España de fábrica en fábrica y vi algo muy concreto: productores honestos haciendo las cosas bien y muy poca estructura alrededor para ayudarles a llegar lejos.
        </p>
        <div className={`${expanded ? 'block' : 'hidden md:block'}`}>
          <p className="mt-4 text-sm leading-7 text-stone-50/88 sm:text-[15px]">
            Luego me fui a Corea con muestras, reuniones y demasiadas puertas cerradas. Perdí dinero, tiempo y orgullo, pero entendí algo útil: el problema no era vuestro producto. Era el sistema alrededor.
          </p>
          <p className="mt-4 text-sm leading-7 text-stone-50/88 sm:text-[15px]">
            Esta página sale de ahí. No de una teoría. De haber visto cómo el buen producto se queda esperando mientras el mercado favorece a quien mejor negocia, no siempre a quien mejor hace las cosas.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-stone-300 md:hidden"
      >
        {expanded ? 'Cerrar historia' : 'Leer toda la historia'}
        <ArrowRight className={`h-4 w-4 transition ${expanded ? 'rotate-90' : ''}`} />
      </button>
    </div>
  );
}

export default function ProducerLanding() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [storyExpanded, setStoryExpanded] = useState(false);

  const signupOpen = location.pathname === '/productor/registro';
  const selectedPlan = normalizeProducerPlan(searchParams.get('plan'));
  const currentRoute = useMemo(
    () => getDefaultRoute(user, user?.onboarding_completed ?? user?.onboardingCompleted),
    [user],
  );

  useEffect(() => {
    if (!signupOpen || !user) return;
    toast.error('Ya tienes una cuenta activa. Te llevo al flujo correcto para no duplicarte el acceso.');
    navigate(currentRoute, { replace: true });
  }, [currentRoute, navigate, signupOpen, user]);

  const openSignup = (plan = 'free') => {
    if (user) {
      navigate(currentRoute);
      return;
    }
    navigate(`/productor/registro?plan=${normalizeProducerPlan(plan)}`);
  };

  const closeSignup = () => {
    navigate('/productor', { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <SEO
        title="Vende tu producto artesanal al mundo | Hispaloshop para Productores"
        description="Landing para productores que quieren vender con más contexto, mejor margen y una infraestructura más clara."
        url="https://www.hispaloshop.com/productor"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Hispaloshop para Productores',
            description: 'Landing para productores artesanales y cooperativas que quieren vender directo y abrir mercado con menos niebla.',
            url: 'https://www.hispaloshop.com/productor',
          },
        ]}
      />

      <Header />

      <main>
        <section className="relative isolate overflow-hidden bg-stone-950 text-[#faf9f6]">
          <div className="absolute inset-0 opacity-30" aria-hidden="true">
            <div className="absolute left-[8%] top-[18%] h-40 w-40 rounded-full border border-white/10" />
            <div className="absolute right-[10%] top-[22%] h-24 w-24 rounded-full border border-white/10" />
          </div>

          <div className="relative mx-auto flex min-h-[calc(100svh-56px)] max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="max-w-3xl">
                <motion.span {...fadeUp} className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-300">
                  Lo he visto de cerca
                </motion.span>
                <motion.h1 {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="mt-6 max-w-4xl text-[32px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-[62px]">
                  Si has hecho un producto bueno de verdad, no deberías sentir que todo el sistema está diseñado para dejarte sin margen y sin voz.
                </motion.h1>
                <motion.p {...fadeUp} transition={{ duration: 0.55, delay: 0.1 }} className="mt-6 max-w-3xl text-base leading-8 text-stone-50/92 sm:text-[22px]">
                  He hablado con productores que trabajan mejor de lo que cobran. Obradores, cooperativas y pequeñas marcas que sostienen calidad real, pero llegan al mercado tarde, mal y negociando siempre desde abajo.
                </motion.p>
                <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.16 }} className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => openSignup('free')} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-stone-950 transition hover:-translate-y-0.5">
                    Crear mi tienda
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => document.getElementById('planes-productor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/18 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10">
                    Ver planes
                  </button>
                </motion.div>
                <motion.p {...fadeUp} transition={{ duration: 0.55, delay: 0.2 }} className="mt-8 max-w-3xl text-base leading-8 text-stone-50/88">
                  Yo también he visto lo que pasa cuando el producto tiene alma pero el canal no acompaña. Por eso esta página no es un pitch deck: es la infraestructura que me habría gustado poner delante de esos productores desde el primer día.
                </motion.p>
              </div>

              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.12 }} className="space-y-5">
                <HeroStory expanded={storyExpanded} onToggle={() => setStoryExpanded((current) => !current)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {painPoints.map((point) => (
                    <article key={point} className="flex min-h-[120px] items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4">
                      <div className="mt-1 rounded-full bg-white/10 p-2 text-white">
                        <Leaf className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-7 text-stone-50/88">{point}</p>
                    </article>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-stone-50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">La infraestructura</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-stone-950 sm:text-[42px]">
                No quiero que vuelvas a depender solo de ferias, distribuidores opacos o promesas que llegan demasiado tarde.
              </h2>
              <p className="mt-6 text-lg leading-8 text-stone-600">
                Hispaloshop está pensado para que tu historia, tu origen y tu producto aparezcan antes que el descuento. Puedes vender directo, construir comunidad y abrir conversaciones B2B sin perderte dentro de un catálogo anónimo.
              </p>
              <p className="mt-4 text-lg leading-8 text-stone-600">
                También quiero que tengas herramientas concretas: mejor presentación, ayuda con contenido, señales de demanda e importadores más fáciles de identificar cuando estés listo para salir fuera.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {valueCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.article key={card.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: index * 0.08 }} className="group rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_-34px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-stone-900 hover:shadow-[0_26px_65px_-34px_rgba(15,23,42,0.22)]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-stone-800">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-600">{card.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="planes-productor" className="bg-stone-100 py-16 sm:py-20">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">Planes y acción</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-stone-800 sm:text-[40px]">
                Entra con el nivel de riesgo que puedas asumir hoy.
              </h2>
              <p className="mt-5 text-lg leading-8 text-stone-600">
                Prefiero que empieces con claridad. Tres planes, funciones concretas y comisiones visibles desde el principio.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {Object.values(PRODUCER_PLANS).map((plan, index) => (
                <motion.article key={plan.key} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: index * 0.08 }} className={`flex h-full flex-col rounded-[30px] border-t-4 p-7 shadow-[0_20px_50px_-32px_rgba(0,0,0,0.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-36px_rgba(0,0,0,0.24)] ${plan.accentClass}`}>
                  <div className="flex items-center justify-between gap-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${plan.key === 'pro' ? 'bg-stone-200 text-stone-900' : plan.key === 'elite' ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-700'}`}>
                      {plan.badge}
                    </span>
                    <span className="text-sm font-semibold text-stone-400">{plan.name}</span>
                  </div>
                  <p className="mt-6 text-4xl font-extrabold tracking-[-0.04em] text-stone-800">{plan.price}</p>
                  <p className="mt-4 text-sm leading-7 text-stone-600">{plan.summary}</p>
                  <ul className="mt-7 space-y-3 text-sm text-stone-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Wheat className="mt-1 h-4 w-4 shrink-0 text-stone-900" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => openSignup(plan.key)} className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition ${plan.buttonClass}`}>
                    {plan.key === 'free' ? 'Crear mi tienda' : plan.key === 'pro' ? 'Elegir PRO' : 'Exportar con ELITE'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <SignupModal
        open={signupOpen && !user}
        initialPlan={selectedPlan}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeSignup();
          } else {
            openSignup(selectedPlan);
          }
        }}
      />
    </div>
  );
}
