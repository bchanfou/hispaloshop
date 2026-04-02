import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ShoppingCart,
  Building2,
  Server,
  Layers,
  Users,
  Globe,
  UserPlus,
  Upload,
  Rocket,
  FileText,
  Handshake,
  Activity,
} from 'lucide-react';
import {
  HeroSection,
  FeatureSection,
  StepsSection,
  FAQSection,
  CTASection,
  GlobalIllustration,
} from '../../components/informativas';

const FEATURE_ICONS = [ShoppingCart, Building2, Server, Layers, Users, Globe];
const STEP_ICONS = [UserPlus, Upload, Rocket];

interface B2BItem {
  title: string;
  description: string;
}

const B2B_ICONS = [FileText, Handshake, Activity];

function B2BSection() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const eyebrow = t('landing.distribuidor.b2b.eyebrow', 'Para venta al por mayor');
  const title = t('landing.distribuidor.b2b.title', 'Tu canal B2B integrado');
  const items = t('landing.distribuidor.b2b.items', { returnObjects: true, defaultValue: [] }) as B2BItem[];

  return (
    <section ref={ref} id="b2b" className="bg-stone-950 py-24 lg:py-32">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="mb-14 max-w-[480px]">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-[11px] uppercase tracking-[0.12em] font-semibold text-stone-500 mb-3"
          >
            {eyebrow}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl font-semibold tracking-tight text-white m-0"
          >
            {title}
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {Array.isArray(items) && items.map((item, i) => {
            const Icon = B2B_ICONS[i] || FileText;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                className="flex flex-col"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-stone-400" />
                </div>
                <h3 className="text-[15px] font-semibold text-white m-0 mb-2 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-stone-400 m-0">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function LandingDistribuidor() {
  const { t } = useTranslation();

  const heroData = {
    eyebrow: t('landing.distribuidor.hero.eyebrow', 'Para distribuidores e importadores'),
    title: t('landing.distribuidor.hero.title', 'Trae productos del mundo a tu mercado local'),
    subtitle: t('landing.distribuidor.hero.subtitle', 'Tu tienda online para vender al consumidor final.'),
    ctaText: t('landing.distribuidor.hero.ctaText', 'Empezar a vender'),
    ctaTo: t('landing.distribuidor.hero.ctaTo', '/register?role=importer'),
    secondaryCtaText: t('landing.distribuidor.hero.secondaryCtaText', 'Ver ventajas B2B'),
    secondaryCtaTo: t('landing.distribuidor.hero.secondaryCtaTo', '/distribuidor#b2b'),
  };

  const featuresEyebrow = t('landing.distribuidor.features.eyebrow', '');
  const featuresTitle = t('landing.distribuidor.features.title', '');
  const featuresItems = t('landing.distribuidor.features.items', { returnObjects: true, defaultValue: [] }) as { title: string; description: string }[];

  const stepsEyebrow = t('landing.distribuidor.steps.eyebrow', '');
  const stepsTitle = t('landing.distribuidor.steps.title', '');
  const stepsItems = t('landing.distribuidor.steps.items', { returnObjects: true, defaultValue: [] }) as { title: string; description: string }[];

  const faqEyebrow = t('landing.distribuidor.faq.eyebrow', '');
  const faqTitle = t('landing.distribuidor.faq.title', '');
  const faqItems = t('landing.distribuidor.faq.items', { returnObjects: true, defaultValue: [] }) as { question: string; answer: string }[];

  const ctaData = {
    title: t('landing.distribuidor.cta.title', ''),
    subtitle: t('landing.distribuidor.cta.subtitle', ''),
    ctaText: t('landing.distribuidor.cta.ctaText', ''),
    ctaTo: t('landing.distribuidor.cta.ctaTo', '/register?role=importer'),
  };

  return (
    <>
      <HeroSection
        {...heroData}
        illustration={<GlobalIllustration className="w-full h-auto" />}
      />

      <FeatureSection
        eyebrow={featuresEyebrow}
        title={featuresTitle}
        features={
          Array.isArray(featuresItems)
            ? featuresItems.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] || ShoppingCart }))
            : []
        }
        columns={3}
        tone="white"
      />

      <StepsSection
        eyebrow={stepsEyebrow}
        title={stepsTitle}
        steps={
          Array.isArray(stepsItems)
            ? stepsItems.map((s, i) => ({ ...s, icon: STEP_ICONS[i] || UserPlus }))
            : []
        }
        tone="warm"
      />

      <B2BSection />

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
