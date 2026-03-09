import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Plus, DollarSign, Ban, Play, Trash2, Eye, Send } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '../../utils/api';


export default function AdminInfluencers() {
  const { t } = useTranslation();
  const tierCommission = { hercules: 3, atenea: 5, zeus: 7 };
  const [influencers, setInfluencers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
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
      const res = await axios.get(`${API}/admin/influencers`, { withCredentials: true });
      setInfluencers(res.data);
    } catch (err) {
      toast.error('Error loading influencers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/influencer-stats`, { withCredentials: true });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const createInfluencer = async () => {
    try {
      const res = await axios.post(`${API}/admin/influencers`, newInfluencer, { withCredentials: true });
      toast.success(`Influencer created! Code: ${res.data.discount_code}`);
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
      toast.error(err.response?.data?.detail || 'Error creating influencer');
    }
  };

  const updateStatus = async (influencerId, status) => {
    try {
      await axios.put(
        `${API}/admin/influencers/${influencerId}/status?status=${status}`,
        {},
        { withCredentials: true }
      );
      toast.success(`Influencer ${status === 'active' ? 'activated' : 'suspended'}`);
      fetchInfluencers();
    } catch (err) {
      toast.error('Error updating status');
    }
  };

  const processPayout = async (influencerId) => {
    try {
      const res = await axios.post(
        `${API}/admin/influencers/${influencerId}/payout`,
        {},
        { withCredentials: true }
      );
      toast.success(res.data.message);
      fetchInfluencers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error processing payout');
    }
  };

  const fetchInfluencerDetails = async (influencerId) => {
    try {
      const res = await axios.get(`${API}/admin/influencers/${influencerId}`, { withCredentials: true });
      setSelectedInfluencer(res.data);
    } catch (err) {
      toast.error('Error loading influencer details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C1C1C]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-medium">Influencers</h1>
          <p className="text-[#7A7A7A] font-body">Manage influencer commissions and payouts</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#1C1C1C] hover:bg-[#2A2A2A]">
              <Plus className="h-4 w-4 mr-2" />
              Add Influencer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin.createInfluencer')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>{t('admin.fullName')}</Label>
                <Input
                  value={newInfluencer.full_name}
                  onChange={(e) => setNewInfluencer({...newInfluencer, full_name: e.target.value})}
                  placeholder="Maria Garcia"
                />
              </div>
              <div>
                <Label>{t('admin.email')}</Label>
                <Input
                  type="email"
                  value={newInfluencer.email}
                  onChange={(e) => setNewInfluencer({...newInfluencer, email: e.target.value})}
                  placeholder="maria@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tier</Label>
                  <select
                    value={newInfluencer.tier}
                    onChange={(e) => setNewInfluencer({...newInfluencer, tier: e.target.value})}
                    className="w-full border border-[#DED7CE] rounded-md p-2"
                  >
                    <option value="hercules">Hercules · 3%</option>
                    <option value="atenea">Atenea · 5%</option>
                    <option value="zeus">Zeus · 7%</option>
                  </select>
                </div>
                <div>
                  <Label>Followers</Label>
                  <Input
                    type="number"
                    value={newInfluencer.followers_count}
                    onChange={(e) => setNewInfluencer({...newInfluencer, followers_count: parseInt(e.target.value || '0', 10) || 0})}
                    placeholder="1000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('admin.discountCode')}</Label>
                  <Input
                    value={newInfluencer.discount_code}
                    onChange={(e) => setNewInfluencer({...newInfluencer, discount_code: e.target.value.toUpperCase()})}
                    placeholder="Auto-generated"
                  />
                </div>
                <div>
                  <Label>{t('admin.customerDiscount')}</Label>
                  <Input
                    type="number"
                    value={newInfluencer.discount_percentage}
                    onChange={(e) => setNewInfluencer({...newInfluencer, discount_percentage: parseFloat(e.target.value)})}
                    placeholder="10"
                  />
                </div>
              </div>
              <Button onClick={createInfluencer} className="w-full bg-[#1C1C1C] hover:bg-[#2A2A2A]">
                Create Influencer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-[#7A7A7A]">Total Influencers</p>
              <p className="text-2xl font-display font-medium">{stats.total_influencers}</p>
              <p className="text-xs text-green-600">{stats.active_influencers} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-[#7A7A7A]">Total Sales</p>
              <p className="text-2xl font-display font-medium">€{stats.total_sales_generated.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-[#7A7A7A]">Total Commissions</p>
              <p className="text-2xl font-display font-medium">€{stats.total_commissions_earned.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-[#7A7A7A]">Pending Payouts</p>
              <p className="text-2xl font-display font-medium text-orange-600">€{stats.total_pending_payouts.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Influencers Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.allInfluencers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E6DFD6]">
                  <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">Name</th>
                  <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">Status</th>
                  <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">Commission</th>
                  <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">Sales</th>
                  <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">Earned</th>
                  <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">Balance</th>
                  <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">Stripe</th>
                  <th className="text-left py-3 px-4 font-body font-medium text-[#7A7A7A]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {influencers.map((inf) => (
                  <tr key={inf.influencer_id} className="border-b border-[#F5F1EB]">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{inf.full_name}</p>
                        <p className="text-sm text-[#7A7A7A]">{inf.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inf.status === 'active' ? 'bg-green-100 text-green-700' :
                        inf.status === 'suspended' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {inf.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {inf.commission_type === 'percentage' ? `${inf.commission_value}%` : `€${inf.commission_value}`}
                    </td>
                    <td className="py-3 px-4">€{(inf.total_sales_generated || 0).toFixed(2)}</td>
                    <td className="py-3 px-4">€{(inf.total_commission_earned || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 font-medium text-green-600">
                      €{(inf.available_balance || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      {inf.stripe_onboarding_complete ? (
                        <span className="text-green-600 text-sm">Connected</span>
                      ) : inf.stripe_account_id ? (
                        <span className="text-amber-600 text-sm">Pending</span>
                      ) : (
                        <span className="text-[#7A7A7A] text-sm">Not connected</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => fetchInfluencerDetails(inf.influencer_id)}
                          title={t('admin.viewDetails')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {inf.status !== 'active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus(inf.influencer_id, 'active')}
                            title={t('admin.activate')}
                          >
                            <Play className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {inf.status === 'active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateStatus(inf.influencer_id, 'suspended')}
                            title={t('admin.pause')}
                          >
                            <Ban className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        {inf.available_balance > 0 && inf.stripe_onboarding_complete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => processPayout(inf.influencer_id)}
                            title={t('admin.processPayout')}
                          >
                            <Send className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Influencer Details Modal */}
      <Dialog open={!!selectedInfluencer} onOpenChange={() => setSelectedInfluencer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.influencerDetails')}</DialogTitle>
          </DialogHeader>
          {selectedInfluencer && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#7A7A7A]">Name</p>
                  <p className="font-medium">{selectedInfluencer.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-[#7A7A7A]">Email</p>
                  <p className="font-medium">{selectedInfluencer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-[#7A7A7A]">Discount Code</p>
                  <p className="font-mono font-bold">{selectedInfluencer.discount_code_info?.code || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-[#7A7A7A]">Customer Discount</p>
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
                          <tr key={c.commission_id} className="border-b border-[#F5F1EB]">
                            <td className="py-2 font-mono text-xs">{c.order_id}</td>
                            <td className="py-2">€{c.order_total?.toFixed(2)}</td>
                            <td className="py-2 text-green-600">€{c.commission_amount?.toFixed(2)}</td>
                            <td className="py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                c.commission_status === 'paid' ? 'bg-green-100 text-green-700' :
                                c.commission_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
