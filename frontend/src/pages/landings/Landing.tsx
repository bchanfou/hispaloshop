// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronDown, ShieldCheck, Zap, Heart, Globe, Package, Sparkles, ShoppingBag } from 'lucide-react';
import SEO from '../../components/SEO';
import AnimatedNumber from '../../components/motion/AnimatedNumber';
import { InfoNav } from '../../components/info/shared';
import { useTranslation } from 'react-i18next';

/* ─────────────────────────────────────────────
   Role section data
   ───────────────────────────────────────────── */
const ROLES = [{
  eyebrow: 'PARA TI',
  headline: '\u00bfSabes realmente lo que comes?',
  body: 'El 73% de los productos del supermercado contienen ingredientes que no puedes pronunciar. En Hispaloshop, cada producto tiene cara y apellidos. Sabes qui\u00e9n lo cultiva, d\u00f3nde y c\u00f3mo. Porque tu salud no es negociable.',
  cta: 'Descubre productos reales',
  to: '/explore',
  icon: ShoppingBag
}, {
  eyebrow: 'PARA PRODUCTORES',
  headline: "Deja de regalar tu margen al intermediario",
  body: 'Trabajas 14 horas al d\u00eda para que otro ponga el precio a tu producto. Tu aceite vale lo que t\u00fa dices que vale. Abre tu tienda propia, vende directo y qu\u00e9date con el 100%.',
  cta: 'Abre tu tienda gratis',
  to: '/register?role=producer',
  icon: Package
}, {
  eyebrow: 'PARA CREADORES',
  headline: 'Tu audiencia ya conf\u00eda en ti. Monet\u00edzalo.',
  body: 'Cada vez que recomiendas un producto, alguien compra. Pero t\u00fa no ves ni un c\u00e9ntimo. Con Hispaloshop ganas comisi\u00f3n por cada venta. Tu c\u00f3digo, tus reglas, tu dinero.',
  cta: 'Activa tu c\u00f3digo de afiliado',
  to: '/register?role=influencer',
  icon: Sparkles
}, {
  eyebrow: 'PARA IMPORTADORES',
  headline: 'Proveedores verificados. Cero sorpresas.',
  body: 'Deja de volar a ferias para encontrar proveedores que luego no cumplen. Directorio verificado con certificaciones reales, contratos digitales y trazabilidad de cada operaci\u00f3n.',
  cta: 'Explora el directorio B2B',
  to: '/register?role=importer',
  icon: Globe
}];
const FEATURES = [{
  icon: ShieldCheck,
  title: 'Productores verificados',
  desc: 'Cada productor pasa un proceso de verificaci\u00f3n con documentaci\u00f3n real. Nada de cuentas fantasma.'
}, {
  icon: Zap,
  title: 'Compra en 3 toques',
  desc: 'Descubre, a\u00f1ade al carrito y paga. Sin formularios eternos ni procesos de registro imposibles.'
}, {
  icon: Heart,
  title: 'David AI, tu nutricionista',
  desc: 'Un asistente de IA que conoce tus preferencias, alergias y objetivos. Te recomienda productos reales del cat\u00e1logo.'
}, {
  icon: Globe,
  title: 'De Espa\u00f1a al mundo',
  desc: 'M\u00e1s de 190 pa\u00edses destino. Importadores acceden al mejor producto artesanal espa\u00f1ol desde una sola plataforma.'
}];

/* ─────────────────────────────────────────────
   Social proof stats
   ───────────────────────────────────────────── */
const STATS = [{
  label: 'Productores verificados'
}, {
  label: 'Venta directa sin intermediarios'
}, {
  label: 'Trazabilidad completa'
}];

/* ─────────────────────────────────────────────
   Landing page component
   ───────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-white" style={{
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  }}>
      <SEO title="HispaloShop \u2014 Marketplace de alimentaci\u00f3n artesanal" description="Conecta con productores reales. Compra directo del campo a tu mesa sin intermediarios. Productos artesanales verificados de toda Espa\u00f1a." />
      <InfoNav activePage="/" />

      {/* ════════════════════════════════════════
          HERO
         ════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        <motion.h1 initial={{
        opacity: 0,
        y: 30
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.7,
        ease: [0.4, 0, 0.2, 1]
      }} className="text-4xl md:text-6xl font-bold text-stone-950 leading-[1.05] tracking-tight max-w-3xl mx-auto mb-5">
          La revoluci&oacute;n de la comida local empieza aqu&iacute;
        </motion.h1>

        <motion.p initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.6,
        delay: 0.15,
        ease: [0.4, 0, 0.2, 1]
      }} className="text-lg md:text-xl text-stone-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Conecta con productores reales. Sin intermediarios. Sin mentiras.
        </motion.p>

        <motion.button initial={{
        opacity: 0,
        y: 16
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        delay: 0.3
      }} whileTap={{
        scale: 0.96
      }} onClick={() => navigate('/register')} className="bg-stone-950 text-white rounded-full px-8 py-4 text-base font-semibold hover:bg-stone-800 transition-colors cursor-pointer">
          Empieza gratis &rarr;
        </motion.button>

        {/* Social proof numbers */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        duration: 0.6,
        delay: 0.55
      }} className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-sm text-stone-400">
          {STATS.map((s, i) => <React.Fragment key={s.label}>
              {i > 0 && <span className="hidden sm:inline text-stone-300">&middot;</span>}
              <span className="font-semibold text-stone-600">{s.label}</span>
            </React.Fragment>)}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 1.2,
        duration: 0.6
      }} className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <motion.div animate={{
          y: [0, 8, 0]
        }} transition={{
          repeat: Infinity,
          duration: 1.6,
          ease: 'easeInOut'
        }}>
            <ChevronDown size={24} className="text-stone-300" />
          </motion.div>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════
          ROLE SECTIONS
         ════════════════════════════════════════ */}
      {ROLES.map((role, index) => {
      const isEven = index % 2 === 1;
      return <motion.section key={role.eyebrow} initial={{
        opacity: 0,
        y: 40
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} transition={{
        duration: 0.6,
        delay: 0.1
      }} className={`px-6 py-20 md:py-28 ${index % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}>
            <div className={`max-w-5xl mx-auto flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} items-start gap-12 md:gap-20`}>
              {/* Text column */}
              <div className="flex-1 max-w-xl">
                <p className="text-xs font-semibold tracking-[0.2em] text-stone-400 uppercase mb-3">
                  {role.eyebrow}
                </p>
                <h2 className="text-3xl md:text-4xl font-bold text-stone-950 leading-tight mb-4">
                  {role.headline}
                </h2>
                <p className="text-base md:text-lg text-stone-600 leading-relaxed mb-6 max-w-xl">
                  {role.body}
                </p>
                <button onClick={() => navigate(role.to)} className="inline-flex items-center gap-2 bg-stone-950 text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-stone-800 transition-colors cursor-pointer">
                  {role.cta} &rarr;
                </button>
              </div>

              {/* Visual placeholder column */}
              <div className="flex-1 w-full">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 border border-stone-200 flex items-center justify-center">
                  {(() => {
                const RoleIcon = role.icon;
                return <RoleIcon size={48} className="text-stone-300" />;
              })()}
                </div>
              </div>
            </div>
          </motion.section>;
    })}

      {/* ════════════════════════════════════════
          FEATURES — stagger grid
         ════════════════════════════════════════ */}
      <motion.section initial={{
      opacity: 0,
      y: 40
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6
    }} className="px-6 py-20 md:py-28 bg-white">
        <h2 className="text-3xl md:text-4xl font-bold text-stone-950 text-center tracking-tight mb-14">
          Todo lo que necesitas, nada que no
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {FEATURES.map((f, index) => {
          const Icon = f.icon;
          return <motion.div key={f.title} initial={{
            opacity: 0,
            y: 24
          }} whileInView={{
            opacity: 1,
            y: 0
          }} viewport={{
            once: true
          }} transition={{
            duration: 0.5,
            delay: index * 0.1
          }} className="bg-white rounded-2xl border border-stone-200 p-6">
                <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-stone-950" />
                </div>
                <h3 className="text-base font-semibold text-stone-950 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>;
        })}
        </div>
      </motion.section>

      {/* ════════════════════════════════════════
          FINAL CTA
         ════════════════════════════════════════ */}
      <motion.section initial={{
      opacity: 0,
      y: 40
    }} whileInView={{
      opacity: 1,
      y: 0
    }} viewport={{
      once: true
    }} transition={{
      duration: 0.6
    }} className="px-6 py-20 md:py-28 bg-stone-950 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4 max-w-lg mx-auto leading-tight">
          Empieza hoy. Es gratis.
        </h2>
        <p className="text-base text-stone-400 mb-10 max-w-md mx-auto leading-relaxed">
          Sin tarjeta de cr&eacute;dito. Sin compromiso. Sin letra peque&ntilde;a.
        </p>
        <motion.button whileTap={{
        scale: 0.96
      }} onClick={() => navigate('/register')} className="bg-white text-stone-950 rounded-full px-10 py-4 text-base font-semibold hover:bg-stone-100 transition-colors cursor-pointer">
          Crear cuenta gratis &rarr;
        </motion.button>
      </motion.section>
    </div>;
}