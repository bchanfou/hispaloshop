import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { 
  Package, Search, Trash2, AlertTriangle, RefreshCw,
  FileCheck, CheckCircle, Clock, XCircle, Filter,
  Image as ImageIcon
} from 'lucide-react';

import { API } from '../../utils/api'; // Centralized API URL

export default function ContentManagement() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [productStats, setProductStats] = useState(null);
  const [certStats, setCertStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
      fetchProductStats();
    } else {
      fetchCertificates();
      fetchCertStats();
    }
  }, [activeTab, statusFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let url = `${API}/super-admin/products`;
      if (statusFilter !== 'all') url += `?status=${statusFilter}`;
      
      const response = await axios.get(url, { withCredentials: true });
      const payload = response.data;
      setProducts(Array.isArray(payload) ? payload : (Array.isArray(payload?.products) ? payload.products : []));
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(t('contentManagement.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      let url = `${API}/super-admin/certificates`;
      if (statusFilter !== 'all') url += `?status=${statusFilter}`;
      
      const response = await axios.get(url, { withCredentials: true });
      const payload = response.data;
      setCertificates(Array.isArray(payload) ? payload : (Array.isArray(payload?.certificates) ? payload.certificates : []));
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error(t('contentManagement.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProductStats = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/products/stats`, { withCredentials: true });
      setProductStats(response.data);
    } catch (error) {
      console.error('Error fetching product stats:', error);
    }
  };

  const fetchCertStats = async () => {
    try {
      const response = await axios.get(`${API}/super-admin/certificates/stats`, { withCredentials: true });
      setCertStats(response.data);
    } catch (error) {
      console.error('Error fetching certificate stats:', error);
    }
  };

  const deleteProduct = async (productId) => {
    setActionLoading(productId);
    try {
      await axios.delete(`${API}/super-admin/products/${productId}`, { withCredentials: true });
      toast.success(t('contentManagement.messages.productDeleted'), { duration: 2000 });
      // Small delay to ensure UI updates properly on mobile
      await new Promise(resolve => setTimeout(resolve, 100));
      setConfirmDelete(null);
      setActionLoading(null);
      await fetchProducts();
      fetchProductStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('contentManagement.errors.deleteFailed'), { duration: 3000 });
      setActionLoading(null);
    }
  };

  const deleteCertificate = async (certificateId) => {
    setActionLoading(certificateId);
    try {
      await axios.delete(`${API}/super-admin/certificates/${certificateId}`, { withCredentials: true });
      toast.success(t('contentManagement.messages.certificateDeleted'), { duration: 2000 });
      // Small delay to ensure UI updates properly on mobile
      await new Promise(resolve => setTimeout(resolve, 100));
      setConfirmDelete(null);
      setActionLoading(null);
      await fetchCertificates();
      fetchCertStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('contentManagement.errors.deleteFailed'), { duration: 3000 });
      setActionLoading(null);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.producer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCertificates = certificates.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.producer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.issuer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl font-bold text-text-primary mb-2">
          {t('contentManagement.title')}
        </h1>
        <p className="text-text-muted">{t('contentManagement.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200">
        <button
          onClick={() => { setActiveTab('products'); setSearchTerm(''); setStatusFilter('all'); }}
          className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'products' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Package className="w-4 h-4" />
          {t('contentManagement.tabs.products')}
          {productStats && (
            <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-xs">
              {productStats.total}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('certificates'); setSearchTerm(''); setStatusFilter('all'); }}
          className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'certificates' 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          {t('contentManagement.tabs.certificates')}
          {certStats && (
            <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-xs">
              {certStats.total}
            </span>
          )}
        </button>
      </div>

      {/* Stats */}
      {activeTab === 'products' && productStats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-text-muted mb-1">
              <Package className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.total')}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{productStats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.approved')}</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{productStats.approved}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.pending')}</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{productStats.pending}</p>
          </div>
        </div>
      )}

      {activeTab === 'certificates' && certStats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-text-muted mb-1">
              <FileCheck className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.total')}</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{certStats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.approved')}</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{certStats.approved}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.pending')}</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{certStats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.rejected')}</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{certStats.rejected}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder={t('contentManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm"
            >
              <option value="all">{t('contentManagement.filters.all')}</option>
              <option value="approved">{t('contentManagement.filters.approved')}</option>
              <option value="pending">{t('contentManagement.filters.pending')}</option>
              {activeTab === 'certificates' && (
                <option value="rejected">{t('contentManagement.filters.rejected')}</option>
              )}
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeTab === 'products' ? fetchProducts() : fetchCertificates()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Products Table */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-muted">{t('common.loading')}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              {t('contentManagement.noProductsFound')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.product')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.producer')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.price')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.status')}
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.product_id} className="hover:bg-stone-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-stone-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{product.name}</p>
                            <p className="text-xs text-text-muted">{product.country_origin}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-text-primary">{product.producer_name}</p>
                        <p className="text-xs text-text-muted">{product.producer_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-text-primary">€{Number(product.price || 0).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          product.approved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {product.approved ? (
                            <><CheckCircle className="w-3 h-3" /> {t('contentManagement.status.approved')}</>
                          ) : (
                            <><Clock className="w-3 h-3" /> {t('contentManagement.status.pending')}</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => { setConfirmDelete(product); setDeleteType('product'); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Certificates Table */}
      {activeTab === 'certificates' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-text-muted">{t('common.loading')}</div>
          ) : filteredCertificates.length === 0 ? (
            <div className="p-8 text-center text-text-muted">
              {t('contentManagement.noCertificatesFound')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.certificate')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.producer')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.issuer')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.status')}
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-text-secondary">
                      {t('contentManagement.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.certificate_id} className="hover:bg-stone-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-text-primary">{cert.name}</p>
                        <p className="text-xs text-text-muted">
                          {cert.expiry_date ? `Exp: ${new Date(cert.expiry_date).toLocaleDateString()}` : 'Sin expiración'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-text-primary">{cert.producer_name}</p>
                        <p className="text-xs text-text-muted">{cert.producer_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-text-primary">{cert.issuer || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          cert.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : cert.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {cert.status === 'approved' && <><CheckCircle className="w-3 h-3" /> {t('contentManagement.status.approved')}</>}
                          {cert.status === 'rejected' && <><XCircle className="w-3 h-3" /> {t('contentManagement.status.rejected')}</>}
                          {cert.status === 'pending' && <><Clock className="w-3 h-3" /> {t('contentManagement.status.pending')}</>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => { setConfirmDelete(cert); setDeleteType('certificate'); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close when clicking on backdrop
            if (e.target === e.currentTarget) {
              setConfirmDelete(null);
            }
          }}
        >
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">
                {deleteType === 'product' 
                  ? t('contentManagement.deleteModal.titleProduct')
                  : t('contentManagement.deleteModal.titleCertificate')
                }
              </h3>
            </div>
            
            <p className="text-text-secondary mb-2">
              {t('contentManagement.deleteModal.message')}
            </p>
            
            <div className="bg-stone-50 rounded-lg p-3 mb-4">
              <p className="font-medium text-text-primary">{confirmDelete.name}</p>
              <p className="text-sm text-text-muted">
                {confirmDelete.producer_name}
              </p>
            </div>
            
            <p className="text-sm text-red-600 mb-4">
              {t('contentManagement.deleteModal.warning')}
            </p>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDelete(null)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (deleteType === 'product') {
                    deleteProduct(confirmDelete.product_id);
                  } else {
                    deleteCertificate(confirmDelete.certificate_id);
                  }
                }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {t('contentManagement.deleteModal.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
