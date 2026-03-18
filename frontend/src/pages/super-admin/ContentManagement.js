import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import {
  Package, Search, Trash2, AlertTriangle, RefreshCw,
  FileCheck, CheckCircle, Clock, XCircle, Filter,
  Image as ImageIcon
} from 'lucide-react';

import { asLowerText } from '../../utils/safe';
import FocusTrap from 'focus-trap-react';

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
      let url = '/super-admin/products';
      if (statusFilter !== 'all') url += `?status=${statusFilter}`;

      const payload = await apiClient.get(url);
      setProducts(Array.isArray(payload) ? payload : (Array.isArray(payload?.products) ? payload.products : []));
    } catch {
      toast.error(t('contentManagement.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      let url = '/super-admin/certificates';
      if (statusFilter !== 'all') url += `?status=${statusFilter}`;

      const payload = await apiClient.get(url);
      setCertificates(Array.isArray(payload) ? payload : (Array.isArray(payload?.certificates) ? payload.certificates : []));
    } catch {
      toast.error(t('contentManagement.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProductStats = async () => {
    try {
      const data = await apiClient.get('/super-admin/products/stats');
      setProductStats(data);
    } catch {
      // handled silently
    }
  };

  const fetchCertStats = async () => {
    try {
      const data = await apiClient.get('/super-admin/certificates/stats');
      setCertStats(data);
    } catch {
      // handled silently
    }
  };

  const deleteProduct = async (productId) => {
    setActionLoading(productId);
    try {
      await apiClient.delete(`/super-admin/products/${productId}`);
      toast.success(t('contentManagement.messages.productDeleted'), { duration: 2000 });
      setConfirmDelete(null);
      setActionLoading(null);
      await fetchProducts();
      await fetchProductStats();
    } catch (error) {
      toast.error(error.message || t('contentManagement.errors.deleteFailed'), { duration: 3000 });
      setActionLoading(null);
    }
  };

  const deleteCertificate = async (certificateId) => {
    setActionLoading(certificateId);
    try {
      await apiClient.delete(`/super-admin/certificates/${certificateId}`);
      toast.success(t('contentManagement.messages.certificateDeleted'), { duration: 2000 });
      setConfirmDelete(null);
      setActionLoading(null);
      await fetchCertificates();
      await fetchCertStats();
    } catch (error) {
      toast.error(error.message || t('contentManagement.errors.deleteFailed'), { duration: 3000 });
      setActionLoading(null);
    }
  };

  const searchNeedle = asLowerText(searchTerm);
  const filteredProducts = products.filter(p =>
    asLowerText(p.name).includes(searchNeedle) ||
    asLowerText(p.producer_name).includes(searchNeedle)
  );

  const filteredCertificates = certificates.filter(c =>
    asLowerText(c.name).includes(searchNeedle) ||
    asLowerText(c.producer_name).includes(searchNeedle) ||
    asLowerText(c.issuer).includes(searchNeedle)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-stone-950 mb-2">
          {t('contentManagement.title')}
        </h1>
        <p className="text-stone-500">{t('contentManagement.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200">
        <button
          onClick={() => { setActiveTab('products'); setSearchTerm(''); setStatusFilter('all'); }}
          className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'products'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
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
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
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
            <div className="flex items-center gap-2 text-stone-500 mb-1">
              <Package className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.total')}</span>
            </div>
            <p className="text-2xl font-bold text-stone-950">{productStats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-stone-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.approved')}</span>
            </div>
            <p className="text-2xl font-bold text-stone-600">{productStats.approved}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-stone-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.pending')}</span>
            </div>
            <p className="text-2xl font-bold text-stone-600">{productStats.pending}</p>
          </div>
        </div>
      )}

      {activeTab === 'certificates' && certStats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-stone-500 mb-1">
              <FileCheck className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.total')}</span>
            </div>
            <p className="text-2xl font-bold text-stone-950">{certStats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-stone-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.approved')}</span>
            </div>
            <p className="text-2xl font-bold text-stone-600">{certStats.approved}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-stone-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.pending')}</span>
            </div>
            <p className="text-2xl font-bold text-stone-600">{certStats.pending}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <div className="flex items-center gap-2 text-stone-600 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-sm">{t('contentManagement.stats.rejected')}</span>
            </div>
            <p className="text-2xl font-bold text-stone-600">{certStats.rejected}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              placeholder={t('contentManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 focus:outline-none focus:border-stone-950 pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-sm"
            >
              <option value="all">{t('contentManagement.filters.all')}</option>
              <option value="approved">{t('contentManagement.filters.approved')}</option>
              <option value="pending">{t('contentManagement.filters.pending')}</option>
              {activeTab === 'certificates' && (
                <option value="rejected">{t('contentManagement.filters.rejected')}</option>
              )}
            </select>
          </div>
          <button
            className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors"
            onClick={() => activeTab === 'products' ? fetchProducts() : fetchCertificates()}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Products Table */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-stone-500">{t('common.loading')}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              {t('contentManagement.noProductsFound')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.product')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.producer')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.price')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.status')}
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.product_id} className="hover:bg-stone-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-stone-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-stone-950">{product.name}</p>
                            <p className="text-xs text-stone-500">{product.country_origin}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-stone-950">{product.producer_name}</p>
                        <p className="text-xs text-stone-500">{product.producer_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-stone-950">€{Number(product.price || 0).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                          {product.approved ? (
                            <><CheckCircle className="w-3 h-3" /> {t('contentManagement.status.approved')}</>
                          ) : (
                            <><Clock className="w-3 h-3" /> {t('contentManagement.status.pending')}</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors"
                          onClick={() => { setConfirmDelete(product); setDeleteType('product'); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
            <div className="p-8 text-center text-stone-500">{t('common.loading')}</div>
          ) : filteredCertificates.length === 0 ? (
            <div className="p-8 text-center text-stone-500">
              {t('contentManagement.noCertificatesFound')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.certificate')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.producer')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.issuer')}
                    </th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.status')}
                    </th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-stone-600">
                      {t('contentManagement.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.certificate_id} className="hover:bg-stone-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-stone-950">{cert.name}</p>
                        <p className="text-xs text-stone-500">
                          {cert.expiry_date ? `Exp: ${new Date(cert.expiry_date).toLocaleDateString()}` : 'Sin expiración'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-stone-950">{cert.producer_name}</p>
                        <p className="text-xs text-stone-500">{cert.producer_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-stone-950">{cert.issuer || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                          {cert.status === 'approved' && <><CheckCircle className="w-3 h-3" /> {t('contentManagement.status.approved')}</>}
                          {cert.status === 'rejected' && <><XCircle className="w-3 h-3" /> {t('contentManagement.status.rejected')}</>}
                          {cert.status === 'pending' && <><Clock className="w-3 h-3" /> {t('contentManagement.status.pending')}</>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors"
                          onClick={() => { setConfirmDelete(cert); setDeleteType('certificate'); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        <FocusTrap focusTrapOptions={{ escapeDeactivates: false, allowOutsideClick: true, returnFocusOnDeactivate: true }}>
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
              <div className="p-2 bg-stone-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-stone-600" />
              </div>
              <h3 className="text-lg font-bold text-stone-950">
                {deleteType === 'product'
                  ? t('contentManagement.deleteModal.titleProduct')
                  : t('contentManagement.deleteModal.titleCertificate')
                }
              </h3>
            </div>

            <p className="text-stone-600 mb-2">
              {t('contentManagement.deleteModal.message')}
            </p>

            <div className="bg-stone-50 rounded-xl p-3 mb-4">
              <p className="font-medium text-stone-950">{confirmDelete.name}</p>
              <p className="text-sm text-stone-500">
                {confirmDelete.producer_name}
              </p>
            </div>

            <p className="text-sm text-stone-600 mb-4">
              {t('contentManagement.deleteModal.warning')}
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-50 transition-colors"
                onClick={() => setConfirmDelete(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl transition-colors"
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
              </button>
            </div>
          </div>
        </div>
        </FocusTrap>
      )}
    </div>
  );
}
