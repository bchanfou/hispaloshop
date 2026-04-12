// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package, Store, MapPin, BadgeCheck, AlertTriangle,
  ShoppingCart, ExternalLink, Globe, ChefHat, X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';

// B12 (4.5d): rebuilt CertificatePage — native Link CTAs (the old <Button to=...>
// silently no-op'd because Button is not a router link), stone palette
// throughout (amber alert replaced), defensive price handling (0 is not null),
// BadgeCheck for certifications, explicit close button in header.

interface CertificateData {
  product_id: string;
  product: {
    name: string;
    description?: string;
    images: string[];
    price?: number;
    currency: string;
    unit?: string;
    ingredients?: string;
    allergens?: string;
    nutrition?: Record<string, any>;
    certifications: string[];
    origin_country?: string;
  };
  store?: {
    name: string;
    slug: string;
    logo?: string;
    location?: string;
  };
  translation: {
    target_lang: string;
    source_lang: string;
    was_translated: boolean;
  };
}

export default function CertificatePage() {
  const { productId } = useParams<{ productId: string }>();
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;
    loadCertificate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      setError('');
      const response: any = await apiClient.get(`/certificates/product/${productId}`);
      // Post-4.3b endpoint may wrap response as { success, data } or return flat —
      // accept both shapes.
      const payload = response?.data?.product ? response.data : response;
      setData(payload);

      // Update i18n if language different
      const target = payload?.translation?.target_lang;
      if (target && target !== i18n.language) {
        i18n.changeLanguage(target);
      }
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      if (status === 404) {
        setError(t('certificate.notFound', 'Producto no encontrado'));
      } else {
        setError(t('certificate.error', 'Error cargando certificado'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-950" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <Package className="w-16 h-16 text-stone-300 mb-4" />
        <h1 className="text-xl font-semibold text-stone-800 mb-2">
          {error || t('certificate.error', 'Error cargando certificado')}
        </h1>
        <Link to="/" className="text-stone-600 hover:text-stone-900 underline">
          {t('certificate.goHome', 'Volver al inicio')}
        </Link>
      </div>
    );
  }

  const { product, store, translation } = data;
  const mainImage = product?.images?.[0];
  const hasPrice = typeof product?.price === 'number' && !Number.isNaN(product.price);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="HispaloShop home">
            <div className="w-8 h-8 bg-stone-950 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-semibold text-stone-900">HispaloShop</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-stone-500">
              <Globe className="w-4 h-4" />
              <span className="uppercase">{translation?.target_lang || 'ES'}</span>
            </div>
            <Link
              to="/"
              aria-label={t('common.close', 'Cerrar')}
              className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
            >
              <X className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden"
        >
          {/* Product Image */}
          {mainImage && (
            <div className="aspect-square bg-stone-100 relative">
              <img
                src={mainImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.origin_country && (
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium text-stone-900 shadow-sm">
                  {product.origin_country}
                </div>
              )}
            </div>
          )}

          {/* Product Info */}
          <div className="p-5">
            <h1 className="text-2xl font-bold text-stone-950 mb-2">
              {product.name}
            </h1>

            {hasPrice && (
              <p className="text-xl font-semibold text-stone-800 mb-4">
                {product.price} {product.currency}
                {product.unit && <span className="text-sm text-stone-500"> / {product.unit}</span>}
              </p>
            )}

            {/* Store Info */}
            {store && (
              <Link
                to={`/store/${store.slug}`}
                className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl mb-4 hover:bg-stone-100 transition-colors"
              >
                {store.logo ? (
                  <img src={store.logo} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-stone-200 rounded-full flex items-center justify-center">
                    <Store className="w-5 h-5 text-stone-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-900 truncate">{store.name}</p>
                  {store.location && (
                    <p className="text-sm text-stone-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {store.location}
                    </p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-stone-400" />
              </Link>
            )}

            {/* Description */}
            {product.description && (
              <div className="mb-5">
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  {t('certificate.about', 'Sobre este producto')}
                </h2>
                <p className="text-stone-700 leading-relaxed text-sm whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Ingredients */}
            {product.ingredients && (
              <div className="mb-5">
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <ChefHat className="w-4 h-4" />
                  {t('certificate.ingredients', 'Ingredientes')}
                </h2>
                <p className="text-stone-700 text-sm">{product.ingredients}</p>
              </div>
            )}

            {/* Allergens — stone palette (no amber) */}
            {product.allergens && (
              <div className="mb-5 p-4 bg-stone-100 border border-stone-200 rounded-xl">
                <h2 className="text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('certificate.allergens', 'Alérgenos')}
                </h2>
                <p className="text-stone-800 text-sm">{product.allergens}</p>
              </div>
            )}

            {/* Certifications */}
            {product.certifications && product.certifications.length > 0 && (
              <div className="mb-5">
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4" />
                  {t('certificate.certifications', 'Certificaciones')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {product.certifications.map((cert, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-800 rounded-full text-sm"
                    >
                      <BadgeCheck className="w-3.5 h-3.5" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs — native Link, stone palette */}
            <div className="space-y-3 pt-4 border-t border-stone-200">
              <Link
                to={`/products/${productId}`}
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-stone-950 text-white font-semibold text-sm hover:bg-stone-800 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                {t('certificate.buyOnline', 'Comprar online')}
              </Link>

              {store && (
                <Link
                  to={`/store/${store.slug}`}
                  className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full border border-stone-300 text-stone-900 font-semibold text-sm hover:bg-stone-100 transition-colors"
                >
                  {t('certificate.viewStore', 'Ver tienda')}
                </Link>
              )}
            </div>

            {/* Translation Notice */}
            {translation?.was_translated && (
              <p className="text-xs text-stone-400 text-center mt-4">
                {t('certificate.translated', 'Traducido automáticamente del {{source}}', {
                  source: (translation.source_lang || '').toUpperCase(),
                })}
              </p>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-stone-500">
          <p>© {new Date().getFullYear()} HispaloShop</p>
          <p className="mt-1">{t('certificate.footer', 'Productos reales, gente real')}</p>
        </footer>
      </main>
    </div>
  );
}
