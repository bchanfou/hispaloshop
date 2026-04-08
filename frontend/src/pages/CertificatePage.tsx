import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Package, Store, MapPin, ShieldCheck, AlertTriangle, 
  ShoppingCart, ExternalLink, Globe, ChefHat
} from 'lucide-react';
import { motion } from 'framer-motion';
import apiClient from '../services/api/client';
import Button from '../components/ui/button';

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

    // Track scan
    apiClient.post(`/certificates/${productId}/track`, {});

    // Fetch certificate data
    loadCertificate();
  }, [productId]);

  const loadCertificate = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/certificates/${productId}`);
      setData(response);
      
      // Update i18n if language different
      if (response.translation?.target_lang && 
          response.translation.target_lang !== i18n.language) {
        i18n.changeLanguage(response.translation.target_lang);
      }
    } catch (err) {
      setError(t('certificate.notFound', 'Producto no encontrado'));
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
  const mainImage = product.images?.[0];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-950 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="font-semibold text-stone-900">HispaloShop</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Globe className="w-4 h-4" />
            <span>{translation.target_lang.toUpperCase()}</span>
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
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
                  {product.origin_country}
                </div>
              )}
            </div>
          )}

          {/* Product Info */}
          <div className="p-5">
            <h1 className="text-2xl font-bold text-stone-900 mb-2">
              {product.name}
            </h1>

            {product.price && (
              <p className="text-xl font-semibold text-stone-700 mb-4">
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
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2">
                  {t('certificate.about', 'Sobre este producto')}
                </h2>
                <p className="text-stone-700 leading-relaxed text-sm">
                  {product.description}
                </p>
              </div>
            )}

            {/* Ingredients */}
            {product.ingredients && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <ChefHat className="w-4 h-4" />
                  {t('certificate.ingredients', 'Ingredientes')}
                </h2>
                <p className="text-stone-700 text-sm">{product.ingredients}</p>
              </div>
            )}

            {/* Allergens */}
            {product.allergens && (
              <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('certificate.allergens', 'Alérgenos')}
                </h2>
                <p className="text-amber-900 text-sm">{product.allergens}</p>
              </div>
            )}

            {/* Certifications */}
            {product.certifications?.length > 0 && (
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {t('certificate.certifications', 'Certificaciones')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {product.certifications.map((cert, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-sm"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="space-y-3 pt-4 border-t border-stone-200">
              <Button 
                to={`/products/${productId}`}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {t('certificate.buyOnline', 'Comprar online')}
              </Button>
              
              {store && (
                <Button 
                  to={`/store/${store.slug}`}
                  variant="outline"
                  className="w-full"
                >
                  {t('certificate.viewStore', 'Ver tienda')}
                </Button>
              )}
            </div>

            {/* Translation Notice */}
            {translation.was_translated && (
              <p className="text-xs text-stone-400 text-center mt-4">
                {t('certificate.translated', 'Traducido automáticamente del {{source}}', { source: translation.source_lang.toUpperCase() })}
              </p>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-stone-500">
          <p>© 2026 HispaloShop</p>
          <p className="mt-1">{t('certificate.footer', 'Productos reales, gente real')}</p>
        </footer>
      </main>
    </div>
  );
}
