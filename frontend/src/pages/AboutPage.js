import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { Button } from '../components/ui/button';
import { Shield, Sparkles, Globe, CreditCard, Users, Heart, ArrowRight, Truck, ShoppingBag, CheckCircle, ChefHat, TrendingUp, Layers, Smartphone, Languages } from 'lucide-react';

export default function AboutPage() {
  const { t } = useTranslation();

  const stats = [
    { value: '65+', label: t('pages.about.countries') },
    { value: '100%', label: t('pages.about.verified') },
    { value: '24-48h', label: t('pages.about.shipping') },
    { value: '80+', label: t('pages.about.categories') },
  ];

  const features = [
    { icon: Shield, title: t('pages.about.quality'), desc: t('pages.about.qualityDesc'), color: 'bg-emerald-50 text-emerald-600' },
    { icon: Globe, title: t('pages.about.global'), desc: t('pages.about.globalDesc'), color: 'bg-blue-50 text-blue-600' },
    { icon: Heart, title: t('pages.about.social'), desc: t('pages.about.socialDesc'), color: 'bg-rose-50 text-rose-600' },
    { icon: CreditCard, title: t('pages.about.payment'), desc: t('pages.about.paymentDesc'), color: 'bg-amber-50 text-amber-600' },
    { icon: ChefHat, title: t('pages.about.recipesFeature'), desc: t('pages.about.recipesFeatureDesc'), color: 'bg-orange-50 text-orange-600' },
    { icon: Users, title: t('pages.about.community'), desc: t('pages.about.communityDesc'), color: 'bg-stone-100 text-stone-600' },
  ];

  const audience = [
    {
      icon: ShoppingBag,
      title: t('pages.about.forBuyers'),
      points: [t('pages.about.buyerPoint1'), t('pages.about.buyerPoint2'), t('pages.about.buyerPoint3'), t('pages.about.buyerPoint4')],
      cta: t('pages.about.exploreProducts'),
      to: '/products',
      border: 'border-emerald-200 bg-emerald-50/30',
    },
    {
      icon: Globe,
      title: t('pages.about.forSellers'),
      points: [t('pages.about.sellerPoint1'), t('pages.about.sellerPoint2'), t('pages.about.sellerPoint3'), t('pages.about.sellerPoint4')],
      cta: t('pages.about.startSelling'),
      to: '/vender',
      border: 'border-blue-200 bg-blue-50/30',
    },
    {
      icon: Sparkles,
      title: t('pages.about.forInfluencers'),
      points: [t('pages.about.influencerPoint1'), t('pages.about.influencerPoint2'), t('pages.about.influencerPoint3'), t('pages.about.influencerPoint4')],
      cta: t('pages.about.monetize'),
      to: '/influencers',
      border: 'border-purple-200 bg-purple-50/30',
    },
  ];

  const newFeatures = [
    { icon: Layers, title: t('pages.about.newCatalog'), desc: t('pages.about.newCatalogDesc'), color: 'bg-yellow-50 text-yellow-700' },
    { icon: ChefHat, title: t('pages.about.newRecipes'), desc: t('pages.about.newRecipesDesc'), color: 'bg-orange-50 text-orange-700' },
    { icon: Smartphone, title: t('pages.about.newSocial'), desc: t('pages.about.newSocialDesc'), color: 'bg-rose-50 text-rose-700' },
    { icon: Languages, title: t('pages.about.newI18n'), desc: t('pages.about.newI18nDesc'), color: 'bg-blue-50 text-blue-700' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <BackButton />

        {/* Hero */}
        <section className="text-center mb-12" data-testid="about-hero">
          <p className="text-xs font-semibold text-[#2D5A27] uppercase tracking-widest mb-3">{t('pages.about.tagline')}</p>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold text-[#1C1C1C] mb-4">{t('pages.about.hero')}</h1>
          <p className="text-sm text-[#555] max-w-xl mx-auto mb-6">{t('pages.about.heroDesc')}</p>
          <div className="flex justify-center gap-5 sm:gap-8 mb-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold text-[#2D5A27]">{s.value}</p>
                <p className="text-xs text-[#7A7A7A] uppercase">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            <Link to="/products"><Button className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full px-6 h-11" data-testid="about-explore-btn">{t('pages.about.exploreProducts')} <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
            <Link to="/signup"><Button variant="outline" className="rounded-full px-6 h-11" data-testid="about-signup-btn">{t('pages.about.createFree')}</Button></Link>
          </div>
        </section>

        {/* What's New */}
        <section className="mb-12" data-testid="about-whats-new">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] text-center mb-2">{t('pages.about.whatsNew')}</h2>
          <p className="text-sm text-[#666] text-center mb-8">{t('pages.about.whatsNewDesc')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {newFeatures.map((nf, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4 text-center hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl ${nf.color} flex items-center justify-center mx-auto mb-2`}>
                  <nf.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-[#1C1C1C] text-sm mb-1">{nf.title}</h3>
                <p className="text-[11px] text-[#666] leading-relaxed">{nf.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] text-center mb-8">{t('pages.about.whyTitle')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-md transition-all" data-testid={`about-feature-${i}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}><f.icon className="w-5 h-5" /></div>
                <h3 className="font-semibold text-[#1C1C1C] text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-[#666] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Audience */}
        <section className="mb-12">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] text-center mb-8">{t('pages.about.forEveryone')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {audience.map((a, i) => (
              <div key={i} className={`rounded-2xl border p-5 ${a.border}`} data-testid={`about-audience-${i}`}>
                <a.icon className="w-7 h-7 text-[#1C1C1C] mb-3" />
                <h3 className="font-heading text-lg font-semibold text-[#1C1C1C] mb-3">{a.title}</h3>
                <ul className="space-y-2 mb-4">
                  {a.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-[#444]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27] mt-0.5 shrink-0" />{p}
                    </li>
                  ))}
                </ul>
                <Link to={a.to}><Button variant="outline" size="sm" className="w-full rounded-xl hover:bg-[#1C1C1C] hover:text-white">{a.cta} <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button></Link>
              </div>
            ))}
          </div>
        </section>

        {/* Seller Plans Overview */}
        <section className="mb-12" data-testid="about-plans">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] text-center mb-2">{t('pages.about.plansTitle')}</h2>
          <p className="text-sm text-[#666] text-center mb-8">{t('pages.about.plansDesc')}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'Free', commission: '20%', price: '$0', highlight: false },
              { name: 'Pro', commission: '18%', price: '$54/mo', highlight: true },
              { name: 'Elite', commission: '17%', price: '$108/mo', highlight: false },
            ].map((plan, i) => (
              <div key={i} className={`rounded-2xl border p-5 text-center ${plan.highlight ? 'border-[#2D5A27] bg-[#2D5A27]/5 ring-1 ring-[#2D5A27]/20' : 'border-stone-200 bg-white'}`}>
                <h3 className="font-heading text-lg font-bold text-[#1C1C1C] mb-1">{plan.name}</h3>
                <p className="text-2xl font-bold text-[#2D5A27] mb-1">{plan.price}</p>
                <p className="text-xs text-[#666]">{t('pages.about.commission')}: {plan.commission}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <Link to="/pricing" className="text-sm text-[#2D5A27] hover:underline inline-flex items-center gap-1">
              {t('pages.about.viewAllPlans')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12 text-center">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-8">{t('pages.about.howItWorks')}</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Sparkles, title: t('pages.about.discover'), desc: t('pages.about.discoverDesc') },
              { icon: ShoppingBag, title: t('pages.about.buy'), desc: t('pages.about.buyDesc') },
              { icon: Truck, title: t('pages.about.receive'), desc: t('pages.about.receiveDesc') },
            ].map((s, i) => (
              <div key={i}>
                <div className="w-12 h-12 rounded-2xl bg-[#2D5A27] text-white flex items-center justify-center mx-auto mb-3"><s.icon className="w-6 h-6" /></div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-[#666]">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1C1C1C] rounded-2xl p-8 text-center" data-testid="about-cta">
          <h2 className="font-heading text-2xl font-semibold text-white mb-3">{t('pages.about.startToday')}</h2>
          <p className="text-sm text-stone-400 mb-6">{t('pages.about.startDesc')}</p>
          <div className="flex justify-center gap-3">
            <Link to="/signup"><Button className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full px-7 h-11">{t('pages.about.createFree')} <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
            <Link to="/products"><Button variant="outline" className="rounded-full px-7 h-11 border-stone-600 text-stone-300 hover:bg-stone-800">{t('pages.about.justBrowse')}</Button></Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
