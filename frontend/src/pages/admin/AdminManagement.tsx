// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import {
  Shield, UserPlus, Trash2, Ban, CheckCircle,
  AlertCircle, X, Eye, EyeOff, Mail, User, Loader2
} from 'lucide-react';
import FocusTrap from 'focus-trap-react';

function SACard({ children, className = '' }) {
  return (
    <div className={`bg-[#ffffff] rounded-[14px] border border-white/[0.08] p-5 ${className}`}>
      {children}
    </div>
  );
}

export default function AdminManagement() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

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
    { code: 'ES', name: t('admin.countries.ES', 'España') },
    { code: 'FR', name: 'Francia' },
    { code: 'DE', name: 'Alemania' },
    { code: 'IT', name: 'Italia' },
    { code: 'PT', name: 'Portugal' },
    { code: 'UK', name: 'Reino Unido' },
    { code: 'US', name: 'Estados Unidos' },
    { code: 'MX', name: t('admin.countries.MX', 'México') },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' }
  ];

  useEffect(() => {
    if (user?.role !== 'super_admin') {
      navigate('/admin');
      return;
    }
    fetchAdmins();
  }, [user, navigate]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const payload = await apiClient.get('/super-admin/admins');
      setAdmins(Array.isArray(payload) ? payload : (Array.isArray(payload?.admins) ? payload.admins : []));
    } catch (error) {
      toast.error(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setFormError('');

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
      await apiClient.post('/super-admin/admins', newAdmin);
      toast.success(t('success.added'));
      setShowCreateModal(false);
      setNewAdmin({ email: '', name: '', password: '', role: 'admin', assigned_country: '' });
      fetchAdmins();
    } catch (error) {
      setFormError(error.message || t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await apiClient.put(`/super-admin/admins/${userId}/status`, { status: newStatus });
      toast.success(t('success.updated'));
      fetchAdmins();
    } catch (error) {
      toast.error(error.message || t('errors.generic'));
    }
  };

  const handleDeleteAdmin = async (userId) => {
    try {
      await apiClient.delete(`/super-admin/admins/${userId}`);
      toast.success(t('success.deleted'));
      setShowDeleteConfirm(null);
      fetchAdmins();
    } catch (error) {
      toast.error(error.message || t('errors.generic'));
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'super_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#0c0a09] text-white">
          <Shield className="w-3 h-3" />
          Super Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white/[0.08] text-white/60">
        <User className="w-3 h-3" />
        Admin
      </span>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-950">
            <CheckCircle className="w-3 h-3" />
            {t('common.active')}
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#dc2626]/20 text-[#dc2626]">
            <Ban className="w-3 h-3" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-white/[0.08] text-white/40">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto pb-16" data-testid="admin-management-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1">
            {t('superAdmin.manageAdmins')}
          </h1>
          <p className="text-sm text-white/40">
            Gestiona cuentas de administrador y permisos
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0c0a09] text-white rounded-2xl hover:bg-[#0c0a09] transition-colors text-sm font-semibold"
          data-testid="create-admin-button"
        >
          <UserPlus className="w-4 h-4" />
          {t('superAdmin.createAdmin')}
        </button>
      </div>

      {/* Admin List */}
      <SACard className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/30 text-[11px] uppercase tracking-wider border-b border-white/[0.06]">
                <th className="text-left px-5 py-3 font-medium">{t('common.name')}</th>
                <th className="text-left px-3 py-3 font-medium">{t('common.email')}</th>
                <th className="text-left px-3 py-3 font-medium">Role</th>
                <th className="text-left px-3 py-3 font-medium">País</th>
                <th className="text-left px-3 py-3 font-medium">{t('common.status')}</th>
                <th className="text-left px-3 py-3 font-medium">Created</th>
                <th className="text-right px-5 py-3 font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr
                  key={admin.user_id}
                  className="border-t border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                  data-testid={`admin-row-${admin.user_id}`}
                >
                  <td className="px-5 py-3">
                    <span className="font-semibold text-white">{admin.name}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5 text-white/50 text-xs">
                      <Mail className="w-3.5 h-3.5" />
                      {admin.email}
                    </span>
                  </td>
                  <td className="px-3 py-3">{getRoleBadge(admin.role)}</td>
                  <td className="px-3 py-3 text-xs">
                    {admin.assigned_country ? (
                      <span className="px-2 py-0.5 bg-white/[0.06] text-white/60 rounded text-xs">
                        {COUNTRIES.find(c => c.code === admin.assigned_country)?.name || admin.assigned_country}
                      </span>
                    ) : (
                      <span className="text-white/25">Global</span>
                    )}
                  </td>
                  <td className="px-3 py-3">{getStatusBadge(admin.status || 'active')}</td>
                  <td className="px-3 py-3 text-white/35 text-xs">
                    {admin.created_at ? new Date(admin.created_at).toLocaleDateString('es-ES') : '-'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {admin.user_id !== user?.user_id && admin.role !== 'super_admin' && (
                      <div className="flex items-center justify-end gap-1">
                        {admin.status !== 'suspended' ? (
                          <button
                            onClick={() => handleStatusChange(admin.user_id, 'suspended')}
                            className="p-1.5 text-white/40 hover:text-[#78716c] hover:bg-white/[0.06] rounded-2xl transition-colors"
                            title={t('admin.suspend')}
                            data-testid={`suspend-admin-${admin.user_id}`}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(admin.user_id, 'active')}
                            className="p-1.5 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-2xl transition-colors"
                            title={t('admin.reactivate')}
                            data-testid={`activate-admin-${admin.user_id}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setShowDeleteConfirm(admin)}
                          className="p-1.5 text-white/40 hover:text-[#dc2626] hover:bg-white/[0.06] rounded-2xl transition-colors"
                          title="Delete"
                          data-testid={`delete-admin-${admin.user_id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {admin.user_id === user?.user_id && (
                      <span className="text-xs text-[#0c0a09]">Tú</span>
                    )}
                    {admin.role === 'super_admin' && admin.user_id !== user?.user_id && (
                      <span className="text-xs text-white/25">Protegido</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {admins.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 text-white/20" />
            <p className="text-sm text-white/40">{t('common.noData')}</p>
          </div>
        )}
      </SACard>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#ffffff] rounded-2xl border border-white/[0.08] max-w-md w-full mx-4 p-6" data-testid="create-admin-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">
                {t('superAdmin.createAdmin')}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/[0.06] rounded-2xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              {formError && (
                <div className="p-3 bg-[#dc2626]/10 border border-[#dc2626]/20 rounded-2xl text-[#dc2626] text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">
                  {t('common.name')} *
                </label>
                <input
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-2xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#0c0a09]"
                  placeholder="John Doe"
                  data-testid="admin-name-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">
                  {t('common.email')} *
                </label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-2xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#0c0a09]"
                  placeholder="admin@example.com"
                  data-testid="admin-email-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">
                  {t('auth.password')} *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 bg-white/[0.06] border border-white/[0.08] rounded-2xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#0c0a09]"
                    placeholder="Min. 8 characters"
                    data-testid="admin-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5">Role</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-2xl text-white text-sm focus:outline-none focus:border-[#0c0a09]"
                  data-testid="admin-role-select"
                >
                  <option value="admin" className="bg-[#ffffff]">Admin</option>
                  <option value="super_admin" className="bg-[#ffffff]">Super Admin</option>
                </select>
              </div>

              {newAdmin.role === 'admin' && (
                <div>
                  <label className="block text-xs font-medium text-white/40 mb-1.5">
                    País asignado
                  </label>
                  <select
                    value={newAdmin.assigned_country}
                    onChange={(e) => setNewAdmin({ ...newAdmin, assigned_country: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-2xl text-white text-sm focus:outline-none focus:border-[#0c0a09]"
                    data-testid="admin-country-select"
                  >
                    {COUNTRIES.map(country => (
                      <option key={country.code} value={country.code} className="bg-[#ffffff]">{country.name}</option>
                    ))}
                  </select>
                  <p className="text-[11px] text-white/20 mt-1.5">
                    El admin solo verá analytics de este país. Déjalo vacío para acceso global.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.06] text-white/60 rounded-2xl hover:bg-white/[0.1] transition-colors text-sm font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-[#0c0a09] text-white rounded-2xl hover:bg-[#0c0a09] transition-colors disabled:opacity-50 text-sm font-semibold"
                  data-testid="submit-create-admin"
                >
                  {submitting ? t('common.loading') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
        </FocusTrap>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#ffffff] rounded-2xl border border-white/[0.08] max-w-md w-full mx-4 p-6" data-testid="delete-confirm-modal">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#dc2626]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-[#dc2626]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Eliminar cuenta admin
              </h3>
              <p className="text-sm text-white/50 mb-1">
                ¿Eliminar a <strong className="text-white">{showDeleteConfirm.name}</strong>?
              </p>
              <p className="text-xs text-white/30 mb-6">
                {t('superAdmin.deleteWarning')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.06] text-white/60 rounded-2xl hover:bg-white/[0.1] transition-colors text-sm font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDeleteAdmin(showDeleteConfirm.user_id)}
                  className="flex-1 px-4 py-2.5 bg-[#dc2626] text-white rounded-2xl hover:bg-[#dc2626] transition-colors text-sm font-semibold"
                  data-testid="confirm-delete-admin"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
        </FocusTrap>
      )}
    </div>
  );
}
