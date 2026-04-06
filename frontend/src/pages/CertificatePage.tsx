import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import { useProductDetail } from '../features/products/hooks/useProductDetail';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { trackEvent } from '../utils/analytics';

import {
  CertHeader,
  CertProductHero,
  CertAllergens,
  CertNutrition,
  CertIngredients,
  CertProducer,
  CertActions,
  CERT_LANGUAGES,
  getTexts,
  normalizeList,
  normalizeIngredientOrigins,
} from '../components/certificate';

/* ══════════════════════════════════════════════════════════════
   CertificatePage — Aesop-style product passport
   Modular redesign using certificate/* components.
   ══════════════════════════════════════════════════════════════ */
export default function CertificatePage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { product, certificate, storeInfo: hookStoreInfo, isLoading } = useProductDetail(productId);

  // ── Language ──
  const browserLang = (navigator.language || 'es').slice(0, 2);
  const autoLang = searchParams.get('auto_lang') === '1';
  const initialLang = searchParams.get('lang')
    || (CERT_LANGUAGES.some(l => l.code === browserLang) ? browserLang : 'es');
  const [certLang, setCertLang] = useState(initialLang);
  const [translatedCert, setTranslatedCert] = useState<any>(null);
  const [translating, setTranslating] = useState(false);

  // ── QR scan context ──
  const isQrScan = searchParams.get('scan') === '1';
  const isRtl = CERT_LANGUAGES.find(l => l.code === certLang)?.rtl || false;
  const txt = getTexts(certLang);

  // ── Translation fetch (with abort on unmount / lang change) ──
  const fetchTranslation = useCallback(async (lang: string, signal: AbortSignal) => {
    if (lang === 'es' || !productId) { setTranslatedCert(null); return; }
    setTranslating(true);
    try {
      const data = await apiClient.get(`/certificates/${productId}/verify?lang=${lang}`, { signal });
      if (!signal.aborted) setTranslatedCert(data);
    } catch {
      if (!signal.aborted) setTranslatedCert(null);
    } finally {
      if (!signal.aborted) setTranslating(false);
    }
  }, [productId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTranslation(certLang, controller.signal);
    return () => controller.abort();
  }, [certLang, fetchTranslation]);

  const handleLangChange = (code: string) => {
    setCertLang(code);
    setSearchParams(prev => { prev.set('lang', code); return prev; }, { replace: true });
  };

  // ── Resolved data ──
  const tc = translatedCert || {};
  const storeInfo = tc.store_info || hookStoreInfo || {};
  const productImage = product?.images?.[0] || product?.image_url || tc.product_image || null;
  const nutrition = tc.nutritional_info || certificate?.data?.nutritional_info || certificate?.data?.nutrition_info || product?.nutritional_info || product?.nutrition_info || null;
  const ingredients = useMemo(() => normalizeList(tc.ingredients || certificate?.data?.ingredients || product?.ingredients), [tc.ingredients, certificate?.data?.ingredients, product?.ingredients]);
  const allergens = useMemo(() => normalizeList(tc.allergens || certificate?.data?.allergens || product?.allergens), [tc.allergens, certificate?.data?.allergens, product?.allergens]);
  const ingredientOrigins = useMemo(() => normalizeIngredientOrigins(certificate?.data?.ingredient_origins), [certificate?.data?.ingredient_origins]);
  const certifications = tc.certifications || (Array.isArray(product?.certifications) ? product.certifications : normalizeList(product?.certifications || certificate?.certificate_type));
  const displayName = tc.product_name || product?.name || '';
  const storeSlug = storeInfo?.slug || storeInfo?.store_slug || null;
  const scanCount = tc.scan_count || certificate?.scan_count || 0;
  const certNumber = tc.certificate_number || certificate?.certificate_number || certificate?.certificate_id || '';
  const issueDate = tc.issue_date || certificate?.issue_date || certificate?.created_at || '';
  const certId = certificate?.certificate_id || productId || '';
  const certUrl = `${window.location.origin}/certificate/${productId}`;
  const hasQrCode = Boolean(certificate?.qr_code);
  const qrSrc = hasQrCode ? `data:image/png;base64,${certificate.qr_code}` : '';

  // ── Owner / admin check for QR+PDF download ──
  const certOwnerId = certificate?.seller_id || certificate?.producer_id;
  const isOwnerOrAdmin = Boolean(
    user && (
      (certOwnerId && certOwnerId === user.user_id) ||
      user.role === 'admin' || user.role === 'superadmin'
    )
  );

  // Track certificate view once
  useEffect(() => {
    if (product?.product_id) {
      trackEvent('certificate_viewed', {
        product_id: product.product_id,
        language: certLang,
        is_qr_scan: isQrScan,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.product_id]);

  const handleBuy = () => {
    trackEvent('certificate_buy_clicked', { product_id: productId, language: certLang });
    if (storeSlug) navigate(`/store/${storeSlug}?product=${productId}`);
    else navigate(`/products/${productId}`);
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="mx-auto max-w-[600px] px-4 py-12">
          <div className="rounded-[32px] border border-stone-100 bg-white p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-stone-100" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-1/2 animate-pulse rounded-full bg-stone-100" />
                <div className="h-3.5 w-1/4 animate-pulse rounded-full bg-stone-100" />
              </div>
            </div>
            <div className="h-48 w-full animate-pulse rounded-2xl bg-stone-50" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (!certificate || !product) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="mx-auto max-w-[600px] px-4 py-16 text-center">
          <div className="rounded-[32px] border border-stone-100 bg-white p-10 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
              <FileCheck className="h-6 w-6 text-stone-500" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-stone-950">
              {t('certificate.noHemosEncontradoLaFichaDeConfianz', 'Certificado no encontrado')}
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              {t('certificate.noHemosEncontradoLaFichaDeConfianz', 'No hemos encontrado la ficha de confianza de este producto.')}
            </p>
            <Link to="/certificates" className="mt-6 inline-flex">
              <button type="button" className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-800">
                {txt.more_certs}
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ──
  return (
    <div className="min-h-screen bg-stone-50" data-testid="certificate-page">
      <SEO
        title={`${displayName} — ${txt.cert_title} | Hispaloshop`}
        description={`${txt.product}: ${displayName}. ${txt.verify}.`}
        lang={certLang}
      />

      <div className={`mx-auto max-w-[600px] px-4 ${isQrScan ? 'pt-6' : 'py-8 sm:px-6'} pb-8`}>
        {!isQrScan && <BackButton />}

        {/* ═══ PASSPORT CARD ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`${isQrScan ? '' : 'mt-5'} overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <CertHeader
            certLang={certLang}
            translating={translating}
            onLangChange={handleLangChange}
          />

          <CertProductHero
            txt={txt}
            certLang={certLang}
            productImage={productImage}
            productName={displayName}
            description={product.short_description || product.description || ''}
            countryOrigin={product.country_origin || ''}
            producerName={storeInfo?.name || product.producer_name || ''}
            certifications={certifications}
            certNumber={certNumber}
            issueDate={issueDate}
            scanCount={scanCount}
          />
        </motion.div>

        {/* ═══ Sections with staggered entrance ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <CertAllergens
            txt={txt}
            allergens={allergens}
            certifications={certifications}
          />

          <CertNutrition
            txt={txt}
            nutrition={nutrition}
          />

          <CertIngredients
            txt={txt}
            ingredients={ingredients}
            allergens={allergens}
            ingredientOrigins={ingredientOrigins}
          />

          <CertProducer
            txt={txt}
            storeInfo={storeInfo}
            producerName={product.producer_name || ''}
            countryOrigin={product.country_origin || ''}
            onGoToStore={storeSlug ? handleBuy : undefined}
          />

          <CertActions
            txt={txt}
            productId={productId || ''}
            certId={certId}
            certUrl={certUrl}
            productName={displayName}
            hasQrCode={hasQrCode}
            qrSrc={qrSrc}
            isOwnerOrAdmin={isOwnerOrAdmin}
            onBuy={handleBuy}
          />
        </motion.div>
      </div>
    </div>
  );
}
