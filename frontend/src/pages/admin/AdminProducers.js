import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { API } from '../../utils/api';
import { 
  Search, CheckCircle, XCircle, Pause, Eye, Edit, ArrowLeft,
  Building, Phone, Mail, MapPin 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';



const statusColors = {
  approved: 'bg-green-100 text-green-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-red-100 text-red-800',
  paused: 'bg-gray-100 text-gray-800'
};

const roleLabels = {
  producer: 'Productor',
  importer: 'Importador',
};

export default function AdminProducers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedProducer, setSelectedProducer] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    fetchProducers();
  }, []);

  const fetchProducers = async () => {
    try {
      const response = await axios.get(`${API}/admin/producers`, { withCredentials: true });
      setProducers(response.data);
    } catch (error) {
      console.error('Error fetching producers:', error);
      toast.error(t('adminProducers.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (producerId, status) => {
    try {
      await axios.put(`${API}/admin/producers/${producerId}/status?status=${status}`, {}, { withCredentials: true });
      toast.success(t('adminProducers.messages.statusUpdated', { status }));
      fetchProducers();
      if (selectedProducer?.user_id === producerId) {
        setSelectedProducer({ ...selectedProducer, status, approved: status === 'approved' });
      }
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  };

  const saveEdits = async () => {
    try {
      await axios.put(`${API}/admin/producers/${selectedProducer.user_id}`, editData, { withCredentials: true });
      toast.success(t('success.updated'));
      setEditMode(false);
      fetchProducers();
      setSelectedProducer({ ...selectedProducer, ...editData });
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  };

  const filteredProducers = producers.filter(p => {
    const matchesSearch = 
      p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = p.status || (p.approved ? 'approved' : 'pending');
    const matchesFilter = filter === 'all' || status === filter;
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    
    return matchesSearch && matchesFilter && matchesRole;
  });

  // Detail View
  if (selectedProducer) {
    const status = selectedProducer.status || (selectedProducer.approved ? 'approved' : 'pending');
    
    return (
      <div>
        <button
          onClick={() => { setSelectedProducer(null); setEditMode(false); }}
          className="flex items-center gap-2 text-text-secondary hover:text-primary mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('adminProducers.backToProducers')}
        </button>

        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="font-heading text-2xl font-bold text-text-primary">
                {editMode ? (
                  <Input
                    value={editData.company_name || selectedProducer.company_name}
                    onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
                    className="text-xl font-bold"
                  />
                ) : (
                  selectedProducer.company_name || selectedProducer.name
                )}
              </h2>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${statusColors[status]}`}>
                {t(`adminProducers.status.${status}`)}
              </span>
              <span className="inline-block ml-2 px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                {roleLabels[selectedProducer.role] || selectedProducer.role || 'Productor'}
              </span>
            </div>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button onClick={saveEdits} className="bg-primary">{t('common.save')}</Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>{t('common.cancel')}</Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => { setEditMode(true); setEditData(selectedProducer); }}>
                  <Edit className="w-4 h-4 mr-2" /> {t('common.edit')}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-text-muted" />
                <span>{selectedProducer.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-text-muted" />
                {editMode ? (
                  <Input
                    value={editData.phone || selectedProducer.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                ) : (
                  <span>{selectedProducer.phone || t('adminProducers.detail.na')}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-text-muted" />
                <span>{t('adminProducers.detail.vat')}: {selectedProducer.vat_cif || t('adminProducers.detail.na')}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-text-muted mt-1" />
                {editMode ? (
                  <Input
                    value={editData.fiscal_address || selectedProducer.fiscal_address || ''}
                    onChange={(e) => setEditData({ ...editData, fiscal_address: e.target.value })}
                  />
                ) : (
                  <span>{selectedProducer.fiscal_address || t('adminProducers.detail.na')}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-muted">{t('adminProducers.detail.country')}:</span>
                {editMode ? (
                  <Input
                    value={editData.country || selectedProducer.country || ''}
                    onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                  />
                ) : (
                  <span>{selectedProducer.country || t('adminProducers.detail.na')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-stone-200 pt-6">
            <h3 className="font-medium text-text-primary mb-4">{t('adminProducers.detail.actions')}</h3>
            <div className="flex flex-wrap gap-3">
              {status !== 'approved' && (
                <Button 
                  onClick={() => updateStatus(selectedProducer.user_id, 'approved')}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="approve-producer"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> {t('adminProducers.detail.approve')}
                </Button>
              )}
              {status !== 'rejected' && (
                <Button 
                  onClick={() => updateStatus(selectedProducer.user_id, 'rejected')}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  data-testid="reject-producer"
                >
                  <XCircle className="w-4 h-4 mr-2" /> {t('adminProducers.detail.reject')}
                </Button>
              )}
              {status === 'approved' && (
                <Button 
                  onClick={() => updateStatus(selectedProducer.user_id, 'paused')}
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                  data-testid="pause-producer"
                >
                  <Pause className="w-4 h-4 mr-2" /> {t('adminProducers.detail.pause')}
                </Button>
              )}
              {status === 'paused' && (
                <Button 
                  onClick={() => updateStatus(selectedProducer.user_id, 'approved')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> {t('adminProducers.detail.reactivate')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold text-text-primary mb-2">
        {t('adminProducers.title', 'Productores e Importadores')}
      </h1>
      <p className="text-text-muted mb-6">{t('adminProducers.subtitle', 'Gestión de productores e importadores por estado y pais')}</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder={t('adminProducers.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-stone-200 bg-white"
          data-testid="status-filter"
        >
          <option value="all">{t('adminProducers.allStatuses')}</option>
          <option value="pending">{t('adminProducers.status.pending')}</option>
          <option value="approved">{t('adminProducers.status.approved')}</option>
          <option value="rejected">{t('adminProducers.status.rejected')}</option>
          <option value="paused">{t('adminProducers.status.paused')}</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-stone-200 bg-white"
          data-testid="role-filter"
        >
          <option value="all">Todos los tipos</option>
          <option value="producer">Productores</option>
          <option value="importer">Importadores</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted">{t('common.loading')}</div>
        ) : filteredProducers.length === 0 ? (
          <div className="p-8 text-center text-text-muted">{t('adminProducers.noProducersFound')}</div>
        ) : (
          <table className="w-full" data-testid="producers-table">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminProducers.table.company')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminProducers.table.contact')}</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">Tipo</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-secondary">{t('adminProducers.table.status')}</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-secondary">{t('adminProducers.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredProducers.map((producer) => {
                const status = producer.status || (producer.approved ? 'approved' : 'pending');
                return (
                  <tr key={producer.user_id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-primary">{producer.company_name || producer.name}</p>
                      <p className="text-sm text-text-muted">{producer.country}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-text-primary">{producer.email}</p>
                      <p className="text-sm text-text-muted">{producer.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                        {roleLabels[producer.role] || producer.role || 'Productor'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[status]}`}>
                        {t(`adminProducers.status.${status}`)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProducer(producer)}
                          data-testid={`view-${producer.user_id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" /> {t('adminProducers.table.view')}
                        </Button>
                        {status === 'pending' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateStatus(producer.user_id, 'approved')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> {t('adminProducers.detail.approve')}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
