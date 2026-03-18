import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Award, ChevronDown, ChevronRight, Copy, FileCheck, Globe, MapPin, Share2, Shield, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { useProductDetail } from '../features/products/hooks/useProductDetail';
import apiClient from '../services/api/client';

const CERT_LANGUAGES = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/,|\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeIngredientOrigins(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') {
    return Object.entries(value).map(([ingredient, origin]) => ({ ingredient, origin }));
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [ingredient, origin] = line.split(':');
        return { ingredient: ingredient?.trim(), origin: origin?.trim() };
      })
      .filter((item) => item.ingredient && item.origin);
  }
  return [];
}

export default function CertificatePage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { product, certificate, storeInfo, isLoading } = useProductDetail(productId);

  // Language state — detect from URL param, browser, or default to 'es'
  const initialLang = searchParams.get('lang') || navigator.language?.slice(0, 2) || 'es';
  const [certLang, setCertLang] = useState(
    CERT_LANGUAGES.some((l) => l.code === initialLang) ? initialLang : 'es'
  );
  const [translatedCert, setTranslatedCert] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const isRtl = CERT_LANGUAGES.find((l) => l.code === certLang)?.rtl || false;

  // Fetch translated certificate when language changes
  const fetchTranslation = useCallback(async (lang) => {
    if (lang === 'es' || !productId) {
      setTranslatedCert(null);
      return;
    }
    setTranslating(true);
    try {
      const data = await apiClient.get(`/certificates/${productId}/verify?lang=${lang}`);
      setTranslatedCert(data);
    } catch {
      setTranslatedCert(null);
    } finally {
      setTranslating(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchTranslation(certLang);
  }, [certLang, fetchTranslation]);

  const handleLangChange = (code) => {
    setCertLang(code);
    setLangOpen(false);
    setSearchParams((prev) => { prev.set('lang', code); return prev; }, { replace: true });
  };

  // Use translated data when available, fall back to original
  const tc = translatedCert || {};
  const uiLabels = tc.ui_labels || {};

  const productImage = product?.images?.[0] || product?.image_url || null;
  const nutrition = tc.nutritional_info || certificate?.data?.nutritional_info || certificate?.data?.nutrition_info || null;
  const ingredients = useMemo(
    () => normalizeList(tc.ingredients || product?.ingredients),
    [tc.ingredients, product?.ingredients]
  );
  const allergens = useMemo(
    () => normalizeList(tc.allergens || product?.allergens || certificate?.data?.allergens),
    [tc.allergens, certificate?.data?.allergens, product?.allergens]
  );
  const ingredientOrigins = useMemo(
    () => normalizeIngredientOrigins(certificate?.data?.ingredient_origins),
    [certificate?.data?.ingredient_origins]
  );
  const certifications = tc.certifications
    || (Array.isArray(product?.certifications)
      ? product.certifications
      : normalizeList(product?.certifications || certificate?.certificate_type));
  const displayName = tc.product_name || product?.name || '';
  const storeSlug = storeInfo?.slug || storeInfo?.store_slug || null;
  const canBuyFromStore = Boolean(storeSlug);

  const handleBuy = () => {
    if (!canBuyFromStore) {
      navigate(`/products/${productId}`);
      return;
    }
    navigate(`/store/${storeSlug}?product=${productId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="flex items-center justify-center py-24" data-testid="certificate-loading">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-stone-950" />
            <p className="text-sm text-stone-500">Cargando certificado...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!certificate || !product) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center" data-testid="certificate-not-found">
          <div className="rounded-[32px] border border-stone-100 bg-white p-10 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
              <FileCheck className="h-6 w-6 text-stone-500" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-stone-950">Certificado no encontrado</h1>
            <p className="mt-2 text-sm text-stone-500">
              No hemos encontrado la ficha de confianza de este producto.
            </p>
            <Link to="/certificates" className="mt-6 inline-flex">
              <button
                type="button"
                className="rounded-full bg-stone-950 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-stone-800"
              >
                Volver a certificados
              </button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50" data-testid="certificate-page">
      <Header />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <BackButton />
        <Breadcrumbs />

        {/* ── Passport card ── */}
        <div className={`mt-5 overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm${isRtl ? ' dir-rtl' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          {/* Dark header band */}
          <div className="flex items-center justify-between bg-stone-950 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-stone-400" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                {uiLabels.certificate_title || 'Certificado digital'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Language selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center gap-1.5 rounded-full bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-300 hover:bg-stone-700 transition-colors"
                >
                  <Globe className="h-3 w-3" />
                  {CERT_LANGUAGES.find((l) => l.code === certLang)?.flag}
                  <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-stone-200 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
                      {CERT_LANGUAGES.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => handleLangChange(l.code)}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                            certLang === l.code
                              ? 'bg-stone-100 font-semibold text-stone-950'
                              : 'text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <span className="text-base">{l.flag}</span>
                          <span>{l.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {translating && (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-500 border-t-white" />
              )}
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2} />
                <span className="text-xs font-semibold text-white">
                  {uiLabels.status_active || 'Verificado'}
                </span>
              </div>
            </div>
          </div>

          {/* Product identity — image + info */}
          <div className="flex flex-col sm:flex-row">
            {/* Image panel */}
            <div className="flex flex-none items-center justify-center border-b border-stone-100 bg-stone-50 p-8 sm:w-52 sm:border-b-0 sm:border-r">
              {productImage ? (
                <img
                  src={productImage}
                  alt={product.name}
                  loading="lazy"
                  className="max-h-44 w-full object-contain"
                  data-testid="certificate-product-image"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-stone-100">
                  <Package className="h-10 w-10 text-stone-400" />
                </div>
              )}
            </div>

            {/* Info panel */}
            <div className="flex-1 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                {uiLabels.product || 'Producto certificado'}
              </p>
              <h1
                className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-950"
                data-testid="certificate-title"
              >
                {displayName}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {product.short_description ||
                  product.description ||
                  'Ficha de confianza y trazabilidad del producto.'}
              </p>

              {/* Meta pills */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                  <MapPin className="h-3 w-3" />
                  {product.country_origin || 'Origen no especificado'}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                  <Package className="h-3 w-3" />
                  {storeInfo?.name || product.producer_name || 'Hispaloshop'}
                </span>
              </div>

              {/* Certification badges */}
              {certifications.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {certifications.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700"
                    >
                      <Award className="h-3 w-3" />
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Nutrition label — styled like official EU label ── */}
        {nutrition && typeof nutrition === 'object' && Object.keys(nutrition).length > 0 && (
          <div className="mt-5 overflow-hidden rounded-[28px] border-2 border-stone-950 bg-white">
            <div className="border-b-[3px] border-stone-950 bg-white px-5 pt-4 pb-3">
              <h2 className="text-xl font-black uppercase tracking-tight text-stone-950">
                {uiLabels.nutrition || 'Información nutricional'}
              </h2>
              <p className="text-xs text-stone-500">{uiLabels.per_100g || 'Valores medios por 100 g / 100 ml'}</p>
            </div>
            {/* Header row */}
            <div className="flex items-center justify-between border-b border-stone-950 bg-stone-950 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-stone-300">
              <span>Nutriente</span>
              <span>Por 100 g</span>
            </div>
            <div className="divide-y divide-stone-100">
              {Object.entries(nutrition).map(([key, value], i) => (
                <div
                  key={key}
                  className={`flex items-center justify-between px-5 py-2.5 text-sm ${
                    i === 0 ? 'font-bold text-stone-950' : 'text-stone-700'
                  }`}
                >
                  <span className="capitalize">{String(key).replace(/_/g, ' ')}</span>
                  <span className={i === 0 ? 'font-black text-stone-950' : 'font-semibold text-stone-950'}>
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Ingredients + Allergens ── */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Ingredients */}
          <div className="rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              {uiLabels.ingredients || 'Ingredientes'}
            </h2>
            {ingredients.length > 0 ? (
              <p className="text-sm leading-relaxed text-stone-700">{ingredients.join(', ')}.</p>
            ) : (
              <p className="text-sm text-stone-400">No declarados</p>
            )}
          </div>

          {/* Allergens */}
          <div className="rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              {uiLabels.allergens || 'Alérgenos'}
            </h2>
            {allergens.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {allergens.map((allergen) => (
                  <span
                    key={allergen}
                    className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {allergen}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">Sin alérgenos declarados</p>
            )}
          </div>
        </div>

        {/* ── Ingredient origins ── */}
        {ingredientOrigins.length > 0 && (
          <div className="mt-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              Trazabilidad de ingredientes
            </h2>
            <div className="divide-y divide-stone-100">
              {ingredientOrigins.map((item) => (
                <div
                  key={`${item.ingredient}-${item.origin}`}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="font-medium text-stone-950">{item.ingredient}</span>
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <MapPin className="h-3 w-3" />
                    {item.origin}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Producer story ── */}
        <div className="mt-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
            Elaborado por
          </h2>
          <p className="text-base font-semibold text-stone-950">
            {storeInfo?.name || product.producer_name || 'Productor independiente'}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            {storeInfo?.story ||
              storeInfo?.tagline ||
              product.description ||
              'Este producto forma parte de una selección con trazabilidad visible y una narrativa de origen más clara.'}
          </p>
          {product.country_origin && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600">
              <MapPin className="h-3 w-3" />
              {product.country_origin}
            </div>
          )}
          {canBuyFromStore && (
            <button
              type="button"
              onClick={handleBuy}
              className="mt-4 flex items-center gap-1.5 text-sm font-medium text-stone-950 transition-colors hover:text-stone-600"
            >
              Ir a la tienda
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── QR Verification + Share ── */}
        <div className="mt-4 flex items-center gap-5 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
          {certificate?.qr_code ? (
            <img
              src={`data:image/png;base64,${certificate.qr_code}`}
              alt={t('certificate.qrCode', 'Código QR de verificación')}
              width={100}
              height={100}
              className="shrink-0 rounded-xl"
            />
          ) : (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.href)}&bgcolor=ffffff&color=0c0a09`}
              alt={t('certificate.qrCode', 'Código QR de verificación')}
              width={100}
              height={100}
              className="shrink-0 rounded-xl"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-950">{t('certificate.verify', 'Verificar autenticidad')}</p>
            <p className="mt-1 text-xs text-stone-500">{t('certificate.scanQR', 'Escanea el QR o copia el enlace para verificar este certificado.')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success(t('social.linkCopied', 'Enlace copiado'));
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <Copy className="h-3 w-3" />
                {t('certificate.copyLink', 'Copiar enlace')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (navigator.share) {
                    try { await navigator.share({ title: `${t('certificate.title', 'Certificado')} - ${product.name}`, url: window.location.href }); } catch { /* cancelled */ }
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success(t('social.linkCopied', 'Enlace copiado'));
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
              >
                <Share2 className="h-3 w-3" />
                {t('certificate.share', 'Compartir')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Buy CTA bar ── */}
        <div className="mt-5 flex items-center justify-between rounded-[28px] bg-stone-950 px-6 py-5">
          <div>
            <p className="font-semibold text-white">Comprar producto</p>
            <p className="text-xs text-stone-400">Directo al productor</p>
          </div>
          <button
            type="button"
            onClick={handleBuy}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-stone-100"
            data-testid="buy-online-button"
          >
            Comprar
          </button>
        </div>

        <div className="mt-5 flex justify-center">
          <Link
            to="/certificates"
            className="flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-600"
          >
            Ver más certificados
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
