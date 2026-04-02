import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// -- Animacion de entrada al scroll --
export const FadeUp = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay }}
  >
    {children}
  </motion.div>
);

// -- Seccion hero --
export const Hero = ({ eyebrow, headline, sub, cta, ctaHref, ctaColor = '#0A0A0A', visual }) => (
  <section className="bg-white text-center overflow-hidden py-[clamp(72px,10vw,120px)] px-6 pb-[clamp(56px,8vw,96px)]">
    <FadeUp>
      {eyebrow && (
        <p className="text-[13px] font-semibold tracking-widest uppercase text-stone-500 mb-4">
          {eyebrow}
        </p>
      )}
      <h1 className="text-[clamp(34px,6vw,64px)] font-bold leading-[1.05] tracking-tight text-stone-950 max-w-[720px] mx-auto mb-5">
        {headline}
      </h1>
      <p className="text-[clamp(16px,2vw,20px)] text-stone-500 leading-relaxed max-w-[520px] mx-auto mb-10">
        {sub}
      </p>
      <a
        href={ctaHref || '/registro'}
        className="inline-flex items-center gap-2 py-[15px] px-8 rounded-full text-base font-semibold no-underline shadow-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-[1.03] hover:shadow-xl"
        style={{
          background: ctaColor,
          color: ctaColor === '#FFFFFF' ? '#0A0A0A' : '#FFFFFF',
        }}
      >
        {cta} →
      </a>
    </FadeUp>
    {visual && (
      <FadeUp delay={0.15}>
        <div className="mt-14">{visual}</div>
      </FadeUp>
    )}
  </section>
);

// -- Grid de features --
export const FeatureGrid = ({ features }) => (
  <section className="bg-stone-50 py-[clamp(56px,8vw,96px)] px-6">
    <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 max-w-[1080px] mx-auto">
      {features.map((f, i) => (
        <FadeUp key={f.title} delay={i * 0.07}>
          <div className="bg-white rounded-2xl border border-black/[0.07] p-7 shadow-sm h-full">
            <div className="text-4xl mb-3.5">{f.icon}</div>
            <p className="text-[17px] font-semibold text-stone-950 mb-2">
              {f.title}
            </p>
            <p className="text-sm text-stone-500 leading-relaxed m-0">
              {f.desc}
            </p>
          </div>
        </FadeUp>
      ))}
    </div>
  </section>
);

// -- Pricing card --
export const PricingCard = ({
  name, tagline, price, period = '/mes', features,
  cta, ctaHref, accentColor, isPopular, isDark,
}) => (
  <FadeUp>
    <div
      className={`rounded-[22px] p-8 relative h-full flex flex-col transition-all duration-300 ${
        isDark ? 'bg-stone-950' : 'bg-white'
      } ${isPopular ? 'scale-[1.03]' : 'scale-100'}`}
      style={{
        border: isPopular
          ? `2px solid ${accentColor}`
          : `0.5px solid rgba(0,0,0,${isDark ? 0.0 : 0.08})`,
        boxShadow: isPopular
          ? `0 8px 40px ${accentColor}28`
          : '0 2px 16px rgba(0,0,0,0.07)',
      }}
    >
      {isPopular && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[11px] font-bold py-[5px] px-4 rounded-full tracking-wide uppercase whitespace-nowrap"
          style={{ background: accentColor }}
        >
          Más popular
        </div>
      )}

      {/* Plan name */}
      <p className={`text-xs font-bold tracking-[0.1em] uppercase mb-1.5 ${isDark ? 'text-white/50' : 'text-stone-400'}`}>
        {name}
      </p>
      <p className={`text-[15px] mb-5 leading-snug ${isDark ? 'text-white/80' : 'text-stone-500'}`}>
        {tagline}
      </p>

      {/* Precio */}
      <div className="mb-6">
        <span className={`text-5xl font-bold leading-none tracking-tight ${isDark ? 'text-white' : 'text-stone-950'}`}>
          {price === 0 ? 'Gratis' : `${price}€`}
        </span>
        {price > 0 && (
          <span className={`text-sm ml-1 ${isDark ? 'text-white/50' : 'text-stone-400'}`}>
            + IVA{period}
          </span>
        )}
      </div>

      {/* Features */}
      <ul className="list-none p-0 flex-1 mb-6">
        {features.map((f) => (
          <li
            key={f}
            className={`flex items-start gap-2.5 py-[7px] text-sm leading-snug ${
              isDark ? 'border-b border-white/[0.07] text-white/85' : 'border-b border-black/[0.06] text-stone-950'
            }`}
          >
            <Check size={15} color={accentColor} className="shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href={ctaHref || '/registro'}
        className="block text-center py-3.5 px-6 rounded-full text-[15px] font-semibold no-underline transition-opacity duration-200 hover:opacity-90"
        style={{
          background: isDark ? '#FFFFFF' : accentColor,
          color: isDark ? '#0A0A0A' : '#FFFFFF',
        }}
      >
        {cta}
      </a>
    </div>
  </FadeUp>
);

// -- Seccion de pricing (3 cards) --
export const PricingSection = ({ title, sub, plans }) => (
  <section className="bg-white py-[clamp(56px,8vw,96px)] px-6">
    <FadeUp>
      <h2 className="text-[clamp(28px,4vw,42px)] font-bold text-center text-stone-950 tracking-tight mb-3">
        {title}
      </h2>
      {sub && (
        <p className="text-[17px] text-stone-500 text-center max-w-[480px] mx-auto mb-14">
          {sub}
        </p>
      )}
    </FadeUp>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 max-w-[960px] mx-auto items-center">
      {plans.map((p) => <PricingCard key={p.name} {...p} />)}
    </div>
  </section>
);

// -- Footer CTA --
export const FooterCTA = ({ headline, cta, ctaHref, ctaColor = '#0A0A0A' }) => (
  <section className="bg-stone-950 py-[clamp(56px,8vw,96px)] px-6 text-center">
    <FadeUp>
      <h2 className="text-[clamp(28px,4vw,44px)] font-bold text-white tracking-tight max-w-[580px] mx-auto mb-9 leading-[1.1]">
        {headline}
      </h2>
      <a
        href={ctaHref || '/registro'}
        className="inline-flex items-center gap-2 py-[15px] px-9 rounded-full bg-white text-stone-950 text-base font-bold no-underline transition-all duration-300"
      >
        {cta} →
      </a>
    </FadeUp>
  </section>
);

// -- Navbar de paginas informativas --
export const InfoNav = ({ activePage }) => (
  <nav className="sticky top-0 z-[200] bg-white/85 backdrop-blur-[20px] border-b border-black/[0.08] px-6 flex items-center justify-between h-[52px]">
    <a href="/" className="no-underline">
      <span className="text-lg font-bold text-stone-950 tracking-tight">
        Hispaloshop
      </span>
    </a>
    <div className="flex gap-1">
      {[
        { href: '/que-es-hispaloshop', label: t('shared.queEs', 'Qué es') },
        { href: '/productor',  label: 'Productor'  },
        { href: '/importador', label: 'Importador' },
        { href: '/influencer', label: 'Influencer' },
      ].map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className={`py-1.5 px-3 rounded-full text-[13px] font-medium no-underline transition-all duration-200 whitespace-nowrap ${
            activePage === href
              ? 'bg-stone-950 text-white'
              : 'bg-transparent text-stone-500'
          }`}
        >
          {label}
        </a>
      ))}
    </div>
    <a href="/login" className="py-2 px-[18px] rounded-full bg-stone-950 text-white text-[13px] font-semibold no-underline">
      Entrar
    </a>
  </nav>
);
