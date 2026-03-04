import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Sparkles, DollarSign, Users, TrendingUp, Award, Shield, Crown, CheckCircle, Share2 } from 'lucide-react';
import BackButton from '../components/BackButton';

function EarningsCalculator() {
  const { t } = useTranslation();
  const [gmv, setGmv] = useState(5000);
  const tierRate = 0.03; // Hercules tier
  const commission = Math.round(gmv * tierRate);
  
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="earnings-calculator">
      <h3 className="font-heading text-lg font-semibold text-[#1C1C1C] mb-4 text-center">{t('influencerLanding.calculator')}</h3>
      <div className="mb-5">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-text-muted">{t('influencerLanding.monthlyGMV')}</span>
          <span className="font-semibold">{gmv.toLocaleString()}$</span>
        </div>
        <input type="range" min="500" max="50000" step="500" value={gmv} onChange={e => setGmv(+e.target.value)} className="w-full accent-amber-600" />
        <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>500$</span><span>50,000$</span></div>
      </div>

      <div className="bg-amber-50 rounded-xl p-5 text-center">
        <p className="text-xs text-amber-700 mb-2">{t('influencerLanding.yourCommission')}</p>
        <p className="text-4xl font-bold text-amber-700">{commission.toLocaleString()}$</p>
        <p className="text-[10px] text-amber-600 mt-2">{t('influencerLanding.gmvNote')}</p>
      </div>
    </div>
  );
}

export default function InfluencerLandingPage() {
  const { t } = useTranslation();

  const tiers = [
    { key: 'PERSEO', icon: Award, label: 'Perseo', rate: '3%', desc: t('influencerLanding.tier1Desc', 'Entry level for new influencers'), color: 'text-stone-500 bg-stone-50 border-stone-200', reqs: t('influencerLanding.tier1Reqs', '0-499 EUR GMV') },
    { key: 'AQUILES', icon: Shield, label: 'Aquiles', rate: '4%', desc: t('influencerLanding.tier2Desc', 'Early growth milestone'), color: 'text-[#2D5A27] bg-emerald-50 border-emerald-200', reqs: t('influencerLanding.tier2Reqs', '500+ EUR GMV') },
    { key: 'HERCULES', icon: Sparkles, label: 'Hercules', rate: '5%', desc: t('influencerLanding.tier3Desc', 'Consistent performer'), color: 'text-blue-600 bg-blue-50 border-blue-200', reqs: t('influencerLanding.tier3Reqs', '2,000+ EUR GMV') },
    { key: 'APOLO', icon: TrendingUp, label: 'Apolo', rate: '6%', desc: t('influencerLanding.tier4Desc', 'Advanced partner'), color: 'text-amber-700 bg-amber-50 border-amber-200', reqs: t('influencerLanding.tier4Reqs', '7,500+ EUR GMV') },
    { key: 'ZEUS', icon: Crown, label: 'Zeus', rate: '7%', desc: t('influencerLanding.tier5Desc', 'Elite tier'), color: 'text-purple-700 bg-purple-50 border-purple-200', reqs: t('influencerLanding.tier5Reqs', '20,000+ EUR GMV') },
  ];
  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <SEO 
        title="Hispaloshop Influencer Program — Earn 3-7% Commission" 
        description="Join the influencer program. Earn 3-7% on every sale. 18-month attribution. Payouts every 15 days. Min $50."
        url="https://www.hispaloshop.com/influencers"
      />
      <Header />
      <div className="max-w-3xl mx-auto px-4 pt-2"><BackButton /></div>

      {/* Hero */}
      <section className="pt-10 pb-8 md:pt-16 md:pb-12" data-testid="influencer-hero">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">{t('influencerLanding.tagline')}</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1C1C1C] mb-4 leading-tight">
            {t('influencerLanding.title')}
          </h1>
          <p className="text-base text-[#555] max-w-xl mx-auto mb-6">
            {t('influencerLanding.subtitle')}
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link to="/influencers/registro">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-full px-7 h-12 text-sm" data-testid="influencer-cta-main">
                <Sparkles className="w-4 h-4 mr-1.5" /> {t('influencerLanding.ctaMain')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-8">{t('influencerLanding.howItWorks')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: t('influencerLanding.step1'), desc: t('influencerLanding.step1Desc') },
              { icon: Share2, label: t('influencerLanding.step2'), desc: t('influencerLanding.step2Desc') },
              { icon: Sparkles, label: t('influencerLanding.step3'), desc: t('influencerLanding.step3Desc') },
              { icon: DollarSign, label: t('influencerLanding.step4'), desc: t('influencerLanding.step4Desc') },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-2">
                  <s.icon className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-sm font-semibold text-[#1C1C1C]">{s.label}</p>
                <p className="text-xs text-[#666] mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator + Tiers */}
      <section className="py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EarningsCalculator />
            <div>
              <h3 className="font-heading text-lg font-semibold text-[#1C1C1C] mb-4">{t('influencerLanding.tierSystem')}</h3>
              <div className="space-y-3">
                {tiers.map(t => (
                  <div key={t.key} className={`rounded-xl border p-4 ${t.color}`} data-testid={`tier-${t.key}`}>
                    <div className="flex items-center gap-3 mb-1">
                      <t.icon className="w-5 h-5" />
                      <span className="font-heading text-lg font-semibold">{t.label}</span>
                      <span className="ml-auto text-lg font-bold">{t.rate}</span>
                    </div>
                    <p className="text-xs opacity-80">{t.desc}</p>
                    <p className="text-[10px] opacity-60 mt-1">{t.reqs}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-10 md:py-14 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-6 text-center">{t('influencerLanding.whatsIncluded')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              t('influencerLanding.benefit1'),
              t('influencerLanding.benefit2'),
              t('influencerLanding.benefit3'),
              t('influencerLanding.benefit4'),
              t('influencerLanding.benefit5'),
              t('influencerLanding.benefit6'),
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-xl">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-sm text-[#444]">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 md:py-14">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-heading text-2xl font-semibold text-[#1C1C1C] mb-6 text-center">{t('influencerLanding.faq')}</h2>
          {[
            { q: t('influencerLanding.faq1q'), a: t('influencerLanding.faq1a') },
            { q: t('influencerLanding.faq2q'), a: t('influencerLanding.faq2a') },
            { q: t('influencerLanding.faq3q'), a: t('influencerLanding.faq3a') },
            { q: t('influencerLanding.faq4q'), a: t('influencerLanding.faq4a') },
          ].map((faq, i) => (
            <div key={i} className="border-b border-stone-200 py-4">
              <p className="text-sm font-semibold text-[#1C1C1C] mb-1">{faq.q}</p>
              <p className="text-xs text-[#666]">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-16 bg-[#1C1C1C]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white mb-3">{t('influencerLanding.haveFollowers')}</h2>
          <p className="text-sm text-stone-400 mb-6">{t('influencerLanding.requirements')}</p>
          <Link to="/influencers/registro">
            <Button className="bg-amber-600 hover:bg-amber-500 text-white rounded-full px-7 h-11 text-sm">
              <Sparkles className="w-4 h-4 mr-1.5" /> {t('influencerLanding.apply')} <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
