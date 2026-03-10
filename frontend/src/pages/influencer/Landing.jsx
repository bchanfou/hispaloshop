import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
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

const PAIN_POINTS = [
  { icon: HeartPulse, title: 'Ingresos frágiles', body: 'Puedes tener una semana excelente y tres semanas de silencio.' },
  { icon: Radar, title: 'El algoritmo manda', body: 'Cambia sin avisar y decide cuánto valen tus horas esta semana.' },
  { icon: ShieldAlert, title: 'Colaboraciones vacías', body: 'Aceptar marcas que no te representan solo para pagar el alquiler.' },
  { icon: Coffee, title: 'No hay descanso', body: 'Si desapareces unos días, el ingreso también desaparece.' },
];

const TIERS = [
  { key: 'hercules', title: 'HERCULES', rate: '3%', subtitle: 'El inicio', description: 'Para cuentas pequeñas con comunidad real y criterio.', bullets: ['Acceso al catálogo', 'Links personalizados', 'Panel base'], icon: Gem },
  { key: 'atenea', title: 'ATENEA', rate: '5%', subtitle: 'El crecimiento', description: 'Para perfiles consolidados que ya saben recomendar bien.', bullets: ['Soporte prioritario', 'Lanzamientos antes que nadie', 'Analítica ampliada'], icon: Sparkles },
  { key: 'zeus', title: 'ZEUS', rate: '7%', subtitle: 'La cima', description: 'Para creadores con comunidad muy activa y alcance sostenido.', bullets: ['Campañas directas', 'Retiros preferentes', 'Visibilidad extra'], icon: Crown },
];

const BENEFITS = [
  { icon: Sparkles, title: 'Libertad para recomendar', body: 'No quiero que recomiendes cualquier cosa. Quiero que puedas defender lo que compartes.' },
  { icon: HandHeart, title: 'Impacto real', body: 'Tus ventas pueden sostener a productores honestos y dar contexto útil a tu audiencia.' },
  { icon: Users2, title: 'Relación más sana', body: 'La monetización deja de depender solo del siguiente post y empieza a apoyarse en confianza repetida.' },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5 },
};

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const isApplyOpen = location.pathname.endsWith('/aplicar');

  const handleApplyState = (nextOpen) => {
    navigate(nextOpen ? '/influencer/aplicar' : '/influencer');
  };

  return (
    <div className="bg-stone-50 text-stone-900">
      <SEOHead
        title="Programa de influencers Hispaloshop"
        description="Programa para creadores que quieren monetizar con más dignidad, mejor contexto y relaciones más honestas con su audiencia."
        keywords="programa de influencers, afiliación honesta, creadores de contenido, monetizar con productos reales"
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-stone-950/90 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate('/')} className="text-left text-sm font-semibold uppercase tracking-[0.28em] text-white">
            Hispaloshop
          </button>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_ITEMS.map((item) => (
              <button key={item.href} type="button" onClick={() => scrollToId(item.href.slice(1))} className="text-sm text-stone-300 transition-colors hover:text-white">
                {item.label}
              </button>
            ))}
          </nav>

          <button type="button" onClick={() => handleApplyState(true)} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition-transform hover:scale-[1.02]">
            Aplicar ahora
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main>
        <section id="problema" className="bg-stone-950 text-white">
          <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-24 lg:pt-24">
            <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
              <motion.div {...fadeUp}>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-stone-300">
                  <Coffee className="h-4 w-4" aria-hidden="true" />
                  Lo vi de cerca
                </div>
                <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-[4rem]">
                  He visto a creadores con mucha audiencia aceptar colaboraciones que les daban vergüenza solo para llegar a fin de mes.
                </h1>
                <p className="mt-8 max-w-3xl text-xl leading-8 text-stone-300 sm:text-[22px]">
                  Conocí a Alberto así. Desde fuera parecía que le iba bien. Por dentro estaba cansado de vender cosas que no usaba y de depender de acuerdos que le dejaban dinero rápido y tranquilidad cero. Esta parte de Hispaloshop nace para ofrecer otra salida.
                </p>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <button type="button" onClick={() => handleApplyState(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-stone-950 transition-transform hover:scale-[1.02]">
                    Aplicar ahora
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => scrollToId('salida')} className="rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10">
                    Ver cómo funciona
                  </button>
                </div>

                <p className="mt-6 text-sm uppercase tracking-[0.28em] text-stone-400">
                  No te prometo humo. Te propongo una relación más limpia con tu audiencia.
                </p>
              </motion.div>

              <motion.aside {...fadeUp} transition={{ duration: 0.5, delay: 0.08 }} className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.24)] backdrop-blur">
                <p className="text-xs uppercase tracking-[0.28em] text-stone-400">Mi contexto</p>
                <div className="mt-6 space-y-4 text-base leading-7 text-stone-300">
                  <p>En Corea del Sur vi muy de cerca lo que pasa con muchos creadores. Desde fuera parece libertad. Desde dentro muchas veces es dependencia, ansiedad y acuerdos que te van vaciando.</p>
                  <p>También conocí a Rebeca cuando apenas empezaba. Tenía pocos seguidores, pero una disciplina brutal. Lo que me quedó claro es que el problema no era el talento. Era el sistema.</p>
                  <p>Por eso aquí el mínimo no es la fama. Es la conexión real. Si sabes recomendar con criterio, puedes construir una relación que te siga pagando cuando de verdad funciona.</p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <p className="text-sm uppercase tracking-[0.24em] text-stone-400">18 meses</p>
                    <p className="mt-3 text-sm leading-6 text-stone-300">El seguidor que compra a través de ti puede seguir vinculado durante 18 meses.</p>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                    <p className="text-sm uppercase tracking-[0.24em] text-stone-400">Bil</p>
                    <p className="mt-3 text-sm leading-6 text-stone-300">Esto está construido desde experiencia propia, no desde una agencia.</p>
                  </div>
                </div>
              </motion.aside>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {PAIN_POINTS.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article key={item.title} {...fadeUp} className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-base leading-7 text-stone-300">{item.body}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="salida" className="bg-stone-50 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-stone-500">La salida</p>
                <h2 className="mt-5 max-w-3xl text-4xl font-black leading-tight tracking-[-0.03em] text-stone-950 sm:text-5xl">
                  Quiero que puedas recomendar algo con orgullo y seguir cobrando cuando ese vínculo funcione de verdad.
                </h2>
              </div>
              <div className="space-y-6 text-lg leading-8 text-stone-700">
                <p>Hispaloshop no te pide que te inventes un personaje. Te conecta con productores honestos y con productos que puedes explicar sin sentirte falso.</p>
                <p>Cuando alguien compra a través de tu enlace, ganas entre el 3% y el 7%. Y si esa persona vuelve a comprar durante <strong>18 meses</strong>, sigues participando en esa relación.</p>
                <p>Eso se parece mucho más a construir una carrera que a sobrevivir publicación por publicación.</p>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-stone-700">
              <div className="rounded-full bg-white px-4 py-3 shadow-sm">Hércules 3%</div>
              <div className="rounded-full bg-white px-4 py-3 shadow-sm">Atenea 5%</div>
              <div className="rounded-full bg-white px-4 py-3 shadow-sm">Zeus 7%</div>
              <div className="rounded-full bg-white px-4 py-3 shadow-sm">Tracking 18 meses</div>
            </div>

            <div id="tiers" className="mt-16 grid gap-6 lg:grid-cols-3">
              {TIERS.map((tier) => {
                const Icon = tier.icon;
                return (
                  <motion.article key={tier.key} {...fadeUp} className="rounded-[32px] border border-stone-200 bg-white p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-900">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="mt-6 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{tier.subtitle}</p>
                        <h3 className="mt-2 text-3xl font-black text-stone-950">{tier.title}</h3>
                      </div>
                      <p className="text-4xl font-black text-stone-950">{tier.rate}</p>
                    </div>
                    <p className="mt-5 text-base leading-7 text-stone-700">{tier.description}</p>
                    <ul className="mt-6 space-y-3 text-sm leading-6 text-stone-600">
                      {tier.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-stone-900" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.article>
                );
              })}
            </div>

            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {BENEFITS.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.article key={item.title} {...fadeUp} className="rounded-[30px] border border-stone-200 bg-white p-7 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-100 text-stone-900">
                      <Icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-2xl font-black text-stone-950">{item.title}</h3>
                    <p className="mt-4 text-base leading-7 text-stone-700">{item.body}</p>
                  </motion.article>
                );
              })}
            </div>

            <div id="aplicar" className="mt-16 rounded-[36px] bg-stone-950 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <h3 className="mt-4 text-3xl font-black leading-tight sm:text-4xl">
                    Si tu audiencia confía en ti, quiero que esa confianza también te dé estabilidad.
                  </h3>
                  <p className="mt-4 max-w-3xl text-lg leading-8 text-white/80">
                    Si llevas tiempo sintiendo que trabajas mucho para construir algo que nunca termina de ser tuyo, esta parte de Hispaloshop está hecha para eso.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                  <button type="button" onClick={() => handleApplyState(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-stone-950 transition-transform hover:scale-[1.02]">
                    Aplicar ahora
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <a href="https://instagram.com/bchanfuah" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-4 font-semibold text-white transition-colors hover:bg-white/15">
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
