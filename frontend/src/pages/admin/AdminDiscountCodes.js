import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { API } from '../../utils/api';
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
      const [codesRes, pendingRes] = await Promise.all([
        axios.get(`${API}/admin/discount-codes`, { withCredentials: true }),
        axios.get(`${API}/admin/influencer-codes/pending`, { withCredentials: true }),
      ]);
      setDiscountCodes(codesRes.data);
      setPendingInfluencerCodes(pendingRes.data);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast.error('Error al cargar los códigos de descuento');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountCodes = fetchAll;

  const handleApproveInfluencerCode = async (codeId, codeName) => {
    try {
      await axios.put(`${API}/admin/influencer-codes/${codeId}/approve`, {}, { withCredentials: true });
      toast.success(`Código ${codeName} aprobado y activado`);
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al aprobar el código');
    }
  };

  const handleRejectInfluencerCode = async (codeId, codeName) => {
    const reason = window.prompt(`Motivo del rechazo del código ${codeName} (opcional):`);
    if (reason === null) return; // Cancelled
    try {
      await axios.put(`${API}/admin/influencer-codes/${codeId}/reject?reason=${encodeURIComponent(reason || '')}`, {}, { withCredentials: true });
      toast.success(`Código ${codeName} rechazado`);
      fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al rechazar el código');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: parseFloat(formData.value) || 0,
      active: formData.active,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      min_cart_amount: formData.min_cart_amount ? parseFloat(formData.min_cart_amount) : null,
      applicable_products: formData.applicable_products
    };

    try {
      if (editingCode) {
        await axios.put(`${API}/admin/discount-codes/${editingCode.code_id}`, payload, { withCredentials: true });
        toast.success('Discount code updated');
      } else {
        await axios.post(`${API}/admin/discount-codes`, payload, { withCredentials: true });
        toast.success('Discount code created');
      }
      resetForm();
      fetchDiscountCodes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save discount code');
    }
  };

  const handleDelete = async (codeId) => {
    if (!window.confirm('Are you sure you want to delete this discount code?')) return;
    
    try {
      await axios.delete(`${API}/admin/discount-codes/${codeId}`, { withCredentials: true });
      toast.success('Discount code deleted');
      fetchDiscountCodes();
    } catch (error) {
      toast.error('Failed to delete discount code');
    }
  };

  const handleToggleActive = async (code) => {
    try {
      await axios.put(`${API}/admin/discount-codes/${code.code_id}/toggle`, {}, { withCredentials: true });
      toast.success(`Discount code ${code.active ? 'deactivated' : 'activated'}`);
      fetchDiscountCodes();
    } catch (error) {
      toast.error('Failed to toggle discount code');
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
      case 'percentage': return 'Percentage';
      case 'fixed': return 'Fixed Amount';
      case 'free_shipping': return 'Free Shipping';
      default: return type;
    }
  };

  const formatValue = (code) => {
    if (code.type === 'percentage') return `${code.value}%`;
    if (code.type === 'fixed') return `$${code.value.toFixed(2)}`;
    return 'Free Shipping';
  };

  const filteredCodes = discountCodes.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-discount-codes">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[#1C1C1C]">Códigos de Descuento</h1>
          <p className="text-[#7A7A7A] text-sm mt-1">Gestiona códigos promocionales e influencers</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-[#1C1C1C] hover:bg-[#2C2C2C] text-white"
          data-testid="create-discount-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo código
        </Button>
      </div>

      {/* Pending influencer codes */}
      {pendingInfluencerCodes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-800">
              Códigos de influencer pendientes de aprobación ({pendingInfluencerCodes.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingInfluencerCodes.map((code) => (
              <div key={code.code_id} className="bg-white rounded-lg border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-fuchsia-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-fuchsia-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#1C1C1C] text-lg tracking-wide">{code.code}</p>
                    <p className="text-sm text-[#7A7A7A] truncate">
                      {code.influencer_name || 'Influencer'}{code.influencer_handle ? ` · ${code.influencer_handle}` : ''} · 10% descuento · uso ilimitado
                    </p>
                    <p className="text-xs text-[#9A9A9A]">Solicitado: {new Date(code.created_at).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4"
                    onClick={() => handleApproveInfluencerCode(code.code_id, code.code)}
                  >
                    <Check className="w-4 h-4 mr-1" /> Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 rounded-full px-4"
                    onClick={() => handleRejectInfluencerCode(code.code_id, code.code)}
                  >
                    <X className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white border border-[#DED7CE] rounded-lg p-6" data-testid="discount-form">
          <h2 className="font-heading text-lg font-medium text-[#1C1C1C] mb-4">
            {editingCode ? 'Edit Discount Code' : 'Create New Discount Code'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  required
                  className="uppercase"
                  data-testid="discount-code-input"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-[#DED7CE] rounded-md px-3 py-2 text-sm"
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
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                    Value <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]">
                      {formData.type === 'percentage' ? '%' : '$'}
                    </span>
                    <Input
                      type="number"
                      step={formData.type === 'percentage' ? '1' : '0.01'}
                      min="0"
                      max={formData.type === 'percentage' ? '100' : undefined}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder={formData.type === 'percentage' ? '10' : '5.00'}
                      required={formData.type !== 'free_shipping'}
                      className="pl-8"
                      data-testid="discount-value-input"
                    />
                  </div>
                </div>
              )}

              {/* Minimum Cart Amount */}
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                  Minimum Cart Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A7A]">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.min_cart_amount}
                    onChange={(e) => setFormData({ ...formData, min_cart_amount: e.target.value })}
                    placeholder="0.00"
                    className="pl-8"
                    data-testid="discount-min-amount-input"
                  />
                </div>
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                  Usage Limit
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="Unlimited"
                  data-testid="discount-usage-limit-input"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                  Start Date
                </label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  data-testid="discount-start-date-input"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">
                  End Date
                </label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
                  className="w-4 h-4 rounded border-[#DED7CE]"
                  data-testid="discount-active-checkbox"
                />
                <label htmlFor="active" className="text-sm text-[#4A4A4A]">
                  Active
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-[#E6DFD6]">
              <Button type="submit" className="bg-[#1C1C1C] hover:bg-[#2C2C2C] text-white" data-testid="save-discount-btn">
                {editingCode ? 'Update Code' : 'Create Code'}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} data-testid="cancel-discount-btn">
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7A7A]" />
        <Input
          placeholder="Search discount codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="search-discount-input"
        />
      </div>

      {/* Discount Codes List */}
      <div className="bg-white border border-[#DED7CE] rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#FAF7F2] border-b border-[#DED7CE]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">Code</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">Value</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">Usage</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">Status</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-[#7A7A7A] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6DFD6]">
            {filteredCodes.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-[#7A7A7A]">
                  {searchTerm ? 'No discount codes found' : 'No discount codes yet. Create one to get started.'}
                </td>
              </tr>
            ) : (
              filteredCodes.map((code) => (
                <tr key={code.code_id} className="hover:bg-[#FAF7F2]" data-testid={`discount-row-${code.code_id}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-[#7A7A7A]" />
                      <span className="font-mono font-medium text-[#1C1C1C]">{code.code}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[#4A4A4A]">
                      {getTypeIcon(code.type)}
                      <span className="text-sm">{getTypeLabel(code.type)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-[#1C1C1C]">{formatValue(code)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-[#4A4A4A]">
                      <Users className="w-4 h-4" />
                      <span>
                        {code.usage_count || 0}
                        {code.usage_limit ? ` / ${code.usage_limit}` : ' uses'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleActive(code)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        code.active
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-stone-100 text-stone-500 border border-stone-200'
                      }`}
                      data-testid={`toggle-status-${code.code_id}`}
                    >
                      {code.active ? (
                        <>
                          <Check className="w-3 h-3" /> Active
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" /> Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(code)}
                        className="p-2 text-[#7A7A7A] hover:text-[#1C1C1C] hover:bg-[#FAF7F2] rounded"
                        data-testid={`edit-discount-${code.code_id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(code.code_id)}
                        className="p-2 text-[#7A7A7A] hover:text-red-500 hover:bg-red-50 rounded"
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
          <div className="bg-white border border-[#DED7CE] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-[#7A7A7A] uppercase tracking-wider">Active Codes</p>
                <p className="font-heading text-xl font-semibold text-[#1C1C1C]">
                  {discountCodes.filter(c => c.active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-[#DED7CE] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-[#7A7A7A] uppercase tracking-wider">Total Uses</p>
                <p className="font-heading text-xl font-semibold text-[#1C1C1C]">
                  {discountCodes.reduce((sum, c) => sum + (c.usage_count || 0), 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-[#DED7CE] rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Tag className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-[#7A7A7A] uppercase tracking-wider">Total Codes</p>
                <p className="font-heading text-xl font-semibold text-[#1C1C1C]">
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
