import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { User, Lock, Leaf, MapPin, Plus, Trash2, Star, Edit2, X, AlertTriangle, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConsentSettings, ConsentSummary, ConsentFullDisclosure } from '../../components/ConsentLayers';
import apiClient from '../../services/api/client';



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
    fetchProfile();
    fetchAddresses();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await apiClient.get('/customer/profile');
      setProfileData({
        name: data.name || '',
        country: data.country || '',
        username: data.username || ''
      });
      if (data.preferences) {
        setPreferences({
          diet_preferences: data.preferences.diet_preferences || [],
          allergens: data.preferences.allergens || [],
          goals: data.preferences.goals || ''
        });
      }
      // Check consent status
      setHasConsent(data.consent?.analytics_consent || false);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const data = await apiClient.get('/customer/addresses');
      setAddresses(data.addresses || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
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
    if (deleteConfirmation !== 'DELETE') {
      toast.error(t('profile.typeDelete', 'Please type DELETE to confirm'));
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
      toast.success('Profile updated');
      checkAuth(); // Refresh user data
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    try {
      await apiClient.put(
        `/customer/password?current_password=${encodeURIComponent(passwordData.current_password)}&new_password=${encodeURIComponent(passwordData.new_password)}`,
        {}
      );
      toast.success('Password changed');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await apiClient.post('/preferences', preferences);
      toast.success('Dietary preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
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
    return <div className="text-center py-12 text-text-muted">Loading...</div>;
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-primary mb-2">
        {t('profile.title', 'My Profile')}
      </h1>
      <p className="text-text-muted mb-6">{t('profile.subtitle', 'Manage your account settings and preferences.')}</p>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-stone-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <User className="w-4 h-4" /> {t('profile.personalInfo', 'Profile')}
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'password' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Lock className="w-4 h-4" /> {t('profile.password', 'Password')}
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'preferences' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Leaf className="w-4 h-4" /> {t('profile.dietaryPreferences', 'Dietary Preferences')}
        </button>
        <button
          onClick={() => setActiveTab('address')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'address' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <MapPin className="w-4 h-4" /> {t('profile.addresses', 'Addresses')}
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'account' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Shield className="w-4 h-4" /> {t('profile.account', 'Account')}
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-xl">
          <h2 className="font-medium text-text-primary mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
              <Input value={user?.email || ''} disabled className="bg-stone-50" />
              <p className="text-xs text-text-muted mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
              <Input
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                data-testid="profile-name-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">@</span>
                <Input
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value.replace(/^@/, '') })}
                  className="pl-7"
                  placeholder="tu_username"
                  data-testid="profile-username-input"
                />
              </div>
              <p className="text-xs text-stone-400 mt-1">Letras, numeros, puntos y guiones bajos. Min 3 caracteres.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Country</label>
              <Input
                value={profileData.country}
                onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
              />
            </div>
            <Button onClick={saveProfile} disabled={saving} className="bg-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-xl">
          <h2 className="font-medium text-text-primary mb-4">Change Password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Current Password</label>
              <Input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">New Password</label>
              <Input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Confirm New Password</label>
              <Input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" disabled={saving} className="bg-primary">
              {saving ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 max-w-2xl">
          <h2 className="font-medium text-text-primary mb-4">Dietary Preferences</h2>
          <p className="text-sm text-text-muted mb-6">
            These preferences help our AI assistant recommend products that match your dietary needs.
          </p>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Diet Types</h3>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map((diet) => (
                <button
                  key={diet}
                  onClick={() => toggleDietPreference(diet)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    preferences.diet_preferences.includes(diet)
                      ? 'bg-primary text-white'
                      : 'bg-stone-100 text-text-secondary hover:bg-stone-200'
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Allergens to Avoid</h3>
            <div className="flex flex-wrap gap-2">
              {ALLERGEN_OPTIONS.map((allergen) => (
                <button
                  key={allergen}
                  onClick={() => toggleAllergen(allergen)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    preferences.allergens.includes(allergen)
                      ? 'bg-red-500 text-white'
                      : 'bg-stone-100 text-text-secondary hover:bg-stone-200'
                  }`}
                >
                  {allergen}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Health Goals (Optional)</h3>
            <textarea
              value={preferences.goals}
              onChange={(e) => setPreferences({ ...preferences, goals: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-stone-200 min-h-[100px]"
              placeholder="e.g., Weight loss, muscle building, heart health..."
            />
          </div>

          <Button onClick={savePreferences} disabled={saving} className="bg-primary">
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      )}

      {/* Address Tab */}
      {activeTab === 'address' && (
        <div className="bg-white p-6 rounded-lg border border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading text-xl font-semibold text-text-primary">
                {t('profile.shippingAddresses', 'Shipping Addresses')}
              </h3>
              <p className="text-text-muted text-sm mt-1">
                {t('profile.addressesDescription', 'Manage your shipping addresses for faster checkout.')}
              </p>
            </div>
            {!showAddressForm && (
              <Button
                onClick={() => setShowAddressForm(true)}
                className="bg-primary hover:bg-primary-hover"
                data-testid="add-address-btn"
              >
                <Plus className="w-4 h-4 mr-2" /> {t('checkout.addNewAddress', 'Add Address')}
              </Button>
            )}
          </div>

          {/* Address Form */}
          {showAddressForm && (
            <div className="mb-6 p-4 border border-stone-200 rounded-lg bg-stone-50" data-testid="address-form">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-text-primary">
                  {editingAddressId ? t('profile.editAddress', 'Edit Address') : t('checkout.addNewAddress', 'Add New Address')}
                </h4>
                <button onClick={resetAddressForm} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t('checkout.addressName', 'Address Name')}
                  </label>
                  <Input
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({...addressForm, name: e.target.value})}
                    placeholder={t('checkout.addressNamePlaceholder', 'e.g., Home, Office')}
                    data-testid="address-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t('checkout.fullName', 'Full Name')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={addressForm.full_name}
                    onChange={(e) => setAddressForm({...addressForm, full_name: e.target.value})}
                    placeholder={t('checkout.fullName', 'Full Name')}
                    required
                    data-testid="address-fullname-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t('checkout.street', 'Street')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                    placeholder={t('checkout.street', 'Street Address')}
                    required
                    data-testid="address-street-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t('checkout.city', 'City')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                    placeholder={t('checkout.city', 'City')}
                    required
                    data-testid="address-city-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t('checkout.zip', 'Postal Code')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({...addressForm, postal_code: e.target.value})}
                    placeholder={t('checkout.zip', 'Postal Code')}
                    required
                    data-testid="address-postal-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t('checkout.country', 'Country')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={addressForm.country}
                    onChange={(e) => setAddressForm({...addressForm, country: e.target.value})}
                    placeholder={t('checkout.country', 'Country')}
                    required
                    data-testid="address-country-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    {t('common.phone', 'Phone')}
                  </label>
                  <Input
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})}
                    placeholder={t('common.phone', 'Phone')}
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
                  className="rounded border-stone-300"
                />
                <label htmlFor="is_default" className="text-sm text-text-muted">
                  {t('checkout.setAsDefault', 'Set as default address')}
                </label>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={editingAddressId ? handleUpdateAddress : handleAddAddress}
                  disabled={saving}
                  className="bg-primary hover:bg-primary-hover"
                  data-testid="save-address-btn"
                >
                  {saving ? t('common.loading', 'Saving...') : editingAddressId ? t('common.update', 'Update') : t('common.save', 'Save')}
                </Button>
                <Button variant="outline" onClick={resetAddressForm}>
                  {t('common.cancel', 'Cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* Addresses List */}
          {addresses.length === 0 && !showAddressForm ? (
            <div className="text-center py-8 text-text-muted">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>{t('profile.noAddresses', 'No saved addresses yet.')}</p>
              <p className="text-sm">{t('profile.addFirstAddress', 'Add your first address to speed up checkout.')}</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="addresses-list">
              {addresses.map((address) => (
                <div
                  key={address.address_id}
                  className={`p-4 rounded-lg border-2 ${
                    address.is_default ? 'border-primary bg-primary/5' : 'border-stone-200'
                  }`}
                  data-testid={`address-card-${address.address_id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-text-primary">
                          {address.name || t('checkout.shippingAddress', 'Address')}
                        </span>
                        {address.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded flex items-center gap-1">
                            <Star className="w-3 h-3" /> {t('checkout.default', 'Default')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-muted">{address.full_name}</p>
                      <p className="text-sm text-text-muted">{address.street}</p>
                      <p className="text-sm text-text-muted">{address.city}, {address.postal_code}</p>
                      <p className="text-sm text-text-muted">{address.country}</p>
                      {address.phone && <p className="text-sm text-text-muted mt-1">📞 {address.phone}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {!address.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(address.address_id)}
                          className="text-text-muted hover:text-primary"
                          title={t('profile.setAsDefault', 'Set as default')}
                          data-testid={`set-default-${address.address_id}`}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditAddress(address)}
                        className="text-text-muted hover:text-text-primary"
                        data-testid={`edit-address-${address.address_id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAddress(address.address_id)}
                        className="text-text-muted hover:text-red-500"
                        data-testid={`delete-address-${address.address_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <ConsentSettings 
              hasConsent={hasConsent}
              onWithdraw={handleWithdrawConsent}
              onReactivate={handleReactivateConsent}
              loading={saving}
            />
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 rounded-xl border-2 border-red-200 p-6">
            <h3 className="font-medium text-red-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('profile.dangerZone', 'Danger Zone')}
            </h3>
            
            <div className="p-4 bg-white rounded-lg border border-red-200">
              <p className="font-medium text-red-700">{t('profile.deleteAccount', 'Delete Account')}</p>
              <p className="text-sm text-red-600 mt-1 mb-3">
                {t('profile.deleteWarning', 'This action is permanent and cannot be undone. All your data will be deleted.')}
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 hover:bg-red-700"
                data-testid="delete-account-btn"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('profile.deleteMyAccount', 'Delete My Account')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="font-heading text-xl font-bold text-text-primary">
                {t('profile.confirmDeleteTitle', 'Delete Account')}
              </h2>
            </div>
            
            <p className="text-text-muted mb-4">
              {t('profile.confirmDeleteDescription', 'This will permanently delete your account, orders history, and all personal data. This action cannot be undone.')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('profile.enterPassword', 'Enter your password')}
                </label>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="••••••••"
                  data-testid="delete-password-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  {t('profile.typeDelete', 'Type DELETE to confirm')}
                </label>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                  placeholder="BORRAR"
                  className="font-mono"
                  data-testid="delete-confirmation-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteConfirmation('');
                }}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmation !== 'DELETE' || !deletePassword}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                data-testid="confirm-delete-btn"
              >
                {deleting ? t('common.loading', 'Deleting...') : t('profile.deleteForever', 'Delete Forever')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
