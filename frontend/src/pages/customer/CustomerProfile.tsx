// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { User, Lock, Leaf, MapPin, Plus, Trash2, Star, Edit2, X, AlertTriangle, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConsentSettings } from '../../components/ConsentLayers';
import apiClient from '../../services/api/client';
import FocusTrap from 'focus-trap-react';

const DIET_OPTIONS = [
  'Vegan',
  'Vegetarian',
  'Gluten-Free',
  'Halal',
  'Kosher',
  'Low-Sugar',
  'Organic',
  'Keto',
  'Paleo'
];

const ALLERGEN_OPTIONS = [
  'Nuts',
  'Gluten',
  'Dairy',
  'Eggs',
  'Soy',
  'Shellfish',
  'Fish',
  'Sesame'
];

export default function CustomerProfile() {
  const { user, checkAuth, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [profileData, setProfileData] = useState({
    name: '',
    country: '',
    username: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [preferences, setPreferences] = useState({
    diet_preferences: [],
    allergens: [],
    goals: ''
  });

  // Multiple addresses support
  const [addresses, setAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    name: '',
    full_name: '',
    street: '',
    city: '',
    postal_code: '',
    country: '',
    phone: '',
    is_default: false
  });

  // Account management state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiClient.get('/customer/profile');
        if (!mounted) return;
        setProfileData({ name: data.name || '', country: data.country || '', username: data.username || '' });
        if (data.preferences) {
          setPreferences({ diet_preferences: data.preferences.diet_preferences || [], allergens: data.preferences.allergens || [], goals: data.preferences.goals || '' });
        }
        setHasConsent(data.consent?.analytics_consent || false);
      } catch {
        if (mounted) toast.error('Error al cargar el perfil');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    fetchAddresses();
    return () => { mounted = false; };
  }, []);

  const fetchAddresses = async () => {
    try {
      const data = await apiClient.get('/customer/addresses');
      setAddresses(data.addresses || []);
    } catch {
      toast.error('Error al cargar las direcciones');
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      name: '',
      full_name: '',
      street: '',
      city: '',
      postal_code: '',
      country: '',
      phone: '',
      is_default: false
    });
    setEditingAddressId(null);
    setShowAddressForm(false);
  };

  const handleAddAddress = async () => {
    if (!addressForm.full_name || !addressForm.street || !addressForm.city || !addressForm.postal_code || !addressForm.country) {
      toast.error(t('checkout.fillAllFields', 'Please fill in all required fields'));
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/customer/addresses', {
        ...addressForm,
        name: addressForm.name || t('checkout.newAddress', 'New Address')
      });
      toast.success(t('success.saved', 'Address saved'));
      fetchAddresses();
      resetAddressForm();
    } catch (error) {
      toast.error(error.message || t('errors.generic', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditAddress = (address) => {
    setAddressForm({
      name: address.name || '',
      full_name: address.full_name || '',
      street: address.street || '',
      city: address.city || '',
      postal_code: address.postal_code || '',
      country: address.country || '',
      phone: address.phone || '',
      is_default: address.is_default || false
    });
    setEditingAddressId(address.address_id);
    setShowAddressForm(true);
  };

  const handleUpdateAddress = async () => {
    if (!addressForm.full_name || !addressForm.street || !addressForm.city || !addressForm.postal_code || !addressForm.country) {
      toast.error(t('checkout.fillAllFields', 'Please fill in all required fields'));
      return;
    }

    setSaving(true);
    try {
      await apiClient.put(`/customer/addresses/${editingAddressId}`, {
        ...addressForm,
        name: addressForm.name || t('checkout.newAddress', 'Address')
      });
      toast.success(t('success.updated', 'Address updated'));
      fetchAddresses();
      resetAddressForm();
    } catch (error) {
      toast.error(error.message || t('errors.generic', 'Failed to update'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm(t('common.confirmDelete', 'Are you sure you want to delete this address?'))) return;

    try {
      await apiClient.delete(`/customer/addresses/${addressId}`);
      toast.success(t('success.deleted', 'Address deleted'));
      fetchAddresses();
    } catch (error) {
      toast.error(error.message || t('errors.generic', 'Failed to delete'));
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      await apiClient.put(`/customer/addresses/${addressId}/default`, {});
      toast.success(t('profile.defaultAddressSet', 'Default address updated'));
      fetchAddresses();
    } catch (error) {
      toast.error(error.message || t('errors.generic', 'Failed to set default'));
    }
  };

  // Account management functions
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'BORRAR') {
      toast.error(t('profile.typeDelete', 'Escribe BORRAR para confirmar'));
      return;
    }

    setDeleting(true);
    try {
      await apiClient.delete('/account/delete', {
        data: { password: deletePassword, confirmation: deleteConfirmation }
      });
      toast.success(t('profile.accountDeleted', 'Account deleted successfully'));
      logout();
      navigate('/');
    } catch (error) {
      toast.error(error.message || t('errors.generic', 'Failed to delete account'));
    } finally {
      setDeleting(false);
    }
  };

  const handleWithdrawConsent = async () => {
    setSaving(true);
    try {
      await apiClient.put('/account/withdraw-consent', {});
      toast.success(t('profile.consentWithdrawn', 'Consent withdrawn successfully'));
      setHasConsent(false);
    } catch (error) {
      toast.error(error.message || t('errors.generic', 'Failed to withdraw consent'));
    } finally {
      setSaving(false);
    }
  };

  const handleReactivateConsent = async () => {
    setSaving(true);
    try {
      await apiClient.put('/account/reactivate-consent', {});
      toast.success(t('profile.consentReactivated', 'Personalization enabled'));
      setHasConsent(true);
    } catch (error) {
      toast.error(error.message || t('errors.generic', 'Failed to enable personalization'));
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.put('/customer/profile', profileData);
      toast.success(t('success.saved', 'Perfil actualizado'));
      checkAuth(); // Refresh user data
    } catch (error) {
      toast.error(t('errors.generic', 'Error al actualizar el perfil'));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error(t('errors.passwordMismatch', 'Las contraseñas no coinciden'));
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error(t('errors.passwordTooShort', 'La contraseña debe tener al menos 6 caracteres'));
      return;
    }

    setSaving(true);
    try {
      await apiClient.put('/customer/password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      toast.success(t('success.saved', 'Contraseña actualizada'));
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.message || t('errors.generic', 'Error al cambiar la contraseña'));
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await apiClient.post('/preferences', preferences);
      toast.success(t('success.saved', 'Preferencias guardadas'));
    } catch (error) {
      toast.error(t('errors.generic', 'Error al guardar preferencias'));
    } finally {
      setSaving(false);
    }
  };

  const toggleDietPreference = (pref) => {
    setPreferences(prev => ({
      ...prev,
      diet_preferences: prev.diet_preferences.includes(pref)
        ? prev.diet_preferences.filter(p => p !== pref)
        : [...prev.diet_preferences, pref]
    }));
  };

  const toggleAllergen = (allergen) => {
    setPreferences(prev => ({
      ...prev,
      allergens: prev.allergens.includes(allergen)
        ? prev.allergens.filter(a => a !== allergen)
        : [...prev.allergens, allergen]
    }));
  };

  if (loading) {
    return (
      <div className="py-12 space-y-4 max-w-xl animate-pulse">
        <div className="h-8 w-48 bg-stone-100 rounded-2xl" />
        <div className="h-4 w-72 bg-stone-100 rounded" />
        <div className="h-48 bg-stone-100 rounded-2xl mt-6" />
      </div>
    );
  }

  return (
    <div className="max-w-[975px] mx-auto">
      <h1 className="text-3xl font-bold text-stone-950 mb-2">
        {t('profile.title', 'My Profile')}
      </h1>
      <p className="text-stone-500 mb-6">{t('profile.subtitle', 'Manage your account settings and preferences.')}</p>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-stone-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          <User className="w-4 h-4" /> {t('profile.personalInfo', 'Profile')}
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'password'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          <Lock className="w-4 h-4" /> {t('profile.password', 'Password')}
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          <Leaf className="w-4 h-4" /> {t('profile.dietaryPreferences', 'Dietary Preferences')}
        </button>
        <button
          onClick={() => setActiveTab('address')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'address'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          <MapPin className="w-4 h-4" /> {t('profile.addresses', 'Addresses')}
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'account'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          <Shield className="w-4 h-4" /> {t('profile.account', 'Account')}
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-xl">
          <h2 className="font-medium text-stone-950 mb-4">{t('profile.personalInfo', 'Información personal')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('common.email', 'Email')}</label>
              <input value={user?.email || ''} disabled readOnly className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950 bg-stone-50" />
              <p className="text-xs text-stone-500 mt-1">{t('profile.emailReadonly', 'El email no se puede cambiar')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('checkout.fullName', 'Nombre completo')}</label>
              <input
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                data-testid="profile-name-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('profile.username', 'Usuario')}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">@</span>
                <input
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value.replace(/^@/, '') })}
                  className="w-full px-3 py-2 pl-7 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                  placeholder="tu_username"
                  data-testid="profile-username-input"
                />
              </div>
              <p className="text-xs text-stone-400 mt-1">Letras, numeros, puntos y guiones bajos. Min 3 caracteres.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('checkout.country', 'País')}</label>
              <input
                value={profileData.country}
                onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
              />
            </div>
            <button onClick={saveProfile} disabled={saving} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors">
              {saving ? t('common.loading', 'Guardando...') : t('common.save', 'Guardar cambios')}
            </button>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-xl">
          <h2 className="font-medium text-stone-950 mb-4">{t('profile.changePassword', 'Cambiar contraseña')}</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('profile.currentPassword', 'Contraseña actual')}</label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('profile.newPassword', 'Nueva contraseña')}</label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">{t('profile.confirmPassword', 'Confirmar nueva contraseña')}</label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                required
                className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
              />
            </div>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors">
              {saving ? t('common.loading', 'Cambiando...') : t('profile.changePassword', 'Cambiar contraseña')}
            </button>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-2xl">
          <h2 className="font-medium text-stone-950 mb-4">{t('profile.dietaryPreferences', 'Preferencias dietéticas')}</h2>
          <p className="text-sm text-stone-500 mb-6">
            {t('profile.dietaryDescription', 'Estas preferencias ayudan a nuestro asistente a recomendarte productos que se adapten a tus necesidades.')}
          </p>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-stone-600 mb-3">{t('profile.dietTypes', 'Tipos de dieta')}</h3>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map((diet) => (
                <button
                  key={diet}
                  onClick={() => toggleDietPreference(diet)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    preferences.diet_preferences.includes(diet)
                      ? 'bg-stone-950 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-stone-600 mb-3">{t('profile.allergensToAvoid', 'Alérgenos a evitar')}</h3>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((allergen) => (
                <button
                  key={allergen}
                  onClick={() => toggleAllergen(allergen)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    preferences.allergens.includes(allergen)
                      ? 'bg-stone-950 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {allergen}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-stone-600 mb-3">{t('profile.healthGoals', 'Objetivos de salud (opcional)')}</h3>
            <textarea
              value={preferences.goals}
              onChange={(e) => setPreferences({ ...preferences, goals: e.target.value })}
              className="w-full px-4 py-2 rounded-2xl border border-stone-200 min-h-[100px] text-stone-950 outline-none focus:border-stone-950"
              placeholder={t('profile.healthGoalsPlaceholder', 'Ej: pérdida de peso, ganar músculo, salud cardiovascular...')}
            />
          </div>

          <button onClick={savePreferences} disabled={saving} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors">
            {saving ? t('common.loading', 'Guardando...') : t('common.save', 'Guardar preferencias')}
          </button>
        </div>
      )}

      {/* Address Tab */}
      {activeTab === 'address' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-stone-950">
                {t('profile.shippingAddresses', 'Shipping Addresses')}
              </h3>
              <p className="text-stone-500 text-sm mt-1">
                {t('profile.addressesDescription', 'Manage your shipping addresses for faster checkout.')}
              </p>
            </div>
            {!showAddressForm && (
              <button
                onClick={() => setShowAddressForm(true)}
                className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors flex items-center gap-2"
                data-testid="add-address-btn"
              >
                <Plus className="w-4 h-4" /> {t('checkout.addNewAddress', 'Add Address')}
              </button>
            )}
          </div>

          {/* Address Form */}
          {showAddressForm && (
            <div className="mb-6 p-4 border border-stone-200 rounded-2xl bg-stone-50" data-testid="address-form">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-stone-950">
                  {editingAddressId ? t('profile.editAddress', 'Edit Address') : t('checkout.addNewAddress', 'Add New Address')}
                </h4>
                <button onClick={resetAddressForm} className="text-stone-500 hover:text-stone-950">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-950 mb-1">
                    {t('checkout.addressName', 'Address Name')}
                  </label>
                  <input
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({...addressForm, name: e.target.value})}
                    placeholder={t('checkout.addressNamePlaceholder', 'e.g., Home, Office')}
                    className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                    data-testid="address-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-950 mb-1">
                    {t('checkout.fullName', 'Full Name')} <span className="text-stone-500">*</span>
                  </label>
                  <input
                    value={addressForm.full_name}
                    onChange={(e) => setAddressForm({...addressForm, full_name: e.target.value})}
                    placeholder={t('checkout.fullName', 'Full Name')}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                    data-testid="address-fullname-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-950 mb-1">
                    {t('checkout.street', 'Street')} <span className="text-stone-500">*</span>
                  </label>
                  <input
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                    placeholder={t('checkout.street', 'Street Address')}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                    data-testid="address-street-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-950 mb-1">
                    {t('checkout.city', 'City')} <span className="text-stone-500">*</span>
                  </label>
                  <input
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                    placeholder={t('checkout.city', 'City')}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                    data-testid="address-city-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-950 mb-1">
                    {t('checkout.zip', 'Postal Code')} <span className="text-stone-500">*</span>
                  </label>
                  <input
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({...addressForm, postal_code: e.target.value})}
                    placeholder={t('checkout.zip', 'Postal Code')}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                    data-testid="address-postal-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-950 mb-1">
                    {t('checkout.country', 'Country')} <span className="text-stone-500">*</span>
                  </label>
                  <input
                    value={addressForm.country}
                    onChange={(e) => setAddressForm({...addressForm, country: e.target.value})}
                    placeholder={t('checkout.country', 'Country')}
                    required
                    className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                    data-testid="address-country-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-950 mb-1">
                    {t('common.phone', 'Phone')}
                  </label>
                  <input
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                    placeholder={t('common.phone', 'Phone')}
                    className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                    data-testid="address-phone-input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={addressForm.is_default}
                  onChange={(e) => setAddressForm({...addressForm, is_default: e.target.checked})}
                  className="rounded border-stone-200"
                />
                <label htmlFor="is_default" className="text-sm text-stone-500">
                  {t('checkout.setAsDefault', 'Set as default address')}
                </label>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={editingAddressId ? handleUpdateAddress : handleAddAddress}
                  disabled={saving}
                  className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
                  data-testid="save-address-btn"
                >
                  {saving ? t('common.loading', 'Saving...') : editingAddressId ? t('common.update', 'Update') : t('common.save', 'Save')}
                </button>
                <button onClick={resetAddressForm} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors">
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Addresses List */}
          {addresses.length === 0 && !showAddressForm ? (
            <div className="text-center py-8 text-stone-500">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{t('profile.noAddresses', 'No saved addresses yet.')}</p>
              <p className="text-sm">{t('profile.addFirstAddress', 'Add your first address to speed up checkout.')}</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="addresses-list">
              {addresses.map((address) => (
                <div
                  key={address.address_id}
                  className={`p-4 rounded-2xl border-2 ${
                    address.is_default ? 'border-stone-950 bg-stone-950/5' : 'border-stone-200'
                  }`}
                  data-testid={`address-card-${address.address_id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-stone-950">
                          {address.name || t('checkout.shippingAddress', 'Address')}
                        </span>
                        {address.is_default && (
                          <span className="text-xs bg-stone-100 text-stone-950 px-2 py-0.5 rounded flex items-center gap-1">
                            <Star className="w-3 h-3" /> {t('checkout.default', 'Default')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-stone-500">{address.full_name}</p>
                      <p className="text-sm text-stone-500">{address.street}</p>
                      <p className="text-sm text-stone-500">{address.city}, {address.postal_code}</p>
                      <p className="text-sm text-stone-500">{address.country}</p>
                      {address.phone && <p className="text-sm text-stone-500 mt-1">📞 {address.phone}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {!address.is_default && (
                        <button
                          onClick={() => handleSetDefault(address.address_id)}
                          className="p-2.5 text-stone-500 hover:text-stone-950 transition-colors"
                          title={t('profile.setAsDefault', 'Set as default')}
                          aria-label={t('profile.setAsDefault', 'Set as default')}
                          data-testid={`set-default-${address.address_id}`}
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditAddress(address)}
                        className="p-2.5 text-stone-500 hover:text-stone-950 transition-colors"
                        aria-label={t('common.edit', 'Edit')}
                        data-testid={`edit-address-${address.address_id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(address.address_id)}
                        className="p-2.5 text-stone-500 hover:text-stone-950 transition-colors"
                        aria-label={t('common.delete', 'Delete')}
                        data-testid={`delete-address-${address.address_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6 max-w-2xl">
          {/* Layer 3: Consent Settings Control */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <ConsentSettings
              hasConsent={hasConsent}
              onWithdraw={handleWithdrawConsent}
              onReactivate={handleReactivateConsent}
              loading={saving}
            />
          </div>

          {/* Affiliate Program */}
          {user?.role !== 'influencer' && (
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Star className="w-5 h-5 text-stone-700" />
                <div>
                  <h3 className="text-base font-semibold text-stone-950">Programa de afiliados</h3>
                  <p className="text-xs text-stone-500">Recomienda productos y gana comisiones</p>
                </div>
              </div>
              {user?.capabilities?.includes('affiliate') ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-stone-950">
                    ✓ Activado
                  </span>
                  <a href="/influencer/dashboard" className="text-sm font-medium text-stone-950 hover:underline">
                    Ver mis links y comisiones →
                  </a>
                </div>
              ) : (
                <>
                  <p className="text-sm text-stone-500 mb-3 leading-relaxed">
                    Genera un código de descuento personalizado.
                    Tus seguidores obtienen 10% de descuento.
                    Tú ganas entre 3% y 7% de cada venta.
                  </p>
                  <button
                    className="px-4 py-2 bg-stone-950 text-white text-sm font-medium rounded-2xl hover:bg-stone-800 transition-colors"
                    onClick={async () => {
                      try {
                        await apiClient.post('/account/enable-affiliate');
                        toast.success('¡Programa de afiliados activado!');
                        checkAuth();
                      } catch (err) {
                        toast.error(err?.message || 'Error al activar el programa');
                      }
                    }}
                  >
                    Activar programa de afiliados
                  </button>
                </>
              )}
            </div>
          )}

          {/* Danger Zone */}
          <div className="bg-stone-50 rounded-2xl border-2 border-stone-200 p-6">
            <h3 className="font-medium text-stone-700 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('profile.dangerZone', 'Danger Zone')}
            </h3>

            <div className="p-4 bg-white rounded-2xl border border-stone-200">
              <p className="font-medium text-stone-700">{t('profile.deleteAccount', 'Delete Account')}</p>
              <p className="text-sm text-stone-600 mt-1 mb-3">
                {t('profile.deleteWarning', 'This action is permanent and cannot be undone. All your data will be deleted.')}
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors flex items-center gap-2"
                data-testid="delete-account-btn"
              >
                <Trash2 className="w-4 h-4" />
                {t('profile.deleteMyAccount', 'Delete My Account')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <FocusTrap focusTrapOptions={{ escapeDeactivates: true, allowOutsideClick: true, returnFocusOnDeactivate: true, onDeactivate: () => { setShowDeleteModal(false); setDeletePassword(''); setDeleteConfirmation(''); } }}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" role="dialog" aria-modal="true" aria-label={t('profile.confirmDeleteTitle', 'Delete Account')}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-stone-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-stone-700" />
              </div>
              <h2 className="text-xl font-bold text-stone-950">
                {t('profile.confirmDeleteTitle', 'Delete Account')}
              </h2>
            </div>

            <p className="text-stone-500 mb-4">
              {t('profile.confirmDeleteDescription', 'This will permanently delete your account, orders history, and all personal data. This action cannot be undone.')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">
                  {t('profile.enterPassword', 'Enter your password')}
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                  data-testid="delete-password-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">
                  {t('profile.typeDelete', 'Type DELETE to confirm')}
                </label>
                <input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                  placeholder="BORRAR"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950 font-mono"
                  data-testid="delete-confirmation-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteConfirmation('');
                }}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmation !== 'BORRAR' || !deletePassword}
                className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors"
                data-testid="confirm-delete-btn"
              >
                {deleting ? t('common.loading', 'Deleting...') : t('profile.deleteForever', 'Delete Forever')}
              </button>
            </div>
          </div>
        </div>
        </FocusTrap>
      )}
    </div>
  );
}
