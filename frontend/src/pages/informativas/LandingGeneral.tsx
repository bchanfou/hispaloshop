import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ShoppingBag,
  Users,
  Store,
  TrendingUp,
  Globe,
  Heart,
  ArrowRight,
} from 'lucide-react';
import { HeroSection, FeatureSection, FAQSection, CTASection } from '../../components/informativas';
import { ConnectionIllustration } from '../../components/informativas';
import SEO from '../../components/SEO';

const FEATURE_ICONS = [ShoppingBag, Users, Store, TrendingUp, Globe, Heart];

// Helper para generar URLs con prefijo de idioma para landings
const LANDING_LANGS = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ja', 'ko'];
function useLocalizedLandingPath() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.split('-')[0] || 'es';
  
  return (path: string): string => {
    // Solo aplicar prefijo para landings y si no es español
    const isLanding = ['/productor', '/distribuidor', '/influencer', '/consumidor', '/about', '/landing'].some(
      landing => path === landing || path.startsWith(landing + '/')
    );
    if (isLanding && lang !== 'es' && LANDING_LANGS.includes(lang)) {
      return `/${lang}${path}`;
    }
    return path;
  };
}

interface RoleCardData {
  role: string;
  description: string;
  cta: string;
  to: string;
}

interface RoleCardProps {
  item: RoleCardData;
  index: number;
  getLocalizedPath: (path: string) => string;
}

function RoleCard({ item, index, getLocalizedPath }: RoleCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      className="group relative bg-white rounded-2xl border border-stone-200 p-7 flex flex-col justify-between transition-all duration-300 hover:border-stone-300 hover:shadow-sm"
    >
      <div>
        <h3 className="text-[17px] font-semibold text-stone-950 m-0 mb-2 tracking-tight">
          {item.role}
        </h3>
        <p className="text-[14px] leading-relaxed text-stone-500 m-0 mb-6">
          {item.description}
        </p>
      </div>
      <Link
        to={getLocalizedPath(item.to)}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-stone-950 no-underline group-hover:gap-3 transition-all duration-200"
      >
        {item.cta}
        <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

function RolesSection() {
  const { t } = useTranslation();
  const getLocalizedPath = useLocalizedLandingPath();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const eyebrow = t('landing.general.roles.eyebrow', 'Para cada tipo de usuario');
  const title = t('landing.general.roles.title', '¿Quién eres en hispaloshop?');
  const items = t('landing.general.roles.items', { returnObjects: true, defaultValue: [] }) as RoleCardData[];

  return (
    <section ref={ref} className="bg-stone-50 py-24 lg:py-32">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="mb-14 max-w-[480px]">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[11px] uppercase tracking-[0.12em] font-semibold text-stone-400 mb-3"
          >
            {eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-stone-950 m-0"
          >
            {title}
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.isArray(items) && items.map((item, i) => (
            <RoleCard key={i} item={item} index={i} getLocalizedPath={getLocalizedPath} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingGeneral() {
  const { t } = useTranslation();
  const getLocalizedPath = useLocalizedLandingPath();

  const heroData = {
    eyebrow: t('landing.general.hero.eyebrow', 'La comida tiene historia'),
    title: t('landing.general.hero.title', 'Compra directamente a quien cultiva tu comida'),
    subtitle: t('landing.general.hero.subtitle', 'Una plataforma donde cada producto tiene cara y apellidos. Sin intermediarios. Del campo a tu mesa.'),
    ctaText: t('landing.general.hero.ctaText', 'Explorar productos'),
    ctaTo: t('landing.general.hero.ctaTo', '/discover'),
    secondaryCtaText: t('landing.general.hero.secondaryCtaText', 'Soy productor'),
    secondaryCtaTo: getLocalizedPath(t('landing.general.hero.secondaryCtaTo', '/productor')),
  };

  const featuresEyebrow = t('landing.general.features.eyebrow', 'Por qué hispaloshop');
  const featuresTitle = t('landing.general.features.title', 'Todo lo que necesitas en un solo lugar');
  const featuresItems = t('landing.general.features.items', { returnObjects: true, defaultValue: [] }) as { title: string; description: string }[];

  const faqEyebrow = t('landing.general.faq.eyebrow', 'Preguntas frecuentes');
  const faqTitle = t('landing.general.faq.title', 'Lo que necesitas saber');
  const faqItems = t('landing.general.faq.items', { returnObjects: true, defaultValue: [] }) as { question: string; answer: string }[];

  const ctaData = {
    title: t('landing.general.cta.title', 'Empieza hoy. Es gratis.'),
    subtitle: t('landing.general.cta.subtitle', 'Únete a la comunidad que conecta productores con consumidores.'),
    ctaText: t('landing.general.cta.ctaText', 'Crear cuenta gratis'),
    ctaTo: t('landing.general.cta.ctaTo', '/register'),
  };

  return (
    <>
      <SEO
        title={t('landing.general.seo.title', 'HispaloShop — Compra directo al productor')}
        description={t('landing.general.seo.description', 'Plataforma de social commerce donde productores locales e importadores venden directamente al consumidor. Sin intermediarios.')}
      />

      <HeroSection
        {...heroData}
        illustration={<ConnectionIllustration className="w-full h-auto" />}
      />

      <FeatureSection
        eyebrow={featuresEyebrow}
        title={featuresTitle}
        features={
          Array.isArray(featuresItems)
            ? featuresItems.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] || ShoppingBag }))
            : []
        }
        columns={3}
        tone="white"
      />

      <RolesSection />

      <FAQSection
        eyebrow={faqEyebrow}
        title={faqTitle}
        items={Array.isArray(faqItems) ? faqItems : []}
        tone="white"
      />

      <CTASection {...ctaData} />
    </>
  );
}
