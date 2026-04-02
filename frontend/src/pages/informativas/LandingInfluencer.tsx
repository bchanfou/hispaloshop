import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Tag,
  TrendingUp,
  BarChart3,
  Wallet,
  Send,
  Share2,
  Banknote,
  UtensilsCrossed,
  HeartPulse,
  Camera,
} from 'lucide-react';
import {
  HeroSection,
  FeatureSection,
  StepsSection,
  FAQSection,
  CTASection,
  GrowthIllustration,
} from '../../components/informativas';

const FEATURE_ICONS = [Tag, TrendingUp, BarChart3, Wallet];
const STEP_ICONS = [Send, Share2, Banknote];

interface AudienceItem {
  title: string;
  description: string;
}

const AUDIENCE_ICONS = [UtensilsCrossed, HeartPulse, Camera];

function AudienceSection() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  const eyebrow = t('landing.influencer.audience.eyebrow', '¿Para quién es?');
  const title = t('landing.influencer.audience.title', '¿Encajas en el programa?');
  const items = t('landing.influencer.audience.items', { returnObjects: true, defaultValue: [] }) as AudienceItem[];

  return (
    <section ref={ref} className="bg-stone-950 py-24 lg:py-32">
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
            const Icon = AUDIENCE_ICONS[i] || UtensilsCrossed;
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

export default function LandingInfluencer() {
  const { t } = useTranslation();

  const heroData = {
    eyebrow: t('landing.influencer.hero.eyebrow', 'Para creadores gastronómicos'),
    title: t('landing.influencer.hero.title', 'Recomienda lo que te gusta y gana por cada venta'),
    subtitle: t('landing.influencer.hero.subtitle', 'Tu código de descuento, tus comisiones, tu dashboard.'),
    ctaText: t('landing.influencer.hero.ctaText', 'Quiero ser embajador'),
    ctaTo: t('landing.influencer.hero.ctaTo', '/register?role=influencer'),
  };

  const featuresEyebrow = t('landing.influencer.features.eyebrow', '');
  const featuresTitle = t('landing.influencer.features.title', '');
  const featuresItems = t('landing.influencer.features.items', { returnObjects: true, defaultValue: [] }) as { title: string; description: string }[];

  const stepsEyebrow = t('landing.influencer.steps.eyebrow', '');
  const stepsTitle = t('landing.influencer.steps.title', '');
  const stepsItems = t('landing.influencer.steps.items', { returnObjects: true, defaultValue: [] }) as { title: string; description: string }[];

  const faqEyebrow = t('landing.influencer.faq.eyebrow', '');
  const faqTitle = t('landing.influencer.faq.title', '');
  const faqItems = t('landing.influencer.faq.items', { returnObjects: true, defaultValue: [] }) as { question: string; answer: string }[];

  const ctaData = {
    title: t('landing.influencer.cta.title', ''),
    subtitle: t('landing.influencer.cta.subtitle', ''),
    ctaText: t('landing.influencer.cta.ctaText', ''),
    ctaTo: t('landing.influencer.cta.ctaTo', '/register?role=influencer'),
  };

  return (
    <>
      <HeroSection
        {...heroData}
        illustration={<GrowthIllustration className="w-full h-auto" />}
      />

      <FeatureSection
        eyebrow={featuresEyebrow}
        title={featuresTitle}
        features={
          Array.isArray(featuresItems)
            ? featuresItems.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] || Tag }))
            : []
        }
        columns={2}
        tone="white"
      />

      <StepsSection
        eyebrow={stepsEyebrow}
        title={stepsTitle}
        steps={
          Array.isArray(stepsItems)
            ? stepsItems.map((s, i) => ({ ...s, icon: STEP_ICONS[i] || Send }))
            : []
        }
        tone="warm"
      />

      <AudienceSection />

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
