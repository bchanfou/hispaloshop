import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO component — dynamic meta tags, Open Graph, Twitter Cards, Structured Data.
 * Use on every page for proper indexing.
 */
export default function SEO({
  title = 'Hispaloshop',
  description = 'Marketplace global de productos alimentarios certificados. Compra directo de productores locales.',
  url,
  image = 'https://res.cloudinary.com/descv3he4/image/upload/v1/hispaloshop/og-default.jpg',
  type = 'website',
  product = null,
  noindex = false,
  lang = 'es',
  structuredData = [],
}) {
  const fullTitle = title.includes('Hispaloshop') ? title : `${title} | Hispaloshop`;
  const canonical = url || (typeof window !== 'undefined' ? window.location.href : 'https://www.hispaloshop.com');
  const extraStructuredData = Array.isArray(structuredData) ? structuredData : [structuredData];

  return (
    <Helmet>
      <html lang={lang} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />

      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Hreflang */}
      <link rel="alternate" hrefLang="es" href={canonical.replace(/\/(en|ko)\//, '/es/')} />
      <link rel="alternate" hrefLang="en" href={canonical.replace(/\/(es|ko)\//, '/en/')} />
      <link rel="alternate" hrefLang="ko" href={canonical.replace(/\/(es|en)\//, '/ko/')} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Hispaloshop" />
      <meta property="og:locale" content={lang === 'ko' ? 'ko_KR' : lang === 'en' ? 'en_US' : 'es_ES'} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data — Organization */}
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Hispaloshop",
        "url": "https://www.hispaloshop.com",
        "logo": "https://www.hispaloshop.com/brand/logo-icon.png",
        "sameAs": ["https://instagram.com/hispaloshop"],
        "description": "Marketplace global de productos alimentarios certificados"
      })}</script>

      {/* Structured Data — Product (if provided) */}
      {product && (
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "description": product.description,
          "image": product.images?.[0],
          "sku": product.product_id,
          "brand": { "@type": "Brand", "name": product.producer_name },
          "offers": {
            "@type": "Offer",
            "url": canonical,
            "priceCurrency": product.currency || "EUR",
            "price": product.price,
            "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": { "@type": "Organization", "name": product.producer_name }
          },
          ...(product.avg_rating && {
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": product.avg_rating,
              "bestRating": 10,
              "reviewCount": product.review_count || 1
            }
          })
        })}</script>
      )}

      {/* Structured Data — BreadcrumbList */}
      {product && (
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.hispaloshop.com" },
            { "@type": "ListItem", "position": 2, "name": "Products", "item": "https://www.hispaloshop.com/products" },
            { "@type": "ListItem", "position": 3, "name": product.name }
          ]
        })}</script>
      )}

      {extraStructuredData.map((item, index) => (
        item ? <script key={index} type="application/ld+json">{JSON.stringify(item)}</script> : null
      ))}
    </Helmet>
  );
}
