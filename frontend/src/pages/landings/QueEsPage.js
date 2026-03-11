import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Compass, Globe, MessageCircle, Package, Search, Wheat } from 'lucide-react';
import SEOHead from '../../components/landings/SEOHead';
import LandingSectionNav from '../../components/landings/LandingSectionNav';
import NavbarLanding from '../../components/landings/NavbarLanding';
import FooterLanding from '../../components/landings/FooterLanding';
import FeatureGrid from '../../components/landings/FeatureGrid';
import FAQAccordion from '../../components/landings/FAQAccordion';
import StepProcess from '../../components/landings/StepProcess';

const FEATURES = [
  {
    icon: Wheat,
    title: 'Producto con origen',
    description: 'Puedes ver quién está detrás de lo que compras, cómo trabaja y por qué ese producto merece atención.',
  },
  {
    icon: MessageCircle,
    title: 'Relación más directa',
    description: 'La ficha no es el final. La conversación también forma parte de una compra mejor informada.',
  },
  {
    icon: Globe,
    title: 'Más contexto útil',
    description: 'Productores, creadores e importadores conviven en el mismo flujo para que entiendas mejor lo que tienes delante.',
  },
];

const STEPS = [
  {
    icon: Search,
    title: 'Explora',
    description: 'Entras por interés real y descubres comida, historias y personas con criterio.',
  },
  {
    icon: MessageCircle,
    title: 'Entiende',
    description: 'Lees contexto, sigues perfiles relevantes y comparas mejor antes de decidir.',
  },
  {
    icon: Package,
    title: 'Compra',
    description: 'La compra llega después, cuando ya sabes por qué ese producto encaja contigo.',
  },
];

const FAQS = [
  {
    question: '¿Qué es Hispaloshop exactamente?',
    answer: 'Es una plataforma de social commerce para alimentación. Puedes descubrir productos, seguir a productores y comprar con más contexto.',
  },
  {
    question: '¿Por qué tiene una capa social?',
    answer: 'Porque una buena compra no sale solo del precio. También sale de entender quién está detrás y si esa recomendación tiene sentido.',
  },
  {
    question: '¿Solo sirve para consumidores?',
    answer: 'No. También está pensada para productores, creadores e importadores, pero esta página explica la idea general del producto.',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: 'easeOut' },
};

const QueEsPage = () => {
  const navigate = useNavigate();
  const extraLinks = useMemo(() => [{ label: 'Historia', href: '#historia' }], []);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-950">
      <SEOHead
        title="Qué es Hispaloshop"
        description="Descubre por qué existe Hispaloshop y cómo conecta productores, creadores, importadores y consumidores en un mismo flujo."
        keywords="Hispaloshop, social commerce, productores, creadores, importadores, comida real"
      />

      <NavbarLanding extraLinks={extraLinks} />
      <LandingSectionNav />

      <section className="overflow-hidden bg-stone-50 pb-16 pt-10 sm:pb-20 sm:pt-12">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <motion.div {...fadeUp}>
            <span className="inline-flex rounded-full border border-stone-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
              Social commerce alimentario
            </span>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-[-0.03em] text-stone-950 md:text-5xl lg:text-6xl">
              Comida real, contexto suficiente y una forma más limpia de comprar.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
              Hispaloshop existe para acercarte a productores honestos, creadores que recomiendan con criterio e importadores que no quieren volver a trabajar a ciegas.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => navigate('/register/new')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3.5 font-medium text-white transition-colors hover:bg-stone-800"
              >
                Crear cuenta
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/discover')}
                className="rounded-full border border-stone-300 bg-white px-6 py-3.5 font-medium text-stone-950 transition-colors hover:bg-stone-100"
              >
                Explorar catálogo
              </button>
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.08 }} className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <img
                src="https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&auto=format&fit=crop"
                alt="Botellas de aceite de oliva artesanal"
                loading="lazy"
                className="h-[220px] w-full rounded-[28px] object-cover shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] sm:h-[280px]"
              />
              <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-stone-950">Compra con contexto</p>
                <p className="mt-2 text-sm leading-6 text-stone-700">Menos ruido, más señales reales sobre producto, origen y recomendación.</p>
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <img
                src="https://images.unsplash.com/photo-1552767059-ce182ead6c1b?w=900&auto=format&fit=crop"
                alt="Queso artesanal en una mesa de producto"
                loading="lazy"
                className="h-[280px] w-full rounded-[28px] object-cover shadow-[0_18px_40px_-28px_rgba(15,23,42,0.3)] sm:h-[340px]"
              />
              <div className="rounded-[28px] bg-stone-950 p-5 text-white shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
                <p className="text-sm font-semibold">Un solo flujo</p>
                <p className="mt-2 text-sm leading-6 text-stone-300">Descubrir, conversar y comprar sin saltar entre experiencias rotas.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black tracking-[-0.03em] text-stone-950 sm:text-4xl">
            Nació de una frustración concreta: ver buen producto escondido dentro de un sistema que no explica nada.
          </h2>
          <div className="mt-10 grid gap-4 text-left md:grid-cols-2">
            {[
              'Etiquetas sin contexto suficiente.',
              'Recomendaciones que no sabes si creer.',
              'Productores invisibles para quien sí los valoraría.',
              'Compras que no cuentan ninguna historia real.',
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-stone-200 bg-stone-50 p-5 text-stone-700">
                {item}
              </div>
            ))}
          </div>
          <p className="mt-8 text-xl font-semibold leading-9 text-stone-950">
            Hispaloshop parte de una pregunta simple:
            <br />
            ¿Y si pudieras comprar sabiendo quién está al otro lado?
          </p>
        </div>
      </section>

      <section id="historia" className="bg-stone-950 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">La historia detrás</p>
            <h2 className="text-3xl font-black tracking-[-0.03em]">Por qué existe Hispaloshop</h2>
            <p className="mt-4 text-lg leading-8 text-stone-300">No salió de un estudio de mercado. Salió de lo que vi y de lo que perdí.</p>
          </div>
          <div className="space-y-5 rounded-[32px] border border-white/10 bg-white/5 p-6 text-base leading-8 text-stone-300 sm:p-8">
            <p>Tenía 24 años y recorría España de fábrica en fábrica. Conocí a productores que hacían las cosas bien y que seguían siendo invisibles para casi todo el mundo.</p>
            <p>
              Intenté llevar esos productos fuera. Fracasé. Perdí 15.000 EUR y entendí algo que ya no se me olvidó:
              <strong className="text-white"> el problema no era el producto, sino la falta de un canal directo entre quien hace la comida y quien la compra.</strong>
            </p>
            <p>Por eso hice Hispaloshop. Para que puedas comprar con más verdad, para que el productor honesto no desaparezca en un lineal y para que el creador no tenga que elegir entre dignidad e ingresos.</p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-stone-950">BC</div>
              <div>
                <p className="text-sm font-semibold text-white">Bil Chanfou · Fundador</p>
                <a href="https://instagram.com/bchanfuah" target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 transition-colors hover:text-white">
                  @bchanfuah
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-stone-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-black tracking-[-0.03em] text-stone-950">Cómo funciona</h2>
          <StepProcess steps={STEPS} layout="horizontal" />
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-black tracking-[-0.03em] text-stone-950">Tres pilares del producto</h2>
          <FeatureGrid features={FEATURES} columns={3} />
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="rounded-[32px] border border-stone-200 bg-stone-50 p-8 sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-950 text-white">
              <Compass className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-3xl font-black tracking-[-0.03em] text-stone-950">Empieza por mirar mejor lo que compras</h2>
            <p className="mt-4 text-lg leading-8 text-stone-700">
              Después ya decidirás si quieres seguir, comprar o construir tu perfil dentro de Hispaloshop.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button type="button" onClick={() => navigate('/register/new')} className="rounded-full bg-stone-950 px-8 py-4 font-semibold text-white transition-colors hover:bg-stone-800">
                Crear cuenta
              </button>
              <button type="button" onClick={() => navigate('/discover')} className="rounded-full border border-stone-300 bg-white px-8 py-4 font-semibold text-stone-950 transition-colors hover:bg-stone-100">
                Explorar sin cuenta
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-stone-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-12 text-center text-3xl font-black tracking-[-0.03em] text-stone-950">Preguntas frecuentes</h2>
          <FAQAccordion faqs={FAQS} />
        </div>
      </section>

      <FooterLanding />
    </div>
  );
};

export default QueEsPage;
