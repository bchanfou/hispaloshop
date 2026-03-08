import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  Filter,
  Globe,
  Handshake,
  HelpCircle,
  Package,
  PackageX,
  Percent,
  Plane,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Verified,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Footer from '../components/Footer';
import Header from '../components/Header';
import SEO from '../components/SEO';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55 },
};

const problems = [
  {
    title: '"Viajo a ferias sin saber si funcionara"',
    description: 'Gastos de viaje, tiempo perdido y productos que luego no venden en tu mercado.',
    icon: Plane,
  },
  {
    title: '"No se si este producto encajara aqui"',
    description: 'Faltan datos sobre tendencias locales, competencia y precios aceptables.',
    icon: HelpCircle,
  },
  {
    title: '"Importe demasiado y ahora tengo stock muerto"',
    description: 'Sin prediccion de demanda, el sobre-stock y quedarse corto salen caros.',
    icon: PackageX,
  },
  {
    title: '"No confio en el productor que encontre online"',
    description: 'Falta de verificacion, riesgo de fraude y calidad inconsistente.',
    icon: ShieldAlert,
  },
];

const solutions = [
  {
    title: 'Descubrimiento inteligente',
    description: 'IA analiza tu mercado y encuentra productores globales que encajan con tendencias locales.',
    icon: Search,
    colors: 'bg-purple-100 text-purple-600',
  },
  {
    title: 'Analisis de viabilidad completo',
    description: 'Precio optimo de venta, tasa de exito estimada y cantidad recomendada de importacion.',
    icon: Activity,
    colors: 'bg-cyan-100 text-cyan-600',
  },
  {
    title: 'Productores verificados',
    description: 'Todos los productores estan validados, con historial, reviews y certificaciones visibles.',
    icon: Verified,
    colors: 'bg-green-100 text-green-600',
  },
  {
    title: 'Contacto directo',
    description: 'Negocias directamente con el productor. Sin intermediarios ni comisiones ocultas en el trato.',
    icon: Handshake,
    colors: 'bg-blue-100 text-blue-600',
  },
];

const processSteps = [
  { title: '1. Registrate', description: 'Crea tu cuenta, verifica tu empresa y accede al marketplace global.', icon: UserPlus, colors: 'bg-blue-100 text-blue-600' },
  { title: '2. Descubre', description: 'IA te recomienda productores y productos segun tu mercado objetivo.', icon: Search, colors: 'bg-purple-100 text-purple-600' },
  { title: '3. Analiza', description: 'Viabilidad completa: precio, demanda, competencia y cantidad optima.', icon: BarChart3, colors: 'bg-cyan-100 text-cyan-600' },
  { title: '4. Importa', description: 'Contacta directo, negocia, importa y luego vende o distribuye.', icon: Handshake, colors: 'bg-green-100 text-green-600' },
];

const plans = [
  {
    id: 'pro',
    name: 'PRO',
    subtitle: 'Importador nacional',
    price: '79€',
    suffix: '/mes + IVA',
    iva: '~95,59€ con IVA incluido',
    commission: '18%',
    panelClass: 'bg-white border-2 border-blue-200 shadow-lg',
    commissionClass: 'bg-blue-50 text-blue-600',
    buttonClass: 'bg-blue-600 text-white hover:bg-blue-700',
    buttonLabel: 'Activar PRO',
    features: [
      'Acceso marketplace nacional en tu pais',
      'Contacto directo con productores',
      'HI IA Sourcing Nacional',
      'Recomendacion de productos locales para importar',
      'Analisis de tendencias en tu pais',
      'Match con productores nacionales',
      'Tienda B2C incluida para vender directo',
    ],
  },
  {
    id: 'elite',
    name: 'ELITE',
    subtitle: 'Importador internacional',
    price: '149€',
    suffix: '/mes + IVA',
    iva: '~180,29€ con IVA incluido',
    commission: '17%',
    panelClass: 'bg-gradient-to-br from-gray-900 to-blue-900 text-white border-2 border-yellow-400 lg:scale-[1.03]',
    commissionClass: 'bg-white/10 text-yellow-400',
    buttonClass: 'bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 hover:shadow-lg hover:shadow-yellow-400/25',
    buttonLabel: 'Solicitar ELITE',
    featured: true,
    features: [
      'Todo lo del plan PRO',
      'HI IA Sourcing Global',
      'Acceso a productores de 40+ paises',
      'Analisis de viabilidad completo por producto y pais',
      'Precio optimo de venta en tu mercado',
      'Tasa de exito estimada con porcentaje de confianza',
      'Cantidad recomendada de importacion',
      'Match con productores globales por compatibilidad',
      'Analisis de productos que ya comercializas para expansion',
      'Label Digital Multiidioma',
      'QR por producto para envios internacionales',
    ],
  },
];

const eliteFeatures = [
  {
    title: 'Analisis de tendencias locales',
    description: 'Detecta si esta creciendo el interes por productos similares en tu zona.',
    icon: TrendingUp,
    colors: 'bg-purple-100 text-purple-600',
  },
  {
    title: 'Precio optimo de venta',
    description: 'Estima cuanto pueden pagar tus clientes segun poder adquisitivo y competencia.',
    icon: Percent,
    colors: 'bg-cyan-100 text-cyan-600',
  },
  {
    title: 'Tasa de exito estimada',
    description: 'Calcula probabilidad de exito usando datos historicos comparables.',
    icon: Percent,
    colors: 'bg-green-100 text-green-600',
  },
  {
    title: 'Cantidad recomendada',
    description: 'Calcula si conviene empezar con 200, 500 o 2.000 unidades.',
    icon: Package,
    colors: 'bg-amber-100 text-amber-600',
  },
];

const matching = [
  {
    title: 'Filtrado por compatibilidad',
    description: 'La IA analiza tu catalogo actual y encuentra gaps que encajan con tendencias.',
    icon: Filter,
    colors: 'bg-purple-100 text-purple-600',
  },
  {
    title: 'Match por perfil de cliente',
    description: 'Si tus clientes compran queso artesano, la IA te muestra complementos con sentido.',
    icon: Target,
    colors: 'bg-cyan-100 text-cyan-600',
  },
  {
    title: 'Verificacion garantizada',
    description: 'Todos los productores estan validados por Hispaloshop con historial y certificaciones.',
    icon: ShieldCheck,
    colors: 'bg-green-100 text-green-600',
  },
];

const faqs = [
  {
    question: 'Puedo ser importador y productor a la vez?',
    answer: 'Si. Puedes tener perfil dual: importar lo que no produces y vender lo que si produces.',
  },
  {
    question: 'Como se calcula la tasa de exito?',
    answer: 'La IA analiza busquedas, ventas comparables, competencia, estacionalidad y paridad de precios en tu zona.',
  },
  {
    question: 'La IA me obliga a importar algo?',
    answer: 'No. La IA recomienda y predice. Tu decides si contactas, negocias o importas.',
  },
  {
    question: 'Que pasa si el analisis falla y el producto no vende?',
    answer: 'Son probabilidades, no certezas. Por eso recomendamos empezar con la cantidad minima sugerida.',
  },
  {
    question: 'Puedo vender los productos importados fuera de Hispaloshop?',
    answer: 'Si. La comision del 17-18% solo aplica si vendes a traves de la plataforma.',
  },
];

export default function ImporterLandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToRegister = (plan) => {
    navigate(`/register?role=importer${plan ? `&plan=${plan}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SEO
        title="Se Importador en Hispaloshop - Sourcing global con IA"
        description="Encuentra productores verificados en 40+ paises. IA analiza viabilidad, precio optimo, tasa de exito y cantidad recomendada antes de importar."
        url="https://www.hispaloshop.com/importador"
      />
      <Header />

      <main>
        <section className="relative min-h-[700px] overflow-hidden bg-blue-900 text-white flex items-center">
          <div className="absolute inset-0 opacity-10">
            <svg className="h-full w-full" viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M150,200 Q200,150 250,200 T350,200" fill="none" stroke="white" strokeWidth="2" />
              <path d="M400,100 Q500,50 600,100 T800,150" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="200" cy="200" r="3" fill="white" />
              <circle cx="350" cy="200" r="3" fill="white" />
              <circle cx="500" cy="100" r="3" fill="white" />
              <circle cx="700" cy="150" r="3" fill="white" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-blue-500 opacity-30 blur-3xl" />
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-500 opacity-20 blur-3xl" />

          <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <motion.span {...fadeUp} className="mb-6 inline-flex items-center rounded-full border border-blue-500/30 bg-blue-700/50 px-4 py-2 text-sm font-medium text-blue-100">
                <Globe className="mr-2 h-4 w-4" />
                Sourcing Global Inteligente
              </motion.span>
              <motion.h1 {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="mb-6 font-heading text-5xl font-bold leading-tight lg:text-7xl">
                Descubre.
                <br />
                Analiza.
                <br />
                <span className="text-cyan-300">Importa.</span>
              </motion.h1>
              <motion.p {...fadeUp} transition={{ duration: 0.55, delay: 0.1 }} className="mb-8 max-w-lg text-xl leading-relaxed text-blue-100">
                Deja de perder tiempo en ferias internacionales sin garantias. Nuestra IA encuentra productores verificados, analiza viabilidad en tu mercado y calcula tu margen antes de comprar.
              </motion.p>
              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="mb-10 flex flex-wrap gap-6 md:gap-8">
                <div>
                  <p className="text-3xl font-bold text-white">40+</p>
                  <p className="text-sm text-blue-200">Paises con productores</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">17-20%</p>
                  <p className="text-sm text-blue-200">Comision por venta B2C</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">IA</p>
                  <p className="text-sm text-blue-200">Prediccion de exito</p>
                </div>
              </motion.div>
              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.2 }} className="flex flex-col gap-4 sm:flex-row">
                <button onClick={() => goToRegister('pro')} className="flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-blue-900 transition-all hover:scale-[1.02] hover:shadow-xl">
                  <Search className="h-5 w-5" />
                  Encontrar productores
                </button>
                <button onClick={() => scrollToSection('planes-importador')} className="rounded-full border-2 border-blue-400 px-8 py-4 text-lg font-semibold text-blue-100 transition-all hover:bg-blue-800">
                  Ver planes PRO y ELITE
                </button>
              </motion.div>
            </div>

            <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }} className="relative hidden h-[500px] lg:block">
              <div className="absolute left-0 top-0 w-64 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <p className="font-semibold mb-1">IA encuentra</p>
                <p className="text-sm text-blue-200">Productores que encajan con tu mercado</p>
              </div>
              <ArrowRight className="absolute left-72 top-20 h-8 w-8 text-blue-400" />
              <div className="absolute right-0 top-10 w-64 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <p className="font-semibold mb-1">Analisis de viabilidad</p>
                <p className="text-sm text-blue-200">Precio optimo, tasa de exito y cantidad recomendada</p>
              </div>
              <div className="absolute bottom-20 left-20 w-64 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500">
                  <Handshake className="h-6 w-6 text-white" />
                </div>
                <p className="font-semibold mb-1">Contacto directo</p>
                <p className="text-sm text-blue-200">Negociacion libre, sin intermediarios</p>
              </div>
              <div className="absolute bottom-0 right-10 w-64 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-6 backdrop-blur-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400">
                  <Ship className="h-6 w-6 text-blue-900" />
                </div>
                <p className="font-semibold mb-1 text-cyan-300">Importa con datos</p>
                <p className="text-sm text-blue-200">Decisiones basadas en analisis, no en intuicion</p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center">
              <h2 className="mb-4 font-heading text-4xl font-bold text-gray-900">Importar sin datos es apostar</h2>
              <p className="text-xl text-gray-600">Los riesgos que eliminamos</p>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {problems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.article key={item.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className="rounded-2xl border-l-4 border-red-400 bg-red-50 p-6">
                    <Icon className="mb-4 h-10 w-10 text-red-500" />
                    <h3 className="mb-2 font-bold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-warm py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center">
              <h2 className="font-heading text-4xl font-bold text-gray-900">Importa con inteligencia, no con intuicion</h2>
            </motion.div>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <motion.div {...fadeUp} className="space-y-6">
                {solutions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-4 rounded-xl bg-white p-4 shadow-sm">
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${item.colors}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="mb-1 font-bold text-gray-900">{item.title}</h3>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </motion.div>

              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.08 }}>
                <div className="rounded-3xl bg-gray-900 p-6 text-white">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Analisis de viabilidad</p>
                      <p className="text-xl font-bold">Queso artesano - Italia a Espana</p>
                    </div>
                    <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">87% tasa de exito</span>
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-xl bg-white/5 p-4">
                      <div className="mb-2 flex justify-between">
                        <span className="text-sm text-gray-400">Precio importacion</span>
                        <span className="font-semibold">€8.50/unidad</span>
                      </div>
                      <div className="mb-2 flex justify-between">
                        <span className="text-sm text-gray-400">Precio venta recomendado</span>
                        <span className="font-semibold text-green-400">€14.90/unidad</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Margen bruto</span>
                        <span className="font-semibold text-cyan-400">75%</span>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="mb-2 text-sm text-gray-400">Cantidad recomendada primer pedido</p>
                      <p className="text-2xl font-bold">200-300 unidades</p>
                      <p className="text-xs text-gray-500">Basado en demanda similar en tu zona</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="mb-2 text-sm text-gray-400">Tendencias en tu mercado</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-300">Queso artesano +23%</span>
                        <span className="rounded bg-cyan-500/20 px-2 py-1 text-xs text-cyan-300">Italiano trending</span>
                        <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-300">Sostenible</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center">
              <h2 className="font-heading text-4xl font-bold text-gray-900">De la idea al contenedor</h2>
            </motion.div>
            <div className="grid gap-8 md:grid-cols-4">
              {processSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.article key={step.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className="text-center">
                    <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${step.colors}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <h3 className="mb-2 font-bold text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="planes-importador" className="bg-gradient-to-b from-blue-50 to-white py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center">
              <h2 className="mb-4 font-heading text-4xl font-bold text-gray-900">Escalon de importador</h2>
              <p className="text-gray-600">Mismo esquema que productores, misma libertad de crecimiento</p>
            </motion.div>

            <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
              {plans.map((plan, index) => (
                <motion.article key={plan.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className={`relative rounded-3xl p-8 ${plan.panelClass}`}>
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 px-4 py-1 text-sm font-bold text-gray-900">Sourcing Global</span>
                    </div>
                  )}
                  <div className="mb-6 text-center">
                    <h3 className={`mb-2 text-xl font-bold ${plan.id === 'elite' ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    <p className={`text-sm ${plan.id === 'elite' ? 'text-gray-400' : 'text-gray-500'}`}>{plan.subtitle}</p>
                  </div>
                  <div className="mb-2 text-center">
                    <span className={`text-5xl font-bold ${plan.id === 'elite' ? 'text-yellow-400' : 'text-blue-600'}`}>{plan.price}</span>
                    <span className={plan.id === 'elite' ? 'text-gray-400' : 'text-gray-500'}>{plan.suffix}</span>
                  </div>
                  <p className="mb-6 text-center text-sm text-gray-500">{plan.iva}</p>
                  <div className={`mb-6 rounded-xl p-4 text-center ${plan.commissionClass}`}>
                    <p className="text-3xl font-bold">{plan.commission}</p>
                    <p className={`text-sm ${plan.id === 'elite' ? 'text-gray-300' : 'text-gray-600'}`}>Comision ventas B2C en plataforma</p>
                  </div>
                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className={`flex items-start gap-3 rounded-lg text-sm ${feature.includes('HI IA') || feature.includes('Label Digital') ? (plan.id === 'elite' ? 'bg-white/10 p-2' : 'bg-purple-50 p-2') : ''}`}>
                        {feature.includes('HI IA') ? (
                          <Sparkles className={`mt-0.5 h-5 w-5 flex-shrink-0 ${plan.id === 'elite' ? 'text-yellow-400' : 'text-purple-600'}`} />
                        ) : feature.includes('Label Digital') ? (
                          <QrCode className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" />
                        ) : feature.includes('40+') ? (
                          <Globe className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
                        ) : (
                          <Check className={`mt-0.5 h-5 w-5 flex-shrink-0 ${plan.id === 'elite' ? 'text-yellow-400' : 'text-blue-600'}`} />
                        )}
                        <span className={plan.id === 'elite' ? 'text-gray-100' : feature.includes('HI IA') ? 'font-semibold text-purple-900' : 'text-gray-700'}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => goToRegister(plan.id)} className={`w-full rounded-xl py-3 font-semibold transition-all ${plan.buttonClass}`}>
                    {plan.buttonLabel}
                  </button>
                </motion.article>
              ))}
            </div>

            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.12 }} className="mt-12 text-center">
              <p className="text-sm text-gray-600">
                <strong>Ya eres productor?</strong> Puedes tener perfil dual Productor+Importador.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <motion.div {...fadeUp}>
              <span className="mb-4 inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                <Star className="mr-2 h-4 w-4" />
                Exclusivo plan ELITE
              </span>
              <h2 className="mb-6 font-heading text-4xl font-bold text-gray-900">Sabes si funcionara antes de importar</h2>
              <p className="mb-6 text-lg text-gray-600">
                Nuestra IA analiza datos reales de Hispaloshop en tu pais para predecir el exito de un producto antes de comprar un solo contenedor.
              </p>
              <div className="space-y-4">
                {eliteFeatures.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${item.colors}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.08 }}>
              <div className="rounded-3xl bg-gray-900 p-6 text-white">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500">
                      <Sparkles className="h-5 w-5 text-gray-900" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">HI IA Analisis de Viabilidad</p>
                      <p className="font-semibold">Miel de lavanda - Francia a Espana</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm font-bold text-green-400">92% exito</span>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <p className="text-2xl font-bold text-cyan-400">€12.50</p>
                      <p className="text-xs text-gray-400">Coste importacion</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <p className="text-2xl font-bold text-green-400">€24.90</p>
                      <p className="text-xs text-gray-400">Precio venta optimo</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-400">99%</p>
                      <p className="text-xs text-gray-400">Margen bruto</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <p className="text-sm text-gray-400">Cantidad recomendada primer pedido</p>
                      <p className="text-xl font-bold text-white">500-750 unidades</p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-700">
                      <div className="h-2 w-3/4 rounded-full bg-gradient-to-r from-yellow-400 to-green-400" />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Rango seguro basado en demanda estimada</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="mb-3 text-sm text-gray-400">Analisis de mercado Espana</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Busquedas "miel artesana"</span>
                        <span className="text-green-400">+34% ↑</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Competencia directa</span>
                        <span className="text-yellow-400">Media</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Preferencia origen frances</span>
                        <span className="text-green-400">Alta</span>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <div className="flex items-center gap-3">
                      <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face" className="h-10 w-10 rounded-full object-cover" alt="Productor" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold">Mieleries du Luberon</p>
                        <p className="text-xs text-gray-400">Provenza, Francia · 4.9★</p>
                      </div>
                      <button onClick={() => goToRegister('elite')} className="rounded-lg bg-blue-500 px-3 py-1 text-xs text-white hover:bg-blue-600">
                        Contactar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-warm py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center">
              <h2 className="mb-4 font-heading text-4xl font-bold text-gray-900">La IA te presenta a quien necesitas</h2>
              <p className="text-gray-600">No busques. Descubre.</p>
            </motion.div>
            <div className="grid gap-6 md:grid-cols-3">
              {matching.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.article key={item.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${item.colors}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 font-bold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="rounded-3xl border border-blue-100 bg-blue-50 p-8 lg:p-12">
              <div className="flex flex-col items-center gap-8 md:flex-row">
                <div className="flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face"
                    alt="Carlos Martin - Importador"
                    className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg"
                  />
                </div>
                <div className="flex-1">
                  <div className="mb-4 font-heading text-4xl text-blue-200">"</div>
                  <p className="mb-6 text-lg leading-relaxed text-gray-700">
                    Antes gastaba 5.000€ en ferias para encontrar dos productores viables. Con Hispaloshop ELITE, en una tarde analice 15 oportunidades, vi que la miel griega tenia alta probabilidad de exito en Madrid, contacte al productor y cerre el primer pedido en 48 horas.
                  </p>
                  <div className="flex flex-col gap-2 text-center md:flex-row md:items-center md:gap-4 md:text-left">
                    <div>
                      <p className="font-bold text-gray-900">Carlos Martin</p>
                      <p className="text-blue-600">Importador · Madrid, Espana</p>
                    </div>
                    <span className="hidden text-gray-300 md:inline">|</span>
                    <div className="text-sm text-gray-500">
                      <p>
                        Plan: <span className="font-semibold text-yellow-600">ELITE</span>
                      </p>
                      <p>+40% margen en primer ano</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-warm py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-12 text-center">
              <h2 className="font-heading text-4xl font-bold text-gray-900">Preguntas frecuentes</h2>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="space-y-4">
              {faqs.map((faq, index) => {
                const open = openFaq === index;
                return (
                  <div key={faq.question} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <button type="button" onClick={() => setOpenFaq(open ? -1 : index)} className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50">
                      <span className="font-medium text-gray-900">{faq.question}</span>
                      <ArrowRight className={`h-5 w-5 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
                    </button>
                    {open && <div className="px-6 pb-4 text-gray-600">{faq.answer}</div>}
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-blue-900 py-24 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400 blur-3xl" />
          </div>
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <motion.div {...fadeUp}>
              <h2 className="mb-6 font-heading text-4xl font-bold lg:text-5xl">Deja de importar a ciegas</h2>
              <p className="mx-auto mb-10 max-w-2xl text-xl text-blue-100">
                Los datos estan ahi. La IA los analiza. Tu solo decides. Empieza gratis y escala cuando veas que funciona.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <button onClick={() => goToRegister('pro')} className="rounded-full bg-white px-8 py-4 text-lg font-bold text-blue-900 transition-all hover:scale-[1.02] hover:shadow-xl">
                  Crear cuenta importador
                </button>
                <button onClick={() => scrollToSection('planes-importador')} className="rounded-full border-2 border-blue-400 px-8 py-4 text-lg font-semibold text-blue-100 transition-all hover:bg-blue-800">
                  Ver planes PRO y ELITE
                </button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
