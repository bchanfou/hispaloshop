import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../services/api/client';
import { Search, Loader2, ShieldOff, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function CountryAdminUsers() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [modal, setModal] = useState(null); // {user, action}
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      const data = await apiClient.get(`/country-admin/users?${params.toString()}`);
      setItems(data?.items || []);
    } catch {
      toast.error(t('countryAdmin.loadError', 'No se pudo cargar la lista'));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, t]);

  useEffect(() => { load(); }, [load]);

  const open = (u, action) => { setModal({ u, action }); setReason(''); setDuration(''); };
  const close = () => { setModal(null); setReason(''); setDuration(''); };

  const submit = async () => {
    if (!modal) return;
    if (modal.action === 'suspend' && reason.trim().length < 20) {
      toast.error(t('countryAdmin.reasonMin20', 'El motivo debe tener al menos 20 caracteres'));
      return;
    }
    setActing(true);
    try {
      if (modal.action === 'suspend') {
        await apiClient.post(`/country-admin/users/${modal.u.user_id}/suspend`, {
          reason: reason.trim(),
          duration_days: duration ? Number(duration) : undefined,
        });
        toast.success(t('countryAdmin.users.suspended', 'Usuario suspendido'));
      } else {
        await apiClient.post(`/country-admin/users/${modal.u.user_id}/unsuspend`);
        toast.success(t('countryAdmin.users.unsuspended', 'Usuario reactivado'));
      }
      close();
      await load();
    } catch (err) {
      toast.error(err?.message || t('countryAdmin.actionError', 'No se pudo completar la acción'));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">
          {t('countryAdmin.users.title', 'Usuarios')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('countryAdmin.users.subtitle', 'Gestiona a los usuarios de tu país.')}
        </p>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" strokeWidth={1.5} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search', 'Buscar...')}
            className="w-full pl-10 pr-3 py-2 rounded-xl border border-stone-200 text-sm bg-white"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-stone-200 text-sm bg-white"
        >
          <option value="">{t('countryAdmin.users.allRoles', 'Todos los roles')}</option>
          <option value="customer">{t('roles.customer', 'Consumer')}</option>
          <option value="producer">{t('roles.producer', 'Producer')}</option>
          <option value="importer">{t('roles.importer', 'Importer')}</option>
          <option value="influencer">{t('roles.influencer', 'Influencer')}</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-sm text-stone-500">
            {t('countryAdmin.users.empty', 'No hay usuarios.')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">{t('countryAdmin.col.user', 'Usuario')}</th>
                <th className="text-left px-4 py-3">{t('countryAdmin.col.role', 'Rol')}</th>
                <th className="text-left px-4 py-3">{t('countryAdmin.col.status', 'Estado')}</th>
                <th className="text-right px-4 py-3">{t('countryAdmin.col.actions', 'Acciones')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((u) => (
                <tr key={u.user_id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-950">{u.name}</p>
                    <p className="text-xs text-stone-500">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-700 capitalize">{u.role}</td>
                  <td className="px-4 py-3">
                    {u.suspended ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-stone-950 text-white">
                        <ShieldOff className="w-3 h-3" /> {t('countryAdmin.users.suspendedBadge', 'Suspendido')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-700">
                        <Shield className="w-3 h-3" /> {t('countryAdmin.users.activeBadge', 'Activo')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.suspended ? (
                      <button
                        onClick={() => open(u, 'unsuspend')}
                        className="px-3 py-1.5 text-xs rounded-xl bg-stone-950 text-white hover:bg-stone-800"
                      >
                        {t('countryAdmin.users.unsuspend', 'Reactivar')}
                      </button>
                    ) : (
                      <button
                        onClick={() => open(u, 'suspend')}
                        className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100"
                      >
                        {t('countryAdmin.users.suspend', 'Suspender')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={close}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-stone-200">
              <h3 className="font-semibold text-stone-950">
                {modal.action === 'suspend'
                  ? t('countryAdmin.users.suspendTitle', 'Suspender usuario')
                  : t('countryAdmin.users.unsuspendTitle', 'Reactivar usuario')}
              </h3>
              <p className="text-sm text-stone-500 mt-1">{modal.u.name} · {modal.u.email}</p>
            </div>
            {modal.action === 'suspend' && (
              <div className="p-6 space-y-3">
                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    {t('countryAdmin.users.reason', 'Motivo (mínimo 20 caracteres)')}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm"
                  />
                  <p className="text-xs text-stone-400 mt-1">{reason.length} / 20</p>
                </div>
                <div>
                  <label className="text-xs text-stone-500 block mb-1">
                    {t('countryAdmin.users.duration', 'Duración (días, vacío = permanente)')}
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm"
                  />
                </div>
              </div>
            )}
            <div className="p-6 border-t border-stone-200 flex gap-3 justify-end">
              <button onClick={close} disabled={acting} className="px-4 py-2 rounded-xl border border-stone-200 text-sm text-stone-700 hover:bg-stone-100">
                {t('common.cancel', 'Cancelar')}
              </button>
              <button
                onClick={submit}
                disabled={acting || (modal.action === 'suspend' && reason.trim().length < 20)}
                className="px-4 py-2 rounded-xl bg-stone-950 text-white text-sm hover:bg-stone-800 disabled:opacity-40 inline-flex items-center gap-2"
              >
                {acting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common.confirm', 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
