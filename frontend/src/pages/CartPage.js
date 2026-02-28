import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import axios from 'axios';
import { toast } from 'sonner';
import { Trash2, Mail, CheckCircle, AlertTriangle, Tag, X, AlertCircle, MapPin, Plus, Check } from 'lucide-react';
import { API } from '../utils/api';



export default function CartPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, checkAuth } = useAuth();
  const { cartItems, removeFromCart, getTotalPrice, loading, fetchCart } = useCart();
  const { t, convertAndFormatPrice, getConvertedPrice, currency, getExchangeRateDisplay, countries, country } = useLocale();
  const [emailVerified, setEmailVerified] = useState(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  
  // Discount code state
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [stockIssues, setStockIssues] = useState([]);
  
  // Address state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    full_name: '',
    street: '',
    city: '',
    postal_code: '',
    country: '',
    phone: '',
    is_default: false
  });
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    // Only redirect if auth has finished loading and user is not logged in
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkVerificationStatus();
      fetchCartWithDiscount();
      fetchSavedAddresses();
    }
  }, [user]);

  const fetchSavedAddresses = async () => {
    try {
      const response = await axios.get(`${API}/customer/addresses`, { withCredentials: true });
      const addresses = response.data.addresses || [];
      setSavedAddresses(addresses);
      
      // Auto-select default address or first address
      const defaultAddr = addresses.find(a => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.address_id);
      } else if (addresses.length > 0) {
        setSelectedAddressId(addresses[0].address_id);
      } else {
        setShowNewAddressForm(true);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  };

  const handleSaveNewAddress = async () => {
    if (!newAddress.full_name || !newAddress.street || !newAddress.city || !newAddress.postal_code || !newAddress.country) {
      toast.error(t('checkout.fillAllFields') || 'Please fill in all required fields');
      return;
    }
    
    setSavingAddress(true);
    try {
      const response = await axios.post(`${API}/customer/addresses`, {
        ...newAddress,
        name: newAddress.name || t('checkout.newAddress') || 'New Address'
      }, { withCredentials: true });
      
      const savedAddr = response.data;
      setSavedAddresses([...savedAddresses, savedAddr]);
      setSelectedAddressId(savedAddr.address_id);
      setShowNewAddressForm(false);
      setNewAddress({
        name: '',
        full_name: '',
        street: '',
        city: '',
        postal_code: '',
        country: '',
        phone: '',
        is_default: false
      });
      toast.success(t('success.saved'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.generic'));
    } finally {
      setSavingAddress(false);
    }
  };

  const getSelectedAddress = () => {
    return savedAddresses.find(a => a.address_id === selectedAddressId);
  };

  const checkVerificationStatus = async () => {
    try {
      const response = await axios.get(`${API}/auth/verification-status`, { withCredentials: true });
      setEmailVerified(response.data.email_verified);
    } catch (error) {
      console.error('Error checking verification status:', error);
    }
  };

  const fetchCartWithDiscount = async () => {
    try {
      const response = await axios.get(`${API}/cart`, { withCredentials: true });
      if (response.data.discount) {
        setAppliedDiscount(response.data.discount);
      }
      // Check for stock issues
      const issues = response.data.items?.filter(item => !item.stock_available) || [];
      setStockIssues(issues);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationToken.trim()) {
      toast.error(t('checkout.verificationCodePlaceholder'));
      return;
    }
    
    setVerifying(true);
    try {
      await axios.post(`${API}/auth/verify-email?token=${verificationToken}`, {}, { withCredentials: true });
      toast.success(t('checkout.emailVerifiedSuccess'));
      setEmailVerified(true);
      checkAuth(); // Refresh user data
    } catch (error) {
      toast.error(error.response?.data?.detail || t('checkout.invalidCode'));
    } finally {
      setVerifying(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const response = await axios.post(`${API}/auth/resend-verification`, {}, { withCredentials: true });
      toast.success(t('checkout.verificationSent') || 'Código enviado. Revisa tu email.');
      // For MVP, show the token (in production this would be emailed)
      if (response.data.verification_token) {
        toast.info(`MVP: ${response.data.verification_token.substring(0, 8)}...`);
      }
    } catch (error) {
      toast.error(t('checkout.failedResend'));
    } finally {
      setResending(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      toast.error(t('errors.generic'));
      return;
    }
    
    setApplyingDiscount(true);
    try {
      const response = await axios.post(
        `${API}/cart/apply-discount?code=${discountCode.toUpperCase()}`,
        {},
        { withCredentials: true }
      );
      setAppliedDiscount(response.data.discount);
      setDiscountCode('');
      toast.success(t('success.added'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.generic'));
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleRemoveDiscount = async () => {
    try {
      await axios.delete(`${API}/cart/remove-discount`, { withCredentials: true });
      setAppliedDiscount(null);
      toast.success(t('success.deleted'));
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  };

  // Calculate totals with currency conversion
  const getDiscountedTotal = () => {
    const subtotal = getTotalPrice();
    if (!appliedDiscount) return subtotal;
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

    // Validate address selection
    const selectedAddress = getSelectedAddress();
    if (!selectedAddress && !showNewAddressForm) {
      toast.error(t('checkout.selectAddress') || 'Please select a shipping address');
      return;
    }

    // If adding new address, save it first
    if (showNewAddressForm) {
      if (!newAddress.full_name || !newAddress.street || !newAddress.city || !newAddress.postal_code || !newAddress.country) {
        toast.error(t('checkout.fillAllFields') || 'Please fill in all required address fields');
        return;
      }
    }

    const addressToUse = showNewAddressForm ? {
      full_name: newAddress.full_name,
      street: newAddress.street,
      city: newAddress.city,
      postal_code: newAddress.postal_code,
      country: newAddress.country,
      phone: newAddress.phone || ''
    } : {
      full_name: selectedAddress.full_name,
      street: selectedAddress.street,
      city: selectedAddress.city,
      postal_code: selectedAddress.postal_code,
      country: selectedAddress.country,
      phone: selectedAddress.phone || ''
    };

    try {
      // Create checkout session with selected address
      const response = await axios.post(
        `${API}/payments/create-checkout`,
        {
          shipping_address: addressToUse
        },
        {
          withCredentials: true,
          headers: {
            'origin': window.location.origin
          }
        }
      );

      // Redirect to Stripe
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      // Handle stock validation errors from backend
      if (error.response?.data?.detail?.issues) {
        const issues = error.response.data.detail.issues;
        issues.forEach(issue => toast.error(issue));
      } else {
        const errorMessage = error.response?.data?.detail || t('checkout.checkoutFailed');
        toast.error(typeof errorMessage === 'string' ? errorMessage : t('checkout.checkoutFailed'));
      }
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-text-muted">{t('common.loading')}</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 pb-32 md:pb-12">
        {/* Breadcrumbs - Hidden on mobile */}
        <div className="hidden md:block">
          <Breadcrumbs className="mb-6" />
        </div>
        
        {/* Back Button - Hidden on mobile (use header back) */}
        <div className="mb-4 md:mb-6 hidden md:block">
          <BackButton label={t('checkout.continueShopping')} />
        </div>

        <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-text-primary mb-4 md:mb-8" data-testid="cart-page-title">
          {t('cart.title')}
        </h1>

        {/* Email Verification Banner */}
        {emailVerified === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8" data-testid="verification-banner">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">{t('checkout.verifyEmail')}</h3>
                <p className="text-amber-800 mb-4">
                  {t('checkout.verifyEmailMessage')} ({user.email})
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2 flex-1">
                    <Input
                      placeholder={t('checkout.verificationCodePlaceholder')}
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value)}
                      className="flex-1 max-w-xs"
                      data-testid="verification-input"
                    />
                    <Button
                      onClick={handleVerifyEmail}
                      disabled={verifying}
                      className="bg-amber-600 hover:bg-amber-700"
                      data-testid="verify-button"
                    >
                      {verifying ? t('checkout.verifying') : t('checkout.verify')}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="border-amber-300 text-amber-700"
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

        {/* Verified Badge */}
        {emailVerified === true && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6 inline-flex items-center gap-2" data-testid="verified-badge">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">{t('checkout.emailVerified', 'Email verificado')}</span>
          </div>
        )}

        {loading ? (
          <p className="text-text-muted text-center py-12">{t('common.loading')}</p>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
            <p className="text-text-muted mb-4">{t('cart.empty')}</p>
            <Button onClick={() => navigate('/products')} className="bg-primary hover:bg-primary-hover">
              {t('cart.continueShopping')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const hasStockIssue = stockIssues.some(i => i.product_id === item.product_id);
                // Generate unique key for items with variants/packs
                const itemKey = item.variant_id && item.pack_id 
                  ? `${item.product_id}-${item.variant_id}-${item.pack_id}`
                  : item.product_id;
                return (
                  <div
                    key={itemKey}
                    className={`bg-white rounded-xl border p-3 md:p-6 flex items-start md:items-center gap-3 md:gap-6 ${hasStockIssue ? 'border-red-300 bg-red-50' : 'border-stone-200'}`}
                    data-testid={`cart-item-${itemKey}`}
                  >
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                      {item.image && (
                        <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary text-sm md:text-base line-clamp-2">{item.product_name}</h3>
                      {/* Variant and Pack info */}
                      {(item.variant_name || item.pack_label) && (
                        <p className="text-xs md:text-sm text-text-muted">
                          {item.variant_name && <span>{item.variant_name}</span>}
                          {item.variant_name && item.pack_label && <span> · </span>}
                          {item.pack_label && <span>{item.pack_label}</span>}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-1 md:mt-2">
                        <div>
                          <p className="text-xs md:text-sm text-text-muted">{t('cart.quantity', 'Cantidad')}: {item.quantity}</p>
                          <p className="text-primary font-bold text-sm md:text-base mt-0.5">
                            {convertAndFormatPrice((item.price * item.quantity), item.currency || 'EUR')}
                          </p>
                        </div>
                        {/* Delete button - Mobile: icon only */}
                        <button
                          onClick={() => removeFromCart(item.product_id, item.variant_id, item.pack_id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors md:hidden"
                          data-testid={`remove-item-${itemKey}-mobile`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Stock issue warning */}
                      {hasStockIssue && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          <span>{stockIssues.find(i => i.product_id === item.product_id)?.message}</span>
                        </div>
                      )}
                    </div>
                    {/* Delete button - Desktop */}
                    <button
                      onClick={() => removeFromCart(item.product_id, item.variant_id, item.pack_id)}
                      className="hidden md:flex p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      data-testid={`remove-item-${itemKey}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}

              {/* Shipping Address Section */}
              <div className="bg-white rounded-xl border border-stone-200 p-4 md:p-6 mt-4 md:mt-6" data-testid="shipping-address-section">
                <h3 className="font-heading text-base md:text-lg font-semibold text-text-primary mb-3 md:mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                  {t('checkout.shippingAddress')}
                </h3>

                {/* Saved Addresses */}
                {savedAddresses.length > 0 && !showNewAddressForm && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.address_id}
                        onClick={() => setSelectedAddressId(addr.address_id)}
                        className={`cursor-pointer p-3 md:p-4 rounded-lg border-2 transition-all ${
                          selectedAddressId === addr.address_id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                        data-testid={`address-${addr.address_id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 md:gap-2 mb-0.5 md:mb-1 flex-wrap">
                              <span className="font-medium text-text-primary text-sm md:text-base truncate">{addr.name || t('checkout.shippingAddress')}</span>
                              {addr.is_default && (
                                <span className="text-[10px] md:text-xs bg-primary/10 text-primary px-1.5 md:px-2 py-0.5 rounded whitespace-nowrap">
                                  {t('checkout.default') || 'Default'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs md:text-sm text-text-muted truncate">{addr.full_name}</p>
                            <p className="text-xs md:text-sm text-text-muted truncate">{addr.street}</p>
                            <p className="text-xs md:text-sm text-text-muted">{addr.city}, {addr.postal_code}</p>
                          </div>
                          {selectedAddressId === addr.address_id && (
                            <Check className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Address Button */}
                {!showNewAddressForm && (
                  <Button
                    variant="outline"
                    onClick={() => setShowNewAddressForm(true)}
                    className="w-full border-dashed border-2 hover:border-primary hover:text-primary"
                    data-testid="add-new-address-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('checkout.addNewAddress') || 'Add New Address'}
                  </Button>
                )}

                {/* New Address Form */}
                {showNewAddressForm && (
                  <div className="space-y-4 p-4 border border-stone-200 rounded-lg" data-testid="new-address-form">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        {t('checkout.addressName') || 'Address Name'}
                      </label>
                      <Input
                        placeholder={t('checkout.addressNamePlaceholder') || 'e.g., Home, Office'}
                        value={newAddress.name}
                        onChange={(e) => setNewAddress({...newAddress, name: e.target.value})}
                        data-testid="new-address-name"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          {t('checkout.fullName')} <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder={t('checkout.fullName')}
                          value={newAddress.full_name}
                          onChange={(e) => setNewAddress({...newAddress, full_name: e.target.value})}
                          data-testid="new-address-fullname"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          {t('common.phone')}
                        </label>
                        <Input
                          placeholder={t('common.phone')}
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                          data-testid="new-address-phone"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        {t('checkout.street')} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder={t('checkout.street')}
                        value={newAddress.street}
                        onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                        data-testid="new-address-street"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          {t('checkout.city')} <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder={t('checkout.city')}
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                          data-testid="new-address-city"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">
                          {t('checkout.zip')} <span className="text-red-500">*</span>
                        </label>
                        <Input
                          placeholder={t('checkout.zip')}
                          value={newAddress.postal_code}
                          onChange={(e) => setNewAddress({...newAddress, postal_code: e.target.value})}
                          data-testid="new-address-postal"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">
                        {t('checkout.country')} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        placeholder={t('checkout.country')}
                        value={newAddress.country}
                        onChange={(e) => setNewAddress({...newAddress, country: e.target.value})}
                        data-testid="new-address-country"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_default"
                        checked={newAddress.is_default}
                        onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})}
                        className="rounded border-stone-300"
                      />
                      <label htmlFor="is_default" className="text-sm text-text-muted">
                        {t('checkout.setAsDefault') || 'Set as default address'}
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleSaveNewAddress}
                        disabled={savingAddress}
                        className="flex-1 bg-primary hover:bg-primary-hover"
                        data-testid="save-new-address-btn"
                      >
                        {savingAddress ? t('common.loading') : t('common.save')}
                      </Button>
                      {savedAddresses.length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => setShowNewAddressForm(false)}
                          data-testid="cancel-new-address-btn"
                        >
                          {t('common.cancel')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl border border-stone-200 p-4 md:p-6 h-fit lg:sticky lg:top-24">
              <h2 className="font-heading text-lg md:text-xl font-semibold text-text-primary mb-3 md:mb-4">
                {t('checkout.orderSummary')}
              </h2>
              
              {/* Discount Code Input */}
              <div className="mb-4 md:mb-6">
                {!appliedDiscount ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('cart.discountCode')}
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      className="flex-1 text-sm"
                      data-testid="discount-code-input"
                    />
                    <Button
                      onClick={handleApplyDiscount}
                      disabled={applyingDiscount}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary hover:text-white"
                      data-testid="apply-discount-btn"
                    >
                      {applyingDiscount ? t('common.loading') : t('cart.apply')}
                    </Button>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between" data-testid="applied-discount">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <span className="text-green-800 font-medium">{appliedDiscount.code}</span>
                      <span className="text-green-600 text-sm">
                        {appliedDiscount.type === 'percentage' 
                          ? `-${appliedDiscount.value}%` 
                          : appliedDiscount.type === 'fixed'
                          ? `-€${appliedDiscount.value}`
                          : t('checkout.freeShipping')}
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveDiscount}
                      className="text-green-600 hover:text-green-800 p-1"
                      data-testid="remove-discount-btn"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-text-muted">{t('cart.subtotal')}</span>
                  <span className="text-text-primary">{convertAndFormatPrice(getTotalPrice(), 'EUR')}</span>
                </div>
                
                {appliedDiscount && appliedDiscount.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600 text-sm md:text-base">
                    <span>{t('cart.discount')}</span>
                    <span>-{convertAndFormatPrice(appliedDiscount.discount_amount, currency)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-text-muted">{t('checkout.shipping')}</span>
                  <span className="text-text-primary">
                    {appliedDiscount?.type === 'free_shipping' ? (
                      <span className="text-green-600">{t('common.free')}</span>
                    ) : t('common.free')}
                  </span>
                </div>
                
                <div className="border-t border-stone-200 pt-2 md:pt-3 flex justify-between">
                  <span className="font-semibold text-text-primary text-sm md:text-base">{t('cart.total')}</span>
                  <span className="font-bold text-lg md:text-xl text-primary">{convertAndFormatPrice(getDiscountedTotal(), currency)}</span>
                </div>
                
                {/* Exchange Rate Info */}
                {currency !== (countries[country]?.currency || 'EUR') && (
                  <div className="text-xs text-text-muted pt-2 border-t">
                    <p>{t('checkout.displayCurrency', { currency })}</p>
                    <p className="font-medium">{t('checkout.chargeCurrency', { currency: countries[country]?.currency || 'EUR' })}</p>
                    {getExchangeRateDisplay(countries[country]?.currency || 'EUR') && (
                      <p className="text-xs mt-1">
                        {t('checkout.exchangeRate')}: {getExchangeRateDisplay(countries[country]?.currency || 'EUR').text}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected Address Summary */}
              {(getSelectedAddress() || showNewAddressForm) && (
                <div className="mb-3 md:mb-4 p-2.5 md:p-3 bg-stone-50 rounded-lg">
                  <p className="text-[10px] md:text-xs text-text-muted mb-0.5 md:mb-1">{t('checkout.shippingTo') || 'Shipping to'}:</p>
                  {showNewAddressForm ? (
                    <p className="text-xs md:text-sm text-text-primary">{t('checkout.newAddressForm') || 'New address (fill form below)'}</p>
                  ) : (
                    <p className="text-xs md:text-sm text-text-primary">
                      {getSelectedAddress()?.full_name}, {getSelectedAddress()?.city}
                    </p>
                  )}
                </div>
              )}
              
              <Button
                onClick={handleCheckout}
                disabled={!emailVerified || stockIssues.length > 0 || (!getSelectedAddress() && !showNewAddressForm)}
                className={`w-full rounded-full py-3 md:py-2 text-sm md:text-base font-medium ${emailVerified && stockIssues.length === 0 && (getSelectedAddress() || showNewAddressForm) ? 'bg-ds-primary hover:bg-ds-primary/90 text-white' : 'bg-stone-300 cursor-not-allowed text-text-muted'}`}
                data-testid="checkout-button"
              >
                {!emailVerified 
                  ? t('errors.unauthorized')
                  : stockIssues.length > 0 
                  ? t('errors.generic')
                  : (!getSelectedAddress() && !showNewAddressForm)
                  ? (t('checkout.selectAddress') || 'Select Address')
                  : t('cart.checkout')}
              </Button>
              
              {!emailVerified && (
                <p className="text-xs text-text-muted mt-2 text-center">
                  {t('checkout.emailVerificationRequired') || 'Email verification required'}
                </p>
              )}
              {stockIssues.length > 0 && (
                <p className="text-xs text-red-500 mt-2 text-center">
                  {t('checkout.stockIssues') || 'Some items have insufficient stock'}
                </p>
              )}
              {!getSelectedAddress() && !showNewAddressForm && emailVerified && stockIssues.length === 0 && (
                <p className="text-xs text-amber-600 mt-2 text-center">
                  {t('checkout.pleaseSelectAddress') || 'Please select or add a shipping address'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
