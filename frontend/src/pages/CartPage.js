import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Trash2, Mail, CheckCircle, AlertTriangle, Tag, X, AlertCircle, MapPin, Plus, Check } from 'lucide-react';
import { useCartAddresses, useCartCheckout, useCartPricing, useCartVerification } from '../features/cart/hooks';

const addressSchema = z.object({
  name: z.string().optional(),
  full_name: z.string().min(2, 'Nombre completo requerido'),
  phone: z.string().optional(),
  street: z.string().min(5, 'Direccion requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  postal_code: z.string().regex(/^\d{4,10}$/, 'Codigo postal no valido'),
  country: z.string().min(2, 'Pais requerido'),
  is_default: z.boolean().optional(),
});

export default function CartPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, checkAuth } = useAuth();
  const {
    cartItems,
    removeFromCart,
    getTotalPrice,
    loading: cartLoading,
    appliedDiscount,
    applyDiscount,
    removeDiscount,
  } = useCart();
  const { t, convertAndFormatPrice, currency, getExchangeRateDisplay, countries, country } = useLocale();
  const [verificationToken, setVerificationToken] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [discountLoading, setDiscountLoading] = useState(false);
  const { emailVerified, verifying, resending, verifyEmail, resendVerification, refetch: refetchVerification } = useCartVerification();
  const { savedAddresses, defaultAddressId, createAddress, savingAddress, isLoading: addressesLoading } = useCartAddresses();
  const { cartSummary, stockIssues, refetch: refetchPricing } = useCartPricing(cartItems, appliedDiscount);
  const { checkoutLoading, createCheckout } = useCartCheckout();
  const {
    register: registerAddr,
    handleSubmit: handleAddrSubmit,
    reset: resetAddr,
    formState: { errors: addrErrors },
  } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'ES', is_default: false },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (!addressesLoading && savedAddresses.length === 0) {
      setShowNewAddressForm(true);
    }
  }, [addressesLoading, savedAddresses.length]);

  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(defaultAddressId);
    }
  }, [defaultAddressId, savedAddresses.length, selectedAddressId]);

  const handleSaveNewAddress = async (data) => {
    try {
      await createAddress({
        ...data,
        name: data.name || t('checkout.newAddress') || 'Nueva direccion',
        is_default: data.is_default ?? false,
      });
      setShowNewAddressForm(false);
      resetAddr({ country: 'ES', is_default: false });
      toast.success(t('success.saved'));
    } catch (error) {
      toast.error(error?.message || t('errors.generic'));
    }
  };

  const getSelectedAddress = () => savedAddresses.find((address) => address.address_id === selectedAddressId);

  const handleVerifyEmail = async () => {
    if (!verificationToken.trim()) {
      toast.error(t('checkout.verificationCodePlaceholder'));
      return;
    }
    try {
      await verifyEmail(verificationToken);
      toast.success(t('checkout.emailVerifiedSuccess'));
      checkAuth();
      await refetchVerification();
    } catch (error) {
      toast.error(error?.message || t('checkout.invalidCode'));
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await resendVerification();
      toast.success(t('checkout.verificationSent') || 'Codigo enviado. Revisa tu email.');
      if (response?.verification_token) {
        toast.info(`MVP: ${response.verification_token.substring(0, 8)}...`);
      }
    } catch (error) {
      toast.error(error?.message || t('checkout.failedResend'));
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error(t('errors.generic'));
      return;
    }
    setDiscountLoading(true);
    try {
      const result = await applyDiscount(discountCode.toUpperCase());
      if (!result?.success) {
        throw new Error(result?.error || t('errors.generic'));
      }
      await refetchPricing();
      setDiscountCode('');
      toast.success(t('success.added'));
    } catch (error) {
      toast.error(error?.message || t('errors.generic'));
    } finally {
      setDiscountLoading(false);
    }
  };

  const handleRemoveDiscount = async () => {
    setDiscountLoading(true);
    try {
      const result = await removeDiscount();
      if (!result?.success) {
        throw new Error(result?.error || t('errors.generic'));
      }
      await refetchPricing();
      toast.success(t('success.deleted'));
    } catch (error) {
      toast.error(error?.message || t('errors.generic'));
    } finally {
      setDiscountLoading(false);
    }
  };

  const getDiscountedTotal = () => {
    if (cartSummary.total_cents > 0) {
      return cartSummary.total_cents / 100;
    }
    const subtotal = getTotalPrice();
    if (!appliedDiscount) {
      return subtotal;
    }
    return Math.max(0, subtotal - (appliedDiscount.discount_amount || 0));
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error(t('cart.empty'));
      return;
    }
    if (!emailVerified) {
      toast.error(t('errors.unauthorized'));
      return;
    }
    if (stockIssues.length > 0) {
      toast.error(t('errors.generic'));
      return;
    }
    const selectedAddress = getSelectedAddress();
    if (!selectedAddress) {
      toast.error(t('checkout.selectAddress') || 'Selecciona una dirección de envío');
      return;
    }
    const addressToUse = {
      full_name: selectedAddress?.full_name,
      street: selectedAddress?.street,
      city: selectedAddress?.city,
      postal_code: selectedAddress?.postal_code,
      country: selectedAddress?.country,
      phone: selectedAddress?.phone || '',
    };
    try {
      const response = await createCheckout({ shippingAddress: addressToUse, origin: window.location.origin });
      window.location.href = response.url;
    } catch (error) {
      console.error('Checkout error:', error);
      if (error?.data?.detail?.issues) {
        error.data.detail.issues.forEach((issue) => toast.error(issue));
      } else {
        toast.error(error?.message || t('checkout.checkoutFailed'));
      }
    }
  };

  const handleRemoveItem = async (item) => {
    await removeFromCart(item.product_id, item.variant_id, item.pack_id);
    await refetchPricing();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-stone-500">{t('common.loading')}</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 pb-32 md:pb-12">
        <div className="hidden md:block">
          <Breadcrumbs className="mb-6" />
        </div>
        <div className="mb-4 md:mb-6 hidden md:block">
          <BackButton label={t('checkout.continueShopping')} />
        </div>
        <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-stone-950 mb-4 md:mb-8" data-testid="cart-page-title">
          {t('cart.title')}
        </h1>

        {emailVerified === false && (
          <div className="mb-8 rounded-xl border border-stone-200 bg-white p-6" data-testid="verification-banner">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-0.5 h-6 w-6 text-stone-700" />
              <div className="flex-1">
                <h3 className="mb-2 font-semibold text-stone-950">{t('checkout.verifyEmail')}</h3>
                <p className="mb-4 text-stone-500">{t('checkout.verifyEmailMessage')} ({user.email})</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2 flex-1">
                    <Input
                      placeholder={t('checkout.verificationCodePlaceholder')}
                      value={verificationToken}
                      onChange={(event) => setVerificationToken(event.target.value)}
                      className="flex-1 max-w-xs"
                      data-testid="verification-input"
                    />
                    <Button onClick={handleVerifyEmail} disabled={verifying} data-testid="verify-button">
                      {verifying ? t('checkout.verifying') : t('checkout.verify')}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="border-stone-200 text-stone-700"
                    data-testid="resend-button"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {resending ? t('checkout.sending') : t('checkout.resendCode')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {emailVerified === true && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-3" data-testid="verified-badge">
            <CheckCircle className="h-5 w-5 text-stone-950" />
            <span className="font-medium text-stone-950">{t('checkout.emailVerified', 'Email verificado')}</span>
          </div>
        )}

        {cartLoading ? (
          <p className="text-stone-500 text-center py-12">{t('common.loading')}</p>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
            <p className="text-stone-500 mb-4">{t('cart.empty')}</p>
            <Button onClick={() => navigate('/products')}>
              {t('cart.continueShopping')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const hasStockIssue = stockIssues.some((issue) => issue.product_id === item.product_id);
                const itemKey = item.variant_id && item.pack_id ? `${item.product_id}-${item.variant_id}-${item.pack_id}` : item.product_id;
                return (
                  <div
                    key={itemKey}
                    className={`flex items-start gap-3 rounded-xl border bg-white p-3 md:items-center md:gap-6 md:p-6 ${hasStockIssue ? 'border-stone-950 bg-stone-100' : 'border-stone-200'}`}
                    data-testid={`cart-item-${itemKey}`}
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                      {item.image && <img src={item.image} alt={item.product_name} loading="lazy" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-stone-950 text-sm md:text-base line-clamp-2">{item.product_name}</h3>
                      {(item.variant_name || item.pack_label) && (
                        <p className="text-xs md:text-sm text-stone-500">
                          {item.variant_name && <span>{item.variant_name}</span>}
                          {item.variant_name && item.pack_label && <span> · </span>}
                          {item.pack_label && <span>{item.pack_label}</span>}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1 md:mt-2">
                        <div>
                          <p className="text-xs md:text-sm text-stone-500">{t('cart.quantity', 'Cantidad')}: {item.quantity}</p>
                          <p className="mt-0.5 text-sm font-bold text-stone-950 md:text-base">
                            {convertAndFormatPrice(item.price * item.quantity, item.currency || 'EUR')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="rounded-lg p-2 text-stone-700 transition-colors hover:bg-stone-100 md:hidden"
                          data-testid={`remove-item-${itemKey}-mobile`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {hasStockIssue && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-stone-700">
                          <AlertCircle className="w-3 h-3" />
                          <span>{stockIssues.find((issue) => issue.product_id === item.product_id)?.message}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="hidden rounded-lg p-2 text-stone-700 transition-colors hover:bg-stone-100 md:flex"
                      data-testid={`remove-item-${itemKey}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}

              <div className="bg-white rounded-xl border border-stone-200 p-4 md:p-6 mt-4 md:mt-6" data-testid="shipping-address-section">
                <h3 className="font-heading text-base md:text-lg font-semibold text-stone-950 mb-3 md:mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                  {t('checkout.shippingAddress')}
                </h3>

                {savedAddresses.length > 0 && !showNewAddressForm && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.address_id}
                        onClick={() => setSelectedAddressId(addr.address_id)}
                        className={`cursor-pointer rounded-lg border-2 p-3 transition-all md:p-4 ${selectedAddressId === addr.address_id ? 'border-stone-950 bg-stone-100' : 'border-stone-200 hover:border-stone-950'}`}
                        data-testid={`address-${addr.address_id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1 flex-wrap">
                              <span className="font-medium text-stone-950 text-sm md:text-base truncate">{addr.name || t('checkout.shippingAddress')}</span>
                              {addr.is_default && (
                                <span className="whitespace-nowrap rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-700 md:px-2 md:text-xs">
                                  {t('checkout.default') || 'Predeterminada'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs md:text-sm text-stone-500 truncate">{addr.full_name}</p>
                            <p className="text-xs md:text-sm text-stone-500 truncate">{addr.street}</p>
                            <p className="text-xs md:text-sm text-stone-500">{addr.city}, {addr.postal_code}</p>
                          </div>
                          {selectedAddressId === addr.address_id && <Check className="h-4 w-4 flex-shrink-0 text-stone-950 md:h-5 md:w-5" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!showNewAddressForm && (
                  <Button
                    variant="outline"
                    onClick={() => setShowNewAddressForm(true)}
                    className="w-full border-2 border-dashed border-stone-200 hover:border-stone-950 hover:text-stone-950"
                    data-testid="add-new-address-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('checkout.addNewAddress') || 'Add New Address'}
                  </Button>
                )}

                {showNewAddressForm && (
                  <form onSubmit={handleAddrSubmit(handleSaveNewAddress)} className="space-y-4 p-4 border border-stone-200 rounded-lg" data-testid="new-address-form">
                    <div>
                      <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.addressName') || 'Nombre de direccion'}</label>
                      <Input {...registerAddr('name')} placeholder={t('checkout.addressNamePlaceholder') || 'Ej: Casa, Trabajo'} data-testid="new-address-name" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.fullName')} <span className="text-stone-700">*</span></label>
                        <Input {...registerAddr('full_name')} placeholder={t('checkout.fullName')} className={addrErrors.full_name ? 'border-stone-950' : ''} data-testid="new-address-fullname" />
                        {addrErrors.full_name && <p className="mt-1 text-xs text-stone-700">{addrErrors.full_name.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-950 mb-1">{t('common.phone')}</label>
                        <Input {...registerAddr('phone')} type="tel" placeholder={t('common.phone')} data-testid="new-address-phone" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.street')} <span className="text-stone-700">*</span></label>
                      <Input {...registerAddr('street')} placeholder={t('checkout.street')} className={addrErrors.street ? 'border-stone-950' : ''} data-testid="new-address-street" />
                      {addrErrors.street && <p className="mt-1 text-xs text-stone-700">{addrErrors.street.message}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.city')} <span className="text-stone-700">*</span></label>
                        <Input {...registerAddr('city')} placeholder={t('checkout.city')} className={addrErrors.city ? 'border-stone-950' : ''} data-testid="new-address-city" />
                        {addrErrors.city && <p className="mt-1 text-xs text-stone-700">{addrErrors.city.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.zip')} <span className="text-stone-700">*</span></label>
                        <Input {...registerAddr('postal_code')} placeholder={t('checkout.zip')} className={addrErrors.postal_code ? 'border-stone-950' : ''} data-testid="new-address-postal" />
                        {addrErrors.postal_code && <p className="mt-1 text-xs text-stone-700">{addrErrors.postal_code.message}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-950 mb-1">{t('checkout.country')} <span className="text-stone-700">*</span></label>
                      <select {...registerAddr('country')} className={`w-full rounded-lg border bg-white px-4 py-2 text-sm ${addrErrors.country ? 'border-stone-950' : 'border-stone-200'}`} data-testid="new-address-country">
                        <option value="ES">Espana</option>
                        <option value="PT">Portugal</option>
                        <option value="FR">Francia</option>
                        <option value="DE">Alemania</option>
                        <option value="IT">Italia</option>
                        <option value="GB">Reino Unido</option>
                        <option value="US">Estados Unidos</option>
                        <option value="MX">México</option>
                        <option value="AR">Argentina</option>
                        <option value="CO">Colombia</option>
                      </select>
                      {addrErrors.country && <p className="mt-1 text-xs text-stone-700">{addrErrors.country.message}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="is_default" {...registerAddr('is_default')} className="rounded border-stone-300" />
                      <label htmlFor="is_default" className="text-sm text-stone-500">{t('checkout.setAsDefault') || 'Establecer como predeterminada'}</label>
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={savingAddress} className="flex-1" data-testid="save-new-address-btn">
                        {savingAddress ? t('common.loading') : t('common.save')}
                      </Button>
                      {savedAddresses.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNewAddressForm(false);
                            resetAddr({ country: 'ES', is_default: false });
                          }}
                          data-testid="cancel-new-address-btn"
                        >
                          {t('common.cancel')}
                        </Button>
                      )}
                    </div>
                  </form>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 p-4 md:p-6 h-fit lg:sticky lg:top-24">
              <h2 className="font-heading text-lg md:text-xl font-semibold text-stone-950 mb-3 md:mb-4">{t('checkout.orderSummary')}</h2>
              <div className="mb-4 md:mb-6">
                {!appliedDiscount ? (
                  <div className="flex gap-2">
                    <Input placeholder={t('cart.discountCode')} value={discountCode} onChange={(event) => setDiscountCode(event.target.value.toUpperCase())} className="flex-1 text-sm" data-testid="discount-code-input" />
                    <Button onClick={handleApplyDiscount} disabled={discountLoading} variant="outline" className="border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-950" data-testid="apply-discount-btn">
                      {discountLoading ? t('common.loading') : t('cart.apply')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-100 p-3" data-testid="applied-discount">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-stone-700" />
                      <span className="font-medium text-stone-950">{appliedDiscount.code}</span>
                      <span className="text-sm text-stone-700">
                        {appliedDiscount.type === 'percentage'
                          ? `-${appliedDiscount.value}%`
                          : appliedDiscount.type === 'fixed'
                            ? `-${convertAndFormatPrice(appliedDiscount.value, currency)}`
                            : t('checkout.freeShipping')}
                      </span>
                    </div>
                    <button onClick={handleRemoveDiscount} className="p-1 text-stone-700 hover:text-stone-950" data-testid="remove-discount-btn">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-stone-500">{t('cart.subtotal')}</span>
                  <span className="text-stone-950">{convertAndFormatPrice((cartSummary.subtotal_cents || Math.round(getTotalPrice() * 100)) / 100, 'EUR')}</span>
                </div>
                {appliedDiscount && appliedDiscount.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-stone-700 md:text-base">
                    <span>{t('cart.discount')}</span>
                    <span>-{convertAndFormatPrice(appliedDiscount.discount_amount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-stone-500">{t('checkout.shipping')}</span>
                  <span className="text-stone-950">
                    {(cartSummary.shipping_cents || 0) > 0 ? convertAndFormatPrice(cartSummary.shipping_cents / 100, 'EUR') : <span className="text-stone-700">{t('common.free')}</span>}
                  </span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-stone-500">IVA ({((cartSummary.tax_rate_bp || 2100) / 100).toFixed(0)}%)</span>
                  <span className="text-stone-950">{convertAndFormatPrice((cartSummary.tax_cents || 0) / 100, 'EUR')}</span>
                </div>
                <div className="border-t border-stone-200 pt-2 md:pt-3 flex justify-between">
                  <span className="font-semibold text-stone-950 text-sm md:text-base">{t('cart.total')}</span>
                  <span className="text-lg font-bold text-stone-950 md:text-xl">{convertAndFormatPrice(getDiscountedTotal(), currency)}</span>
                </div>
                {currency !== (countries[country]?.currency || 'EUR') && (
                  <div className="text-xs text-stone-500 pt-2 border-t">
                    <p>{t('checkout.displayCurrency', { currency })}</p>
                    <p className="font-medium">{t('checkout.chargeCurrency', { currency: countries[country]?.currency || 'EUR' })}</p>
                    {getExchangeRateDisplay(countries[country]?.currency || 'EUR') && (
                      <p className="text-xs mt-1">{t('checkout.exchangeRate')}: {getExchangeRateDisplay(countries[country]?.currency || 'EUR').text}</p>
                    )}
                  </div>
                )}
              </div>

              {(getSelectedAddress() || showNewAddressForm) && (
                <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-stone-50 rounded-lg">
                  <p className="text-[10px] md:text-xs text-stone-500 mb-0.5 md:mb-1">{t('checkout.shippingTo') || 'Shipping to'}:</p>
                  {showNewAddressForm ? (
                    <p className="text-xs md:text-sm text-stone-950">{t('checkout.newAddressForm') || 'New address (fill form below)'}</p>
                  ) : (
                    <p className="text-xs md:text-sm text-stone-950">{getSelectedAddress()?.full_name}, {getSelectedAddress()?.city}</p>
                  )}
                </div>
              )}

              <Button
                onClick={handleCheckout}
                disabled={checkoutLoading || !emailVerified || stockIssues.length > 0 || (!getSelectedAddress() && !showNewAddressForm)}
                className={`w-full rounded-full py-3 md:py-2 text-sm md:text-base font-medium ${!checkoutLoading && emailVerified && stockIssues.length === 0 && (getSelectedAddress() || showNewAddressForm) ? 'bg-stone-950 hover:bg-stone-800 text-white' : 'bg-stone-200 cursor-not-allowed text-stone-400'}`}
                data-testid="checkout-button"
              >
                {checkoutLoading
                  ? t('common.loading')
                  : !emailVerified
                    ? t('errors.unauthorized')
                    : stockIssues.length > 0
                      ? t('errors.generic')
                      : (!getSelectedAddress() && !showNewAddressForm)
                        ? (t('checkout.selectAddress') || 'Selecciona una dirección')
                        : t('cart.checkout')}
              </Button>

              {!emailVerified && <p className="text-xs text-stone-500 mt-2 text-center">{t('checkout.emailVerificationRequired') || 'Debes verificar tu correo electrónico'}</p>}
              {stockIssues.length > 0 && <p className="mt-2 text-center text-xs text-stone-700">{t('checkout.stockIssues') || 'Algunos productos no tienen stock suficiente'}</p>}
              {!getSelectedAddress() && !showNewAddressForm && emailVerified && stockIssues.length === 0 && (
                <p className="mt-2 text-center text-xs text-stone-700">{t('checkout.pleaseSelectAddress') || 'Selecciona o añade una dirección de envío'}</p>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
