import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, DollarSign, Ban, Play, Trash2, Eye, Send, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import { asNumber } from '../../utils/safe';
import FocusTrap from 'focus-trap-react';


export default function AdminInfluencers() {
  const { t } = useTranslation();
  const [influencers, setInfluencers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [editInfluencer, setEditInfluencer] = useState(null);
  const [editForm, setEditForm] = useState({ tier: 'hercules', followers_count: 1000 });
  const [newInfluencer, setNewInfluencer] = useState({
    full_name: '',
    email: '',
    tier: 'hercules',
    followers_count: 1000,
    discount_code: '',
    discount_percentage: 10
  });

  useEffect(() => {
    fetchInfluencers();
    fetchStats();
  }, []);

  const fetchInfluencers = async () => {
    try {
      const data = await apiClient.get('/admin/influencers');
      setInfluencers(data);
    } catch (err) {
      toast.error('Error loading influencers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiClient.get('/admin/influencer-stats');
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const createInfluencer = async () => {
    try {
      const data = await apiClient.post('/admin/influencers', newInfluencer);
      toast.success(`Influencer created! Code: ${data.discount_code}`);
      setShowCreateDialog(false);
      setNewInfluencer({
        full_name: '',
        email: '',
        tier: 'hercules',
        followers_count: 1000,
        discount_code: '',
        discount_percentage: 10
      });
      fetchInfluencers();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Error creating influencer');
    }
  };

  const updateStatus = async (influencerId, status) => {
    try {
      await apiClient.put(`/admin/influencers/${influencerId}/status?status=${status}`, {});
      toast.success(`Influencer ${status === 'active' ? 'activated' : 'suspended'}`);
      fetchInfluencers();
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const processPayout = async (influencerId) => {
    try {
      const data = await apiClient.post(`/admin/influencers/${influencerId}/payout`, {});
      toast.success(data.message);
      fetchInfluencers();
      fetchStats();
    } catch (err) {
      toast.error(err.message || 'Error processing payout');
    }
  };

  const fetchInfluencerDetails = async (influencerId) => {
    try {
      const data = await apiClient.get(`/admin/influencers/${influencerId}`);
      setSelectedInfluencer(data);
    } catch (err) {
      toast.error('Error loading influencer details');
    }
  };

  const openEdit = (inf) => {
    setEditForm({ tier: inf.current_tier || 'hercules', followers_count: inf.followers_count || 0 });
    setEditInfluencer(inf);
  };

  const saveEdit = async () => {
    if (!editInfluencer) return;
    try {
      await apiClient.put(`/admin/influencers/${editInfluencer.influencer_id}?tier=${editForm.tier}&followers_count=${editForm.followers_count}`, {});
      toast.success('Influencer actualizado');
      setEditInfluencer(null);
      fetchInfluencers();
    } catch (err) {
      toast.error(err.message || 'Error al actualizar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Influencers</h1>
          <p className="text-stone-500">Manage influencer commissions and payouts</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-xl transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Influencer
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">Total Influencers</p>
            <p className="text-2xl font-semibold">{stats.total_influencers}</p>
            <p className="text-xs text-stone-700">{stats.active_influencers} active</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">Total Sales</p>
            <p className="text-2xl font-semibold">€{stats.total_sales_generated.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">Total Commissions</p>
            <p className="text-2xl font-semibold">€{stats.total_commissions_earned.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-sm text-stone-500">Pending Payouts</p>
            <p className="text-2xl font-semibold text-stone-700">€{stats.total_pending_payouts.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Influencers Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="p-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-950">{t('admin.allInfluencers')}</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-3 px-4 font-medium text-stone-500">Name</th>
                <th className="text-left py-3 px-4 font-medium text-stone-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-stone-500">Commission</th>
                <th className="text-left py-3 px-4 font-medium text-stone-500">Sales</th>
                <th className="text-left py-3 px-4 font-medium text-stone-500">Earned</th>
                <th className="text-left py-3 px-4 font-medium text-stone-500">Balance</th>
                <th className="text-left py-3 px-4 font-medium text-stone-500">Stripe</th>
                <th className="text-left py-3 px-4 font-medium text-stone-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {influencers.map((inf) => (
                <tr key={inf.influencer_id} className="border-b border-stone-100">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium">{inf.full_name}</p>
                      <p className="text-sm text-stone-500">{inf.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${inf.status === 'active' ? 'bg-stone-950 text-white' : 'border border-stone-200 text-stone-400 bg-white'}`}>
                      {inf.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {inf.commission_type === 'percentage' ? `${inf.commission_value}%` : `€${inf.commission_value}`}
                  </td>
                  <td className="py-3 px-4">€{(inf.total_sales_generated || 0).toFixed(2)}</td>
                  <td className="py-3 px-4">€{(inf.total_commission_earned || 0).toFixed(2)}</td>
                  <td className="py-3 px-4 font-medium text-stone-700">
                    €{(inf.available_balance || 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    {inf.stripe_onboarding_complete ? (
                      <span className="text-stone-700 text-sm">Connected</span>
                    ) : inf.stripe_account_id ? (
                      <span className="text-stone-600 text-sm">Pending</span>
                    ) : (
                      <span className="text-stone-500 text-sm">Not connected</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <button type="button" className="p-1.5 rounded-xl hover:bg-stone-100 transition-colors" onClick={() => openEdit(inf)} title="Editar tier">
                        <Pencil className="h-4 w-4 text-stone-500" />
                      </button>
                      <button type="button" className="p-1.5 rounded-xl hover:bg-stone-100 transition-colors" onClick={() => fetchInfluencerDetails(inf.influencer_id)} title={t('admin.viewDetails')}>
                        <Eye className="h-4 w-4" />
                      </button>
                      {inf.status !== 'active' && (
                        <button type="button" className="p-1.5 rounded-xl hover:bg-stone-100 transition-colors" onClick={() => updateStatus(inf.influencer_id, 'active')} title={t('admin.activate')}>
                          <Play className="h-4 w-4 text-stone-700" />
                        </button>
                      )}
                      {inf.status === 'active' && (
                        <button type="button" className="p-1.5 rounded-xl hover:bg-stone-100 transition-colors" onClick={() => updateStatus(inf.influencer_id, 'suspended')} title={t('admin.pause')}>
                          <Ban className="h-4 w-4 text-stone-600" />
                        </button>
                      )}
                      {inf.available_balance > 0 && inf.stripe_onboarding_complete && (
                        <button type="button" className="p-1.5 rounded-xl hover:bg-stone-100 transition-colors" onClick={() => processPayout(inf.influencer_id)} title={t('admin.processPayout')}>
                          <Send className="h-4 w-4 text-stone-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Tier Modal */}
      {!!editInfluencer && (
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-950">Editar influencer</h2>
              <button type="button" onClick={() => setEditInfluencer(null)} className="p-1.5 rounded-full hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-stone-500 mb-1">Influencer</p>
                <p className="font-medium">{editInfluencer.full_name}</p>
                <p className="text-sm text-stone-500">{editInfluencer.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Tier</label>
                <select
                  value={editForm.tier}
                  onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2"
                >
                  <option value="hercules">Hercules · 3%</option>
                  <option value="atenea">Atenea · 5%</option>
                  <option value="zeus">Zeus · 7%</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Seguidores</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                  value={editForm.followers_count}
                  onChange={(e) => setEditForm({ ...editForm, followers_count: parseInt(e.target.value || '0', 10) })}
                />
              </div>
              <div className="bg-stone-50 rounded-xl p-3 text-sm text-stone-600">
                Comisión que se aplicara: <strong>
                  {editForm.tier === 'hercules' ? '3%' : editForm.tier === 'atenea' ? '5%' : '7%'}
                </strong>
              </div>
              <button type="button" onClick={saveEdit} className="w-full py-2.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-xl transition-colors">
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
        </FocusTrap>
      )}

      {/* Influencer Details Modal */}
      {!!selectedInfluencer && (
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-950">{t('admin.influencerDetails')}</h2>
              <button type="button" onClick={() => setSelectedInfluencer(null)} className="p-1.5 rounded-full hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-stone-500">Name</p>
                  <p className="font-medium">{selectedInfluencer.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Email</p>
                  <p className="font-medium">{selectedInfluencer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Discount Code</p>
                  <p className="font-mono font-bold">{selectedInfluencer.discount_code_info?.code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Customer Discount</p>
                  <p className="font-medium">{selectedInfluencer.discount_code_info?.value}%</p>
                </div>
              </div>

              {selectedInfluencer.recent_commissions?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recent Commissions</h4>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Order</th>
                          <th className="text-left py-2">Total</th>
                          <th className="text-left py-2">Commission</th>
                          <th className="text-left py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInfluencer.recent_commissions.map((c) => (
                          <tr key={c.commission_id} className="border-b border-stone-100">
                            <td className="py-2 font-mono text-xs">{c.order_id}</td>
                            <td className="py-2">€{asNumber(c.order_total).toFixed(2)}</td>
                            <td className="py-2 text-stone-700">€{asNumber(c.commission_amount).toFixed(2)}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${c.commission_status === 'paid' ? 'bg-stone-950 text-white' : c.commission_status === 'pending' ? 'bg-stone-200 text-stone-700' : 'border border-stone-200 text-stone-400 bg-white'}`}>
                                {c.commission_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </FocusTrap>
      )}
      {/* Create Influencer Modal */}
      {showCreateDialog && (
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-950">{t('admin.createInfluencer')}</h2>
              <button type="button" onClick={() => setShowCreateDialog(false)} className="p-1.5 rounded-full hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('admin.fullName')}</label>
                <input
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                  value={newInfluencer.full_name}
                  onChange={(e) => setNewInfluencer({...newInfluencer, full_name: e.target.value})}
                  placeholder="Maria Garcia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">{t('admin.email')}</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                  value={newInfluencer.email}
                  onChange={(e) => setNewInfluencer({...newInfluencer, email: e.target.value})}
                  placeholder="maria@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tier</label>
                  <select
                    value={newInfluencer.tier}
                    onChange={(e) => setNewInfluencer({...newInfluencer, tier: e.target.value})}
                    className="w-full border border-stone-200 rounded-xl px-3 py-2"
                  >
                    <option value="hercules">Hercules · 3%</option>
                    <option value="atenea">Atenea · 5%</option>
                    <option value="zeus">Zeus · 7%</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Followers</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                    value={newInfluencer.followers_count}
                    onChange={(e) => setNewInfluencer({...newInfluencer, followers_count: parseInt(e.target.value || '0', 10) || 0})}
                    placeholder="1000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('admin.discountCode')}</label>
                  <input
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                    value={newInfluencer.discount_code}
                    onChange={(e) => setNewInfluencer({...newInfluencer, discount_code: e.target.value.toUpperCase()})}
                    placeholder="Auto-generated"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('admin.customerDiscount')}</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                    value={newInfluencer.discount_percentage}
                    onChange={(e) => setNewInfluencer({...newInfluencer, discount_percentage: parseFloat(e.target.value)})}
                    placeholder="10"
                  />
                </div>
              </div>
              <button type="button" onClick={createInfluencer} className="w-full py-2.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-xl transition-colors">
                Create Influencer
              </button>
            </div>
          </div>
        </div>
        </FocusTrap>
      )}
    </div>
  );
}
