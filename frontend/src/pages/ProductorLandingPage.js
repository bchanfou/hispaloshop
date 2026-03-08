import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, Award, Check, CheckCircle2, Clock, Euro, Globe, Hammer, Heart, List, Percent, QrCode, Rocket, ShieldCheck, ShoppingBag, Sparkles, Star, Truck, Users, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import LandingSectionNav from '../components/landings/LandingSectionNav';
import Footer from '../components/Footer';
import Header from '../components/Header';
import SEO from '../components/SEO';

const fadeUp = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 }, transition: { duration: 0.55 } };
const problems = [{ title: '"Vendo en ferias los fines de semana"', description: 'Agotador, impredecible y dificil de escalar.', icon: Users }, { title: '"Los marketplaces me quitan el 30-40%"', description: 'Comisiones abusivas y tu producto perdido entre masas.', icon: Percent }, { title: '"Mis clientes no saben quien soy"', description: 'Tu historia desaparece detras del lineal.', icon: Heart }, { title: '"No tengo tiempo de marketing"', description: 'Quieres crear, no aprender anuncios y SEO.', icon: Clock }];
const faqs = [{ question: 'Por que tardan 24h en aprobar mi cuenta?', answer: 'Revisamos que seas productor real y que el proyecto cumpla estandares de calidad.' }, { question: 'Tambien aprueban cada producto?', answer: 'Si. Revisamos fotos, descripcion, precio y calidad antes de publicar.' }, { question: 'Como recibo el pago?', answer: 'Configuras Stripe o tu IBAN y el dinero entra automaticamente.' }, { question: 'Puedo cambiar de plan?', answer: 'Si. Puedes empezar gratis y subir a PRO o ELITE cuando quieras.' }];
const plans = [
  { id: 'free', name: 'GRATUITO', subtitle: 'Empieza sin riesgo', price: '0 EUR', suffix: '/mes', iva: '', commission: '20%', button: 'Empezar gratis', panel: 'bg-white border-2 border-gray-200', commissionClass: 'bg-gray-100 text-gray-900', buttonClass: 'border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white', features: ['Crear cuenta y empezar a vender', 'Catalogo nacional en tu pais', 'Notificacion email + SMS por pedido', 'Pago automatico Stripe/transferencia', 'Soporte por WhatsApp'] },
  { id: 'pro', name: 'PRO', subtitle: 'Vende mas, vende mejor', price: '79 EUR', suffix: '/mes + IVA', iva: '~95,59 EUR con IVA incluido', commission: '18%', featured: true, panel: 'bg-white border-2 border-hispalo-500 shadow-xl lg:scale-[1.03]', commissionClass: 'bg-hispalo-50 text-hispalo-700', buttonClass: 'bg-hispalo-600 text-white hover:bg-hispalo-700', button: 'Activar PRO', features: ['Todo lo del plan Gratuito', 'HI AI Asistente de Ventas', 'Crear packs y combos optimizados', 'Precios dinamicos recomendados', 'Analisis de busquedas nacionales', 'Perfiles de consumidores por region'] },
  { id: 'elite', name: 'ELITE', subtitle: 'Lleva tu producto al mundo', price: '149 EUR', suffix: '/mes + IVA', iva: '~180,29 EUR con IVA incluido', commission: '17%', dark: true, panel: 'bg-gradient-to-br from-gray-900 to-gray-800 text-white border-2 border-yellow-500/50', commissionClass: 'bg-white/15 text-yellow-300', buttonClass: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900', button: 'Solicitar acceso ELITE', features: ['Todo lo del plan PRO', 'Alcance internacional', 'IA recomienda paises donde encaja tu producto', 'Precio optimo por pais', 'Match con importadores locales', 'Label Digital Multiidioma'] },
];

function ChecklistCard({ title, description, accent = 'text-green-500' }) {
  return <div className="flex items-start gap-4 rounded-xl bg-white p-4 shadow-sm"><CheckCircle2 className={`mt-0.5 h-6 w-6 flex-shrink-0 ${accent}`} /><div><p className="font-semibold text-gray-900">{title}</p><p className="mt-1 text-sm text-gray-700">{description}</p></div></div>;
}

export default function ProductorLandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);
  const scrollToSection = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const goToRegister = (plan) => navigate(`/register?role=producer${plan ? `&plan=${plan}` : ''}`);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <SEO title="Se Productor en Hispaloshop - Vende sin complicaciones" description="Dedicate a crear, nosotros vendemos. Planes desde 0 EUR con comision 17-20%, pago automatico, IA de ventas y label digital multiidioma." url="https://www.hispaloshop.com/productor" />
      <Header />
      <LandingSectionNav />

      <main>
        <section className="relative min-h-[640px] sm:min-h-[700px] overflow-hidden bg-hispalo-900 text-white flex items-center">
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-hispalo-500 opacity-30 blur-3xl" />
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-yellow-500 opacity-20 blur-3xl" />
          <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8">
            <div>
              <motion.span {...fadeUp} className="mb-6 inline-flex items-center rounded-full border border-hispalo-500/30 bg-hispalo-700/50 px-4 py-2 text-sm font-medium text-white/90"><Heart className="mr-2 h-4 w-4" />Dedicate a lo que amas</motion.span>
              <motion.h1 {...fadeUp} className="mb-6 font-heading text-4xl sm:text-5xl lg:text-7xl font-bold leading-[0.95]">Crea.<br />Nosotros<br /><span className="text-hispalo-300">vendemos.</span></motion.h1>
              <motion.p {...fadeUp} transition={{ duration: 0.55, delay: 0.1 }} className="mb-8 max-w-lg text-lg sm:text-xl leading-relaxed text-white/90">Deja de perder tiempo en marketplaces impersonales. Tus clientes conocen tu historia, tu proceso y tu pasion. Tu creas, nosotros vendemos.</motion.p>
              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.15 }} className="mb-10 flex flex-wrap gap-6 md:gap-8">
                <div><p className="text-3xl font-bold text-white">0 EUR</p><p className="text-sm text-white/75">Para empezar</p></div>
                <div><p className="text-3xl font-bold text-white">17-20%</p><p className="text-sm text-white/75">Comision por venta</p></div>
                <div><p className="text-3xl font-bold text-white">24h</p><p className="text-sm text-white/75">Aprobacion</p></div>
              </motion.div>
              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.2 }} className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => goToRegister('free')} className="flex items-center justify-center gap-2 rounded-full bg-white px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold text-hispalo-900 transition-all hover:scale-[1.02] hover:shadow-xl"><Rocket className="h-5 w-5" />Empezar a vender gratis</button>
                <button onClick={() => scrollToSection('planes')} className="rounded-full border-2 border-white/50 px-6 sm:px-8 py-4 text-base sm:text-lg font-semibold text-white transition-all hover:bg-white/10">Ver planes PRO y ELITE</button>
              </motion.div>
            </div>
            <motion.div {...fadeUp} className="relative hidden h-[500px] lg:block">
              <div className="absolute left-0 top-0 w-64 rounded-2xl border border-white/25 bg-white/15 p-6 backdrop-blur-md"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-hispalo-500"><Hammer className="h-6 w-6 text-white" /></div><p className="font-semibold">Tu creas</p><p className="mt-1 text-sm text-white/80">Queso, miel, galletas, aceite...</p></div>
              <ArrowRight className="absolute left-72 top-20 h-8 w-8 text-hispalo-300" />
              <div className="absolute right-0 top-10 w-64 rounded-2xl border border-white/25 bg-white/15 p-6 backdrop-blur-md"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500"><ShoppingBag className="h-6 w-6 text-white" /></div><p className="font-semibold">Nosotros vendemos</p><p className="mt-1 text-sm text-white/80">Marketing, pagos e influencers</p></div>
              <div className="absolute bottom-20 left-20 w-64 rounded-2xl border border-white/25 bg-white/15 p-6 backdrop-blur-md"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500"><Truck className="h-6 w-6 text-white" /></div><p className="font-semibold">Tu envias</p><p className="mt-1 text-sm text-white/80">Notificacion instantanea y pago automatico</p></div>
              <div className="absolute bottom-0 right-10 w-64 rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-6 backdrop-blur-md"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500"><Euro className="h-6 w-6 text-white" /></div><p className="font-semibold text-green-300">Cobras</p><p className="mt-1 text-sm text-white/80">Stripe o transferencia, automatico</p></div>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center"><h2 className="mb-4 font-heading text-3xl sm:text-4xl font-bold text-gray-900">Te suena familiar?</h2><p className="text-lg sm:text-xl text-gray-700">Los problemas que nos contaron cientos de productores</p></motion.div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">{problems.map((item, index) => { const Icon = item.icon; return <motion.article key={item.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className="rounded-2xl border-l-4 border-red-400 bg-red-50 p-6"><Icon className="mb-4 h-10 w-10 text-red-500" /><h3 className="mb-2 font-bold text-gray-900">{item.title}</h3><p className="text-sm text-gray-700">{item.description}</p></motion.article>; })}</div>
          </div>
        </section>

        <section className="bg-warm py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center"><h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">Que ganas, que dejas de hacer</h2></motion.div>
            <div className="grid gap-12 lg:grid-cols-2">
              <motion.div {...fadeUp}><h3 className="mb-6 flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-hispalo-100"><Heart className="h-5 w-5 text-hispalo-600" /></span>Tu te dedicas a...</h3><div className="space-y-4">{gains.map((item) => <ChecklistCard key={item.title} title={item.title} description={item.description} accent="text-green-500" />)}</div></motion.div>
              <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.08 }}><h3 className="mb-6 flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100"><Zap className="h-5 w-5 text-purple-600" /></span>Nosotros nos encargamos de...</h3><div className="space-y-4">{handles.map((item) => <ChecklistCard key={item.title} title={item.title} description={item.description} accent="text-purple-500" />)}</div></motion.div>
            </div>
          </div>
        </section>

        <section id="planes" className="bg-gradient-to-b from-warm to-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 text-center"><h2 className="mb-4 font-heading text-3xl sm:text-4xl font-bold text-gray-900">Crece segun tu ambicion</h2><p className="text-gray-700">Empieza gratis, escala con inteligencia</p></motion.div>
            <div className="grid gap-8 lg:grid-cols-3">
              {plans.map((plan, index) => <motion.article key={plan.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.55, delay: index * 0.08 }} className={`relative rounded-3xl p-8 ${plan.panel}`}>{plan.featured && <div className="absolute -top-4 left-1/2 -translate-x-1/2"><span className="rounded-full bg-hispalo-600 px-4 py-1 text-sm font-semibold text-white">Mas popular</span></div>}{plan.dark && <div className="absolute -top-4 left-1/2 -translate-x-1/2"><span className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-1 text-sm font-bold text-gray-900">Exportacion</span></div>}<div className="mb-6 text-center"><h3 className={`mb-2 text-xl font-bold ${plan.dark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3><p className={`text-sm ${plan.dark ? 'text-gray-300' : 'text-gray-600'}`}>{plan.subtitle}</p></div><div className="mb-2 text-center"><span className={`text-5xl font-bold ${plan.dark ? 'text-yellow-300' : plan.id === 'pro' ? 'text-hispalo-700' : 'text-gray-900'}`}>{plan.price}</span><span className={plan.dark ? 'text-gray-300' : 'text-gray-600'}>{plan.suffix}</span></div>{plan.iva && <p className={`mb-6 text-center text-sm ${plan.dark ? 'text-gray-300' : 'text-gray-600'}`}>{plan.iva}</p>}<div className={`mb-6 rounded-xl p-4 text-center ${plan.commissionClass}`}><p className="text-3xl font-bold">{plan.commission}</p><p className={`text-sm ${plan.dark ? 'text-gray-100' : 'text-gray-700'}`}>Comision por venta</p></div><ul className="mb-8 space-y-3">{plan.features.map((feature) => <li key={feature} className={`flex items-start gap-3 text-sm ${plan.dark ? 'text-gray-100' : 'text-gray-700'}`}>{feature.includes('HI AI') ? <Sparkles className={`mt-0.5 h-5 w-5 shrink-0 ${plan.dark ? 'text-yellow-300' : 'text-purple-600'}`} /> : feature.includes('Label') ? <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" /> : feature.includes('Alcance') ? <Globe className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" /> : <Check className={`mt-0.5 h-5 w-5 shrink-0 ${plan.dark ? 'text-yellow-300' : 'text-hispalo-600'}`} />}<span>{feature}</span></li>)}</ul><button onClick={() => goToRegister(plan.id)} className={`w-full rounded-xl py-3 font-semibold transition-all ${plan.buttonClass}`}>{plan.button}</button></motion.article>)}
            </div>
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.12 }} className="mt-12 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b-2 border-gray-200"><th className="px-4 py-4 text-left">Caracteristica</th><th className="px-4 py-4 text-center">Gratuito</th><th className="bg-hispalo-50 px-4 py-4 text-center">PRO</th><th className="bg-yellow-50 px-4 py-4 text-center">ELITE</th></tr></thead><tbody>{comparisonRows.map((row, index) => <tr key={row[0]} className={index === comparisonRows.length - 1 ? '' : 'border-b border-gray-100'}><td className="px-4 py-3 text-gray-800">{row[0]}</td><td className="px-4 py-3 text-center text-gray-700">{row[1]}</td><td className="bg-hispalo-50 px-4 py-3 text-center font-semibold text-hispalo-700">{row[2]}</td><td className="bg-yellow-50 px-4 py-3 text-center font-semibold text-yellow-700">{row[3]}</td></tr>)}</tbody></table></motion.div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <motion.div {...fadeUp}><span className="mb-4 inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800"><Star className="mr-2 h-4 w-4" />Exclusivo plan ELITE</span><h2 className="mb-6 font-heading text-3xl sm:text-4xl font-bold text-gray-900">Tu producto habla todos los idiomas</h2><p className="mb-6 text-lg text-gray-700">Cada producto que subes genera automaticamente un <strong>QR unico</strong>. Cuando un cliente lo escanea, ve la informacion en su idioma automaticamente.</p><div className="mb-8 space-y-4">{labelFeatures.map((item) => { const Icon = item.icon; return <div key={item.title} className="flex items-start gap-4"><div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${item.colors}`}><Icon className="h-5 w-5" /></div><div><p className="font-semibold text-gray-900">{item.title}</p><p className="text-sm text-gray-700">{item.description}</p></div></div>; })}</div><div className="rounded-xl border border-gray-200 bg-gray-50 p-6"><p className="mb-2 text-sm text-gray-600">Ejemplo real:</p><p className="italic text-gray-900">"Un turista japones en Madrid escanea tu queso. Ve todo en japones, entiende el origen y revisa el certificado ecologico."</p></div></motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.08 }}><div className="relative overflow-hidden rounded-3xl bg-gray-900 p-8 text-white"><div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-yellow-500 opacity-30 blur-3xl" /><div className="rounded-2xl bg-white p-6 text-gray-900"><div className="mb-4 flex items-center justify-between gap-4"><div><h4 className="text-lg font-bold">Queso Curado Artesano</h4><p className="text-sm text-gray-600">Dehesa de Extremadura</p></div><div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100"><QrCode className="h-12 w-12 text-gray-800" /></div></div><div className="space-y-2 text-sm"><div className="flex justify-between gap-4"><span className="text-gray-600">Origen leche:</span><span className="text-right font-medium">Oveja merina, Badajoz</span></div><div className="flex justify-between gap-4"><span className="text-gray-600">Curacion:</span><span className="text-right font-medium">6 meses</span></div><div className="flex justify-between gap-4"><span className="text-gray-600">Alergenos:</span><span className="text-right font-medium text-red-600">Leche</span></div></div></div><p className="mt-6 text-center text-sm text-gray-300">Descarga el QR e imprimelo en tu packaging. Funciona para siempre.</p></div></motion.div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-12 text-center"><h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">Preguntas frecuentes</h2></motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.55, delay: 0.05 }} className="space-y-4">{faqs.map((faq, index) => { const open = openFaq === index; return <div key={faq.question} className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"><button type="button" onClick={() => setOpenFaq(open ? -1 : index)} className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-100"><span className="font-medium text-gray-900">{faq.question}</span><ArrowRight className={`h-5 w-5 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`} /></button>{open && <div className="px-6 pb-4 text-gray-700">{faq.answer}</div>}</div>; })}</motion.div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-hispalo-900 py-20 sm:py-24 text-white">
          <div className="absolute inset-0 opacity-10"><div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-hispalo-400 blur-3xl" /></div>
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
            <motion.div {...fadeUp}><h2 className="mb-6 font-heading text-3xl sm:text-4xl lg:text-5xl font-bold">Vuelve a lo que amas</h2><p className="mx-auto mb-10 max-w-2xl text-lg sm:text-xl text-white/90">Deja de ser community manager, logistica y contable. Se productor. Nosotros hacemos el resto.</p><div className="flex flex-col justify-center gap-4 sm:flex-row"><button onClick={() => goToRegister('free')} className="rounded-full bg-white px-8 py-4 text-lg font-bold text-hispalo-900 transition-all hover:scale-[1.02] hover:shadow-xl">Crear cuenta gratuita</button><button onClick={() => scrollToSection('planes')} className="rounded-full border-2 border-white/50 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white/10">Comparar planes PRO y ELITE</button></div><p className="mt-8 text-sm text-white/70">Aprobacion en 24h. Sin compromiso. Sin tarjeta de credito para empezar.</p></motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
