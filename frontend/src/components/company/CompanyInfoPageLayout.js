import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import BackButton from '../BackButton';
import SEO from '../SEO';

export default function CompanyInfoPageLayout({
  title,
  description,
  url,
  eyebrow,
  intro,
  sections,
  primaryCta,
  secondaryCta,
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <SEO title={title} description={description} url={url} />
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <BackButton />
        <section className="mt-3 rounded-[28px] border border-stone-200 bg-white p-6 md:p-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">{eyebrow}</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-stone-950">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm md:text-base leading-7 text-stone-600">
            {intro}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {primaryCta ? (
              <Link to={primaryCta.to}>
                <button className="h-11 rounded-full bg-stone-950 hover:bg-stone-800 px-6 text-white transition-colors inline-flex items-center">
                  {primaryCta.label}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </Link>
            ) : null}
            {secondaryCta ? (
              <Link to={secondaryCta.to}>
                <button className="h-11 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 px-6 transition-colors">
                  {secondaryCta.label}
                </button>
              </Link>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <article
              key={section.title}
              className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-stone-950">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">{section.body}</p>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
