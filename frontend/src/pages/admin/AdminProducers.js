import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { 
  Search, CheckCircle, XCircle, Pause, Eye, Edit, ArrowLeft,
  Building, Phone, Mail, MapPin 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { asLowerText } from '../../utils/safe';



const statusColors = {
  approved: 'bg-stone-950 text-white',
  pending: 'bg-stone-200 text-stone-700',
  rejected: 'border border-stone-200 text-stone-400 bg-white',
  paused: 'bg-stone-200 text-stone-600'
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
      const data = await apiClient.get('/admin/producers');
      setProducers(data);
    } catch (error) {
      console.error('Error fetching producers:', error);
      toast.error(t('adminProducers.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (producerId, status) => {
    try {
      await apiClient.put(`/admin/producers/${producerId}/status?status=${status}`, {});
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
      await apiClient.put(`/admin/producers/${selectedProducer.user_id}`, editData);
      toast.success(t('success.updated'));
      setEditMode(false);
      fetchProducers();
      setSelectedProducer({ ...selectedProducer, ...editData });
    } catch (error) {
      toast.error(t('errors.generic'));
    }
  };

  const filteredProducers = producers.filter(p => {
    const searchNeedle = asLowerText(searchTerm);
    const matchesSearch = 
      asLowerText(p.company_name).includes(searchNeedle) ||
      asLowerText(p.email).includes(searchNeedle) ||
      asLowerText(p.name).includes(searchNeedle);
    
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
          className="flex items-center gap-2 text-stone-600 hover:text-stone-950 mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('adminProducers.backToProducers')}
        </button>

        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-stone-950">
                {editMode ? (
                  <input
                    className="w-full px-3 py-2 text-xl font-bold border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                    value={editData.company_name || selectedProducer.company_name}
                    onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
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
                  <button type="button" onClick={saveEdits} className="px-4 py-2 text-sm font-medium bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-colors">{t('common.save')}</button>
                  <button type="button" className="px-4 py-2 text-sm font-medium border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors" onClick={() => setEditMode(false)}>{t('common.cancel')}</button>
                </>
              ) : (
                <button type="button" className="flex items-center px-4 py-2 text-sm font-medium border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors" onClick={() => { setEditMode(true); setEditData(selectedProducer); }}>
                  <Edit className="w-4 h-4 mr-2" /> {t('common.edit')}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-stone-500" />
                <span>{selectedProducer.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-stone-500" />
                {editMode ? (
                  <input
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                    value={editData.phone || selectedProducer.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  />
                ) : (
                  <span>{selectedProducer.phone || t('adminProducers.detail.na')}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-stone-500" />
                <span>{t('adminProducers.detail.vat')}: {selectedProducer.vat_cif || t('adminProducers.detail.na')}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-stone-500 mt-1" />
                {editMode ? (
                  <input
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
                    value={editData.fiscal_address || selectedProducer.fiscal_address || ''}
                    onChange={(e) => setEditData({ ...editData, fiscal_address: e.target.value })}
                  />
                ) : (
                  <span>{selectedProducer.fiscal_address || t('adminProducers.detail.na')}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-stone-500">{t('adminProducers.detail.country')}:</span>
                {editMode ? (
                  <input
                    className="flex-1 px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950"
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
            <h3 className="font-medium text-stone-950 mb-4">{t('adminProducers.detail.actions')}</h3>
            <div className="flex flex-wrap gap-3">
              {status !== 'approved' && (
                <button
                  type="button"
                  onClick={() => updateStatus(selectedProducer.user_id, 'approved')}
                  className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-xl transition-colors"
                  data-testid="approve-producer"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> {t('adminProducers.detail.approve')}
                </button>
              )}
              {status !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => updateStatus(selectedProducer.user_id, 'rejected')}
                  className="flex items-center px-4 py-2 text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl transition-colors"
                  data-testid="reject-producer"
                >
                  <XCircle className="w-4 h-4 mr-2" /> {t('adminProducers.detail.reject')}
                </button>
              )}
              {status === 'approved' && (
                <button
                  type="button"
                  onClick={() => updateStatus(selectedProducer.user_id, 'paused')}
                  className="flex items-center px-4 py-2 text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl transition-colors"
                  data-testid="pause-producer"
                >
                  <Pause className="w-4 h-4 mr-2" /> {t('adminProducers.detail.pause')}
                </button>
              )}
              {status === 'paused' && (
                <button
                  type="button"
                  onClick={() => updateStatus(selectedProducer.user_id, 'approved')}
                  className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-xl transition-colors"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> {t('adminProducers.detail.reactivate')}
                </button>
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
      <h1 className="text-3xl font-bold text-stone-950 mb-2">
        {t('adminProducers.title', 'Productores e Importadores')}
      </h1>
      <p className="text-stone-500 mb-6">{t('adminProducers.subtitle', 'Gestión de productores e importadores por estado y pais')}</p>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            className="w-full pl-10 pr-3 py-2 border border-stone-200 rounded-xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
            placeholder={t('adminProducers.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="search-input"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-stone-200 bg-white"
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
          className="px-4 py-2 rounded-xl border border-stone-200 bg-white"
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
          <div className="p-8 text-center text-stone-500">{t('common.loading')}</div>
        ) : filteredProducers.length === 0 ? (
          <div className="p-8 text-center text-stone-500">{t('adminProducers.noProducersFound')}</div>
        ) : (
          <table className="w-full" data-testid="producers-table">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminProducers.table.company')}</th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminProducers.table.contact')}</th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-stone-600">Tipo</th>
                <th scope="col" className="text-left px-6 py-4 text-sm font-medium text-stone-600">{t('adminProducers.table.status')}</th>
                <th scope="col" className="text-right px-6 py-4 text-sm font-medium text-stone-600">{t('adminProducers.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredProducers.map((producer) => {
                const status = producer.status || (producer.approved ? 'approved' : 'pending');
                return (
                  <tr key={producer.user_id} className="hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-950">{producer.company_name || producer.name}</p>
                      <p className="text-sm text-stone-500">{producer.country}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-stone-950">{producer.email}</p>
                      <p className="text-sm text-stone-500">{producer.phone}</p>
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
                        <button
                          type="button"
                          className="flex items-center px-3 py-1.5 text-sm font-medium border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
                          onClick={() => setSelectedProducer(producer)}
                          data-testid={`view-${producer.user_id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" /> {t('adminProducers.table.view')}
                        </button>
                        {status === 'pending' && (
                          <button
                            type="button"
                            className="flex items-center px-3 py-1.5 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-xl transition-colors"
                            onClick={() => updateStatus(producer.user_id, 'approved')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> {t('adminProducers.detail.approve')}
                          </button>
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
