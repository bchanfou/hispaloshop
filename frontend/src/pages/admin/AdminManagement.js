import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { API } from '../../utils/api';
import { 
  Shield, UserPlus, Trash2, Ban, CheckCircle, 
  AlertCircle, X, Eye, EyeOff, Mail, User 
} from 'lucide-react';



export default function AdminManagement() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // Form state
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    name: '',
    password: '',
    role: 'admin',
    assigned_country: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const COUNTRIES = [
    { code: '', name: 'Sin asignar (Global)' },
    { code: 'ES', name: 'España' },
    { code: 'FR', name: 'Francia' },
    { code: 'DE', name: 'Alemania' },
    { code: 'IT', name: 'Italia' },
    { code: 'PT', name: 'Portugal' },
    { code: 'UK', name: 'Reino Unido' },
    { code: 'US', name: 'Estados Unidos' },
    { code: 'MX', name: 'México' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' }
  ];

  useEffect(() => {
    // Only super_admin can access this page
    if (user?.role !== 'super_admin') {
      navigate('/admin');
      return;
    }
    fetchAdmins();
  }, [user, navigate]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/super-admin/admins`, { withCredentials: true });
      setAdmins(response.data);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Validation
    if (!newAdmin.email || !newAdmin.name || !newAdmin.password) {
      setFormError(t('errors.generic'));
      return;
    }
    
    if (newAdmin.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`${API}/super-admin/admins`, newAdmin, { withCredentials: true });
      toast.success(t('success.added'));
      setShowCreateModal(false);
      setNewAdmin({ email: '', name: '', password: '', role: 'admin', assigned_country: '' });
      fetchAdmins();
    } catch (error) {
      console.error('Error creating admin:', error);
      setFormError(error.response?.data?.detail || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await axios.put(
        `${API}/super-admin/admins/${userId}/status`, 
        { status: newStatus },
        { withCredentials: true }
      );
      toast.success(t('success.updated'));
      fetchAdmins();
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error(error.response?.data?.detail || t('errors.generic'));
    }
  };

  const handleDeleteAdmin = async (userId) => {
    try {
      await axios.delete(`${API}/super-admin/admins/${userId}`, { withCredentials: true });
      toast.success(t('success.deleted'));
      setShowDeleteConfirm(null);
      fetchAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error(error.response?.data?.detail || t('errors.generic'));
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'super_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Shield className="w-3 h-3" />
          Super Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        <User className="w-3 h-3" />
        Admin
      </span>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            {t('common.active')}
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Ban className="w-3 h-3" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div data-testid="admin-management-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            {t('superAdmin.manageAdmins')}
          </h1>
          <p className="text-text-secondary mt-1">
            Manage administrator accounts and permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          data-testid="create-admin-button"
        >
          <UserPlus className="w-4 h-4" />
          {t('superAdmin.createAdmin')}
        </button>
      </div>

      {/* Admin List */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {t('common.name')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {t('common.email')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                País
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {t('common.status')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {admins.map((admin) => (
              <tr 
                key={admin.user_id} 
                className="hover:bg-stone-50 transition-colors"
                data-testid={`admin-row-${admin.user_id}`}
              >
                <td className="px-6 py-4">
                  <div className="font-medium text-text-primary">{admin.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Mail className="w-4 h-4" />
                    {admin.email}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getRoleBadge(admin.role)}
                </td>
                <td className="px-6 py-4 text-text-secondary text-sm">
                  {admin.assigned_country ? (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {COUNTRIES.find(c => c.code === admin.assigned_country)?.name || admin.assigned_country}
                    </span>
                  ) : (
                    <span className="text-text-muted">Global</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(admin.status || 'active')}
                </td>
                <td className="px-6 py-4 text-text-secondary text-sm">
                  {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  {/* Don't allow actions on the current user or other super_admins */}
                  {admin.user_id !== user?.user_id && admin.role !== 'super_admin' && (
                    <div className="flex items-center justify-end gap-2">
                      {admin.status !== 'suspended' ? (
                        <button
                          onClick={() => handleStatusChange(admin.user_id, 'suspended')}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title={t('admin.suspend')}
                          data-testid={`suspend-admin-${admin.user_id}`}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(admin.user_id, 'active')}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title={t('admin.reactivate')}
                          data-testid={`activate-admin-${admin.user_id}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setShowDeleteConfirm(admin)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                        data-testid={`delete-admin-${admin.user_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {admin.user_id === user?.user_id && (
                    <span className="text-xs text-text-muted italic">You</span>
                  )}
                  {admin.role === 'super_admin' && admin.user_id !== user?.user_id && (
                    <span className="text-xs text-purple-600 italic">Protected</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {admins.length === 0 && (
          <div className="text-center py-12 text-text-secondary">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" data-testid="create-admin-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-text-primary">
                {t('superAdmin.createAdmin')}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('common.name')} *
                </label>
                <input
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="John Doe"
                  data-testid="admin-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('common.email')} *
                </label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="admin@example.com"
                  data-testid="admin-email-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('auth.password')} *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Min. 8 characters"
                    data-testid="admin-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Role
                </label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  data-testid="admin-role-select"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              {/* Country Assignment - Only for regular admin */}
              {newAdmin.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    País asignado (para analytics)
                  </label>
                  <select
                    value={newAdmin.assigned_country}
                    onChange={(e) => setNewAdmin({ ...newAdmin, assigned_country: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    data-testid="admin-country-select"
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code}>{country.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-text-muted mt-1">
                    El admin solo verá analytics de este país. Déjalo vacío para acceso global.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-stone-200 text-text-secondary rounded-lg hover:bg-stone-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  data-testid="submit-create-admin"
                >
                  {submitting ? t('common.loading') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" data-testid="delete-confirm-modal">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-2">
                Delete Admin Account?
              </h3>
              <p className="text-text-secondary mb-1">
                Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
              </p>
              <p className="text-sm text-red-600 mb-6">
                {t('superAdmin.deleteWarning')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-stone-200 text-text-secondary rounded-lg hover:bg-stone-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDeleteAdmin(showDeleteConfirm.user_id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  data-testid="confirm-delete-admin"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
