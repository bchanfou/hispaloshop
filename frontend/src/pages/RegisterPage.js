import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { toast } from 'sonner';
import { Shield, ArrowLeft, User, Store, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConsentSummary, ConsentFullDisclosure, ConsentModal } from '../components/ConsentLayers';
import { API } from '../utils/api';
import { useLocale } from '../context/LocaleContext';

// Parse backend error messages into user-friendly format
const parseErrorMessage = (error) => {
  const detail = error.response?.data?.detail;
  
  if (!detail) {
    // Network error or no response
    if (error.message === 'Network Error') {
      return 'Error de conexión. Por favor, verifica tu conexión a internet.';
    }
    return 'Error de registro. Por favor, inténtalo de nuevo.';
  }
  
  // If detail is a string, translate common messages
  if (typeof detail === 'string') {
    // Common backend error messages
    const errorTranslations = {
      'Email already registered': 'Este email ya está registrado.',
      'Invalid email format': 'Formato de email inválido.',
      'Password too weak': 'La contraseña es muy débil.',
      'Password must be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
      'Country is required': 'El país es obligatorio.',
      'Name is required': 'El nombre es obligatorio.',
      'Invalid country code': 'Código de país inválido.',
      'VAT/CIF already registered': 'Este CIF/NIF ya está registrado.',
      'Phone number is required': 'El teléfono es obligatorio.',
      'Fiscal address is required': 'La dirección fiscal es obligatoria.',
      'Company name is required': 'El nombre de la empresa es obligatorio.',
      'Username already taken': 'Este nombre de usuario ya esta en uso.',
      'Username must be at least 3 characters': 'El nombre de usuario debe tener al menos 3 caracteres.',
      'Analytics consent is required': 'Debes aceptar el procesamiento de datos.',
      'You need at least 1000 followers': 'Necesitas al menos 1.000 seguidores para registrarte como influencer.',
      'At least one social media profile is required': 'Debes indicar al menos una red social.'
    };
    
    return errorTranslations[detail] || detail;
  }
  
  // If detail is an array (validation errors)
  if (Array.isArray(detail)) {
    const messages = detail.map(err => {
      if (typeof err === 'string') return err;
      const field = err.loc ? err.loc.join('.').replace('body.', '') : '';
      const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return `${fieldName}: ${err.msg}`;
    });
    return messages.join('. ');
  }
  
  // If detail is an object, try to extract message
  if (typeof detail === 'object' && detail !== null) {
    return detail.msg || detail.message || JSON.stringify(detail);
  }
  
  // Fallback
  return 'Error de registro. Por favor, verifica tus datos.';
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { language } = useLocale();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  
  // Auto-detect role from URL path
  const pathRole = window.location.pathname.includes('/vender') ? 'producer' 
    : window.location.pathname.includes('/influencer') ? 'influencer' 
    : window.location.pathname.includes('/seller') ? 'producer'
    : null;
  const fixedRole = pathRole || roleParam || 'customer';
  
  // Get user's current language from i18n or locale context
  const currentLanguage = i18n.language || language || 'es';
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    username: '',
    role: fixedRole,
    country: '',
    company_name: '',
    phone: '',
    whatsapp: '',
    contact_person: '',
    fiscal_address: '',
    vat_cif: '',
    // Influencer fields
    instagram: '',
    tiktok: '',
    youtube: '',
    twitter: '',
    followers: '',
    niche: '',
    analytics_consent: false,
    consent_version: '1.0',
    // User's preferred language for emails
    language: currentLanguage
  });
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showConsentModal, setShowConsentModal] = useState(false);

  // Update language in formData when user changes language
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, language: currentLanguage }));
  }, [currentLanguage]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) errors.email = 'Email is required';
    if (!formData.password) errors.password = 'Password is required';
    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.country) errors.country = 'Country is required';
    
    // Consent is required for customers
    if (formData.role === 'customer' && !formData.analytics_consent) {
      errors.analytics_consent = 'You must accept the data processing terms to continue';
    }
    
    if (formData.role === 'producer') {
      if (!formData.company_name) errors.company_name = 'Company name is required';
      if (!formData.phone) errors.phone = 'Phone number is required';
      if (!formData.fiscal_address) errors.fiscal_address = 'Fiscal address is required';
      if (!formData.vat_cif) errors.vat_cif = 'VAT/CIF is required';
    }
    
    if (formData.role === 'influencer') {
      if (!formData.followers) errors.followers = 'Número de seguidores es requerido';
      // Validate minimum 1000 followers
      const followerCount = parseInt(formData.followers.replace(/[^0-9]/g, ''));
      if (isNaN(followerCount) || followerCount < 1000) {
        errors.followers = 'Necesitas al menos 1.000 seguidores';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    
    if (!validateForm()) {
      // Show specific error for consent
      if (formData.role === 'customer' && !formData.analytics_consent) {
        toast.error(t('consent.errors.required', 'Please accept the AI data processing consent to continue'));
        // Scroll to consent section on mobile
        const consentSection = document.querySelector('[data-testid="consent-section"]');
        if (consentSection) {
          consentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        toast.error(t('auth.fillRequiredFields', 'Please fill in all required fields'));
      }
      return;
    }
    
    setLoading(true);

    // DEBUG: Log the exact payload being sent
    console.log('=== REGISTER PAYLOAD ===');
    console.log('Full formData:', JSON.stringify(formData, null, 2));
    console.log('Fields check:');
    console.log('  - email:', formData.email, '| type:', typeof formData.email);
    console.log('  - name:', formData.name, '| type:', typeof formData.name);
    console.log('  - password:', formData.password ? '***' : 'EMPTY', '| type:', typeof formData.password);
    console.log('  - country:', formData.country, '| type:', typeof formData.country, '| length:', formData.country?.length);
    console.log('  - role:', formData.role, '| type:', typeof formData.role);
    console.log('  - analytics_consent:', formData.analytics_consent, '| type:', typeof formData.analytics_consent);
    console.log('========================');

    try {
      const response = await axios.post(`${API}/auth/register`, formData);
      console.log('=== REGISTER SUCCESS ===');
      console.log('Response:', response.data);
      
      if (formData.role === 'producer') {
        toast.success(t('auth.producerRegistrationSuccess', 'Registration successful! Your account is pending admin approval.'));
      } else if (formData.role === 'influencer') {
        toast.success('¡Registro exitoso! Revisa tu email para verificar tu cuenta. Tu cuenta está pendiente de aprobación.');
      } else {
        toast.success(t('auth.registrationSuccess', 'Registration successful! Please check your email to verify your account.'));
      }
      navigate('/login');
    } catch (error) {
      // DEBUG: Log the full error
      console.log('=== REGISTER ERROR ===');
      console.log('Error status:', error.response?.status);
      console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
      console.log('Error detail:', error.response?.data?.detail);
      console.log('======================');
      
      const errorMessage = parseErrorMessage(error);
      // Check if it's a consent-related error from backend
      if (errorMessage.toLowerCase().includes('consent')) {
        toast.error(t('consent.errors.required', 'Please accept the AI data processing consent to continue'));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  const isProducer = formData.role === 'producer';
  const isInfluencer = formData.role === 'influencer';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header - Simple back button */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-stone-200 safe-area-top">
        <div className="flex items-center h-14 px-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 text-text-primary hover:bg-stone-100 rounded-full transition-colors"
            data-testid="mobile-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-center text-sm font-medium text-text-primary pr-8 truncate">
            {isProducer ? t('register.producerTitle') : isInfluencer ? t('register.influencerTitle') : t('register.title')}
          </h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header />
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-4 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white p-4 md:p-8 rounded-2xl border border-stone-200 shadow-sm" data-testid="register-form">
            {/* Title - Hidden on mobile (shown in header) */}
            <div className="hidden md:block">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/logo.png" alt="Hispaloshop" className="w-8 h-8 object-contain" />
                <h1 className="font-heading text-3xl font-bold text-text-primary" data-testid="register-title">
                  {isProducer ? t('register.producerTitle') : isInfluencer ? t('register.influencerTitle') : t('register.title')}
                </h1>
              </div>
              <p className="text-text-secondary text-center mb-8">
                {isProducer ? t('register.producerDescription') : isInfluencer ? t('register.influencerDescription') : t('register.description')}
              </p>
            </div>
            
            {/* Mobile subtitle */}
            <p className="md:hidden text-sm text-text-secondary text-center mb-4">
              {isProducer ? t('register.producerDescription') : isInfluencer ? t('register.influencerDescription') : t('register.description')}
            </p>

            {/* Role is auto-detected from URL — no selector shown */}

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              {/* Common Fields - Mobile optimized inputs */}
              <div>
                <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')} *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg ${formErrors.email ? 'border-red-500' : ''}`}
                  placeholder="tu@email.com"
                  data-testid="email-input"
                />
                {formErrors.email && (
                  <p className="text-red-500 text-xs md:text-sm mt-1" data-testid="email-error">{formErrors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')} *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg ${formErrors.password ? 'border-red-500' : ''}`}
                  placeholder={t('common.minCharacters', 'Mínimo 6 caracteres')}
                  data-testid="password-input"
                />
                {formErrors.password && (
                  <p className="text-red-500 text-xs md:text-sm mt-1" data-testid="password-error">{formErrors.password}</p>
                )}
              </div>

              <div>
                <Label htmlFor="name" className="text-sm font-medium">{isProducer ? t('register.companyName') + ' *' : t('register.fullName') + ' *'}</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className={`mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg ${formErrors.name ? 'border-red-500' : ''}`}
                  data-testid="name-input"
                />
                {formErrors.name && (
                  <p className="text-red-500 text-xs md:text-sm mt-1" data-testid="name-error">{formErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="username" className="text-sm font-medium">{t('register.username', 'Username')}</Label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">@</span>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg pl-7 ${formErrors.username ? 'border-red-500' : ''}`}
                    placeholder={t('register.usernamePlaceholder', 'tu_nombre_unico')}
                    data-testid="username-input"
                  />
                </div>
                <p className="text-xs text-stone-400 mt-1">{t('register.usernameHint', 'Opcional. Si no lo eliges, se generara automaticamente.')}</p>
                {formErrors.username && (
                  <p className="text-red-500 text-xs md:text-sm mt-1" data-testid="username-error">{formErrors.username}</p>
                )}
              </div>

              <div>
                <Label htmlFor="country" className="text-sm font-medium">{t('register.country')} *</Label>
                <Input
                  id="country"
                  name="country"
                  required
                  value={formData.country}
                  onChange={handleChange}
                  className={`mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg ${formErrors.country ? 'border-red-500' : ''}`}
                  placeholder="España"
                  data-testid="country-input"
                />
                {formErrors.country && (
                  <p className="text-red-500 text-xs md:text-sm mt-1" data-testid="country-error">{formErrors.country}</p>
                )}
              </div>

            {/* Producer-specific Fields - Mobile optimized */}
            {isProducer && (
              <>
                <div>
                  <Label htmlFor="company_name" className="text-sm font-medium">{t('register.companyName')} *</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    required={isProducer}
                    value={formData.company_name}
                    onChange={handleChange}
                    className={`mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg ${formErrors.company_name ? 'border-red-500' : ''}`}
                    data-testid="company-name-input"
                  />
                  {formErrors.company_name && (
                    <p className="text-red-500 text-xs md:text-sm mt-1" data-testid="company-name-error">{formErrors.company_name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium">{t('register.phone')} *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      required={isProducer}
                      value={formData.phone}
                      onChange={handleChange}
                      className={`mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg ${formErrors.phone ? 'border-red-500' : ''}`}
                      placeholder="+34 600 000 000"
                      data-testid="phone-input"
                    />
                    {formErrors.phone && (
                      <p className="text-red-500 text-xs md:text-sm mt-1" data-testid="phone-error">{formErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      className="mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                      placeholder="+34 600 000 000"
                      data-testid="whatsapp-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact_person" className="text-sm font-medium">{t('register.fullName', 'Persona de Contacto')}</Label>
                  <Input
                    id="contact_person"
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleChange}
                    className="mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    data-testid="contact-person-input"
                  />
                </div>

                <div>
                  <Label htmlFor="fiscal_address" className="text-sm font-medium">{t('register.fiscalAddress')} *</Label>
                  <Input
                    id="fiscal_address"
                    name="fiscal_address"
                    required={isProducer}
                    value={formData.fiscal_address}
                    onChange={handleChange}
                    className={`mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg ${formErrors.fiscal_address ? 'border-red-500' : ''}`}
                    placeholder="Calle, número, ciudad, CP"
                    data-testid="fiscal-address-input"
                  />
                  {formErrors.fiscal_address && (
                    <p className="text-red-500 text-xs md:text-sm mt-1" data-testid="fiscal-address-error">{formErrors.fiscal_address}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="vat_cif" className="text-sm font-medium">{t('register.vatNumber')} *</Label>
                  <Input
                    id="vat_cif"
                    name="vat_cif"
                    required={isProducer}
                    value={formData.vat_cif}
                    onChange={handleChange}
                    className={`mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg ${formErrors.vat_cif ? 'border-red-500' : ''}`}
                    placeholder="B12345678"
                    data-testid="vat-cif-input"
                  />
                  {formErrors.vat_cif && (
                    <p className="text-red-500 text-xs md:text-sm mt-1" data-testid="vat-cif-error">{formErrors.vat_cif}</p>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl md:rounded-lg p-3 md:p-4" data-testid="producer-notice">
                  <p className="text-xs md:text-sm text-amber-900">
                    <strong>{t('common.note', 'Nota')}:</strong> {t('register.producerPendingNote', 'Las cuentas de productores requieren aprobación del administrador antes de empezar a vender. Tu cuenta se creará con estado "pendiente".')}
                  </p>
                </div>
              </>
            )}

            {/* Influencer-specific Fields - Mobile optimized */}
            {isInfluencer && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="instagram" className="text-sm font-medium">{t('register.instagram')}</Label>
                    <Input
                      id="instagram"
                      name="instagram"
                      value={formData.instagram}
                      onChange={handleChange}
                      placeholder="@tu_instagram"
                      className="mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tiktok" className="text-sm font-medium">{t('register.tiktok')}</Label>
                    <Input
                      id="tiktok"
                      name="tiktok"
                      value={formData.tiktok}
                      onChange={handleChange}
                      placeholder="@tu_tiktok"
                      className="mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="youtube" className="text-sm font-medium">{t('register.youtube')}</Label>
                    <Input
                      id="youtube"
                      name="youtube"
                      value={formData.youtube}
                      onChange={handleChange}
                      placeholder="URL del canal"
                      className="mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitter" className="text-sm font-medium">{t('register.twitter')}</Label>
                    <Input
                      id="twitter"
                      name="twitter"
                      value={formData.twitter}
                      onChange={handleChange}
                      placeholder="@tu_twitter"
                      className="mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="followers" className="text-sm font-medium">{t('register.followers')} *</Label>
                    <Input
                      id="followers"
                      name="followers"
                      value={formData.followers}
                      onChange={handleChange}
                      placeholder="Ej: 5.000"
                      className={`mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg ${formErrors.followers ? 'border-red-500' : ''}`}
                    />
                    {formErrors.followers && (
                      <p className="text-red-500 text-xs md:text-sm mt-1">{formErrors.followers}</p>
                    )}
                    <p className="text-xs text-text-muted mt-1">{t('register.followersHelp')}</p>
                  </div>
                  <div>
                    <Label htmlFor="niche" className="text-sm font-medium">{t('register.niche')}</Label>
                    <Input
                      id="niche"
                      name="niche"
                      value={formData.niche}
                      onChange={handleChange}
                      placeholder={t('register.nichePlaceholder')}
                      className="mt-2 h-12 md:h-10 text-base md:text-sm rounded-xl md:rounded-lg"
                    />
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl md:rounded-lg p-3 md:p-4">
                  <p className="text-xs md:text-sm text-purple-900">
                    <strong>{t('common.note', 'Nota')}:</strong> {t('register.influencerPendingNote', 'Las cuentas de influencer requieren aprobación del administrador. Una vez aprobada, podrás crear tu código de descuento personalizado y comenzar a ganar comisiones.')}
                  </p>
                  <ul className="text-xs md:text-sm text-purple-800 mt-2 space-y-1">
                    <li>• <strong>15%</strong> {t('register.commissionPerSale', 'de comisión por cada venta (de por vida)')}</li>
                    <li>• <strong>10%</strong> {t('register.discountForFollowers', 'de descuento para tus seguidores')}</li>
                    <li>• {t('register.minFollowersReq', 'Requisito: mínimo 1.000 seguidores')}</li>
                  </ul>
                </div>
              </>
            )}

            {/* 3-LAYER GDPR CONSENT - Required for customers */}
            {formData.role === 'customer' && (
              <div className="border border-stone-200 rounded-xl md:rounded-lg overflow-hidden bg-stone-50" data-testid="consent-section">
                {/* Consent Header */}
                <div className="px-3 md:px-4 py-2.5 md:py-3 bg-primary/5 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <span className="font-medium text-text-primary text-sm md:text-base">
                      {t('consent.title', 'AI Data Processing Consent')}
                    </span>
                    <span className="text-[10px] md:text-xs bg-red-100 text-red-700 px-1.5 md:px-2 py-0.5 rounded">
                      {t('consent.required', 'Required')}
                    </span>
                  </div>
                </div>
                
                {/* Layer 1: Quick Summary (always visible) */}
                <div className="p-3 md:p-4 border-b border-stone-200">
                  <ConsentSummary />
                </div>
                
                {/* Layer 2: Full Legal Disclosure (expandable) */}
                <div className="px-3 md:px-4 py-2.5 md:py-3">
                  <ConsentFullDisclosure 
                    isExpanded={showConsentModal} 
                    onToggle={() => setShowConsentModal(!showConsentModal)} 
                  />
                </div>
                
                {/* Checkbox - Mobile Optimized */}
                <div className="px-3 md:px-4 py-3 md:py-4 bg-white border-t border-stone-200">
                  <label 
                    htmlFor="analytics_consent" 
                    className={`flex items-start gap-3 md:gap-4 cursor-pointer p-2.5 md:p-3 rounded-xl md:rounded-lg transition-colors ${
                      formData.analytics_consent 
                        ? 'bg-green-50 border-2 border-green-300' 
                        : formErrors.analytics_consent 
                          ? 'bg-red-50 border-2 border-red-300' 
                          : 'bg-stone-50 border-2 border-stone-200 hover:border-stone-300 active:bg-stone-100'
                    }`}
                    data-testid="consent-label"
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      <input
                        type="checkbox"
                        id="analytics_consent"
                        checked={formData.analytics_consent}
                        onChange={(e) => {
                          setFormData({ ...formData, analytics_consent: e.target.checked });
                          if (formErrors.analytics_consent) {
                            setFormErrors({ ...formErrors, analytics_consent: '' });
                          }
                        }}
                        className={`h-5 w-5 md:h-6 md:w-6 rounded border-2 text-primary focus:ring-primary focus:ring-2 cursor-pointer ${
                          formErrors.analytics_consent ? 'border-red-500' : 'border-stone-400'
                        }`}
                        data-testid="consent-checkbox"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm md:text-base text-text-primary font-medium block">
                        {t('consent.checkboxLabel', 'I accept the AI data processing terms')} 
                        <span className="text-red-500 ml-1">*</span>
                      </span>
                      <span className="text-xs md:text-sm text-text-muted mt-0.5 md:mt-1 block">
                        {t('consent.checkboxHint', 'Required to create your account')}
                      </span>
                    </div>
                  </label>
                  {formErrors.analytics_consent && (
                    <div className="mt-2 p-2.5 md:p-3 bg-red-100 border border-red-300 rounded-xl md:rounded-lg" data-testid="consent-error">
                      <p className="text-red-700 text-xs md:text-sm font-medium flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {t('consent.errors.required', 'Please accept the AI data processing consent to continue')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-full h-12 md:h-11 text-base md:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 active:scale-[0.98]"
              data-testid="register-submit-button"
            >
              {loading ? t('register.creating') : t('register.createAccount')}
            </Button>
          </form>

          {/* Google Sign Up - Only for customers */}
          {formData.role === 'customer' && (
            <div className="mt-5 md:mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-200"></div>
                </div>
                <div className="relative flex justify-center text-xs md:text-sm">
                  <span className="px-3 md:px-4 bg-white text-text-muted">{t('auth.orContinueWith', 'o continuar con')}</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => {
                  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
                  const redirectUrl = window.location.origin + '/dashboard';
                  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
                }}
                className="w-full mt-4 bg-white hover:bg-stone-50 text-text-primary border border-stone-200 rounded-full h-12 md:h-11 text-base md:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 active:scale-[0.98]"
                data-testid="google-register-button"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {t('auth.signUpWithGoogle', 'Registrarse con Google')}
              </Button>
            </div>
          )}

          <div className="mt-6 md:mt-8 text-center text-sm text-text-muted">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary hover:text-primary-hover font-medium" data-testid="login-link">
              {t('auth.login')}
            </Link>
          </div>
          
          {/* Cross-links to other registration types */}
          <div className="mt-4 text-center text-xs text-text-muted space-y-1">
            {fixedRole !== 'producer' && (
              <p>{t('register.isProducer')} <Link to="/vender/registro" className="text-[#2D5A27] font-medium hover:underline">{t('register.registerSeller')}</Link></p>
            )}
            {fixedRole !== 'influencer' && (
              <p>{t('register.isInfluencer')} <Link to="/influencers/registro" className="text-amber-600 font-medium hover:underline">{t('register.joinProgram')}</Link></p>
            )}
            {fixedRole !== 'customer' && (
              <p>{t('register.justBuy')} <Link to="/signup" className="text-blue-600 font-medium hover:underline">{t('register.createBuyerAccount')}</Link></p>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Footer - Hidden on mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}