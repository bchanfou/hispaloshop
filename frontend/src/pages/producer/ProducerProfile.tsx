// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Building2, Warehouse, Save, User, Phone, Mail, MapPin, Shield, AlertTriangle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../context/LocaleContext';
import apiClient from '../../services/api/client';
import i18n from "../../locales/i18n";
function CountrySelect({
  value,
  onChange,
  testId
}) {
  const {
    countries
  } = useLocale();
  const entries = Object.entries(countries || {});
  return <select value={value || ''} onChange={e => onChange(e.target.value)} data-testid={testId} className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950 bg-white">
      <option value="">{i18n.t('register.seleccionarPais', 'Seleccionar país')}</option>
      {entries.map(([code, data]) => <option key={code} value={code}>{data.name || code}</option>)}
    </select>;
}
import FocusTrap from 'focus-trap-react';
export default function ProducerProfile() {
  const {
    user,
    logout
  } = useAuth();
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
    setError(false);
    setLoading(true);
    try {
      const data = await apiClient.get('/producer/profile');
      setProfile({
        company_name: data.company_name || '',
        contact_person: data.contact_person || '',
        phone: data.phone || '',
        whatsapp: data.whatsapp || '',
        fiscal_address: data.fiscal_address || '',
        vat_cif: data.vat_cif || ''
      });
      if (data.office_address) {
        setOfficeAddress(prev => ({
          ...prev,
          ...data.office_address
        }));
      }
      if (data.warehouse_address) {
        setWarehouseAddress(prev => ({
          ...prev,
          ...data.warehouse_address
        }));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  const saveAddresses = async () => {
    setSaving(true);
    try {
      await apiClient.put('/producer/addresses', {
        office_address: officeAddress.street ? officeAddress : null,
        warehouse_address: warehouseAddress.street ? warehouseAddress : null
      });
      toast.success(t('success.saved', 'Addresses saved successfully'));
    } catch (error) {
      toast.error(error.message || t('errors.generic', 'Failed to save'));
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
      // Check for pending orders before deletion
      const ordersCheck = await apiClient.get('/producer/orders?limit=1&status=pending,preparing,paid,confirmed');
      const pendingCount = ordersCheck?.total || ordersCheck?.orders?.length || 0;
      if (pendingCount > 0) {
        toast.error(`Tienes ${pendingCount} pedido(s) pendiente(s). Completa los envíos antes de eliminar tu cuenta.`);
        setDeleting(false);
        return;
      }
      await apiClient.delete('/account/delete', {
        data: {
          password: deletePassword,
          confirmation: deleteConfirmation
        }
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
  if (loading) {
    return <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-stone-100 rounded-2xl animate-pulse" />
          <div className="h-4 w-72 bg-stone-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-4 border-b border-stone-200 pb-4">
          {[1, 2, 3].map(i => <div key={i} className="h-5 w-28 bg-stone-100 rounded animate-pulse" />)}
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-2xl space-y-4">
          <div className="h-5 w-40 bg-stone-100 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="space-y-1">
                <div className="h-3 w-24 bg-stone-100 rounded animate-pulse" />
                <div className="h-10 bg-stone-100 rounded-2xl animate-pulse" />
              </div>)}
          </div>
        </div>
      </div>;
  }
  if (error) {
    return <div className="flex flex-col items-center justify-center py-20">
        <Building2 className="w-12 h-12 text-stone-300 mb-4" />
        <p className="text-stone-600 font-medium mb-2">{t('errors.loadingProfile', 'Error al cargar el perfil')}</p>
        <p className="text-stone-500 text-sm mb-4">{t('errors.tryAgain', 'Comprueba tu conexión e inténtalo de nuevo.')}</p>
        <button type="button" onClick={fetchProfile} className="px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white text-sm rounded-2xl transition-colors">
          {t('common.retry', 'Reintentar')}
        </button>
      </div>;
  }
  return <div>
      <h1 className="text-3xl font-semibold text-stone-950 mb-2">
        {t('producer.profile', 'Company Profile')}
      </h1>
      <p className="text-stone-500 mb-6">
        {t('producer.profileDescription', 'Manage your company information and addresses.')}
      </p>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-stone-200">
        <button onClick={() => setActiveTab('company')} className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'company' ? 'text-stone-950 border-b-2 border-stone-950' : 'text-stone-500 hover:text-stone-950'}`} data-testid="tab-company">
          <User className="w-4 h-4" /> {t('producer.companyInfo', 'Company Info')}
        </button>
        <button onClick={() => setActiveTab('addresses')} className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'addresses' ? 'text-stone-950 border-b-2 border-stone-950' : 'text-stone-500 hover:text-stone-950'}`} data-testid="tab-addresses">
          <MapPin className="w-4 h-4" /> {t('producer.addresses', 'Addresses')}
        </button>
        <button onClick={() => setActiveTab('account')} className={`pb-4 px-2 font-medium flex items-center gap-2 transition-colors ${activeTab === 'account' ? 'text-stone-950 border-b-2 border-stone-950' : 'text-stone-500 hover:text-stone-950'}`} data-testid="tab-account">
          <Shield className="w-4 h-4" /> {t('profile.account', 'Account')}
        </button>
      </div>

      {/* Company Info Tab */}
      {activeTab === 'company' && <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-2xl">
          <h3 className="font-medium text-stone-950 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" /> {t('producer.companyDetails', 'Company Details')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                {t('producer.companyName', 'Company Name')}
              </label>
              <input value={profile.company_name} disabled readOnly className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 bg-stone-50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                {t('producer.vatCif', 'VAT/CIF')}
              </label>
              <input value={profile.vat_cif} disabled readOnly className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 bg-stone-50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                {t('producer.contactPerson', 'Contact Person')}
              </label>
              <input value={profile.contact_person} disabled readOnly className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 bg-stone-50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                <Mail className="w-4 h-4 inline mr-1" /> {t('common.email', 'Email')}
              </label>
              <input value={user?.email || ''} disabled readOnly className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 bg-stone-50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                <Phone className="w-4 h-4 inline mr-1" /> {t('common.phone', 'Phone')}
              </label>
              <input value={profile.phone} disabled readOnly className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 bg-stone-50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                WhatsApp
              </label>
              <input value={profile.whatsapp} disabled readOnly className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 bg-stone-50 focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-600 mb-1">
                {t('producer.fiscalAddress', 'Fiscal Address')}
              </label>
              <input value={profile.fiscal_address} disabled readOnly className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 bg-stone-50 focus:outline-none" />
            </div>
          </div>

          <p className="text-sm text-stone-500 mt-4">
            {t('producer.contactAdminToUpdate', 'Contact admin to update company information.')}
          </p>
        </div>}

      {/* Addresses Tab */}
      {activeTab === 'addresses' && <div className="space-y-6">
          {/* Office Address */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="office-address-section">
            <h3 className="font-medium text-stone-950 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> {t('producer.officeAddress', 'Office Address')}
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              {t('producer.officeAddressDescription', 'Your main business address for official correspondence.')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.fullName', 'Contact Name')}
                </label>
                <input value={officeAddress.full_name} onChange={e => setOfficeAddress({
              ...officeAddress,
              full_name: e.target.value
            })} placeholder={t('checkout.fullName', 'Full Name')} data-testid="office-fullname" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('common.phone', 'Phone')}
                </label>
                <input value={officeAddress.phone} onChange={e => setOfficeAddress({
              ...officeAddress,
              phone: e.target.value
            })} placeholder="+34 600 000 000" data-testid="office-phone" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.street', 'Street')}
                </label>
                <input value={officeAddress.street} onChange={e => setOfficeAddress({
              ...officeAddress,
              street: e.target.value
            })} placeholder={t('checkout.street', 'Street Address')} data-testid="office-street" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.city', 'City')}
                </label>
                <input value={officeAddress.city} onChange={e => setOfficeAddress({
              ...officeAddress,
              city: e.target.value
            })} placeholder={t('checkout.city', 'City')} data-testid="office-city" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.zip', 'Postal Code')}
                </label>
                <input value={officeAddress.postal_code} onChange={e => setOfficeAddress({
              ...officeAddress,
              postal_code: e.target.value
            })} placeholder={t('checkout.zip', 'Postal Code')} data-testid="office-postal" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.country', 'Country')}
                </label>
                <CountrySelect value={officeAddress.country} onChange={val => setOfficeAddress({
              ...officeAddress,
              country: val
            })} testId="office-country" />
              </div>
            </div>
          </div>

          {/* Warehouse Address */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="warehouse-address-section">
            <h3 className="font-medium text-stone-950 mb-4 flex items-center gap-2">
              <Warehouse className="w-5 h-5" /> {t('producer.warehouseAddress', 'Warehouse Address')}
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              {t('producer.warehouseAddressDescription', 'Address where products are stored and shipped from.')}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.fullName', 'Contact Name')}
                </label>
                <input value={warehouseAddress.full_name} onChange={e => setWarehouseAddress({
              ...warehouseAddress,
              full_name: e.target.value
            })} placeholder={t('checkout.fullName', 'Full Name')} data-testid="warehouse-fullname" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('common.phone', 'Phone')}
                </label>
                <input value={warehouseAddress.phone} onChange={e => setWarehouseAddress({
              ...warehouseAddress,
              phone: e.target.value
            })} placeholder="+34 600 000 000" data-testid="warehouse-phone" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.street', 'Street')}
                </label>
                <input value={warehouseAddress.street} onChange={e => setWarehouseAddress({
              ...warehouseAddress,
              street: e.target.value
            })} placeholder={t('checkout.street', 'Street Address')} data-testid="warehouse-street" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.city', 'City')}
                </label>
                <input value={warehouseAddress.city} onChange={e => setWarehouseAddress({
              ...warehouseAddress,
              city: e.target.value
            })} placeholder={t('checkout.city', 'City')} data-testid="warehouse-city" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.zip', 'Postal Code')}
                </label>
                <input value={warehouseAddress.postal_code} onChange={e => setWarehouseAddress({
              ...warehouseAddress,
              postal_code: e.target.value
            })} placeholder={t('checkout.zip', 'Postal Code')} data-testid="warehouse-postal" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  {t('checkout.country', 'Country')}
                </label>
                <CountrySelect value={warehouseAddress.country} onChange={val => setWarehouseAddress({
              ...warehouseAddress,
              country: val
            })} testId="warehouse-country" />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button type="button" onClick={saveAddresses} disabled={saving} className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-2xl transition-colors" data-testid="save-addresses-btn">
              <Save className="w-4 h-4 mr-2" />
              {saving ? t('common.loading', 'Saving...') : t('common.save', 'Save Addresses')}
            </button>
          </div>
        </div>}

      {/* Account Tab */}
      {activeTab === 'account' && <div className="space-y-6 max-w-2xl">
          {/* Danger Zone */}
          <div className="bg-stone-50 rounded-2xl border-2 border-stone-200 p-6">
            <h3 className="font-medium text-stone-950 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('profile.dangerZone', 'Danger Zone')}
            </h3>

            <div className="p-4 bg-white rounded-2xl border border-stone-200">
              <p className="font-medium text-stone-950">{t('profile.deleteAccount', 'Delete Account')}</p>
              <p className="text-sm text-stone-600 mt-1 mb-3">
                {t('profile.deleteProducerWarning', 'This will deactivate your products and delete your account. You cannot delete if you have pending orders.')}
              </p>
              <button type="button" onClick={() => setShowDeleteModal(true)} data-testid="delete-account-btn" className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-2xl transition-colors">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('profile.deleteMyAccount', 'Delete My Account')}
              </button>
            </div>
          </div>
        </div>}

      {/* Delete Account Modal */}
      {showDeleteModal && <FocusTrap focusTrapOptions={{
      escapeDeactivates: false,
      allowOutsideClick: true,
      returnFocusOnDeactivate: true
    }}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-stone-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-stone-700" />
              </div>
              <h2 className="text-xl font-bold text-stone-950">
                {t('profile.confirmDeleteTitle', 'Delete Account')}
              </h2>
            </div>

            <p className="text-stone-500 mb-4">
              {t('profile.confirmDeleteProducerDescription', 'Your products will be deactivated and your account deleted. Orders history will be kept for accounting purposes.')}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">
                  {t('profile.enterPassword', 'Enter your password')}
                </label>
                <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="••••••••" data-testid="delete-password-input" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950" />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-950 mb-1">
                  {t('profile.typeDelete', 'Type DELETE to confirm')}
                </label>
                <input value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value.toUpperCase())} placeholder="DELETE" data-testid="delete-confirmation-input" className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 font-mono focus:outline-none focus:border-stone-950" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => {
              setShowDeleteModal(false);
              setDeletePassword('');
              setDeleteConfirmation('');
            }} className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors">
                {t('common.cancel', 'Cancel')}
              </button>
              <button type="button" onClick={handleDeleteAccount} disabled={deleting || deleteConfirmation !== 'DELETE' || !deletePassword} data-testid="confirm-delete-btn" className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors">
                {deleting ? t('common.loading', 'Deleting...') : t('profile.deleteForever', 'Delete Forever')}
              </button>
            </div>
          </div>
        </div>
        </FocusTrap>}
    </div>;
}