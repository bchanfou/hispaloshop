import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  Utensils,
  ShoppingCart,
  Package,
  Star,
  Globe,
} from 'lucide-react';
import { InfoNav } from '../../components/info/shared';

/* ─────────────────────────────────────────────
   Timeline steps
   ───────────────────────────────────────────── */
const STEPS = [
  {
    icon: Search,
    num: 1,
    title: 'Descubre',
    desc: 'Explora productores artesanales verificados. Filtra por categor\u00eda, certificaci\u00f3n, origen o valores. Cada producto tiene historia.',
  },
  {
    icon: ShoppingBag,
    num: 2,
    title: 'Compra',
    desc: 'A\u00f1ade al carrito, elige env\u00edo y paga en segundos. Directo del productor a tu puerta, sin intermediarios.',
  },
  {
    icon: Utensils,
    num: 3,
    title: 'Disfruta',
    desc: 'Recibe producto fresco con trazabilidad completa. Sabes qui\u00e9n lo hizo, d\u00f3nde y c\u00f3mo. Comida de verdad.',
  },
];

/* ─────────────────────────────────────────────
   Role cards
   ───────────────────────────────────────────── */
const ROLES = [
  {
    icon: ShoppingCart,
    role: 'Consumidor',
    desc: 'Descubre productos aut\u00e9nticos de productores verificados. David AI te recomienda seg\u00fan tus preferencias y alergias.',
    href: '/explore',
  },
  {
    icon: Package,
    role: 'Productor',
    desc: 'Abre tu tienda propia, vende directo y qu\u00e9date con el margen. Sin exclusividades. Sin letra peque\u00f1a.',
    href: '/productor',
  },
  {
    icon: Star,
    role: 'Influencer',
    desc: 'Gana comisiones reales por cada venta con tu c\u00f3digo de afiliado. Tu audiencia conf\u00eda en ti. Monet\u00edzalo.',
    href: '/influencer',
  },
  {
    icon: Globe,
    role: 'Importador',
    desc: 'Accede a un directorio verificado de productores espa\u00f1oles. Contratos digitales, certificaciones y trazabilidad.',
    href: '/importador',
  },
];

/* ─────────────────────────────────────────────
   QueEsPage component
   ───────────────────────────────────────────── */
export default function QueEsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <InfoNav activePage="/que-es-hispaloshop" />

      {/* ════════════════════════════════════════
          1. HERO
         ════════════════════════════════════════ */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 md:pt-36 md:pb-28">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-xs font-semibold tracking-[0.2em] text-stone-400 uppercase mb-4"
        >
          La plataforma de alimentaci&oacute;n real
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          className="text-4xl md:text-6xl font-bold text-stone-950 leading-[1.05] tracking-tight max-w-3xl mx-auto mb-5"
        >
          Hispaloshop es el mercado donde la comida tiene historia
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-lg md:text-xl text-stone-500 max-w-xl mx-auto leading-relaxed"
        >
          Una plataforma donde cada producto tiene cara y apellidos. Del campo a tu mesa, sin nadie en medio.
        </motion.p>
      </section>

      {/* ════════════════════════════════════════
          2. THE PROBLEM
         ════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="px-6 py-20 md:py-28 bg-stone-50"
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-400 uppercase mb-3">
            EL PROBLEMA
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-stone-950 leading-tight mb-6">
            El sistema alimentario est&aacute; roto
          </h2>
          <div className="space-y-4 text-base md:text-lg text-stone-600 leading-relaxed max-w-2xl">
            <p>
              Entre el productor y tu plato hay una cadena de intermediarios que encarece el precio, diluye la calidad y borra la historia de lo que comes.
            </p>
            <p>
              El productor artesanal trabaja 14 horas al d&iacute;a para que otro ponga el precio a su producto. El consumidor paga m&aacute;s por menos calidad. Y nadie sabe de d&oacute;nde viene realmente lo que hay en su nevera.
            </p>
            <p className="font-semibold text-stone-950">
              Eso se acaba.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ════════════════════════════════════════
          3. THE SOLUTION
         ════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="px-6 py-20 md:py-28 bg-white"
      >
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-400 uppercase mb-3">
            LA SOLUCI&Oacute;N
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-stone-950 leading-tight mb-6">
            Conectamos al que produce con el que come
          </h2>
          <div className="space-y-4 text-base md:text-lg text-stone-600 leading-relaxed max-w-2xl">
            <p>
              Hispaloshop es una plataforma de social commerce donde los productores artesanales abren su tienda propia, cuentan su historia y venden directamente al consumidor final.
            </p>
            <p>
              Sin intermediarios. Sin comisiones abusivas. Sin algoritmos que entierren tu producto. Cada venta es una conexi&oacute;n directa entre quien cultiva, elabora y produce, y quien quiere comer bien de verdad.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ════════════════════════════════════════
          4. HOW IT WORKS — 3 step timeline
         ════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="px-6 py-20 md:py-28 bg-stone-950"
      >
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-500 uppercase mb-3">
            C&Oacute;MO FUNCIONA
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-14">
            Tres pasos. Sin complicaciones.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.12 }}
                  className="relative"
                >
                  {/* Step number + icon */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                      <Icon size={22} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-stone-500">
                      Paso {step.num}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-stone-400 leading-relaxed">
                    {step.desc}
                  </p>

                  {/* Connector line (only between steps on desktop) */}
                  {index < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-[calc(100%+4px)] w-[calc(100%-56px)] h-px bg-white/10" style={{ transform: 'translateX(-50%)' }} />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ════════════════════════════════════════
          5. FOR WHOM — 4 role cards
         ════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="px-6 py-20 md:py-28 bg-stone-50"
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold tracking-[0.2em] text-stone-400 uppercase mb-3 text-center">
            PARA QUI&Eacute;N ES
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-stone-950 leading-tight mb-14 text-center">
            Una plataforma, cuatro roles
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ROLES.map((r, index) => {
              const Icon = r.icon;
              return (
                <motion.div
                  key={r.role}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  onClick={() => navigate(r.href)}
                  className="bg-white rounded-2xl border border-stone-200 p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
                    <Icon size={20} className="text-stone-950" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-950 mb-2">
                    {r.role}
                  </h3>
                  <p className="text-sm text-stone-500 leading-relaxed mb-3">
                    {r.desc}
                  </p>
                  <span className="text-sm font-semibold text-stone-950">
                    Saber m&aacute;s &rarr;
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ════════════════════════════════════════
          6. CTA
         ════════════════════════════════════════ */}
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="px-6 py-20 md:py-28 bg-stone-950 text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4 max-w-lg mx-auto leading-tight">
          &Uacute;nete a la revoluci&oacute;n
        </h2>
        <p className="text-base text-stone-400 mb-10 max-w-md mx-auto leading-relaxed">
          Miles de productores, creadores y consumidores ya est&aacute;n dentro. &iquest;A qu&eacute; esperas?
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate('/register')}
          className="bg-white text-stone-950 rounded-full px-10 py-4 text-base font-semibold hover:bg-stone-100 transition-colors cursor-pointer"
        >
          Crear cuenta gratis &rarr;
        </motion.button>
      </motion.section>
    </div>
  );
}
