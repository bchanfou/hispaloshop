import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  Euro,
  Globe,
  Hammer,
  Heart,
  List,
  Percent,
  QrCode,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Users,
  Zap,
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
  { title: '"Vendo en ferias los fines de semana"', description: 'Agotador, impredecible y dificil de escalar. Tu vida pasa entre el obrador y el coche.', icon: Users },
  { title: '"Los marketplaces me quitan el 30-40%"', description: 'Comisiones abusivas, competencia desleal y tu producto perdido entre masas.', icon: Percent },
  { title: '"Mis clientes no saben quien soy"', description: 'Tu historia desaparece detras del lineal. Eres una referencia, no una persona.', icon: Heart },
  { title: '"No tengo tiempo de marketing"', description: 'Quieres crear, no aprender anuncios, SEO y automatizaciones para vender.', icon: Clock },
];

const gains = [
  { title: 'Crear tu producto con pasion', description: 'Elaborar, innovar y mejorar recetas. Lo que realmente te gusta.' },
  { title: 'Contar tu historia', description: 'Posts y reels del dia a dia. Sin disfrazarte de agencia.' },
  { title: 'Enviar el producto', description: 'Recibes notificacion por email y SMS, preparas el envio y listo.' },
  { title: 'Cobrar automaticamente', description: 'Stripe o transferencia bancaria. El pago se procesa solo.' },
];

const handles = [
  { title: 'Traerte clientes', description: 'Marketing, SEO e influencers que empujan tu producto real.' },
  { title: 'Procesar pagos seguros', description: 'Cobros con Stripe, proteccion al comprador y gestion de incidencias.' },
  { title: 'Notificarte instantaneamente', description: 'Email + SMS en cuanto entra el pedido. Nunca pierdes una venta.' },
  { title: 'Construir tu comunidad', description: 'Clientes que te siguen, repiten compra y recomiendan.' },
];

const steps = [
  { number: '1', title: 'Te registras', description: 'Creas tu cuenta, subes documentacion y esperas aprobacion.', badge: '<24h aprobacion', badgeClass: 'bg-hispalo-100 text-hispalo-700' },
  { number: '2', title: 'Subes productos', description: 'Fotos, descripcion y precio. Cada producto pasa revision de calidad.', badge: 'Aprobacion por admin', badgeClass: 'bg-yellow-100 text-yellow-700' },
  { number: '3', title: 'Vendes', description: 'Notificacion instantanea por email + SMS. Preparas y envias.', badge: 'Pago automatico', badgeClass: 'bg-blue-100 text-blue-700' },
  { number: '€', title: 'Cobras', description: 'Stripe o transferencia bancaria. El dinero entra solo.', badge: 'Sin demoras', badgeClass: 'bg-green-100 text-green-700', isMoney: true },
];

const plans = [
  {
    id: 'free',
    name: 'GRATUITO',
    subtitle: 'Empieza sin riesgo',
    price: '0€',
    suffix: '/mes',
    iva: '',
    commission: '20%',
    buttonLabel: 'Empezar gratis',
    buttonClass: 'border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white',
    panelClass: 'bg-white border-2 border-gray-200',
    commissionClass: 'bg-gray-100 text-gray-900',
    features: ['Crear cuenta y empezar a vender', 'Catalogo nacional en tu pais', 'Notificacion email + SMS por pedido', 'Pago automatico Stripe/transferencia', 'Soporte por WhatsApp'],
  },
  {
    id: 'pro',
    name: 'PRO',
    subtitle: 'Vende mas, vende mejor',
    price: '79€',
    suffix: '/mes + IVA',
    iva: '~95,59€ con IVA incluido',
    commission: '18%',
    featured: true,
    buttonLabel: 'Activar PRO',
    buttonClass: 'bg-hispalo-600 text-white hover:bg-hispalo-700 shadow-lg shadow-hispalo-600/25',
    panelClass: 'bg-white border-2 border-hispalo-500 shadow-xl lg:scale-[1.03]',
    commissionClass: 'bg-hispalo-50 text-hispalo-600',
    features: ['Todo lo del plan Gratuito', 'HI AI Asistente de Ventas', 'Crear packs y combos optimizados', 'Precios dinamicos recomendados', 'Nuevos sabores segun tendencias', 'Analisis de busquedas nacionales', 'Perfiles de consumidores por region', 'Visibilidad prioritaria en catalogo'],
  },
  {
    id: 'elite',
    name: 'ELITE',
    subtitle: 'Lleva tu producto al mundo',
    price: '149€',
    suffix: '/mes + IVA',
    iva: '~180,29€ con IVA incluido',
    commission: '17%',
    dark: true,
    buttonLabel: 'Solicitar acceso ELITE',
    buttonClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 hover:shadow-lg hover:shadow-yellow-500/25',
    panelClass: 'bg-gradient-to-br from-gray-900 to-gray-800 text-white border-2 border-yellow-500/50',
    commissionClass: 'bg-white/10 text-yellow-400',
    features: ['Todo lo del plan PRO', 'Alcance internacional', 'IA recomienda paises donde encaja tu producto', 'Precio optimo por pais', 'Match con importadores locales', 'Analisis del catalogo que ya venden', 'Label Digital Multiidioma', 'QR con ingredientes, nutricion, alergenos y certificados', 'Idioma automatico segun quien escanea', 'Descargable para packaging fisico'],
  },
];

const comparisonRows = [
  ['Comision', '20%', '18%', '17%'],
  ['Mercado', 'Nacional', 'Nacional', 'Internacional'],
  ['HI AI Asistente', '-', 'Si Nacional', 'Si Global'],
  ['Label Digital Multiidioma', '-', '-', 'Si'],
  ['Match con importadores', '-', '-', 'Si'],
];

const labelFeatures = [
  { title: 'Ingredientes detallados', description: 'Con origen geolocalizado de cada componente.', icon: List, colors: 'bg-blue-100 text-blue-600' },
  { title: 'Valores nutricionales', description: 'Por porcion y por 100g, con calculos automaticos.', icon: Activity, colors: 'bg-green-100 text-green-600' },
  { title: 'Alergenos destacados', description: 'Regulacion EU completa, actualizada automaticamente.', icon: AlertTriangle, colors: 'bg-red-100 text-red-600' },
  { title: 'Certificados visibles', description: 'Organico, artesano, DOP y mas, verificables al instante.', icon: Award, colors: 'bg-purple-100 text-purple-600' },
];

const faqs = [
  { question: 'Por que tardan 24h en aprobar mi cuenta?', answer: 'Un administrador local revisa que seas productor real y que el proyecto cumpla los estandares de calidad de la comunidad.' },
  { question: 'Tambien aprueban cada producto que subo?', answer: 'Si. Revisamos fotos, descripcion, precio y cumplimiento de calidad antes de publicar.' },
  { question: 'Como recibo el pago de las ventas?', answer: 'Configuras Stripe o tu IBAN. Cuando el cliente paga, el dinero se transfiere automaticamente descontando la comision.' },
  { question: 'Puedo cambiar de plan cuando quiera?', answer: 'Si. Puedes empezar gratis, pasar a PRO cuando te interese y saltar a ELITE al preparar expansion.' },
  { question: 'El label digital funciona sin internet?', answer: 'No. Necesita conexion para mostrar informacion viva, aunque puedes descargar una version PDF de apoyo.' },
];

function ProducerCard({ title, description, accent = 'text-green-500' }) {
  return (
    <div className="flex items-start gap-4 rounded-xl bg-white p-4 shadow-sm">
      <CheckCircle2 className={`mt-0.5 h-6 w-6 flex-shrink-0 ${accent}`} />
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

export default function ProductorLandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToRegister = (plan) => {
    navigate(`/register?role=producer${plan ? `&plan=${plan}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SEO
        title="Se Productor en Hispaloshop - Vende sin complicaciones"
        description="Dedicate a crear, nosotros vendemos. Planes desde 0€ con comision 17-20%, pago automatico, IA de ventas y label digital multiidioma."
        url="https://www.hispaloshop.com/productor"
      />
      <Header />

      <main>
        <section className="relative min-h-[700px] overflow-hidden bg-hispalo-900 text-white flex items-center">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              }}
            />
          </div>
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-hispalo-500 opacity-30 blur-3xl" />
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-yellow-500 opacity-20 blur-3xl" />

          <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div>
              <motion.span {...fadeUp} className="mb-6 inline-flex items-center rounded-full border border-hispalo-500/30 bg-hispalo-700/50 px-4 py-2 text-sm font-medium text-hispalo-100">
                <Heart className="mr-2 h-4 w-4" />
                Dedicate a lo que amas
              </motion.span>
              <motion.h1 {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="mb-6 font-heading text-5xl font-bold leading-tight lg:text-7xl">
                Crea.
                <br />
                Nosotros
                <br />
                <span className="text-hispalo-300">vendemos.</span>
              </motion.h1>
              <motion.p {...fadeUp} transition={{ duration: 0.55, delay: 0.1 }} className="mb-8 max-w-lg text-xl leading-relaxed text-hispalo-100">
                Deja de perder tiempo en marketplaces impersonales. En Hispaloshop tus clientes conocen tu historia, tu proceso y tu pasion. Tu te encargas de crear, nosotros del resto.
              </motion.p>
              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="mb-10 flex flex-wrap gap-6 md:gap-8">
                <div>
                  <p className="text-3xl font-bold text-white">0€</p>
                  <p className="text-sm text-hispalo-200">Para empezar</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">17-20%</p>
                  <p className="text-sm text-hispalo-200">Comision por venta</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">24h</p>
                  <p className="text-sm text-hispalo-200">Aprobacion</p>
                </div>
              </motion.div>
              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.2 }} className="flex flex-col gap-4 sm:flex-row">
                <button onClick={() => goToRegister('free')} className="flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-hispalo-900 transition-all hover:scale-[1.02] hover:shadow-xl">
                  <Rocket className="h-5 w-5" />
                  Empezar a vender gratis
                </button>
                <button onClick={() => scrollToSection('planes')} className="rounded-full border-2 border-hispalo-400 px-8 py-4 text-lg font-semibold text-hispalo-100 transition-all hover:bg-hispalo-800">
                  Ver planes PRO y ELITE
                </button>
              </motion.div>
            </div>

            <motion.div {...fadeUp} transition={{ duration: 0.6, delay: 0.2 }} className="relative hidden h-[500px] lg:block">
              <div className="absolute left-0 top-0 w-64 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-hispalo-500">
                  <Hammer className="h-6 w-6 text-white" />
                </div>
                <p className="font-semibold">Tu creas</p>
                <p className="mt-1 text-sm text-hispalo-200">Queso, miel, galletas, aceite...</p>
              </div>
              <ArrowRight className="absolute left-72 top-20 h-8 w-8 text-hispalo-400" />
              <div className="absolute right-0 top-10 w-64 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500">
                  <ShoppingBag className="h-6 w-6 text-white" />
                </div>
                <p className="font-semibold">Nosotros vendemos</p>
                <p className="mt-1 text-sm text-hispalo-200">Marketing, pagos e influencers</p>
              </div>
              <div className="absolute bottom-20 left-20 w-64 rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500">
                  <Truck className="h-6 w-6 text-white" />
                </div>
                <p className="font-semibold">Tu envias</p>
                <p className="mt-1 text-sm text-hispalo-200">Notificacion instantanea y pago automatico</p>
              </div>
              <div className="absolute bottom-0 right-10 w-64 rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 backdrop-blur-md">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500">
                  <Euro className="h-6 w-6 text-white" />
                </div>
                <p className="font-semibold text-green-400">Cobras</p>
                <p className="mt-1 text-sm text-hispalo-200">Stripe o transferencia, automatico</p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center">
              <h2 className="mb-4 font-heading text-4xl font-bold text-gray-900">Te suena familiar?</h2>
              <p className="text-xl text-gray-600">Los problemas que nos contaron cientos de productores</p>
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
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="mt-12 rounded-2xl border border-hispalo-100 bg-hispalo-50 p-8 text-center">
              <p className="font-heading text-2xl italic text-hispalo-800">"Queria hacer queso, no convertirme en community manager."</p>
              <p className="mt-2 text-hispalo-600">Helena Rodriguez, Carolina Honest Food</p>
            </motion.div>
          </div>
        </section>

        <section className="bg-warm py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center">
              <h2 className="font-heading text-4xl font-bold text-gray-900">Que ganas, que dejas de hacer</h2>
            </motion.div>
            <div className="grid gap-12 lg:grid-cols-2">
              <motion.div {...fadeUp}>
                <h3 className="mb-6 flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-hispalo-100">
                    <Heart className="h-5 w-5 text-hispalo-600" />
                  </span>
                  Tu te dedicas a...
                </h3>
                <div className="space-y-4">
                  {gains.map((item) => (
                    <ProducerCard key={item.title} title={item.title} description={item.description} accent="text-green-500" />
                  ))}
                </div>
              </motion.div>

              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.08 }}>
                <h3 className="mb-6 flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </span>
                  Nosotros nos encargamos de...
                </h3>
                <div className="space-y-4">
                  {handles.map((item) => (
                    <ProducerCard key={item.title} title={item.title} description={item.description} accent="text-purple-500" />
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center">
              <h2 className="mb-4 font-heading text-4xl font-bold text-gray-900">De tu obrador a su mesa</h2>
              <p className="text-gray-600">Asi de simple es vender en Hispaloshop</p>
            </motion.div>
            <div className="relative">
              <div className="absolute left-0 right-0 top-24 hidden h-1 bg-hispalo-200 lg:block" />
              <div className="grid gap-8 lg:grid-cols-4">
                {steps.map((step, index) => (
                  <motion.article key={step.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className="relative text-center">
                    <div className={`relative z-10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white ${step.isMoney ? 'bg-green-500' : 'bg-hispalo-600'}`}>
                      <span className="text-2xl font-bold text-white">{step.number}</span>
                    </div>
                    <h3 className="mb-2 font-bold text-gray-900">{step.title}</h3>
                    <p className="mb-3 text-sm text-gray-600">{step.description}</p>
                    <span className={`inline-block rounded-full px-3 py-1 text-xs ${step.badgeClass}`}>{step.badge}</span>
                  </motion.article>
                ))}
              </div>
            </div>
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="mt-16 rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-4">
                <ShieldCheck className="mt-1 h-6 w-6 flex-shrink-0 text-amber-600" />
                <div>
                  <h4 className="mb-1 font-bold text-amber-900">Garantia de calidad</h4>
                  <p className="text-sm text-amber-800">
                    Cada productor y cada producto es aprobado por un administrador local en menos de 24h. Solo productos organicos, reales y no ultra-procesados. Asi mantenemos la confianza de la comunidad.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="planes" className="bg-gradient-to-b from-warm to-white py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center">
              <h2 className="mb-4 font-heading text-4xl font-bold text-gray-900">Crece segun tu ambicion</h2>
              <p className="text-gray-600">Empieza gratis, escala con inteligencia</p>
            </motion.div>

            <div className="grid gap-8 lg:grid-cols-3">
              {plans.map((plan, index) => (
                <motion.article key={plan.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className={`relative rounded-3xl p-8 ${plan.panelClass}`}>
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-hispalo-600 px-4 py-1 text-sm font-semibold text-white">Mas popular</span>
                    </div>
                  )}
                  {plan.dark && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-1 text-sm font-bold text-gray-900">Exportacion</span>
                    </div>
                  )}

                  <div className="mb-6 text-center">
                    <h3 className={`mb-2 text-xl font-bold ${plan.dark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    <p className={`text-sm ${plan.dark ? 'text-gray-400' : 'text-gray-500'}`}>{plan.subtitle}</p>
                  </div>

                  <div className="mb-2 text-center">
                    <span className={`text-5xl font-bold ${plan.dark ? 'text-yellow-400' : plan.id === 'pro' ? 'text-hispalo-600' : 'text-gray-900'}`}>{plan.price}</span>
                    <span className={plan.dark ? 'text-gray-400' : 'text-gray-500'}>{plan.suffix}</span>
                  </div>
                  {plan.iva && <p className="mb-6 text-center text-sm text-gray-500">{plan.iva}</p>}

                  <div className={`mb-6 rounded-xl p-4 text-center ${plan.commissionClass}`}>
                    <p className="text-3xl font-bold">{plan.commission}</p>
                    <p className={`text-sm ${plan.dark ? 'text-gray-300' : 'text-gray-600'}`}>Comision por venta</p>
                  </div>

                  <ul className="mb-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className={`flex items-start gap-3 rounded-lg text-sm ${feature.includes('HI AI') || feature.includes('Label Digital') || feature.includes('Alcance internacional') ? (plan.dark ? 'bg-white/10 p-2' : feature.includes('HI AI') ? 'bg-purple-50 p-2' : 'bg-yellow-50/80 p-2') : ''}`}>
                        {feature.includes('HI AI') ? (
                          <Sparkles className={`mt-0.5 h-5 w-5 flex-shrink-0 ${plan.dark ? 'text-yellow-400' : 'text-purple-600'}`} />
                        ) : feature.includes('Label Digital') ? (
                          <QrCode className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
                        ) : feature.includes('Alcance internacional') ? (
                          <Globe className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
                        ) : (
                          <Check className={`mt-0.5 h-5 w-5 flex-shrink-0 ${plan.dark ? 'text-yellow-400' : 'text-hispalo-600'}`} />
                        )}
                        <span className={plan.dark ? 'text-gray-100' : feature.includes('HI AI') ? 'font-semibold text-purple-900' : 'text-gray-700'}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button onClick={() => goToRegister(plan.id)} className={`w-full rounded-xl py-3 font-semibold transition-all ${plan.buttonClass}`}>
                    {plan.buttonLabel}
                  </button>
                </motion.article>
              ))}
            </div>

            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.12 }} className="mt-12 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="px-4 py-4 text-left">Caracteristica</th>
                    <th className="px-4 py-4 text-center">Gratuito</th>
                    <th className="bg-hispalo-50 px-4 py-4 text-center">PRO</th>
                    <th className="bg-yellow-50 px-4 py-4 text-center">ELITE</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, index) => (
                    <tr key={row[0]} className={index === comparisonRows.length - 1 ? '' : 'border-b border-gray-100'}>
                      <td className="px-4 py-3">{row[0]}</td>
                      <td className="px-4 py-3 text-center">{row[1]}</td>
                      <td className="bg-hispalo-50 px-4 py-3 text-center font-semibold text-hispalo-600">{row[2]}</td>
                      <td className="bg-yellow-50 px-4 py-3 text-center font-semibold text-yellow-600">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <motion.div {...fadeUp}>
              <span className="mb-4 inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                <Star className="mr-2 h-4 w-4" />
                Exclusivo plan ELITE
              </span>
              <h2 className="mb-6 font-heading text-4xl font-bold text-gray-900">Tu producto habla todos los idiomas</h2>
              <p className="mb-6 text-lg text-gray-600">
                Cada producto que subes genera automaticamente un <strong>QR unico</strong>. Cuando un cliente lo escanea, ve la informacion en su idioma automaticamente.
              </p>
              <div className="mb-8 space-y-4">
                {labelFeatures.map((item) => {
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
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <p className="mb-2 text-sm text-gray-600">Ejemplo real:</p>
                <p className="italic text-gray-900">
                  "Un turista japones en Madrid escanea tu queso. Ve todo en japones, entiende el origen, revisa el certificado ecologico y compra tres unidades para llevar a Tokio."
                </p>
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.08 }}>
              <div className="relative overflow-hidden rounded-3xl bg-gray-900 p-8 text-white">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-yellow-500 opacity-30 blur-3xl" />
                <div className="rounded-2xl bg-white p-6 text-gray-900">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold">Queso Curado Artesano</h4>
                      <p className="text-sm text-gray-500">Dehesa de Extremadura</p>
                    </div>
                    <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100">
                      <QrCode className="h-12 w-12 text-gray-800" />
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Origen leche:</span>
                      <span className="text-right font-medium">Oveja merina, Badajoz</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Curacion:</span>
                      <span className="text-right font-medium">6 meses</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Alergenos:</span>
                      <span className="text-right font-medium text-red-600">Leche</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-xs">
                    <span className="text-gray-400">Escaneado desde: Japon</span>
                    <span className="rounded bg-green-100 px-2 py-1 text-green-700">Certificado Ecologico</span>
                  </div>
                </div>
                <p className="mt-6 text-center text-sm text-gray-400">Descarga el QR e imprimelo en tu packaging. Funciona para siempre.</p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-warm py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="rounded-3xl bg-white p-8 shadow-xl lg:p-12">
              <div className="flex flex-col items-center gap-8 md:flex-row">
                <div className="flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=200&h=200&fit=crop&crop=face"
                    alt="Helena Rodriguez - Fundadora de Carolina"
                    className="h-32 w-32 rounded-full border-4 border-hispalo-100 object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="mb-4 font-heading text-4xl text-hispalo-200">"</div>
                  <p className="mb-6 text-lg leading-relaxed text-gray-700">
                    Pase de vender en 4 ferias al mes a tener 25.000 personas que siguen como horneo cada manana. El plan PRO me ayudo a crear packs que se venden solos, y ahora con ELITE estoy preparando la exportacion a Italia. Lo mejor: yo solo me encargo de las galletas, Hispaloshop del resto.
                  </p>
                  <div className="flex flex-col gap-2 text-center md:flex-row md:items-center md:gap-4 md:text-left">
                    <div>
                      <p className="font-bold text-gray-900">Helena Rodriguez</p>
                      <p className="text-hispalo-600">Fundadora, Carolina Honest Food</p>
                    </div>
                    <span className="hidden text-gray-300 md:inline">|</span>
                    <div className="text-sm text-gray-500">
                      <p>
                        Plan: <span className="font-semibold text-yellow-600">ELITE</span>
                      </p>
                      <p>+300% ventas en 12 meses</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-12 text-center">
              <h2 className="font-heading text-4xl font-bold text-gray-900">Preguntas frecuentes</h2>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="space-y-4">
              {faqs.map((faq, index) => {
                const open = openFaq === index;
                return (
                  <div key={faq.question} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    <button type="button" onClick={() => setOpenFaq(open ? -1 : index)} className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-100">
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

        <section className="relative overflow-hidden bg-hispalo-900 py-24 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-hispalo-400 blur-3xl" />
          </div>
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <motion.div {...fadeUp}>
              <h2 className="mb-6 font-heading text-4xl font-bold lg:text-5xl">Vuelve a lo que amas</h2>
              <p className="mx-auto mb-10 max-w-2xl text-xl text-hispalo-100">
                Deja de ser community manager, logistica y contable. Se productor. Nosotros hacemos el resto.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <button onClick={() => goToRegister('free')} className="rounded-full bg-white px-8 py-4 text-lg font-bold text-hispalo-900 transition-all hover:scale-[1.02] hover:shadow-xl">
                  Crear cuenta gratuita
                </button>
                <button onClick={() => scrollToSection('planes')} className="rounded-full border-2 border-hispalo-400 px-8 py-4 text-lg font-semibold text-hispalo-100 transition-all hover:bg-hispalo-800">
                  Comparar planes PRO y ELITE
                </button>
              </div>
              <p className="mt-8 text-sm text-hispalo-300">Aprobacion en 24h. Sin compromiso. Sin tarjeta de credito para empezar.</p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
