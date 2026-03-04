import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { ArrowRight, Globe, CreditCard, Users, BarChart3, Shield, Zap, CheckCircle, Clock, Store } from 'lucide-react';
import BackButton from '../components/BackButton';
import { useTranslation } from 'react-i18next';

const commissionTable = [
  { label: 'FREE (20%)', sale: 100, seller: 80, platform: 20 },
  { label: 'PRO (18%)', sale: 100, seller: 82, platform: 18 },
  { label: 'ELITE (17%)', sale: 100, seller: 83, platform: 17 },
];

export default function SellerLandingPage() {
  const { t } = useTranslation();

  const benefits = [
    { icon: Globe, title: t('sellerLanding.globalReach'), desc: t('sellerLanding.globalReachDesc') },
    { icon: CreditCard, title: t('sellerLanding.fairCommission'), desc: t('sellerLanding.fairCommissionDesc') },
    { icon: Users, title: t('sellerLanding.influencerMatching'), desc: t('sellerLanding.influencerMatchingDesc') },
  ];

  const tools = [
    t('sellerLanding.tool1'),
    t('sellerLanding.tool2'),
    t('sellerLanding.tool3'),
    t('sellerLanding.tool4'),
    t('sellerLanding.tool5'),
    t('sellerLanding.tool6'),
  ];
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO 
        title="Sell on Hispaloshop — Global Food Marketplace for Producers" 
        description="Start selling your products to 18+ countries. Commission from 17%. Automatic payments via Stripe. Free to start."
        url="https://www.hispaloshop.com/vender"
      />
      <Header />
      <div className="max-w-3xl mx-auto px-4 pt-2"><BackButton /></div>

      {/* Hero */}
      <section className="pt-10 pb-8 md:pt-16 md:pb-12" data-testid="seller-hero">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-[#2D5A27] uppercase tracking-widest mb-3">{t('sellerLanding.tagline')}</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1C1C1C] mb-4 leading-tight">
            {t('sellerLanding.title')} 
          </h1>
          <p className="text-base text-[#555] max-w-xl mx-auto mb-6">
            {t('sellerLanding.subtitle')}
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/vender/registro">
              <Button className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full px-7 h-12 text-sm" data-testid="seller-cta-main">
                {t('sellerLanding.ctaMain')} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <a href="#planes">
              <Button variant="outline" className="rounded-full px-7 h-12 text-sm">
                {t('sellerLanding.viewPlans')}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-6 text-center hover:shadow-md transition-all" data-testid={`benefit-${i}`}>
                <b.icon className="w-8 h-8 text-[#2D5A27] mx-auto mb-3" />
                <h3 className="font-semibold text-[#1C1C1C] text-sm mb-2">{b.title}</h3>
                <p className="text-xs text-[#666] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[#1C1C1C] mb-2">{t('sellerLanding.howItWorks')}</h2>
          <p className="text-sm text-[#666] mb-8"><Clock className="w-4 h-4 inline mr-1" />{t('sellerLanding.inMinutes')}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[t('sellerLanding.step1'), t('sellerLanding.step2'), t('sellerLanding.step3'), t('sellerLanding.step4')].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-full bg-[#2D5A27] text-white flex items-center justify-center mx-auto text-lg font-bold mb-2">{i + 1}</div>
                <p className="text-xs text-[#444] font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission table */}
      <section className="py-10 md:py-14">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-6 text-center">{t('sellerLanding.transparentCommissions')}</h2>
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-text-muted font-medium">Plan</th>
                  <th className="px-4 py-3 text-right text-text-muted font-medium">{t('sellerLanding.saleColumn')}</th>
                  <th className="px-4 py-3 text-right text-emerald-600 font-medium">{t('sellerLanding.youKeepColumn')}</th>
                  <th className="px-4 py-3 text-right text-text-muted font-medium">{t('sellerLanding.platformColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {commissionTable.map((r, i) => (
                  <tr key={i} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-medium text-xs">{r.label}</td>
                    <td className="px-4 py-3 text-right">${r.sale}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">${r.seller}</td>
                    <td className="px-4 py-3 text-right text-text-muted">${r.platform}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-stone-50 text-[10px] text-text-muted">
              * {t('sellerLanding.netGMVDisclaimer', 'Commission calculated on NET GMV (after shipping and taxes). PRO plan $54/mo, ELITE plan $108/mo.')}
            </div>
          </div>
        </div>
      </section>

      {/* Tools */}
      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-6 text-center">{t('sellerLanding.toolsIncluded')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tools.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                <CheckCircle className="w-4 h-4 text-[#2D5A27] shrink-0" />
                <span className="text-sm text-[#444]">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Plans Inline */}
      <section className="py-10 md:py-14" id="planes" data-testid="seller-plans">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[#1C1C1C] mb-2 text-center">{t('sellerLanding.choosePlan')}</h2>
          <p className="text-sm text-[#666] text-center mb-8">{t('sellerLanding.choosePlanDesc')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: 'FREE', price: 0, label: 'Free', commission: '20%', features: [t('sellerLanding.publishProducts'), t('sellerLanding.basicDashboard'), t('sellerLanding.emailSupport')], cta: t('sellerLanding.startFree'), color: '' },
              { key: 'PRO', price: 54, label: 'Pro', commission: '18%', recommended: true, features: [t('sellerLanding.allFromFree'), t('sellerLanding.commission18'), t('sellerLanding.advancedAnalytics'), t('sellerLanding.aiPricing'), t('sellerLanding.matchInfluencers'), t('sellerLanding.prioritySupport')], cta: t('sellerLanding.freeTrial'), color: 'border-[#2D5A27] shadow-lg scale-[1.02]' },
              { key: 'ELITE', price: 108, label: 'Elite', commission: '17%', features: [t('sellerLanding.allFromPro'), t('sellerLanding.commission16'), t('sellerLanding.homepagePriority'), t('sellerLanding.aiForecast'), t('sellerLanding.accountManager'), t('sellerLanding.badgeElite')], cta: t('sellerLanding.freeTrial'), color: '' },
            ].map(plan => (
              <div key={plan.key} className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col ${plan.color || 'border-stone-200'}`}>
                {plan.recommended && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2D5A27] text-white text-xs font-semibold px-4 py-1 rounded-full">{t('sellerLanding.recommended')}</div>}
                <h3 className="font-heading text-lg font-semibold">{plan.label}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-1">
                  <span className="text-2xl font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className="text-xs text-[#666]">/{t('sellerLanding.month', 'mo')}</span>}
                </div>
                <p className="text-xs text-[#2D5A27] font-medium mb-3">{t('sellerLanding.commissionLabel', 'Commission')}: {plan.commission}</p>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#444]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#2D5A27] mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/vender/registro">
                  <Button className={`w-full rounded-xl h-10 text-sm ${plan.recommended ? 'bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white' : ''}`} variant={plan.recommended ? 'default' : 'outline'}>
                    {plan.cta} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-[#999] mt-4">{t('sellerLanding.netGMVNote')}</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-16 bg-[#1C1C1C]" data-testid="seller-final-cta">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-3">{t('sellerLanding.readyToSell')}</h2>
          <p className="text-sm text-stone-400 mb-6">{t('sellerLanding.readyDesc')}</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/vender/registro">
              <Button className="bg-[#1C1C1C] hover:bg-[#2A2A2A] text-white rounded-full px-7 h-11 text-sm">
                {t('sellerLanding.createStore')} <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="rounded-full px-7 h-11 text-sm border-stone-600 text-stone-300 hover:bg-stone-800">
                {t('sellerLanding.alreadyHaveAccount')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
