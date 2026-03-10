import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BrainCircuit,
  Coffee,
  Crown,
  Gem,
  HandHeart,
  HeartPulse,
  Instagram,
  Radar,
  ShieldAlert,
  Sparkles,
  Users2,
} from 'lucide-react';

import SEOHead from '../../components/landings/SEOHead';
import FooterLanding from '../../components/landings/FooterLanding';
import ApplicationModal from '../../components/influencer/ApplicationModal';

const NAV_ITEMS = [
  { label: 'El problema', href: '#problema' },
  { label: 'La salida', href: '#salida' },
  { label: 'Tiers', href: '#tiers' },
  { label: 'Aplicar', href: '#aplicar' },
];

const PARTICLES = [
  { left: '8%', top: '14%', size: 8, duration: 10, delay: 0 },
  { left: '18%', top: '42%', size: 10, duration: 14, delay: 1.2 },
  { left: '28%', top: '18%', size: 6, duration: 12, delay: 0.4 },
  { left: '52%', top: '10%', size: 12, duration: 15, delay: 2.1 },
  { left: '64%', top: '34%', size: 7, duration: 11, delay: 1.4 },
  { left: '76%', top: '20%', size: 9, duration: 13, delay: 0.8 },
  { left: '84%', top: '46%', size: 10, duration: 9, delay: 1.7 },
  { left: '92%', top: '16%', size: 6, duration: 12, delay: 2.4 },
];

const PAIN_POINTS = [
  {
    icon: HeartPulse,
    title: 'Ingresos esporadicos',
    body: 'Un mes lleno, tres meses vacios.',
  },
  {
    icon: Radar,
    title: 'El algoritmo es tu jefe',
    body: 'Cambia sin avisar y te deja sin aire.',
  },
  {
    icon: ShieldAlert,
    title: 'Marcas que no te representan',
    body: 'Aceptar productos toxicos solo para pagar facturas.',
  },
  {
    icon: Coffee,
    title: 'No existe el descanso',
    body: 'Te vas de vacaciones y tus ingresos se van a cero.',
  },
  {
    icon: BrainCircuit,
    title: 'Competencia inflada',
    body: 'Tu juegas limpio mientras otros compran numeros.',
  },
  {
    icon: Sparkles,
    title: 'Ansiedad cronica',
    body: 'La duda constante de si podras seguir viviendo de esto.',
  },
];

const TIERS = [
  {
    key: 'hercules',
    title: 'HERCULES',
    rate: '3%',
    subtitle: 'El inicio',
    description: 'Para micro-influencers de 1k a 50k empezando fuerte.',
    bullets: ['Acceso inmediato al catalogo', 'Links personalizados', 'Dashboard basico'],
    className: 'lg:translate-y-10',
    icon: Gem,
  },
  {
    key: 'atenea',
    title: 'ATENEA',
    rate: '5%',
    subtitle: 'El crecimiento',
    description: 'Para perfiles consolidados de 50k a 200k con engagement real.',
    bullets: ['Pre-lanzamientos exclusivos', 'Soporte prioritario', 'Analytics avanzados'],
    className: 'lg:translate-y-4',
    icon: BrainCircuit,
  },
  {
    key: 'zeus',
    title: 'ZEUS',
    rate: '7%',
    subtitle: 'La cima',
    description: 'Para top creators de 200k+ o nichos hiper-engaged.',
    bullets: ['Importadores internacionales', 'Colabs directas', 'Retiros exclusivos'],
    className: 'lg:-translate-y-6',
    icon: Crown,
  },
];

const BENEFITS = [
  {
    icon: Sparkles,
    title: 'Libertad de creacion',
    body: 'Sin briefs impuestos. Si quieres contar la historia a las 3am en pijama, hazlo asi.',
  },
  {
    icon: HandHeart,
    title: 'Impacto real',
    body: 'Ayudas a productores honestos y das a tu audiencia alternativas mejores que el super corporativo.',
  },
  {
    icon: Users2,
    title: 'Comunidad',
    body: 'No entras solo. Entras con gente que quiere algo mas digno que perseguir likes.',
  },
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -70]);
  const storyY = useTransform(scrollY, [0, 500], [0, 36]);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const isApplyOpen = location.pathname.endsWith('/aplicar');

  const handleApplyState = (nextOpen) => {
    navigate(nextOpen ? '/influencer/aplicar' : '/influencer');
  };

  return (
    <div
      style={{
        '--creator-night': '#0f0518',
        '--creator-indigo': '#1e1b4b',
        '--creator-magenta': '#d946ef',
        '--creator-coral': '#fb7185',
        '--creator-bone': '#f8fafc',
        '--creator-soft': '#faf5ff',
      }}
      className="bg-[var(--creator-night)] text-[var(--creator-bone)]"
    >
      <SEOHead
        title="Programa de influencers Hispaloshop"
        description="Landing para creadores de lifestyle, food, wellness y sostenibilidad que buscan ingresos pasivos honestos con tracking de 18 meses."
        keywords="Como monetizar Instagram sin vender cursos, programa de afiliados alimentacion organica, ingresos pasivos para influencers, trabajar con marcas eticas como influencer, alternativa a OnlyFans para creadores de contenido, vivir de las redes sociales de forma sostenible"
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(10,8,20,0.72)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left text-sm font-semibold uppercase tracking-[0.28em] text-white"
          >
            Hispaloshop
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => scrollToId(item.href.slice(1))}
                className="text-sm text-slate-300 transition-colors hover:text-white"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => handleApplyState(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#d946ef,#fb7185)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(217,70,239,0.24)] transition-transform hover:scale-[1.02]"
          >
            Unirme al movimiento
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main>
        <section id="problema" className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.26),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_24%),linear-gradient(180deg,#0f0518_0%,#1e1b4b_48%,#0a192f_100%)]">
          <div className="absolute inset-0">
            {PARTICLES.map((particle, index) => (
              <motion.span
                key={`${particle.left}-${particle.top}`}
                aria-hidden="true"
                className="absolute rounded-full bg-white/40"
                style={{
                  left: particle.left,
                  top: particle.top,
                  width: particle.size,
                  height: particle.size,
                  boxShadow: '0 0 30px rgba(216, 70, 239, 0.45)',
                }}
                animate={{ y: [0, -10, 6, 0], opacity: [0.3, 1, 0.55, 0.3] }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8 lg:pb-32 lg:pt-24">
            <div className="grid gap-16 lg:grid-cols-[1.14fr_0.86fr] lg:items-start">
              <motion.div style={{ y: heroY }}>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-fuchsia-200">
                  <Coffee className="h-4 w-4" aria-hidden="true" />
                  6 de la madrugada. 3 cafes. Sin humo.
                </div>
                <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.04em] text-[var(--creator-bone)] sm:text-6xl lg:text-[4rem]">
                  Tienes 100.000 seguidores. Y estas rogando por una colaboracion de 200EUR que ni siquiera te gusta.
                </h1>
                <p className="mt-8 max-w-3xl text-xl leading-8 text-slate-300 sm:text-[22px]">
                  La verdad que nadie te cuenta: el algoritmo es tu jefe, las marcas te tratan como carne de canon, y
                  tu trabajo sonado se convirtio en una carrera constante por el siguiente post viral para poder pagar
                  el wifi. Mientras tanto, ves a tus amigos con trabajos normales con nomina fija y vacaciones pagadas,
                  y tu aqui, preguntandote si este mes podras ir al medico sin arruinarte.
                </p>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleApplyState(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#d946ef,#fb7185)] px-7 py-4 text-base font-semibold text-white shadow-[0_24px_50px_rgba(217,70,239,0.24)] transition-transform hover:scale-[1.02]"
                  >
                    Unirme al movimiento
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToId('salida')}
                    className="rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    Quiero ver la salida
                  </button>
                </div>

                <p className="mt-6 text-sm uppercase tracking-[0.28em] text-fuchsia-200/80">
                  No te voy a mentir. Esto no es facil. Pero es honesto.
                </p>
              </motion.div>

              <motion.div style={{ y: storyY }} className="lg:pt-10">
                <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.24)] backdrop-blur">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-fuchsia-200/70">Contexto real</p>
                      <p className="mt-3 text-3xl font-black text-white">06:03 AM</p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-200">
                      Reus / habitacion de mis padres
                    </div>
                  </div>

                  <div className="mt-8 space-y-4 text-base leading-7 text-slate-300">
                    <div className="rounded-[24px] border border-fuchsia-400/30 bg-fuchsia-500/10 p-5">
                      <p className="text-sm uppercase tracking-[0.24em] text-fuchsia-100/80">Lo he visto con mis propios ojos</p>
                      <p className="mt-3 text-lg font-semibold text-white">
                        300.000 seguidores. Sin poder comer tranquilo al final del mes.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Alberto</p>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          300k seguidores. Lo vi destruido: aceptando inauguraciones de autoservicios, vendiendo
                          cremas que no usaba. Miedo en los ojos.
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Rebeca</p>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          2.000 seguidores y una dedicación brutal. Su sueño: vivir en Corea creando contenido.
                          Sin tener que vender su alma.
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">18 meses</p>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          Si conectas a una persona con un producto real, sigues cobrando cada vez que vuelva.
                          Ingreso pasivo de verdad.
                        </p>
                      </div>
                      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                        <p className="text-sm uppercase tracking-[0.24em] text-slate-400">@bchanfuah</p>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          Sigo aquí. No escondido detrás de una marca. Lo construí para ellos. Y para ti.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div className="mt-16 rounded-[34px] border-l-4 border-[var(--creator-magenta)] bg-white/5 p-6 backdrop-blur sm:p-8" whileInView={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 28 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.5 }}>
              <div className="relative">
                <div className={!storyExpanded ? 'max-h-[15.5rem] overflow-hidden md:max-h-none' : ''}>
                  <p className="text-lg leading-8 text-slate-100">
                    Tenía 22 años cuando me metí en el mundo del K-pop y los K-dramas en Corea del Sur. Trabajaba
                    como extra, apareciendo fugazmente en videoclips y series de Netflix. Fue ahí donde conocí a{' '}
                    <strong className="text-white">Alberto</strong>. Trescientos mil seguidores en Instagram. Pero
                    lo vi destruido: tenía que aceptar colaboraciones con marcas que no representaba, vender
                    productos que ni siquiera usaba, asistir a inauguraciones de locales solo para pagar el piso.
                    Vi en sus ojos el miedo que todos los creadores conocen: tener la audiencia pero no la libertad.
                    Esa imagen no se me quitó de la cabeza.
                  </p>
                  <p className="mt-6 text-lg leading-8 text-slate-100">
                    Pero también conocí a <strong className="text-white">Rebeca</strong>. Apenas 2.000 seguidores
                    recién conquistados. La vi trabajar con una dedicación que me dejó sin palabras. Su sueño:
                    vivir en Corea del Sur dedicándose a crear contenido. Hacerlo dignamente, sin vender su alma.
                    Y yo pensé: &ldquo;Esta chica se lo merece, pero el sistema está diseñado para que solo ganen
                    las grandes corporaciones&rdquo;.
                  </p>
                  <p className="mt-6 text-lg leading-8 text-slate-100">
                    A los 24 años recorrí España de fábrica en fábrica buscando los mejores productores. A los
                    25 perdí 15.000€ importando un container de palomitas orgánicas que se pudrió en Incheon
                    mientras yo rogaba en ferias sin hablar coreano. Lloré en un parque de Seúl. A los 26 volví
                    a la habitación de mis padres en Reus. Son las 6 de la mañana y llevo dos meses sin dormir
                    más de 5 horas al día construyendo esto.
                  </p>
                  <p className="mt-6 text-lg leading-8 text-slate-100">
                    <strong className="text-white">Lo hice pensando en Alberto y en Rebeca.</strong> Para que
                    Alberto no tenga que elegir entre su integridad y su pan. Para que Rebeca, con sus 2.000
                    seguidores y su dedicación brutal, pueda empezar a vivir de esto sin esperar a tener cien mil.
                    Por eso el mínimo son 1.000 seguidores: el valor no está en el número, está en la conexión real.
                  </p>
                </div>

                {!storyExpanded && <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a192f] to-transparent md:hidden" />}
              </div>

              <button
                type="button"
                onClick={() => setStoryExpanded((current) => !current)}
                className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-fuchsia-200 md:hidden"
              >
                {storyExpanded ? 'Mostrar menos' : 'Leer mas'}
              </button>
            </motion.div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {PAIN_POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    whileInView={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 24 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.42 }}
                    className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_16px_45px_rgba(0,0,0,0.16)] backdrop-blur"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-[#f472b6]"
                      aria-label={item.title}
                      role="img"
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-base leading-7 text-slate-300">{item.body}</p>
                  </motion.article>
                );
              })}
            </div>

            <motion.div className="mt-14 rounded-[32px] border border-fuchsia-400/30 bg-[linear-gradient(135deg,rgba(217,70,239,0.16),rgba(251,113,133,0.10))] p-8" whileInView={{ opacity: 1, scale: 1 }} initial={{ opacity: 0, scale: 0.98 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.45 }}>
              <p className="max-w-4xl text-2xl font-black leading-tight text-white sm:text-3xl">
                Si estas aqui no es casualidad. Es una senal. No te voy a pedir que confies en una empresa. Te pido
                que confies en alguien que esta en el suelo contigo, construyendo la salida.
              </p>
            </motion.div>
          </div>

          <div aria-hidden="true" className="relative h-20 overflow-hidden">
            <svg viewBox="0 0 1440 140" className="absolute inset-0 h-full w-full fill-[var(--creator-soft)]">
              <path d="M0,64L60,74.7C120,85,240,107,360,101.3C480,96,600,64,720,58.7C840,53,960,75,1080,90.7C1200,107,1320,117,1380,122.7L1440,128L1440,160L1380,160C1320,160,1200,160,1080,160C960,160,840,160,720,160C600,160,480,160,360,160C240,160,120,160,60,160L0,160Z" />
            </svg>
          </div>
        </section>

        <section id="salida" className="bg-[var(--creator-soft)] px-4 py-20 text-slate-900 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-fuchsia-600">La salida</p>
                <h2 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] text-[#581c87] sm:text-5xl">
                  Deja de vender tu alma por un CPM de mierda. Empieza a ganar dinero mientras duermes durante 18 meses.
                </h2>
              </div>
              <div className="space-y-6 text-lg leading-8 text-slate-700">
                <p>
                  Hispaloshop no te pide que vendas cursos que no tienes ni que promociones batidoras chinas. Te conecta
                  con productores honestos de alimentos reales, gente que se parte el lomo como tu para crear algo bueno.
                </p>
                <p>
                  Tu mision: comparte lo que ya usas o lo que realmente usarias. Cuando un seguidor compra a traves de tu
                  link, tu ganas entre el 3% y el 7% de la venta. Pero aqui esta la magia: ese seguidor queda vinculado a
                  ti durante <strong>18 meses</strong>. Cada vez que vuelva a comprar, tu sigues cobrando.
                </p>
                <p>
                  Es ingreso pasivo real. No depende de que hagas 3 posts diarios. Depende de haber conectado a una
                  persona con un producto que de verdad le mejora la vida.
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-fuchsia-700">
              <div className="rounded-full bg-white px-4 py-3 shadow-sm">Hercules 3%</div>
              <div className="rounded-full bg-white px-4 py-3 shadow-sm">Atenea 5%</div>
              <div className="rounded-full bg-white px-4 py-3 shadow-sm">Zeus 7%</div>
              <div className="rounded-full bg-white px-4 py-3 shadow-sm">Tracking 18 meses</div>
            </div>

            <div id="tiers" className="mt-16 grid gap-6 lg:grid-cols-3">
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                return (
                  <motion.article
                    key={tier.key}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ duration: 0.18 }}
                    className={`rounded-[32px] border border-fuchsia-200 bg-white p-7 shadow-[0_24px_60px_rgba(88,28,135,0.10)] ${tier.className}`}
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-600"
                      aria-label={tier.title}
                      role="img"
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="mt-6 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-fuchsia-500">{tier.subtitle}</p>
                        <h3 className="mt-2 text-3xl font-black text-slate-950">{tier.title}</h3>
                      </div>
                      <p className="text-4xl font-black text-[#581c87]">{tier.rate}</p>
                    </div>
                    <p className="mt-5 text-base leading-7 text-slate-700">{tier.description}</p>
                    <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-600">
                      {tier.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-fuchsia-500" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.article>
                );
              })}
            </div>

            <p className="mt-8 text-sm uppercase tracking-[0.24em] text-slate-500">
              Cada tier sube automaticamente por GMV generado. Nadie paga por subir de nivel.
            </p>

            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {BENEFITS.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className="rounded-[30px] border border-fuchsia-100 bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,rgba(217,70,239,0.14),rgba(251,113,133,0.12))] text-fuchsia-600"
                      aria-label={item.title}
                      role="img"
                    >
                      <Icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-2xl font-black text-slate-950">{item.title}</h3>
                    <p className="mt-4 text-base leading-7 text-slate-700">{item.body}</p>
                  </article>
                );
              })}
            </div>

            <div id="aplicar" className="mt-18 rounded-[36px] bg-[linear-gradient(140deg,#581c87_0%,#7e22ce_36%,#ec4899_100%)] p-8 text-white shadow-[0_30px_80px_rgba(88,28,135,0.18)] sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-fuchsia-100/80">CTA final</p>
                  <h3 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                    No es facil. Pero es honesto. Y es tuyo si lo quieres.
                  </h3>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-white/80">
                    Si llevas tiempo sintiendo alivio y rabia al mismo tiempo, probablemente ya sabes que tu tiempo como
                    creador no deberia seguir malvendido.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                  <button
                    type="button"
                    onClick={() => handleApplyState(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-[#581c87] transition-transform hover:scale-[1.02]"
                  >
                    Unirme al movimiento
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <a
                    href="https://instagram.com/bchanfuah"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-4 font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    <Instagram className="h-4 w-4" aria-hidden="true" />
                    Seguir a @bchanfuah
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterLanding />

      <ApplicationModal open={isApplyOpen} onOpenChange={handleApplyState} />
    </div>
  );
}
