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
  Sparkles,
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
  'Distribuidores que te pagan a 90 dias si tienes suerte',
  'Festivales gastronomicos costosos donde vendes menos de lo que gastas',
  'Supermercados que te exigen el 50% de margen y exclusividad',
  'Stock acumulandose mientras buscas quien te compre',
  'Imposible llegar al importador adecuado sin contactos',
  'Tu historia, tu origen, tu ilusion... invisible para el consumidor',
];

const valueCards = [
  {
    icon: CircleDollarSign,
    title: 'Venta Directa, Dinero Instantaneo',
    body: 'Tu pones el precio. Tu recibes el pago. Sin distribuidores que se queden el 60% ni plazos que te asfixien.',
  },
  {
    icon: HeartHandshake,
    title: 'Tu Historia en el Frontend',
    body: 'Los consumidores compran tu origen, tu proceso y tu ilusion. No solo un bote perdido entre miles.',
  },
  {
    icon: Plane,
    title: 'Matching con Importadores Reales',
    body: 'Accede a compradores de Japon, Corea o USA que buscan productos autenticos y quieren conectar con importadores de alimentos serios.',
  },
  {
    icon: BrainCircuit,
    title: 'Marketing Automatizado con IA',
    body: 'Es marketing digital para pequenos productores: copy, traducciones, ideas visuales y posicionamiento sin montar un equipo de veinte personas.',
  },
];

function HeroStory({ expanded, onToggle }) {
  return (
    <div className="rounded-[28px] border border-[#d97706]/40 bg-black/15 p-5 shadow-[0_22px_60px_-34px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-7">
      <div className="border-l-4 border-[#d97706] pl-5">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#fbbf24]">Verano de 2024</p>
        <p className="mt-4 text-sm leading-7 text-[#faf9f6]/88 sm:text-[15px]">
          Tenía 24 años y una obsesión: conectar a los mejores productores españoles con el mundo. Recorrí España de fábrica en fábrica. Conocí a la gente de la Cooperativa La Carrera en Úbeda, probé los productos de Anaconda Foods en Madrid y me enamoré de la honestidad de Carolina Honest en Reus. Decidí representar a esas tres fábricas en Corea del Sur.
        </p>
        <div className={`${expanded ? 'block' : 'hidden md:block'}`}>
          <p className="mt-4 text-sm leading-7 text-[#faf9f6]/88 sm:text-[15px]">
            Con 20 kg de muestras en la maleta volé a Seúl. Luego a Japón. Durante un año viví el rechazo sistemático: oficina tras oficina de importadores, siempre la misma respuesta. No tenemos tiempo, no tenemos personal, el packaging no sirve. Nadie me miró a los ojos. Nadie valoró el alma que había en esos productos.
          </p>
          <p className="mt-4 text-sm leading-7 text-[#faf9f6]/88 sm:text-[15px]">
            Desesperado, pedí dinero prestado e importé un container de palomitas orgánicas españolas. Fracasé estrepitosamente. Durante seis meses esas palomitas se pudrieron en mi salón de Incheon mientras me peleaba en ferias sin hablar coreano. Perdí 15.000€. Lloré en un parque de Seúl preguntándome qué había hecho mal. Lo he sufrido en mis carnes. Y por eso, ahora, estoy construyendo lo que yo necesitaba entonces.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#fbbf24] md:hidden"
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
    if (!signupOpen || !user) {
      return;
    }

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
    <div className="min-h-screen bg-[#fdfcf8] text-[#1f2937]">
      <SEO
        title="Vende tu producto artesanal al mundo | Hispaloshop para Productores"
        description="Vender productos artesanales online, exportar alimentos espanoles y vender directo al consumidor sin intermediarios desde un marketplace para productores locales con IA, importadores y comunidad."
        url="https://www.hispaloshop.com/productor"
        structuredData={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Hispaloshop para Productores',
            description: 'Landing para productores artesanales y cooperativas que quieren vender directo al consumidor y exportar sin intermediarios.',
            url: 'https://www.hispaloshop.com/productor',
          },
        ]}
      />

      <Header />

      <main>
        <section
          className="relative isolate overflow-hidden bg-[#2c241b] text-[#faf9f6]"
          style={{
            backgroundImage: 'radial-gradient(circle at 12% 12%, rgba(217,119,6,0.18), transparent 24%), radial-gradient(circle at 88% 18%, rgba(20,83,45,0.18), transparent 28%), linear-gradient(135deg, rgba(44,36,27,0.96), rgba(26,47,26,0.96)), repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 10px)',
          }}
        >
          <div className="absolute inset-0 opacity-30" aria-hidden="true">
            <div className="absolute left-[8%] top-[18%] h-40 w-40 rounded-full border border-white/10" />
            <div className="absolute right-[10%] top-[22%] h-24 w-24 rounded-full border border-white/10" />
            <div className="absolute bottom-[18%] right-[22%] h-52 w-52 rounded-full bg-[#14532d]/25 blur-3xl" />
          </div>

          <div className="relative mx-auto flex min-h-[calc(100svh-56px)] max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="max-w-3xl">
                <motion.span
                  {...fadeUp}
                  className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#fbbf24]"
                >
                  Lo he sufrido en mis carnes
                </motion.span>
                <motion.h1
                  {...fadeUp}
                  transition={{ duration: 0.55, delay: 0.05 }}
                  className="mt-6 max-w-4xl text-[32px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-[62px]"
                >
                  Creaste un producto increible. Ahora dilo con la cara seria cuando te ofrezcan pagarte a 90 dias y te quiten el 60% de margen.
                </motion.h1>
                <motion.p
                  {...fadeUp}
                  transition={{ duration: 0.55, delay: 0.1 }}
                  className="mt-6 max-w-3xl text-base leading-8 text-[#faf9f6]/92 sm:text-[22px]"
                >
                  La realidad del productor artesano: madrugones en el obrador, fines de semana en mercadillos vendiendo tres botes, supermercados que te piden exclusividad territorial y te pagan cuando les da la gana. Mientras tanto, tu producto se queda en stock, tu ilusion se desgasta y tu te preguntas si no habria sido mejor quedarte en el trabajo de oficina.
                </motion.p>
                <motion.div
                  {...fadeUp}
                  transition={{ duration: 0.55, delay: 0.16 }}
                  className="mt-7 flex flex-col gap-3 sm:flex-row"
                >
                  <button
                    type="button"
                    onClick={() => openSignup('free')}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d97706] px-7 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#b45309] hover:shadow-[0_18px_40px_-18px_rgba(217,119,6,0.6)]"
                  >
                    Crear mi tienda GRATIS
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('planes-productor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/18 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Ver planes y comisiones
                  </button>
                </motion.div>
                <motion.p
                  {...fadeUp}
                  transition={{ duration: 0.55, delay: 0.2 }}
                  className="mt-8 max-w-3xl text-base leading-8 text-[#faf9f6]/88"
                >
                  Si estas leyendo esto y te duele el pecho, no estas solo. Lo he vivido. Y por eso, a mis 26 anos, de vuelta en Reus con mis ultimos euros, estoy construyendo lo que yo necesitaba entonces.
                </motion.p>
              </div>

              <motion.div
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="space-y-5"
              >
                <HeroStory expanded={storyExpanded} onToggle={() => setStoryExpanded((current) => !current)} />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {painPoints.map((point) => (
                    <article
                      key={point}
                      className="flex min-h-[120px] items-start gap-3 rounded-[22px] border border-white/10 bg-white/[0.06] px-4 py-4"
                    >
                      <div className="mt-1 rounded-full bg-[#f87171]/15 p-2 text-[#f87171]">
                        <Leaf className="h-4 w-4" />
                      </div>
                      <p className="text-sm leading-7 text-[#faf9f6]/88">{point}</p>
                    </article>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0">
            <svg viewBox="0 0 1440 160" className="h-auto w-full text-[#fdfcf8]" preserveAspectRatio="none" aria-hidden="true">
              <path fill="currentColor" d="M0,128L80,133.3C160,139,320,149,480,133.3C640,117,800,75,960,58.7C1120,43,1280,53,1360,58.7L1440,64L1440,160L1360,160C1280,160,1120,160,960,160C800,160,640,160,480,160C320,160,160,160,80,160L0,160Z" />
            </svg>
          </div>
        </section>

        <section className="bg-[#fdfcf8] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#14532d]">La infraestructura</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[#14532d] sm:text-[42px]">
                Hispaloshop no es otro marketplace. Es tu ventana al mundo sin intermediarios que te roben el alma.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-700">
                He creado esta plataforma para que ningun productor honesto vuelva a sentirse invisible. Aqui puedes vender productos artesanales online y comercializar productos gourmet sin competir contra megacorporaciones por una estanteria. Este marketplace para productores locales pone tu historia delante, te ayuda a vender directo al consumidor sin intermediarios y te acompana si te preguntas como exportar alimentos espanoles con menos oscuridad y mas control.
              </p>
              <p className="mt-4 text-lg leading-8 text-slate-700">
                Es una capa real de cooperativas agrarias online, marketing digital para pequenos productores, IA para copy y traduccion, y rutas concretas para conectar con importadores de alimentos que si entienden el valor de la artesania.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {valueCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.article
                    key={card.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    className="group rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_-34px_rgba(0,0,0,0.18)] transition duration-300 hover:-translate-y-1 hover:border-[#16a34a] hover:shadow-[0_26px_65px_-34px_rgba(20,83,45,0.28)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#14532d] text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-[#1f2937]">{card.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="planes-productor" className="bg-[#f5f5f4] py-16 sm:py-20">
          <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#4f46e5]">Planes y accion</p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[#1f2937] sm:text-[40px]">
                Elige la velocidad. Nosotros ponemos la escalera.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Empieza sin riesgo, escala con IA o sal a buscar paises y precios con una capa mas ambiciosa. Las comisiones activas siguen el modelo real: 20%, 18% y 17%.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {Object.values(PRODUCER_PLANS).map((plan, index) => (
                <motion.article
                  key={plan.key}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className={`flex h-full flex-col rounded-[30px] border-t-4 p-7 shadow-[0_20px_50px_-32px_rgba(0,0,0,0.2)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-36px_rgba(0,0,0,0.24)] ${plan.accentClass}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${plan.key === 'pro' ? 'bg-[#fffbeb] text-[#b45309]' : plan.key === 'elite' ? 'bg-[#eef2ff] text-[#4338ca]' : 'bg-[#ecfdf5] text-[#166534]'}`}>
                      {plan.badge}
                    </span>
                    <span className="text-sm font-semibold text-stone-400">{plan.name}</span>
                  </div>
                  <p className="mt-6 text-4xl font-extrabold tracking-[-0.04em] text-[#1f2937]">{plan.price}</p>
                  <p className="mt-4 text-sm leading-7 text-slate-600">{plan.summary}</p>
                  <ul className="mt-7 space-y-3 text-sm text-slate-600">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Wheat className="mt-1 h-4 w-4 shrink-0 text-[#d97706]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => openSignup(plan.key)}
                    className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-semibold transition ${plan.buttonClass}`}
                  >
                    {plan.key === 'free' ? 'Crear mi tienda GRATIS' : plan.key === 'pro' ? 'Elegir PRO y crecer' : 'Exportar con ELITE'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.article>
              ))}
            </div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="mt-10 rounded-[28px] border border-stone-200 bg-white p-6 shadow-[0_18px_50px_-34px_rgba(0,0,0,0.18)]"
            >
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#14532d]">SEO y mercado</p>
                  <h3 className="mt-3 text-2xl font-bold text-[#1f2937]">Tu producto necesita infraestructura, no mas humo.</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Esto no es una promesa vaga de visibilidad. Es una forma concreta de vender productos artesanales online, de comercializar productos gourmet con mas contexto y de dejar de perseguir a quien deberia buscarte a ti.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    'Vender directo al consumidor sin intermediarios',
                    'Como exportar alimentos espanoles con menos riesgo',
                    'Conectar con importadores de alimentos verificados',
                    'Marketplace para productores locales con IA y relato',
                  ].map((line) => (
                    <div key={line} className="rounded-[18px] border border-stone-200 bg-stone-50 p-4 text-sm font-semibold text-stone-700">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
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
