// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MapPin, Star, Trash2, Edit2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';

export default function AddressesPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', full_name: '', street: '', city: '', postal_code: '', country: '', phone: '', is_default: false,
  });

  const fetchAddresses = async () => {
    try {
      const data = await apiClient.get('/customer/addresses');
      setAddresses(data?.addresses || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchAddresses(); }, []);

  const resetForm = () => {
    setForm({ name: '', full_name: '', street: '', city: '', postal_code: '', country: '', phone: '', is_default: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.street || !form.city || !form.postal_code || !form.country) {
      toast.error(t('settings_addr.fill_required', 'Rellena todos los campos obligatorios'));
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.put(`/customer/addresses/${editingId}`, { ...form, name: form.name || t('settings_addr.new', 'Direccion') });
        toast.success(t('settings_addr.updated', 'Direccion actualizada'));
      } else {
        await apiClient.post('/customer/addresses', { ...form, name: form.name || t('settings_addr.new', 'Nueva direccion') });
        toast.success(t('settings_addr.saved', 'Direccion guardada'));
      }
      fetchAddresses();
      resetForm();
    } catch (e) { toast.error(e?.message || t('errors.generic', 'Error')); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/customer/addresses/${id}`);
      toast.success(t('settings_addr.deleted', 'Direccion eliminada'));
      fetchAddresses();
    } catch { toast.error(t('errors.generic', 'Error')); }
  };

  const handleSetDefault = async (id) => {
    try {
      await apiClient.put(`/customer/addresses/${id}/default`, {});
      toast.success(t('settings_addr.default_set', 'Direccion predeterminada actualizada'));
      fetchAddresses();
    } catch { toast.error(t('errors.generic', 'Error')); }
  };

  const startEdit = (addr) => {
    setForm({
      name: addr.name || '', full_name: addr.full_name || '', street: addr.street || '',
      city: addr.city || '', postal_code: addr.postal_code || '', country: addr.country || '',
      phone: addr.phone || '', is_default: addr.is_default || false,
    });
    setEditingId(addr.address_id);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate('/settings')} className="bg-transparent border-none cursor-pointer p-1 flex">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-[17px] font-bold text-stone-950">
          {t('settings_addr.title', 'Direcciones guardadas')}
        </span>
      </div>

      <div className="max-w-[600px] mx-auto px-4 pt-4 pb-[100px]">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={28} className="text-stone-500 animate-spin" /></div>
        ) : (
          <>
            {addresses.map((addr) => (
              <div key={addr.address_id} className="bg-white border border-stone-200 rounded-2xl p-4 mb-3">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-stone-400" />
                    <span className="text-sm font-semibold text-stone-950">{addr.name || t('settings_addr.address', 'Direccion')}</span>
                    {addr.is_default && (
                      <span className="text-[10px] font-medium bg-stone-950 text-white px-2 py-0.5 rounded-full">
                        {t('settings_addr.default', 'Predeterminada')}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-stone-950 mt-1">{addr.full_name}</p>
                <p className="text-[13px] text-stone-500 mt-0.5">
                  {addr.street}, {addr.city} {addr.postal_code}, {addr.country}
                </p>
                {addr.phone && <p className="text-[13px] text-stone-500 mt-0.5">{addr.phone}</p>}
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => startEdit(addr)} className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 rounded-full text-xs font-medium text-stone-950 border-none cursor-pointer">
                    <Edit2 size={12} /> {t('common.edit', 'Editar')}
                  </button>
                  {!addr.is_default && (
                    <button onClick={() => handleSetDefault(addr.address_id)} className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 rounded-full text-xs font-medium text-stone-950 border-none cursor-pointer">
                      <Star size={12} /> {t('settings_addr.set_default', 'Predeterminada')}
                    </button>
                  )}
                  <button onClick={() => handleDelete(addr.address_id)} className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 rounded-full text-xs font-medium text-stone-700 border-none cursor-pointer">
                    <Trash2 size={12} /> {t('common.delete', 'Eliminar')}
                  </button>
                </div>
              </div>
            ))}

            {addresses.length === 0 && !showForm && (
              <div className="text-center py-12">
                <MapPin size={40} className="mx-auto text-stone-200 mb-3" />
                <p className="text-sm text-stone-500">{t('settings_addr.empty', 'No tienes direcciones guardadas')}</p>
              </div>
            )}

            {/* Add / Edit form */}
            {showForm ? (
              <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-stone-950">
                    {editingId ? t('settings_addr.edit', 'Editar direccion') : t('settings_addr.add', 'Nueva direccion')}
                  </span>
                  <button onClick={resetForm} className="bg-transparent border-none cursor-pointer p-1"><X size={18} className="text-stone-500" /></button>
                </div>
                <div className="space-y-3">
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('settings_addr.label', 'Etiqueta (ej: Casa, Oficina)')} className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-950 outline-none" />
                  <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder={t('checkout.fullName', 'Nombre completo')} className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-950 outline-none" />
                  <input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} placeholder={t('settings_addr.street', 'Calle y numero')} className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-950 outline-none" />
                  <div className="flex gap-2">
                    <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder={t('settings_addr.city', 'Ciudad')} className="flex-1 px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-950 outline-none" />
                    <input value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })} placeholder={t('settings_addr.postal', 'C.P.')} className="w-24 px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-950 outline-none" />
                  </div>
                  <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder={t('settings_addr.country', 'Pais')} className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-950 outline-none" />
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder={t('settings_addr.phone', 'Telefono (opcional)')} className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-950 outline-none" />
                </div>
                <button onClick={handleSave} disabled={saving} className="w-full mt-4 py-3 bg-stone-950 text-white rounded-full text-sm font-semibold border-none cursor-pointer disabled:opacity-50">
                  {saving ? t('common.saving', 'Guardando...') : editingId ? t('settings_addr.update', 'Actualizar') : t('settings_addr.save', 'Guardar direccion')}
                </button>
              </div>
            ) : (
              <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-dashed border-stone-300 rounded-2xl text-sm font-medium text-stone-950 cursor-pointer mt-3">
                <Plus size={16} /> {t('settings_addr.add', 'Anadir direccion')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
