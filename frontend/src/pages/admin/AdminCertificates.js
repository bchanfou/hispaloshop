import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { API } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { 
  Search, CheckCircle, XCircle, Eye, ArrowLeft, History, Trash2, AlertTriangle,
  Clock, FileText, ExternalLink
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const STATUS_CONFIG = {
  approved: { 
    icon: CheckCircle, 
    color: 'text-green-600', 
    bg: 'bg-green-100',
    label: 'Aprobado'
  },
  pending: { 
    icon: Clock, 
    color: 'text-amber-600', 
    bg: 'bg-amber-100',
    label: 'Pendiente'
  },
  rejected: { 
    icon: XCircle, 
    color: 'text-red-600', 
    bg: 'bg-red-100',
    label: 'Rechazado'
  }
};

export default function AdminCertificates() {
  const { t } = useTranslation();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedCert, setSelectedCert] = useState(null);
  const [certHistory, setCertHistory] = useState([]);
  
  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionCert, setActionCert] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCertificates = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/admin/certificates`, { withCredentials: true });
      setCertificates(response.data);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error(t('errors.loadCertificates', 'Error al cargar certificados'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const fetchHistory = async (certificateId) => {
    try {
      const response = await axios.get(`${API}/admin/certificates/${certificateId}/history`, { withCredentials: true });
      setCertHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const approveCertificate = async (certificateId) => {
    setActionLoading(true);
    try {
      await axios.put(`${API}/admin/certificates/${certificateId}/approve?approved=true`, {}, { withCredentials: true });
      toast.success(t('certificates.approved', 'Certificado aprobado'));
      fetchCertificates();
      if (selectedCert?.certificate_id === certificateId) {
        setSelectedCert({ ...selectedCert, approved: true, rejected: false });
        fetchHistory(certificateId);
      }
    } catch (error) {
      toast.error(t('errors.approveCertificate', 'Error al aprobar certificado'));
    } finally {
      setActionLoading(false);
    }
  };

  const rejectCertificate = async () => {
    if (!rejectReason.trim()) {
      toast.error(t('certificates.reasonRequired', 'Por favor, indica el motivo del rechazo'));
      return;
    }

    setActionLoading(true);
    try {
      await axios.put(
        `${API}/admin/certificates/${actionCert.certificate_id}/reject`, 
        { reason: rejectReason },
        { withCredentials: true }
      );
      toast.success(t('certificates.rejected', 'Certificado rechazado'));
      setShowRejectModal(false);
      setRejectReason('');
      setActionCert(null);
      fetchCertificates();
      if (selectedCert?.certificate_id === actionCert.certificate_id) {
        setSelectedCert({ ...selectedCert, approved: false, rejected: true, rejection_reason: rejectReason });
        fetchHistory(actionCert.certificate_id);
      }
    } catch (error) {
      toast.error(t('errors.rejectCertificate', 'Error al rechazar certificado'));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteCertificate = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`${API}/admin/certificates/${actionCert.certificate_id}`, { withCredentials: true });
      toast.success(t('certificates.deleted', 'Certificado eliminado'));
      setShowDeleteModal(false);
      setActionCert(null);
      fetchCertificates();
      if (selectedCert?.certificate_id === actionCert.certificate_id) {
        setSelectedCert(null);
      }
    } catch (error) {
      toast.error(t('errors.deleteCertificate', 'Error al eliminar certificado'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatus = (cert) => {
    if (cert.rejected) return 'rejected';
    if (cert.approved) return 'approved';
    return 'pending';
  };

  const filteredCertificates = certificates.filter(c => {
    const matchesSearch = 
      c.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.certificate_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.producer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = getStatus(c);
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'pending' && status === 'pending') ||
      (filter === 'approved' && status === 'approved') ||
      (filter === 'rejected' && status === 'rejected');
    
    return matchesSearch && matchesFilter;
  });

  // Detail View
  if (selectedCert) {
    const status = getStatus(selectedCert);
    const StatusIcon = STATUS_CONFIG[status].icon;

    return (
      <div>
        <button
          onClick={() => { setSelectedCert(null); setCertHistory([]); }}
          className="flex items-center gap-2 text-text-secondary hover:text-primary mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back', 'Volver')}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Certificate Details */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="font-heading text-2xl font-bold text-text-primary mb-1">
                  {selectedCert.product_name}
                </h2>
                <p className="text-sm text-text-muted">
                  {t('certificates.producer', 'Productor')}: {selectedCert.producer_name}
                </p>
                <p className="text-xs text-text-muted font-mono mt-1">
                  ID: {selectedCert.certificate_id}
                </p>
              </div>
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].color}`}>
                <StatusIcon className="w-4 h-4" />
                {STATUS_CONFIG[status].label}
              </span>
            </div>

            {/* Rejection Reason */}
            {status === 'rejected' && selectedCert.rejection_reason && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-medium text-red-800 mb-1">
                  {t('certificates.rejectionReason', 'Motivo del rechazo')}:
                </p>
                <p className="text-sm text-red-700">{selectedCert.rejection_reason}</p>
              </div>
            )}

            {/* Document Link */}
            {selectedCert.document_url && (
              <div className="mb-6 p-4 bg-stone-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium text-text-primary">
                      {t('certificates.attachedDocument', 'Documento adjunto')}
                    </span>
                  </div>
                  <a 
                    href={selectedCert.document_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline text-sm"
                  >
                    {t('common.view', 'Ver')}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* Certificate Data */}
            <div className="space-y-4">
              <h3 className="font-medium text-text-primary border-b border-stone-200 pb-2">
                {t('certificates.data', 'Datos del Certificado')}
              </h3>
              
              {selectedCert.data && Object.entries(selectedCert.data).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                return (
                  <div key={key} className="grid grid-cols-3 gap-4 py-2 border-b border-stone-100">
                    <span className="text-text-muted font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="col-span-2 text-text-primary">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-stone-200">
              {status !== 'approved' && (
                <Button
                  onClick={() => approveCertificate(selectedCert.certificate_id)}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={actionLoading}
                  data-testid="approve-certificate"
                >
                  <CheckCircle className="w-4 h-4 mr-2" /> 
                  {t('certificates.approve', 'Aprobar')}
                </Button>
              )}
              {status !== 'rejected' && (
                <Button
                  onClick={() => {
                    setActionCert(selectedCert);
                    setShowRejectModal(true);
                  }}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" /> 
                  {t('certificates.reject', 'Rechazar')}
                </Button>
              )}
              <Button
                onClick={() => {
                  setActionCert(selectedCert);
                  setShowDeleteModal(true);
                }}
                variant="outline"
                className="border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                <Trash2 className="w-4 h-4 mr-2" /> 
                {t('common.delete', 'Eliminar')}
              </Button>
            </div>
          </div>

          {/* History Panel */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
              <History className="w-5 h-5" /> 
              {t('certificates.history', 'Historial de cambios')}
            </h3>
            
            {certHistory.length === 0 ? (
              <p className="text-text-muted text-sm">
                {t('certificates.noHistory', 'Sin historial registrado')}
              </p>
            ) : (
              <div className="space-y-3">
                {certHistory.map((log, idx) => (
                  <div key={idx} className="border-l-2 border-stone-200 pl-4 py-2">
                    <p className="font-medium text-text-primary capitalize">{log.action}</p>
                    <p className="text-sm text-text-muted">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    {log.reason && (
                      <p className="text-xs text-stone-500 mt-1">{log.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div>
      <h1 className="font-heading text-2xl md:text-3xl font-bold text-text-primary mb-2">
        {t('certificates.management', 'Gestión de Certificados')}
      </h1>
      <p className="text-text-muted mb-6">
        {t('certificates.reviewAndApprove', 'Revisa y aprueba los certificados de productos.')}
      </p>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder={t('certificates.searchPlaceholder', 'Buscar por producto o vendedor...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-stone-200 bg-white min-w-[160px]"
          data-testid="status-filter"
        >
          <option value="all">{t('certificates.filterAll', 'Todos')}</option>
          <option value="pending">{t('certificates.filterPending', 'Pendientes')}</option>
          <option value="approved">{t('certificates.filterApproved', 'Aprobados')}</option>
          <option value="rejected">{t('certificates.filterRejected', 'Rechazados')}</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-2xl font-bold text-text-primary">{certificates.length}</p>
          <p className="text-sm text-text-muted">{t('certificates.total', 'Total')}</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-2xl font-bold text-amber-600">
            {certificates.filter(c => getStatus(c) === 'pending').length}
          </p>
          <p className="text-sm text-amber-700">{t('certificates.pending', 'Pendientes')}</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-2xl font-bold text-green-600">
            {certificates.filter(c => getStatus(c) === 'approved').length}
          </p>
          <p className="text-sm text-green-700">{t('certificates.approved', 'Aprobados')}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <p className="text-2xl font-bold text-red-600">
            {certificates.filter(c => getStatus(c) === 'rejected').length}
          </p>
          <p className="text-sm text-red-700">{t('certificates.rejected', 'Rechazados')}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-muted">
            {t('common.loading', 'Cargando...')}
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            {t('certificates.noCertificatesFound', 'No se encontraron certificados')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="certificates-table">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-text-secondary">
                    {t('certificates.product', 'Producto')}
                  </th>
                  <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-text-secondary hidden md:table-cell">
                    {t('certificates.producer', 'Productor')}
                  </th>
                  <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-text-secondary hidden lg:table-cell">
                    {t('certificates.created', 'Creado')}
                  </th>
                  <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-text-secondary">
                    {t('certificates.status', 'Estado')}
                  </th>
                  <th className="text-right px-4 md:px-6 py-4 text-sm font-medium text-text-secondary">
                    {t('certificates.actions', 'Acciones')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredCertificates.map((cert) => {
                  const status = getStatus(cert);
                  const StatusIcon = STATUS_CONFIG[status].icon;

                  return (
                    <tr key={cert.certificate_id} className="hover:bg-stone-50">
                      <td className="px-4 md:px-6 py-4">
                        <p className="font-medium text-text-primary">{cert.product_name}</p>
                        <p className="text-xs text-text-muted md:hidden">{cert.producer_name}</p>
                      </td>
                      <td className="px-4 md:px-6 py-4 hidden md:table-cell">
                        <p className="text-text-muted text-sm">{cert.producer_name}</p>
                      </td>
                      <td className="px-4 md:px-6 py-4 hidden lg:table-cell">
                        <p className="text-text-muted text-sm">
                          {cert.created_at ? new Date(cert.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{STATUS_CONFIG[status].label}</span>
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCert(cert);
                              fetchHistory(cert.certificate_id);
                            }}
                            data-testid={`view-${cert.certificate_id}`}
                          >
                            <Eye className="w-4 h-4 md:mr-1" />
                            <span className="hidden md:inline">{t('common.view', 'Ver')}</span>
                          </Button>
                          {status === 'pending' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approveCertificate(cert.certificate_id)}
                              disabled={actionLoading}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setActionCert(cert);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              {t('certificates.rejectCertificate', 'Rechazar Certificado')}
            </DialogTitle>
            <DialogDescription>
              {t('certificates.rejectDescription', 'El productor recibirá una notificación con el motivo del rechazo y podrá corregir y reenviar.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              {t('certificates.rejectReason', 'Motivo del rechazo')} *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={t('certificates.rejectReasonPlaceholder', 'Ej: Documento ilegible, información incompleta, certificado expirado...')}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 min-h-[100px] focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
                setActionCert(null);
              }}
            >
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              onClick={rejectCertificate}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading ? t('common.processing', 'Procesando...') : t('certificates.reject', 'Rechazar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {t('certificates.deleteCertificate', 'Eliminar Certificado')}
            </DialogTitle>
            <DialogDescription>
              {t('certificates.deleteWarning', '¿Estás seguro? Esta acción no se puede deshacer.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {actionCert && (
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="font-medium text-text-primary">{actionCert.product_name}</p>
                <p className="text-sm text-text-muted">{actionCert.producer_name}</p>
                <p className="text-xs text-text-muted font-mono mt-1">{actionCert.certificate_id}</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setActionCert(null);
              }}
            >
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              onClick={deleteCertificate}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading}
            >
              {actionLoading ? t('common.processing', 'Procesando...') : t('common.delete', 'Eliminar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
