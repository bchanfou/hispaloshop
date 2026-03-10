import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import Breadcrumbs from '../components/Breadcrumbs';
import LanguageSwitcher from '../components/LanguageSwitcher';
import CountryFlag from '../components/CountryFlag';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShoppingCart, Shield, Award, Leaf, MapPin, FileCheck, Star, Check } from 'lucide-react';
import { getIngredientEmoji } from '../utils/helpers';

import { API } from '../utils/api';

export default function CertificatePage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { language } = useLocale();
  const { t, i18n } = useTranslation();
  const [certificate, setCertificate] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentLang = i18n.language || language || 'es';

  const handleBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    const fetchCertificate = async () => {
      setLoading(true);
      try {
        const [certRes, prodRes] = await Promise.all([
          axios.get(`${API}/certificates/product/${productId}?lang=${currentLang}`),
          axios.get(`${API}/products/${productId}?lang=${currentLang}`)
        ]);
        setCertificate(certRes.data);
        setProduct(prodRes.data);
      } catch (error) {
        console.error('Error fetching certificate:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCertificate();
  }, [productId, currentLang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-background-subtle flex items-center justify-center" data-testid="certificate-loading">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-stone-300 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="font-body text-sm text-text-muted mt-4">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!certificate || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-background-subtle flex items-center justify-center" data-testid="certificate-not-found">
        <div className="text-center bg-white p-12 rounded-2xl shadow-lg max-w-md">
          <FileCheck className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <p className="font-heading text-xl text-primary mb-2">{t('errors.notFound')}</p>
          <p className="text-text-muted mb-6">{t('certificate.notFoundDesc', 'This certificate could not be found')}</p>
          <Link to="/certificates">
            <Button className="bg-primary hover:bg-text-secondary text-white rounded-full px-8">
              {t('common.back')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const productImage = product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1541401154946-62f8d84bd284?w=600';
  const hasIngredients = product.ingredients && product.ingredients.length > 0;
  const hasCertifications = product.certifications && product.certifications.length > 0;
  const nutritionalInfo = certificate?.data?.nutritional_info || certificate?.data?.nutrition_info;
  
  // Parse ingredient origins from certificate data
  const ingredientOrigins = {};
  if (certificate?.data?.ingredient_origins) {
    const lines = certificate.data.ingredient_origins.split('\n');
    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length === 2) {
        ingredientOrigins[parts[0].trim()] = parts[1].trim();
      }
    });
  }

  // Nutritional labels translation map
  const nutritionLabels = {
    energy: t('certificate.nutritionLabels.energy', 'Energy'),
    calories: t('certificate.nutritionLabels.calories', 'Calories'),
    fat: t('certificate.nutritionLabels.fat', 'Fat'),
    saturated_fat: t('certificate.nutritionLabels.saturatedFat', 'Saturated Fat'),
    carbohydrates: t('certificate.nutritionLabels.carbohydrates', 'Carbohydrates'),
    sugars: t('certificate.nutritionLabels.sugars', 'Sugars'),
    fiber: t('certificate.nutritionLabels.fiber', 'Fiber'),
    protein: t('certificate.nutritionLabels.protein', 'Protein'),
    salt: t('certificate.nutritionLabels.salt', 'Salt'),
    sodium: t('certificate.nutritionLabels.sodium', 'Sodium'),
  };

  const getNutritionLabel = (key) => {
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
    return nutritionLabels[normalizedKey] || key.replace(/_/g, ' ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-background-subtle" data-testid="certificate-page">
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 font-body text-sm text-text-muted hover:text-primary transition-colors group"
            data-testid="back-button"
          >
            <ArrowLeft className="w-4 h-4 stroke-[1.5] group-hover:-translate-x-1 transition-transform" />
            <span>{t('common.back')}</span>
          </button>
          
          <LanguageSwitcher variant="default" />
        </div>
        
        {/* Breadcrumbs */}
        <Breadcrumbs 
          className="mb-8"
          customItems={[
            { label: t('breadcrumbs.certificates'), href: '/certificates' },
            { label: product.name }
          ]}
        />

        {/* Certificate Document */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-300">
          
          {/* Header with Product Image */}
          <div className="relative bg-gradient-to-br from-primary to-text-secondary p-8 md:p-12">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-32 h-32 border border-white rounded-full"></div>
              <div className="absolute bottom-4 left-4 w-24 h-24 border border-white rounded-full"></div>
            </div>
            
            <div className="relative flex flex-col md:flex-row items-center gap-8">
              {/* Product Image */}
              <div className="relative">
                <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl overflow-hidden border-4 border-white shadow-2xl">
                  <img
                    src={productImage}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    data-testid="certificate-product-image"
                  />
                </div>
                {/* Verified Badge */}
                <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                  <Check className="w-6 h-6 text-white stroke-[3]" />
                </div>
              </div>
              
              {/* Product Info */}
              <div className="text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-white/20 text-white px-4 py-1.5 rounded-full text-sm mb-4">
                  <Shield className="w-4 h-4" />
                  <span>{t('certificate.productDossier')}</span>
                </div>
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2" data-testid="certificate-title">
                  {product.name}
                </h1>
                <p className="text-white/70 text-lg">
                  {t('products.byProducer', { producer: product.producer_name })}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-stone-50 border-b border-stone-200">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white mx-auto mb-2 flex items-center justify-center shadow-sm">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wider">{t('productDetail.origin')}</p>
              <p className="font-semibold text-primary">{product.country_origin}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white mx-auto mb-2 flex items-center justify-center shadow-sm">
                <Leaf className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wider">{t('productDetail.ingredients')}</p>
              <p className="font-semibold text-primary">{product.ingredients?.length || 0}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white mx-auto mb-2 flex items-center justify-center shadow-sm">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wider">{t('productDetail.certifications')}</p>
              <p className="font-semibold text-primary">{product.certifications?.length || 0}</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white mx-auto mb-2 flex items-center justify-center shadow-sm">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs text-text-muted uppercase tracking-wider">{t('certificate.status', 'Status')}</p>
              <p className="font-semibold text-green-600">{t('certificate.verifiedStatus', 'Verified')}</p>
            </div>
          </div>

          {/* Ingredients & Origin */}
          <section className="p-8 md:p-12 border-b border-stone-200" data-testid="ingredient-origin-section">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-primary">
                {t('productDetail.ingredients')} & {t('productDetail.origin')}
              </h2>
            </div>
            
            {hasIngredients ? (
              <div className="grid gap-3">
                {product.ingredients.map((ingredient, idx) => {
                  const origin = ingredientOrigins[ingredient] || product.country_origin;
                  const countryCode = origin.length === 2 ? origin.toUpperCase() : '';
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-background-subtle transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <Leaf className="w-4 h-4 text-accent" />
                        </div>
                        <span className="font-body text-lg text-primary font-medium">
                          {ingredient}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-body text-base text-text-secondary">
                          {origin}
                        </span>
                        {countryCode ? (
                          <CountryFlag countryCode={countryCode} size="lg" />
                        ) : (
                          <MapPin className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-stone-50 rounded-xl">
                <p className="text-text-muted">{t('common.noData')}</p>
              </div>
            )}
          </section>

          {/* Nutritional Information */}
          <section className="p-8 md:p-12 border-b border-stone-200" data-testid="nutritional-table-section">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-primary">
                  {t('certificate.nutritionalInfo', 'Nutritional Information')}
                </h2>
                <p className="text-sm text-text-muted">{t('certificate.per100g', 'Per 100g')}</p>
              </div>
            </div>
            
            <div className="bg-stone-50 rounded-2xl overflow-hidden">
              {nutritionalInfo && typeof nutritionalInfo === 'object' ? (
                <div className="divide-y divide-stone-200">
                  {Object.entries(nutritionalInfo).map(([key, value], idx) => (
                    <div 
                      key={key} 
                      className={`flex items-center justify-between p-4 ${idx % 2 === 0 ? 'bg-white' : 'bg-stone-50'}`}
                    >
                      <span className="font-medium text-text-secondary capitalize">
                        {getNutritionLabel(key)}
                      </span>
                      <span className="font-bold text-primary text-lg">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-text-muted">{t('common.noData')}</p>
                </div>
              )}
            </div>
          </section>

          {/* Certifications */}
          <section className="p-8 md:p-12 border-b border-stone-200" data-testid="dietary-labels-section">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <h2 className="font-heading text-2xl font-bold text-primary">
                {t('productDetail.certifications')}
              </h2>
            </div>
            
            {hasCertifications ? (
              <div className="flex flex-wrap gap-3">
                {product.certifications.map((cert, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-text-secondary text-white px-6 py-3 rounded-full text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
                  >
                    <Shield className="w-4 h-4" />
                    {cert}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-stone-50 rounded-xl">
                <p className="text-text-muted">{t('common.noData')}</p>
              </div>
            )}
          </section>

          {/* Country & Producer */}
          <section className="p-8 md:p-12 bg-gradient-to-br from-stone-50 to-white border-b border-stone-200" data-testid="producer-story-section">
            <div className="max-w-3xl mx-auto text-center">
              <div className="mb-4 flex justify-center">
                <CountryFlag 
                  countryCode={product.country_origin?.substring(0, 2).toUpperCase()} 
                  size="xl" 
                  className="transform scale-150"
                />
              </div>
              <h2 className="font-heading text-2xl font-bold text-primary mb-4">
                {t('certificate.madeIn', 'Proudly Made in')} {product.country_origin}
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                {product.description || t('certificate.producerDescription', {
                  producer: product.producer_name || 'Hispaloshop',
                  country: product.country_origin
                })}
              </p>
            </div>
          </section>

          {/* Buy CTA */}
          <div className="p-8 md:p-12 text-center">
            <Link to={`/products/${productId}`}>
              <Button
                size="lg"
                className="bg-primary hover:bg-text-secondary text-white rounded-full px-12 py-6 font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:scale-105"
                data-testid="buy-online-button"
              >
                <ShoppingCart className="mr-3 w-5 h-5 stroke-[2]" />
                {t('products.buyNow')}
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <div className="p-8 bg-primary text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-white font-medium">{t('certificate.verified', 'Verified & Transparent')}</span>
            </div>
            <p className="font-body text-xs text-white/60 mb-1">
              {t('certificate.certificateId', 'Certificate ID')}: {certificate.certificate_id}
            </p>
            <p className="font-body text-xs text-white/60">
              {t('footer.copyright')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
