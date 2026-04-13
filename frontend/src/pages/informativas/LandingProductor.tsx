import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';
import { usePlanConfig } from '../../hooks/api/usePlanConfig';
import {
  Store,
  Coins,
  Users,
  ClipboardList,
  BarChart3,
  Sparkles,
  UserPlus,
  Settings,
  Truck,
  Check,
} from 'lucide-react';
import {
  HeroSection,
  FeatureSection,
  StepsSection,
  FAQSection,
  CTASection,
  DeviceIllustration,
} from '../../components/informativas';
import SEO from '../../components/SEO';

const FEATURE_ICONS = [Store, Coins, Users, ClipboardList, BarChart3, Sparkles];
const STEP_ICONS = [UserPlus, Settings, Truck];

interface PlanData {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
}

const PLAN_KEYS = ['FREE', 'PRO', 'ELITE'] as const;

function PlanCard({ plan, index, featured }: { plan: PlanData; index: number; featured: boolean; key?: React.Key }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
      className={`rounded-2xl p-7 flex flex-col ${
        featured
          ? 'bg-stone-950 text-white border-2 border-stone-950 relative'
          : 'bg-white border border-stone-200'
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-7 px-3 py-0.5 text-[10px] uppercase tracking-[0.1em] font-semibold bg-white text-stone-950 rounded-full">
          {t('landing.productor.plans.popular', 'Popular')}
        </span>
      )}
      <h3 className={`text-[13px] uppercase tracking-[0.08em] font-semibold m-0 mb-1 ${
        featured ? 'text-stone-400' : 'text-stone-500'
      }`}>
        {plan.name}
      </h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-3xl font-semibold tracking-tight ${featured ? 'text-white' : 'text-stone-950'}`}>
          {plan.price}
        </span>
        <span className={`text-sm ${featured ? 'text-stone-400' : 'text-stone-500'}`}>
          {plan.period}
        </span>
      </div>
      <p className={`text-[13px] leading-relaxed m-0 mb-6 ${featured ? 'text-stone-400' : 'text-stone-500'}`}>
        {plan.description}
      </p>
      <ul className="list-none m-0 p-0 flex flex-col gap-2.5 flex-1">
        {plan.features.map((feat, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <Check size={14} className={`flex-shrink-0 mt-0.5 ${featured ? 'text-stone-400' : 'text-stone-500'}`} />
            <span className={`text-[13px] leading-snug ${featured ? 'text-stone-300' : 'text-stone-700'}`}>
              {feat}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function PlansSection() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const [isAnnual, setIsAnnual] = useState(false);
  const { data: planConfig } = usePlanConfig() as { data?: { seller_plans?: Record<string, { price_monthly_eur?: number; price_annual_eur?: number }> } };

  const eyebrow = t('landing.productor.plans.eyebrow', 'Planes');
  const title = t('landing.productor.plans.title', 'Elige el plan que encaja contigo');
  const rawItems = t('landing.productor.plans.items', { returnObjects: true, defaultValue: [] }) as PlanData[];

  const items: PlanData[] = (Array.isArray(rawItems) ? rawItems : []).map((plan, idx) => {
    const key = PLAN_KEYS[idx];
    const api = planConfig?.seller_plans?.[key];
    if (!api) return plan;
    const monthly = api.price_monthly_eur ?? 0;
    const annual = api.price_annual_eur ?? Math.round(monthly * 12 * 0.85);
    if (monthly === 0) {
      return { ...plan, price: t('landing.productor.plans.freeLabel', 'Gratis'), period: '' };
    }
    if (isAnnual) {
      return {
        ...plan,
        price: `${annual}\u20ac`,
        period: t('landing.productor.plans.perYear', '/año'),
      };
    }
    return {
      ...plan,
      price: `${monthly}\u20ac`,
      period: t('landing.productor.plans.perMonth', '/mes'),
    };
  });

  return (
    <section ref={ref} id="planes" className="bg-stone-50 py-24 lg:py-32">
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

        <div className="mb-10 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-stone-950' : 'text-stone-400'}`}>
            {t('landing.productor.plans.monthly', 'Mensual')}
          </span>
          <button
            type="button"
            onClick={() => setIsAnnual(v => !v)}
            className={`relative w-14 h-7 rounded-full transition-colors ${isAnnual ? 'bg-stone-950' : 'bg-stone-200'}`}
            aria-label="Toggle annual billing"
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${isAnnual ? 'translate-x-7' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-stone-950' : 'text-stone-400'}`}>
            {t('landing.productor.plans.annual', 'Anual')}
            <span className="ml-1.5 text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-semibold">
              {t('landing.productor.plans.save15', '-15%')}
            </span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((plan, i) => (
            <PlanCard key={i} plan={plan} index={i} featured={i === 1} />
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-stone-400">
          {isAnnual
            ? t('landing.productor.plans.annualNote', 'Facturación anual. Sin prueba gratis.')
            : t('landing.productor.plans.monthlyNote', '7 días de prueba gratis en planes de pago.')}
        </p>
      </div>
    </section>
  );
}

export default function LandingProductor() {
  const { t } = useTranslation();
  React.useEffect(() => { trackEvent('landing_viewed', { page: 'producer' }); }, []);

  const heroData = {
    eyebrow: t('landing.productor.hero.eyebrow', 'Para productores y artesanos'),
    title: t('landing.productor.hero.title', 'Tu producto merece llegar sin intermediarios'),
    subtitle: t('landing.productor.hero.subtitle', 'Abre tu tienda online en minutos.'),
    ctaText: t('landing.productor.hero.ctaText', 'Registrar mi tienda'),
    ctaTo: t('landing.productor.hero.ctaTo', '/register?role=producer'),
    secondaryCtaText: t('landing.productor.hero.secondaryCtaText', 'Ver planes'),
    secondaryCtaTo: t('landing.productor.hero.secondaryCtaTo', '/productor#planes'),
  };

  const featuresEyebrow = t('landing.productor.features.eyebrow', 'Producer benefits');
  const featuresTitle = t('landing.productor.features.title', 'Everything you need to sell');
  const featuresItems = t('landing.productor.features.items', { returnObjects: true, defaultValue: [] }) as { title: string; description: string }[];

  const stepsEyebrow = t('landing.productor.steps.eyebrow', 'How it works');
  const stepsTitle = t('landing.productor.steps.title', 'From your farm to the table');
  const stepsItems = t('landing.productor.steps.items', { returnObjects: true, defaultValue: [] }) as { title: string; description: string }[];

  const faqEyebrow = t('landing.productor.faq.eyebrow', 'FAQ');
  const faqTitle = t('landing.productor.faq.title', 'Your questions answered');
  const faqItems = t('landing.productor.faq.items', { returnObjects: true, defaultValue: [] }) as { question: string; answer: string }[];

  const ctaData = {
    title: t('landing.productor.cta.title', 'Your story deserves to be told'),
    subtitle: t('landing.productor.cta.subtitle', 'Open your store and start selling today.'),
    ctaText: t('landing.productor.cta.ctaText', 'Set up my store free'),
    ctaTo: t('landing.productor.cta.ctaTo', '/register?role=producer'),
  };

  return (
    <>
      <SEO
        title={t('landing.productor.seo.title', 'Vende sin intermediarios — HispaloShop')}
        description={t('landing.productor.seo.description', 'Abre tu tienda online y vende directamente al consumidor. Planes desde 0€. Comisiones desde 17%.')}
      />

      <HeroSection
        {...heroData}
        illustration={<DeviceIllustration className="w-full h-auto" />}
      />

      <FeatureSection
        eyebrow={featuresEyebrow}
        title={featuresTitle}
        features={
          Array.isArray(featuresItems)
            ? featuresItems.map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] || Store }))
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

      <PlansSection />

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
