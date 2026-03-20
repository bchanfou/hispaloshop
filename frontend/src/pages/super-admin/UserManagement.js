import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import CountryFlag from '../../components/CountryFlag';
import {
  Users, Search, Globe, UserX, UserCheck, Trash2,
  AlertTriangle, Building, ShoppingBag, Share2,
  ChevronDown, Filter, RefreshCw, Edit, Key, Mail,
  Eye, EyeOff
} from 'lucide-react';

import { asLowerText } from '../../utils/safe';
import FocusTrap from 'focus-trap-react';

// Country code to name mapping
const COUNTRY_NAMES = {
  ES: 'España',
  US: 'Estados Unidos',
  MX: 'México',
  AR: 'Argentina',
  CO: 'Colombia',
  CL: 'Chile',
  PE: 'Perú',
  FR: 'Francia',
  DE: 'Alemania',
  IT: 'Italia',
  PT: 'Portugal',
  GB: 'Reino Unido',
  KR: 'Corea del Sur',
  JP: 'Japón',
  CN: 'China',
  BR: 'Brasil',
  Unknown: 'Sin especificar'
};

function normalizeUserStats(rawStats) {
  if (!rawStats) return null;

  if (rawStats.customers && rawStats.producers && rawStats.influencers) {
    return rawStats;
  }

  return {
    customers: {
      total: rawStats.total_customers || 0,
      active: rawStats.total_customers || 0,
      suspended: 0,
    },
    producers: {
      total: rawStats.total_producers || 0,
      active: rawStats.total_producers || 0,
      suspended: 0,
    },
    influencers: {
      total: rawStats.total_influencers || 0,
      active: rawStats.total_influencers || 0,
      suspended: 0,
    },
  };
}

export default function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [countries, setCountries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('customer');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [editCredentials, setEditCredentials] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const normalizedStats = useMemo(() => normalizeUserStats(stats), [stats]);

  useEffect(() => {
    fetchCountries();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [selectedRole, selectedCountry, selectedStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let url = `/super-admin/users?role=${selectedRole}`;
      if (selectedCountry !== 'all') url += `&country=${selectedCountry}`;
      if (selectedStatus !== 'all') url += `&status=${selectedStatus}`;

      const payload = await apiClient.get(url);
      setUsers(Array.isArray(payload) ? payload : (Array.isArray(payload?.users) ? payload.users : []));
    } catch {
      toast.error(t('userManagement.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const payload = await apiClient.get('/super-admin/users/countries');
      setCountries(Array.isArray(payload) ? payload : (Array.isArray(payload?.countries) ? payload.countries : []));
    } catch {
      setCountries([]);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiClient.get('/super-admin/users/stats');
      setStats(data);
    } catch {
      // handled silently
    }
  };

  const updateUserStatus = async (userId, newStatus) => {
    setActionLoading(userId);
    try {
      const action = newStatus === 'suspended' ? 'suspend' : 'reactivate';
      await apiClient.put(`/super-admin/users/${userId}/status?action=${action}`, null);
      toast.success(newStatus === 'suspended' 
        ? t('userManagement.messages.suspended') 
        : t('userManagement.messages.reactivated')
      );
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.message || t('userManagement.errors.updateFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (userId) => {
    setActionLoading(userId);
    try {
      await apiClient.delete(`/super-admin/users/${userId}`);
      toast.success(t('userManagement.messages.deleted'));
      setConfirmDelete(null);
      fetchUsers();
      fetchStats();
    } catch (error) {
      toast.error(error.message || t('userManagement.errors.deleteFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const updateCredentials = async (userId) => {
    if (!newEmail && !newPassword) {
      toast.error(t('userManagement.errors.noChanges'));
      return;
    }
    
    setActionLoading(userId);
    try {
      const data = {};
      if (newEmail) data.email = newEmail;
      if (newPassword) data.password = newPassword;
      
      await apiClient.put(`/super-admin/users/${userId}/credentials`, data);
      toast.success(t('userManagement.messages.credentialsUpdated'));
      setEditCredentials(null);
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    } catch (error) {
      toast.error(error.message || t('userManagement.errors.credentialsFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const openEditCredentials = (user) => {
    setEditCredentials(user);
    setNewEmail(user.email || '');
    setNewPassword('');
  };

  const searchNeedle = asLowerText(searchTerm);
  const filteredUsers = users.filter(u =>
    asLowerText(u.name).includes(searchNeedle) ||
    asLowerText(u.email).includes(searchNeedle) ||
    asLowerText(u.company_name).includes(searchNeedle)
  );

  const getRoleIcon = (role) => {
    switch (role) {
      case 'customer': return <ShoppingBag className="w-4 h-4" />;
      case 'producer': return <Building className="w-4 h-4" />;
      case 'influencer': return <Share2 className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'customer': return t('userManagement.roles.customers');
      case 'producer': return t('userManagement.roles.producers');
      case 'influencer': return t('userManagement.roles.influencers');
      default: return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-950 mb-2">
          {t('userManagement.title')}
        </h1>
        <p className="text-stone-500">{t('userManagement.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      {normalizedStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            onClick={() => setSelectedRole('customer')}
            className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
              selectedRole === 'customer' ? 'border-stone-950 ring-2 ring-stone-950/20' : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-stone-100 rounded-2xl">
                <ShoppingBag className="w-5 h-5 text-stone-600" />
              </div>
              <span className="font-medium text-stone-950">{t('userManagement.roles.customers')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-stone-500">{t('userManagement.stats.total')}</p>
                <p className="text-xl font-bold text-stone-950">{normalizedStats.customers.total}</p>
              </div>
              <div>
                <p className="text-stone-500">{t('userManagement.stats.active')}</p>
                <p className="text-xl font-bold text-stone-950">{normalizedStats.customers.active}</p>
              </div>
              <div>
                <p className="text-stone-500">{t('userManagement.stats.suspended')}</p>
                <p className="text-xl font-bold text-stone-950">{normalizedStats.customers.suspended}</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setSelectedRole('producer')}
            className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
              selectedRole === 'producer' ? 'border-stone-950 ring-2 ring-stone-950/20' : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-stone-100 rounded-2xl">
                <Building className="w-5 h-5 text-stone-600" />
              </div>
              <span className="font-medium text-stone-950">{t('userManagement.roles.producers')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-stone-500">{t('userManagement.stats.total')}</p>
                <p className="text-xl font-bold text-stone-950">{normalizedStats.producers.total}</p>
              </div>
              <div>
                <p className="text-stone-500">{t('userManagement.stats.active')}</p>
                <p className="text-xl font-bold text-stone-950">{normalizedStats.producers.active}</p>
              </div>
              <div>
                <p className="text-stone-500">{t('userManagement.stats.suspended')}</p>
                <p className="text-xl font-bold text-stone-950">{normalizedStats.producers.suspended}</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setSelectedRole('influencer')}
            className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
              selectedRole === 'influencer' ? 'border-stone-950 ring-2 ring-stone-950/20' : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-stone-100 rounded-2xl">
                <Share2 className="w-5 h-5 text-stone-600" />
              </div>
              <span className="font-medium text-stone-950">{t('userManagement.roles.influencers')}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-stone-500">{t('userManagement.stats.total')}</p>
                <p className="text-xl font-bold text-stone-950">{normalizedStats.influencers.total}</p>
              </div>
              <div>
                <p className="text-stone-500">{t('userManagement.stats.active')}</p>
                <p className="text-xl font-bold text-stone-950">{normalizedStats.influencers.active}</p>
              </div>
              <div>
                <p className="text-stone-500">{t('userManagement.stats.suspended')}</p>
                <p className="text-xl font-bold text-stone-950">{normalizedStats.influencers.suspended}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              placeholder={t('userManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
              data-testid="search-users"
            />
          </div>

          {/* Country Filter */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-stone-500" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-3 py-2 rounded-2xl border border-stone-200 bg-white text-sm"
              data-testid="country-filter"
            >
              <option value="all">{t('userManagement.filters.allCountries')}</option>
              {countries.map(c => (
                <option key={c.code} value={c.code}>
                  {COUNTRY_NAMES[c.code] || c.code} ({c.user_count ?? c.count ?? 0})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-2xl border border-stone-200 bg-white text-sm"
              data-testid="status-filter"
            >
              <option value="all">{t('userManagement.filters.allStatuses')}</option>
              <option value="active">{t('userManagement.filters.active')}</option>
              <option value="suspended">{t('userManagement.filters.suspended')}</option>
            </select>
          </div>

          {/* Refresh */}
          <button
            onClick={() => { fetchUsers(); fetchStats(); }}
            data-testid="refresh-users"
            className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            {getRoleIcon(selectedRole)}
            <span className="font-medium text-stone-950">
              {getRoleLabel(selectedRole)} ({filteredUsers.length})
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-stone-500">{t('common.loading')}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-stone-500">
            {t('userManagement.noUsersFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="users-table">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                    {t('userManagement.table.user')}
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                    {t('userManagement.table.country')}
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                    {t('userManagement.table.status')}
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                    {t('userManagement.table.registered')}
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-stone-600">
                    {t('userManagement.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-stone-950">
                          {user.name || user.company_name || 'Sin nombre'}
                        </p>
                        <p className="text-sm text-stone-500">{user.email}</p>
                        {user.phone && (
                          <p className="text-xs text-stone-500">{user.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CountryFlagWithFallback countryCode={user.country} />
                        <span className="text-sm text-stone-950">
                          {COUNTRY_NAMES[user.country] || user.country || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700`}>
                        {user.account_status === 'suspended' ? (
                          <>
                            <UserX className="w-3 h-3" />
                            {t('userManagement.status.suspended')}
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3 h-3" />
                            {t('userManagement.status.active')}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-stone-500">
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleDateString()
                          : 'N/A'
                        }
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        {/* Edit Credentials */}
                        <button
                          onClick={() => openEditCredentials(user)}
                          data-testid={`edit-${user.user_id}`}
                          title={t('userManagement.actions.editCredentials')}
                          className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        
                        {/* Suspend/Reactivate */}
                        {user.account_status === 'suspended' ? (
                          <button
                            onClick={() => updateUserStatus(user.user_id, 'active')}
                            disabled={actionLoading === user.user_id}
                            data-testid={`reactivate-${user.user_id}`}
                            className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors disabled:opacity-50 inline-flex items-center"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            {t('userManagement.actions.reactivate')}
                          </button>
                        ) : (
                          <button
                            onClick={() => updateUserStatus(user.user_id, 'suspended')}
                            disabled={actionLoading === user.user_id}
                            data-testid={`suspend-${user.user_id}`}
                            className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors disabled:opacity-50 inline-flex items-center"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            {t('userManagement.actions.suspend')}
                          </button>
                        )}
                        
                        {/* Delete */}
                        <button
                          onClick={() => setConfirmDelete(user)}
                          disabled={actionLoading === user.user_id}
                          data-testid={`delete-${user.user_id}`}
                          className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-stone-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-stone-500" />
              </div>
              <h3 className="text-lg font-bold text-stone-950">
                {t('userManagement.deleteModal.title')}
              </h3>
            </div>
            
            <p className="text-stone-600 mb-2">
              {t('userManagement.deleteModal.message')}
            </p>
            
            <div className="bg-stone-50 rounded-2xl p-3 mb-4">
              <p className="font-medium text-stone-950">{confirmDelete.name}</p>
              <p className="text-sm text-stone-500">{confirmDelete.email}</p>
            </div>
            
            <p className="text-sm text-stone-500 mb-4">
              {t('userManagement.deleteModal.warning')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors flex-1"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteUser(confirmDelete.user_id)}
                disabled={actionLoading === confirmDelete.user_id}
                className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors flex-1 inline-flex items-center justify-center"
              >
                {actionLoading === confirmDelete.user_id ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {t('userManagement.deleteModal.confirm')}
              </button>
            </div>
          </div>
        </div>
        </FocusTrap>
      )}

      {/* Edit Credentials Modal */}
      {editCredentials && (
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-stone-100 rounded-full">
                <Key className="w-6 h-6 text-stone-600" />
              </div>
              <h3 className="text-lg font-bold text-stone-950">
                {t('userManagement.credentialsModal.title')}
              </h3>
            </div>
            
            <div className="bg-stone-50 rounded-2xl p-3 mb-4">
              <p className="font-medium text-stone-950">{editCredentials.name}</p>
              <p className="text-sm text-stone-500">{editCredentials.email}</p>
            </div>
            
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  {t('userManagement.credentialsModal.newEmail')}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={editCredentials.email}
                  data-testid="new-email-input"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                />
              </div>
              
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  <Key className="w-4 h-4 inline mr-1" />
                  {t('userManagement.credentialsModal.newPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    data-testid="new-password-input"
                    className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-950"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  {t('userManagement.credentialsModal.passwordHint')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditCredentials(null);
                  setNewEmail('');
                  setNewPassword('');
                }}
                className="px-4 py-2 border border-stone-200 text-stone-600 rounded-2xl hover:bg-stone-50 transition-colors flex-1"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => updateCredentials(editCredentials.user_id)}
                disabled={actionLoading === editCredentials.user_id || (!newEmail && !newPassword)}
                className="px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-2xl transition-colors flex-1 inline-flex items-center justify-center"
              >
                {actionLoading === editCredentials.user_id ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Key className="w-4 h-4 mr-2" />
                )}
                {t('userManagement.credentialsModal.save')}
              </button>
            </div>
          </div>
        </div>
        </FocusTrap>
      )}
    </div>
  );
}

// Helper component to render country flag with fallback
function CountryFlagWithFallback({ countryCode }) {
  if (!countryCode || countryCode === 'Unknown') {
    return <Globe className="w-4 h-4 text-stone-400" />;
  }
  return <CountryFlag countryCode={countryCode} size="sm" />;
}
