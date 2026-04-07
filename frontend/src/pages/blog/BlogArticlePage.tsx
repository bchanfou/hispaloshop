// @ts-nocheck
import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getArticleBySlug } from '../../data/blogArticles';
import SEO from '../../components/SEO';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

function renderBody(body: string) {
  // Simple markdown-light: ## headings + paragraphs
  return body.split('\n\n').map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('## ')) {
      return <h2 key={i} className="mb-3 mt-8 text-lg font-bold text-stone-950">{trimmed.slice(3)}</h2>;
    }
    return <p key={i} className="mb-4 text-[15px] leading-[1.7] text-stone-700">{trimmed}</p>;
  });
}

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const article = getArticleBySlug(slug || '');

  useEffect(() => {
    if (slug) trackEvent('blog_article_viewed', { slug });
  }, [slug]);

  if (!article) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4">
        <p className="mb-4 text-lg font-semibold text-stone-950">{t('blog.not_found', 'Artículo no encontrado')}</p>
        <Link to="/blog" className="text-[14px] font-medium text-stone-500 no-underline hover:text-stone-950">
          {t('blog.back_to_blog', 'Volver al blog')}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title={`${article.title} — HispaloShop`}
        description={article.description}
        structuredData={[{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.description,
          datePublished: article.publishedAt,
          publisher: { '@type': 'Organization', name: 'HispaloShop' },
        }]}
      />

      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <button onClick={() => navigate('/blog')} className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent border-none cursor-pointer text-stone-950">
          <ArrowLeft size={20} />
        </button>
        <span className="truncate text-[15px] font-semibold text-stone-950">{article.title}</span>
      </div>

      {/* Content */}
      <article className="mx-auto max-w-[700px] px-4 py-8">
        <span className="mb-3 inline-block rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium text-stone-500">{article.category}</span>
        <h1 className="mb-2 text-2xl font-bold leading-tight text-stone-950 lg:text-3xl">{article.title}</h1>
        <p className="mb-8 text-[16px] leading-relaxed text-stone-500">{article.subtitle}</p>

        <div className="prose-hispalo">
          {renderBody(article.body)}
        </div>

        {/* CTA */}
        {article.ctaText && article.ctaTo && (
          <div className="mt-12 rounded-2xl bg-stone-950 p-8 text-center">
            <p className="mb-4 text-lg font-semibold text-white">{article.ctaText}</p>
            <Link
              to={article.ctaTo}
              onClick={() => trackEvent('landing_cta_clicked', { page: `blog/${slug}`, cta: article.ctaTo })}
              className="inline-block rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-stone-950 no-underline transition-colors hover:bg-stone-100"
            >
              {article.ctaText}
            </Link>
          </div>
        )}

        {/* Back to blog */}
        <div className="mt-8 text-center">
          <Link to="/blog" className="text-[13px] font-medium text-stone-400 no-underline hover:text-stone-950">
            ← {t('blog.back_to_blog', 'Volver al blog')}
          </Link>
        </div>
      </article>
    </div>
  );
}
