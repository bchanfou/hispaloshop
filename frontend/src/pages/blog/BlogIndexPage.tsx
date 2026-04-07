// @ts-nocheck
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getAllArticles, getFeaturedArticle } from '../../data/blogArticles';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

export default function BlogIndexPage() {
  const { t } = useTranslation();
  const articles = getAllArticles();
  const featured = getFeaturedArticle();
  const rest = articles.filter(a => a.slug !== featured?.slug);

  React.useEffect(() => {
    trackEvent('blog_article_viewed', { slug: 'index' });
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO title="Historias de HispaloShop" description="Lo que hacemos y por qué. Guías, comisiones, features y la historia detrás de la plataforma." />

      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full text-stone-950 no-underline">
          <ArrowLeft size={20} />
        </Link>
        <span className="text-[15px] font-semibold text-stone-950">{t('blog.title', 'Historias de HispaloShop')}</span>
      </div>

      <div className="mx-auto max-w-[900px] px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-stone-950">{t('blog.title', 'Historias de HispaloShop')}</h1>
        <p className="mb-8 text-[15px] text-stone-500">{t('blog.subtitle', 'Lo que hacemos y por qué')}</p>

        {/* Featured article */}
        {featured && (
          <Link to={`/blog/${featured.slug}`} className="mb-8 block rounded-2xl border border-stone-200 bg-white p-6 no-underline transition-colors hover:border-stone-300">
            <span className="mb-2 inline-block rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500">{featured.category}</span>
            <h2 className="mb-1.5 text-xl font-bold text-stone-950">{featured.title}</h2>
            <p className="mb-3 text-[14px] leading-relaxed text-stone-500">{featured.subtitle}</p>
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-stone-950">
              {t('blog.read', 'Leer')} <ChevronRight size={14} />
            </span>
          </Link>
        )}

        {/* Article grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map(article => (
            <Link
              key={article.slug}
              to={`/blog/${article.slug}`}
              className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 no-underline transition-colors hover:border-stone-300"
            >
              <span className="mb-2 inline-block self-start rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-medium text-stone-500">{article.category}</span>
              <h3 className="mb-1.5 text-[15px] font-semibold leading-snug text-stone-950">{article.title}</h3>
              <p className="mb-3 flex-1 text-[13px] leading-relaxed text-stone-400">{article.subtitle}</p>
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-stone-700">
                {t('blog.read', 'Leer')} <ChevronRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
