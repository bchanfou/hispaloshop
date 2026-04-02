// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import {
  Plus, Trash2, Edit, Search, Tag, Percent, DollarSign, Truck,
  Check, X, Calendar, Users, ShoppingBag, Clock, Sparkles
} from 'lucide-react';



export default function AdminDiscountCodes() {
  const { t } = useTranslation();
  const [discountCodes, setDiscountCodes] = useState([]);
  const [pendingInfluencerCodes, setPendingInfluencerCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: '',
    active: true,
    start_date: '',
    end_date: '',
    usage_limit: '',
    min_cart_amount: '',
    applicable_products: []
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [codesData, pendingData] = await Promise.all([
        apiClient.get('/admin/discount-codes'),
        apiClient.get('/admin/influencer-codes/pending'),
      ]);
      setDiscountCodes(Array.isArray(codesData) ? codesData : []);
      setPendingInfluencerCodes(Array.isArray(pendingData) ? pendingData : []);
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Error al cargar los códigos de descuento');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountCodes = fetchAll;

  const handleApproveInfluencerCode = async (codeId, codeName) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await apiClient.put(`/admin/influencer-codes/${codeId}/approve`, {});
      toast.success(`Código ${codeName} aprobado y activado`);
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || error.message || 'Error al aprobar el código');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRejectInfluencerCode = async (codeId, codeName) => {
    if (actionBusy) return;
    const reason = window.prompt(`Motivo del rechazo del código ${codeName} (opcional):`);
    if (reason === null) return;
    setActionBusy(true);
    try {
      await apiClient.put(`/admin/influencer-codes/${codeId}/reject?reason=${encodeURIComponent(reason || '')}`, {});
      toast.success(`Código ${codeName} rechazado`);
      fetchAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || error.message || 'Error al rechazar el código');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: isNaN(parseFloat(formData.value)) ? 0 : parseFloat(formData.value),
      active: formData.active,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      usage_limit: formData.usage_limit && !isNaN(parseInt(formData.usage_limit)) ? parseInt(formData.usage_limit) : null,
      min_cart_amount: formData.min_cart_amount && !isNaN(parseFloat(formData.min_cart_amount)) ? parseFloat(formData.min_cart_amount) : null,
      applicable_products: formData.applicable_products
    };

    try {
      if (editingCode) {
        await apiClient.put(`/admin/discount-codes/${editingCode.code_id}`, payload);
        toast.success('Código de descuento actualizado');
      } else {
        await apiClient.post('/admin/discount-codes', payload);
        toast.success('Código de descuento creado');
      }
      resetForm();
      fetchDiscountCodes();
    } catch (error) {
      toast.error(error?.response?.data?.detail || error.message || 'Error al guardar código de descuento');
    }
  };

  const handleDelete = async (codeId) => {
    if (actionBusy) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar este código?')) return;

    setActionBusy(true);
    try {
      await apiClient.delete(`/admin/discount-codes/${codeId}`);
      toast.success('Código de descuento eliminado');
      fetchDiscountCodes();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Error al eliminar código de descuento');
    } finally {
      setActionBusy(false);
    }
  };

  const handleToggleActive = async (code) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await apiClient.put(`/admin/discount-codes/${code.code_id}/toggle`, {});
      toast.success(`Código ${code.active ? 'desactivado' : 'activado'}`);
      fetchDiscountCodes();
    } catch (error) {
      toast.error(error?.response?.data?.detail || 'Error al cambiar estado del código');
    } finally {
      setActionBusy(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      active: true,
      start_date: '',
      end_date: '',
      usage_limit: '',
      min_cart_amount: '',
      applicable_products: []
    });
    setEditingCode(null);
    setShowCreateForm(false);
  };

  const startEdit = (code) => {
    setFormData({
      code: code.code,
      type: code.type,
      value: code.value.toString(),
      active: code.active,
      start_date: code.start_date || '',
      end_date: code.end_date || '',
      usage_limit: code.usage_limit?.toString() || '',
      min_cart_amount: code.min_cart_amount?.toString() || '',
      applicable_products: code.applicable_products || []
    });
    setEditingCode(code);
    setShowCreateForm(true);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'percentage': return <Percent className="w-4 h-4" />;
      case 'fixed': return <DollarSign className="w-4 h-4" />;
      case 'free_shipping': return <Truck className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'percentage': return 'Porcentaje';
      case 'fixed': return 'Importe fijo';
      case 'free_shipping': return 'Envío gratis';
      default: return type;
    }
  };

  const formatValue = (code) => {
    if (code.type === 'percentage') return `${code.value}%`;
    if (code.type === 'fixed') { const v = Number(code.value); return `${isNaN(v) ? '0.00' : v.toFixed(2)} €`; }
    return 'Envío gratis';
  };

  const filteredCodes = discountCodes.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Cargando códigos de descuento">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-56 animate-pulse rounded-full bg-stone-100" />
            <div className="h-3.5 w-80 animate-pulse rounded-full bg-stone-100" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded-full bg-stone-100" />
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-4 space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-24 animate-pulse rounded-full bg-stone-100" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-stone-100" />
              <div className="flex-1" />
              <div className="h-4 w-20 animate-pulse rounded-full bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-discount-codes">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">Códigos de Descuento</h1>
          <p className="text-stone-500 text-sm mt-1">Gestiona códigos promocionales e influencers</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-2xl transition-colors"
          data-testid="create-discount-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo código
        </button>
      </div>

      {/* Pending influencer codes */}
      {pendingInfluencerCodes.length > 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-stone-700" />
            <h2 className="font-semibold text-stone-950">
              Códigos de influencer pendientes de aprobación ({pendingInfluencerCodes.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingInfluencerCodes.map((code) => (
              <div key={code.code_id} className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-stone-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-stone-950 text-lg tracking-wide">{code.code}</p>
                    <p className="text-sm text-stone-500 truncate">
                      {code.influencer_name || 'Influencer'}{code.influencer_handle ? ` · ${code.influencer_handle}` : ''} · 10% descuento · uso ilimitado
                    </p>
                    <p className="text-xs text-stone-500">Solicitado: {code.created_at && !isNaN(new Date(code.created_at).getTime()) ? new Date(code.created_at).toLocaleDateString('es-ES') : '—'}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="flex items-center px-4 py-1.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-full transition-colors"
                    onClick={() => handleApproveInfluencerCode(code.code_id, code.code)}
                  >
                    <Check className="w-4 h-4 mr-1" /> Aprobar
                  </button>
                  <button
                    type="button"
                    className="flex items-center px-4 py-1.5 text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-full transition-colors"
                    onClick={() => handleRejectInfluencerCode(code.code_id, code.code)}
                  >
                    <X className="w-4 h-4 mr-1" /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6" data-testid="discount-form">
          <h2 className="text-lg font-semibold text-stone-950 mb-4">
            {editingCode ? 'Editar código de descuento' : 'Crear código de descuento'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Código <span className="text-stone-500">*</span>
                </label>
                <input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Ej. SAVE20"
                  required
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 uppercase placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                  data-testid="discount-code-input"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Tipo <span className="text-stone-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-stone-200 rounded-2xl px-3 py-2 text-sm text-stone-950 focus:outline-none focus:border-stone-950"
                  data-testid="discount-type-select"
                >
                  <option value="percentage">{t('admin.percentageOff')}</option>
                  <option value="fixed">{t('admin.fixedAmountOff')}</option>
                  <option value="free_shipping">{t('admin.freeShipping')}</option>
                </select>
              </div>

              {/* Value */}
              {formData.type !== 'free_shipping' && (
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">
                    Valor <span className="text-stone-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">
                      {formData.type === 'percentage' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      step={formData.type === 'percentage' ? '1' : '0.01'}
                      min="0"
                      max={formData.type === 'percentage' ? '100' : undefined}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder={formData.type === 'percentage' ? '10' : '5.00'}
                      required={formData.type !== 'free_shipping'}
                      className="w-full pl-8 pr-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                      data-testid="discount-value-input"
                    />
                  </div>
                </div>
              )}

              {/* Minimum Cart Amount */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Importe mínimo del carrito
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_cart_amount}
                    onChange={(e) => setFormData({ ...formData, min_cart_amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                    data-testid="discount-min-amount-input"
                  />
                </div>
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Límite de uso
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="Ilimitado"
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                  data-testid="discount-usage-limit-input"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Fecha de inicio
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                  data-testid="discount-start-date-input"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Fecha de fin
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                  data-testid="discount-end-date-input"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 rounded border-stone-200 accent-stone-950"
                  data-testid="discount-active-checkbox"
                />
                <label htmlFor="active" className="text-sm text-stone-600">
                  Activo
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-stone-200">
              <button type="submit" className="px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-2xl transition-colors" data-testid="save-discount-btn">
                {editingCode ? 'Actualizar código' : 'Crear código'}
              </button>
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium border border-stone-200 rounded-2xl hover:bg-stone-50 transition-colors" data-testid="cancel-discount-btn">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          placeholder="Buscar códigos de descuento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
          data-testid="search-discount-input"
        />
      </div>

      {/* Discount Codes List */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Código</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Tipo</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Valor</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Uso</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Estado</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {filteredCodes.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-stone-500">
                  {searchTerm ? 'No se encontraron códigos' : 'Aún no hay códigos de descuento. Crea uno para empezar.'}
                </td>
              </tr>
            ) : (
              filteredCodes.map((code) => (
                <tr key={code.code_id} className="hover:bg-stone-50" data-testid={`discount-row-${code.code_id}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-stone-500" />
                      <span className="font-mono font-medium text-stone-950">{code.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-stone-600">
                      {getTypeIcon(code.type)}
                      <span className="text-sm">{getTypeLabel(code.type)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-stone-950">{formatValue(code)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-stone-600">
                      <Users className="w-4 h-4" />
                      <span>
                        {code.usage_count || 0}
                        {code.usage_limit ? ` / ${code.usage_limit}` : ' usos'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(code)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        code.active
                          ? 'bg-stone-950 text-white'
                          : 'border border-stone-200 text-stone-400 bg-white'
                      }`}
                      data-testid={`toggle-status-${code.code_id}`}
                    >
                      {code.active ? (
                        <>
                          <Check className="w-3 h-3" /> Activo
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" /> Inactivo
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(code)}
                        className="p-2 text-stone-500 hover:text-stone-950 hover:bg-stone-50 rounded-2xl transition-colors"
                        data-testid={`edit-discount-${code.code_id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(code.code_id)}
                        className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-50 rounded-2xl transition-colors"
                        data-testid={`delete-discount-${code.code_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {discountCodes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-2xl">
                <Check className="w-5 h-5 text-stone-700" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider">Códigos activos</p>
                <p className="text-xl font-semibold text-stone-950">
                  {discountCodes.filter(c => c.active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-2xl">
                <Users className="w-5 h-5 text-stone-700" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider">Usos totales</p>
                <p className="text-xl font-semibold text-stone-950">
                  {discountCodes.reduce((sum, c) => sum + (c.usage_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-2xl">
                <Tag className="w-5 h-5 text-stone-700" />
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase tracking-wider">Total de códigos</p>
                <p className="text-xl font-semibold text-stone-950">
                  {discountCodes.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
