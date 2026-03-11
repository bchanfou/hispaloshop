import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { Building2, Warehouse, Save, User, Phone, Mail, MapPin, Shield, AlertTriangle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../../utils/api';



export default function ProducerProfile() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('company');
  
  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  
  const [profile, setProfile] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    whatsapp: '',
    fiscal_address: '',
    vat_cif: ''
  });

  const [officeAddress, setOfficeAddress] = useState({
    full_name: '',
    street: '',
    city: '',
    postal_code: '',
    country: '',
    phone: ''
  });

  const [warehouseAddress, setWarehouseAddress] = useState({
    full_name: '',
    street: '',
    city: '',
    postal_code: '',
    country: '',
    phone: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/producer/profile`, { withCredentials: true });
      const data = response.data;
      
      setProfile({
        company_name: data.company_name || '',
        contact_person: data.contact_person || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        fiscal_address: data.fiscal_address || '',
        vat_cif: data.vat_cif || ''
      });

      if (data.office_address) {
        setOfficeAddress(data.office_address);
      }
      if (data.warehouse_address) {
        setWarehouseAddress(data.warehouse_address);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveAddresses = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/producer/addresses`, {
        office_address: officeAddress.street ? officeAddress : null,
        warehouse_address: warehouseAddress.street ? warehouseAddress : null
      }, { withCredentials: true });
      toast.success(t('success.saved', 'Addresses saved successfully'));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.generic', 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error(t('profile.typeDelete', 'Please type DELETE to confirm'));
      return;
    }
    
    setDeleting(true);
    try {
      await axios.delete(`${API}/account/delete`, {
        data: { password: deletePassword, confirmation: deleteConfirmation },
        withCredentials: true
      });
      toast.success(t('profile.accountDeleted', 'Account deleted successfully'));
      logout();
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || t('errors.generic', 'Failed to delete account'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-text-muted">
        {t('common.loading', 'Loading...')}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading text-3xl font-semibold text-primary mb-2">
        {t('producer.profile', 'Company Profile')}
      </h1>
      <p className="text-text-muted font-body mb-6">
        {t('producer.profileDescription', 'Manage your company information and addresses.')}
      </p>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('company')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'company' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-primary'
          }`}
          data-testid="tab-company"
        >
          <User className="w-4 h-4" /> {t('producer.companyInfo', 'Company Info')}
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'addresses' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-primary'
          }`}
          data-testid="tab-addresses"
        >
          <MapPin className="w-4 h-4" /> {t('producer.addresses', 'Addresses')}
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'account' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-primary'
          }`}
          data-testid="tab-account"
        >
          <Shield className="w-4 h-4" /> {t('profile.account', 'Account')}
        </button>
      </div>

      {/* Company Info Tab */}
      {activeTab === 'company' && (
        <div className="bg-white rounded-xl border border-stone-300 p-6 max-w-2xl">
          <h3 className="font-medium text-primary mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" /> {t('producer.companyDetails', 'Company Details')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('producer.companyName', 'Company Name')}
              </label>
              <Input value={profile.company_name} disabled className="bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('producer.vatCif', 'VAT/CIF')}
              </label>
              <Input value={profile.vat_cif} disabled className="bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('producer.contactPerson', 'Contact Person')}
              </label>
              <Input value={profile.contact_person} disabled className="bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                <Mail className="w-4 h-4 inline mr-1" /> {t('common.email', 'Email')}
              </label>
              <Input value={user?.email || ''} disabled className="bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                <Phone className="w-4 h-4 inline mr-1" /> {t('common.phone', 'Phone')}
              </label>
              <Input value={profile.phone} disabled className="bg-stone-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                WhatsApp
              </label>
              <Input value={profile.whatsapp} disabled className="bg-stone-50" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1">
                {t('producer.fiscalAddress', 'Fiscal Address')}
              </label>
              <Input value={profile.fiscal_address} disabled className="bg-stone-50" />
            </div>
          </div>

          <p className="text-sm text-text-muted mt-4">
            {t('producer.contactAdminToUpdate', 'Contact admin to update company information.')}
          </p>
        </div>
      )}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          {/* Office Address */}
          <div className="bg-white rounded-xl border border-stone-300 p-6" data-testid="office-address-section">
            <h3 className="font-medium text-primary mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> {t('producer.officeAddress', 'Office Address')}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {t('producer.officeAddressDescription', 'Your main business address for official correspondence.')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.fullName', 'Contact Name')}
                </label>
                <Input
                  value={officeAddress.full_name}
                  onChange={(e) => setOfficeAddress({...officeAddress, full_name: e.target.value})}
                  placeholder={t('checkout.fullName', 'Full Name')}
                  data-testid="office-fullname"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('common.phone', 'Phone')}
                </label>
                <Input
                  value={officeAddress.phone}
                  onChange={(e) => setOfficeAddress({...officeAddress, phone: e.target.value})}
                  placeholder="+34 600 000 000"
                  data-testid="office-phone"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.street', 'Street')}
                </label>
                <Input
                  value={officeAddress.street}
                  onChange={(e) => setOfficeAddress({...officeAddress, street: e.target.value})}
                  placeholder={t('checkout.street', 'Street Address')}
                  data-testid="office-street"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.city', 'City')}
                </label>
                <Input
                  value={officeAddress.city}
                  onChange={(e) => setOfficeAddress({...officeAddress, city: e.target.value})}
                  placeholder={t('checkout.city', 'City')}
                  data-testid="office-city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.zip', 'Postal Code')}
                </label>
                <Input
                  value={officeAddress.postal_code}
                  onChange={(e) => setOfficeAddress({...officeAddress, postal_code: e.target.value})}
                  placeholder={t('checkout.zip', 'Postal Code')}
                  data-testid="office-postal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.country', 'Country')}
                </label>
                <Input
                  value={officeAddress.country}
                  onChange={(e) => setOfficeAddress({...officeAddress, country: e.target.value})}
                  placeholder={t('checkout.country', 'Country')}
                  data-testid="office-country"
                />
              </div>
            </div>
          </div>

          {/* Warehouse Address */}
          <div className="bg-white rounded-xl border border-stone-300 p-6" data-testid="warehouse-address-section">
            <h3 className="font-medium text-primary mb-4 flex items-center gap-2">
              <Warehouse className="w-5 h-5" /> {t('producer.warehouseAddress', 'Warehouse Address')}
            </h3>
            <p className="text-sm text-text-muted mb-4">
              {t('producer.warehouseAddressDescription', 'Address where products are stored and shipped from.')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.fullName', 'Contact Name')}
                </label>
                <Input
                  value={warehouseAddress.full_name}
                  onChange={(e) => setWarehouseAddress({...warehouseAddress, full_name: e.target.value})}
                  placeholder={t('checkout.fullName', 'Full Name')}
                  data-testid="warehouse-fullname"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('common.phone', 'Phone')}
                </label>
                <Input
                  value={warehouseAddress.phone}
                  onChange={(e) => setWarehouseAddress({...warehouseAddress, phone: e.target.value})}
                  placeholder="+34 600 000 000"
                  data-testid="warehouse-phone"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.street', 'Street')}
                </label>
                <Input
                  value={warehouseAddress.street}
                  onChange={(e) => setWarehouseAddress({...warehouseAddress, street: e.target.value})}
                  placeholder={t('checkout.street', 'Street Address')}
                  data-testid="warehouse-street"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.city', 'City')}
                </label>
                <Input
                  value={warehouseAddress.city}
                  onChange={(e) => setWarehouseAddress({...warehouseAddress, city: e.target.value})}
                  placeholder={t('checkout.city', 'City')}
                  data-testid="warehouse-city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.zip', 'Postal Code')}
                </label>
                <Input
                  value={warehouseAddress.postal_code}
                  onChange={(e) => setWarehouseAddress({...warehouseAddress, postal_code: e.target.value})}
                  placeholder={t('checkout.zip', 'Postal Code')}
                  data-testid="warehouse-postal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('checkout.country', 'Country')}
                </label>
                <Input
                  value={warehouseAddress.country}
                  onChange={(e) => setWarehouseAddress({...warehouseAddress, country: e.target.value})}
                  placeholder={t('checkout.country', 'Country')}
                  data-testid="warehouse-country"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={saveAddresses}
              disabled={saving}
              className="bg-primary hover:bg-primary-hover text-white"
              data-testid="save-addresses-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? t('common.loading', 'Saving...') : t('common.save', 'Save Addresses')}
            </Button>
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="space-y-6 max-w-2xl">
          {/* Danger Zone */}
          <div className="bg-red-50 rounded-xl border-2 border-red-200 p-6">
            <h3 className="font-medium text-red-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('profile.dangerZone', 'Danger Zone')}
            </h3>
            
            <div className="p-4 bg-white rounded-lg border border-red-200">
              <p className="font-medium text-red-700">{t('profile.deleteAccount', 'Delete Account')}</p>
              <p className="text-sm text-red-600 mt-1 mb-3">
                {t('profile.deleteProducerWarning', 'This will deactivate your products and delete your account. You cannot delete if you have pending orders.')}
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
              <h2 className="font-heading text-xl font-bold text-primary">
                {t('profile.confirmDeleteTitle', 'Delete Account')}
              </h2>
            </div>
            
            <p className="text-text-muted mb-4">
              {t('profile.confirmDeleteProducerDescription', 'Your products will be deactivated and your account deleted. Orders history will be kept for accounting purposes.')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
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
                <label className="block text-sm font-medium text-primary mb-1">
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
