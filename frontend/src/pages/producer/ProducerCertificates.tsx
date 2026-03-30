// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FileCheck, Plus, ArrowLeft, ArrowRight, CheckCircle, Clock, XCircle,
  Upload, FileText, Info, Check, Save, Send, AlertCircle,
  Leaf, Sprout, Wheat, Handshake, MapPin, Dna, ClipboardList
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/api/client';

// Certificate types available
const CERTIFICATE_TYPES = [
  { id: 'organic', label: 'Orgánico / Ecológico', Icon: Leaf },
  { id: 'vegan', label: 'Vegano', Icon: Sprout },
  { id: 'glutenFree', label: 'Sin Gluten', Icon: Wheat },
  { id: 'halal', label: 'Halal', emoji: '☪️' },
  { id: 'kosher', label: 'Kosher', emoji: '✡️' },
  { id: 'fairTrade', label: 'Comercio Justo', Icon: Handshake },
  { id: 'localProduct', label: 'Producto Local', Icon: MapPin },
  { id: 'nonGMO', label: 'Sin OGM', Icon: Dna },
  { id: 'other', label: 'Otro', Icon: ClipboardList }
];

const STATUS_CONFIG = {
  approved: {
    icon: CheckCircle,
    color: 'text-stone-700',
    bg: 'bg-stone-100',
    label: 'Aprobado'
  },
  pending: {
    icon: Clock,
    color: 'text-stone-700',
    bg: 'bg-stone-100',
    label: 'Pendiente de revisión'
  },
  rejected: {
    icon: XCircle,
    color: 'text-stone-700',
    bg: 'bg-stone-100',
    label: 'Rechazado'
  }
};

// Progress Steps Component
const ProgressSteps = ({ currentStep, steps }) => (
  <div className="flex items-center justify-between mb-8">
    {steps.map((step, idx) => (
      <React.Fragment key={step.id}>
        <div className="flex flex-col items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
            idx < currentStep
              ? 'bg-stone-950 border-stone-950 text-white'
              : idx === currentStep
                ? 'border-stone-950 text-stone-950 bg-white'
                : 'border-stone-200 text-stone-400 bg-white'
          }`}>
            {idx < currentStep ? (
              <Check className="w-5 h-5" />
            ) : (
              <span className="font-semibold">{idx + 1}</span>
            )}
          </div>
          <span className={`text-xs mt-2 font-medium ${
            idx <= currentStep ? 'text-stone-950' : 'text-stone-400'
          }`}>
            {step.label}
          </span>
        </div>
        {idx < steps.length - 1 && (
          <div className={`flex-1 h-0.5 mx-2 ${
            idx < currentStep ? 'bg-stone-950' : 'bg-stone-200'
          }`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

export default function ProducerCertificates() {
  const { t } = useTranslation();
  const [certificates, setCertificates] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    product_id: '',
    certificate_type: '',
    custom_type: '',
    document_url: '',
    document_name: '',
    data: {
      claims: '',
      dietary_flags: '',
      nutrition_info: '',
      ingredient_origins: '',
      certifying_body: '',
      expiry_date: ''
    }
  });
  const [uploading, setUploading] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  const WIZARD_STEPS = [
    { id: 'type', label: t('certificates.stepType', 'Tipo') },
    { id: 'document', label: t('certificates.stepDocument', 'Documento') },
    { id: 'details', label: t('certificates.stepDetails', 'Detalles') },
    { id: 'review', label: t('certificates.stepReview', 'Revisar') }
  ];

  const fetchData = useCallback(async () => {
    try {
      const [certsData, productsData] = await Promise.all([
        apiClient.get('/producer/certificates'),
        apiClient.get('/producer/products')
      ]);
      setCertificates(certsData);
      setProducts(productsData);
    } catch {
      // handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('certificates.invalidFileType', 'Tipo de archivo no válido. Usa PDF, JPG o PNG.'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('certificates.fileTooLarge', 'El archivo es demasiado grande. Máximo 5MB.'));
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await apiClient.post('/upload', uploadFormData);

      setFormData(prev => ({
        ...prev,
        document_url: response.url,
        document_name: file.name
      }));
      toast.success(t('certificates.uploadSuccess', 'Documento subido correctamente'));
    } catch (error) {
      toast.error(t('certificates.uploadError', 'Error al subir el documento'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (asDraft = false) => {
    try {
      const certData = {
        product_id: formData.product_id,
        certificate_type: formData.certificate_type === 'other' ? formData.custom_type : formData.certificate_type,
        document_url: formData.document_url,
        is_draft: asDraft,
        data: {
          claims: formData.data.claims?.split(',').map(c => c.trim()).filter(Boolean) || [],
          dietary_flags: formData.data.dietary_flags?.split(',').map(d => d.trim()).filter(Boolean) || [],
          nutrition_info: formData.data.nutrition_info,
          ingredient_origins: formData.data.ingredient_origins,
          certifying_body: formData.data.certifying_body,
          expiry_date: formData.data.expiry_date
        }
      };
      
      await apiClient.post('/certificates', certData);
      
      if (asDraft) {
        toast.success(t('certificates.draftSaved', 'Borrador guardado'));
      } else {
        toast.success(t('certificates.submitted', '¡Certificado enviado para revisión!'));
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || t('certificates.createError', 'Error al crear certificado'));
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setCurrentStep(0);
    setFormData({
      product_id: '',
      certificate_type: '',
      custom_type: '',
      document_url: '',
      document_name: '',
      data: { claims: '', dietary_flags: '', nutrition_info: '', ingredient_origins: '', certifying_body: '', expiry_date: '' }
    });
    setIsDraft(false);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Type
        return formData.product_id && formData.certificate_type && 
               (formData.certificate_type !== 'other' || formData.custom_type);
      case 1: // Document
        return true; // Document is optional
      case 2: // Details
        return true; // Details are optional
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  const getStatus = (cert) => {
    if (cert.rejected) return 'rejected';
    if (cert.approved) return 'approved';
    return 'pending';
  };

  // Wizard Form
  if (showCreateForm) {
    const productsWithoutCert = products.filter(
      p => !certificates.some(c => c.product_id === p.product_id)
    );

    return (
      <div>
        <button
          onClick={resetForm}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-950 mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('common.back', 'Volver')}
        </button>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-3xl">
          <h2 className="text-2xl font-bold text-stone-950 mb-2">
            {t('certificates.createTitle', 'Crear Certificado')}
          </h2>
          <p className="text-stone-500 mb-6">
            {t('certificates.createDescription', 'Añade certificaciones a tus productos para aumentar la confianza del cliente.')}
          </p>

          {/* Progress Steps */}
          <ProgressSteps currentStep={currentStep} steps={WIZARD_STEPS} />
          
          {productsWithoutCert.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-stone-500 mb-4">
                {t('certificates.allProductsCertified', 'Todos tus productos ya tienen certificados.')}
              </p>
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-colors">
                {t('common.goBack', 'Volver')}
              </button>
            </div>
          ) : (
            <>
              {/* Step 1: Certificate Type */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-2">
                      {t('certificates.selectProduct', 'Producto')} *
                    </label>
                    <select
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-stone-950"
                      data-testid="product-select"
                    >
                      <option value="">{t('certificates.selectProductPlaceholder', 'Seleccionar producto')}</option>
                      {productsWithoutCert.map(p => (
                        <option key={p.product_id} value={p.product_id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-3">
                      {t('certificates.certificateType', 'Tipo de Certificado')} *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {CERTIFICATE_TYPES.map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, certificate_type: type.id })}
                          className={`p-4 rounded-2xl border-2 transition-all text-left ${
                            formData.certificate_type === type.id
                              ? 'border-stone-950 bg-stone-50'
                              : 'border-stone-200 hover:border-stone-200'
                          }`}
                          data-testid={`cert-type-${type.id}`}
                        >
                          <span className="mb-2 block">{type.Icon ? <type.Icon size={24} className="text-stone-600" /> : <span className="text-2xl">{type.emoji}</span>}</span>
                          <span className="font-medium text-sm text-stone-950">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.certificate_type === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-stone-950 mb-2">
                        {t('certificates.customType', 'Especificar tipo')} *
                      </label>
                      <input
                        value={formData.custom_type}
                        onChange={(e) => setFormData({ ...formData, custom_type: e.target.value })}
                        placeholder={t('certificates.customTypePlaceholder', 'Ej: Certificado de Denominación de Origen')}
                        className="w-full h-12 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Document Upload */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-2">
                      {t('certificates.uploadDocument', 'Subir Documento (opcional)')}
                    </label>
                    <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                      formData.document_url 
                        ? 'border-stone-200 bg-stone-100'
                        : 'border-stone-200 hover:border-stone-950 hover:bg-stone-50'
                    }`}>
                      {formData.document_url ? (
                        <div className="flex flex-col items-center">
                          <CheckCircle className="w-12 h-12 text-stone-700 mb-3" />
                          <p className="font-medium text-stone-950">{formData.document_name}</p>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, document_url: '', document_name: '' })}
                            className="text-sm text-stone-600 hover:underline mt-2"
                          >
                            {t('common.remove', 'Eliminar')}
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <Upload className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                          <p className="font-medium text-stone-950 mb-1">
                            {uploading 
                              ? t('common.uploading', 'Subiendo...') 
                              : t('certificates.dragOrClick', 'Arrastra o haz clic para subir')
                            }
                          </p>
                          <p className="text-sm text-stone-500">PDF, JPG, PNG (máx. 5MB)</p>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-stone-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-stone-700">
                          {t('certificates.documentHint', 'Sube el documento oficial del certificado (opcional). Si no tienes el documento, podrás añadirlo más tarde.')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Details */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-2">
                      {t('certificates.certifyingBody', 'Organismo Certificador')}
                    </label>
                    <input
                      value={formData.data.certifying_body}
                      onChange={(e) => setFormData({
                        ...formData,
                        data: { ...formData.data, certifying_body: e.target.value }
                      })}
                      placeholder={t('certificates.certifyingBodyPlaceholder', 'Ej: CAAE, Ecocert, BCS...')}
                      className="w-full h-12 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-2">
                      {t('certificates.expiryDate', 'Fecha de Caducidad')}
                    </label>
                    <input
                      type="date"
                      value={formData.data.expiry_date}
                      onChange={(e) => setFormData({
                        ...formData,
                        data: { ...formData.data, expiry_date: e.target.value }
                      })}
                      className="w-full h-12 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 focus:outline-none focus:border-stone-950"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-2">
                      {t('certificates.claims', 'Declaraciones (separadas por coma)')}
                    </label>
                    <input
                      value={formData.data.claims}
                      onChange={(e) => setFormData({
                        ...formData,
                        data: { ...formData.data, claims: e.target.value }
                      })}
                      placeholder="100% Orgánico, Sin Pesticidas, Cosecha Manual..."
                      className="w-full h-12 px-3 py-2 border border-stone-200 rounded-2xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-950 mb-2">
                      {t('certificates.ingredientOrigins', 'Origen de Ingredientes')}
                    </label>
                    <textarea
                      value={formData.data.ingredient_origins}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        data: { ...formData.data, ingredient_origins: e.target.value }
                      })}
                      className="w-full px-4 py-3 rounded-2xl border border-stone-200 min-h-[100px] focus:outline-none focus:border-stone-950"
                      placeholder="Aceitunas: España (Jaén)&#10;Sal: Portugal&#10;..."
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-stone-50 rounded-2xl p-6">
                    <h3 className="font-medium text-stone-950 mb-4">
                      {t('certificates.reviewSummary', 'Resumen del Certificado')}
                    </h3>
                    
                    <dl className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-stone-200">
                        <dt className="text-stone-500">{t('certificates.product', 'Producto')}</dt>
                        <dd className="font-medium text-stone-950">
                          {productsWithoutCert.find(p => p.product_id === formData.product_id)?.name}
                        </dd>
                      </div>
                      <div className="flex justify-between py-2 border-b border-stone-200">
                        <dt className="text-stone-500">{t('certificates.type', 'Tipo')}</dt>
                        <dd className="font-medium text-stone-950">
                          {formData.certificate_type === 'other' 
                            ? formData.custom_type 
                            : CERTIFICATE_TYPES.find(ct => ct.id === formData.certificate_type)?.label
                          }
                        </dd>
                      </div>
                      {formData.document_url && (
                        <div className="flex justify-between py-2 border-b border-stone-200">
                          <dt className="text-stone-500">{t('certificates.document', 'Documento')}</dt>
                          <dd className="font-medium text-stone-950 flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {formData.document_name}
                          </dd>
                        </div>
                      )}
                      {formData.data.certifying_body && (
                        <div className="flex justify-between py-2 border-b border-stone-200">
                          <dt className="text-stone-500">{t('certificates.certifier', 'Certificador')}</dt>
                          <dd className="font-medium text-stone-950">{formData.data.certifying_body}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-stone-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-stone-700 mb-1">
                          {t('certificates.pendingNote', 'Pendiente de aprobación')}
                        </p>
                        <p className="text-sm text-stone-600">
                          {t('certificates.pendingDescription', 'Tu certificado será revisado por el equipo de Hispaloshop. Recibirás una notificación en 24-48h.')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-stone-200">
                <div>
                  {currentStep > 0 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="flex items-center px-4 py-2 text-sm font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      {t('common.back', 'Atrás')}
                    </button>
                  )}
                </div>
                
                <div className="flex gap-3">
                  {currentStep === 3 && (
                    <button
                      type="button"
                      onClick={() => handleSubmit(true)}
                      className="flex items-center px-4 py-2 text-sm font-medium border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {t('certificates.saveDraft', 'Guardar borrador')}
                    </button>
                  )}
                  
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(currentStep + 1)}
                      disabled={!canProceed()}
                      className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 disabled:opacity-40 text-white rounded-full transition-colors"
                    >
                      {t('common.next', 'Siguiente')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-full transition-colors"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {t('certificates.submitForApproval', 'Enviar para aprobación')}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="max-w-[975px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-950 mb-2">
            {t('certificates.title', 'Certificados')}
          </h1>
          <p className="text-stone-500 text-sm md:text-base">
            {t('certificates.description', 'Gestiona los certificados y documentos de cumplimiento de tus productos.')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-full transition-colors"
          data-testid="create-certificate"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{t('certificates.create', 'Crear Certificado')}</span>
          <span className="sm:hidden">{t('common.create', 'Crear')}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-500">
            {t('common.loading', 'Cargando...')}
          </div>
        ) : certificates.length === 0 ? (
          <div className="p-8 text-center">
            <FileCheck className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 mb-4">
              {t('certificates.noCertificates', 'No tienes certificados todavía.')}
            </p>
            <button type="button" onClick={() => setShowCreateForm(true)} className="flex items-center px-4 py-2 text-sm font-medium bg-stone-950 hover:bg-stone-800 text-white rounded-full transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              {t('certificates.createFirst', 'Crear tu primer certificado')}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="certificates-table">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-stone-600">
                    {t('certificates.product', 'Producto')}
                  </th>
                  <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-stone-600 hidden md:table-cell">
                    {t('certificates.type', 'Tipo')}
                  </th>
                  <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-stone-600">
                    {t('certificates.status', 'Estado')}
                  </th>
                  <th className="text-left px-4 md:px-6 py-4 text-sm font-medium text-stone-600 hidden sm:table-cell">
                    {t('certificates.created', 'Creado')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {certificates.map((cert) => {
                  const status = getStatus(cert);
                  const StatusIcon = STATUS_CONFIG[status].icon;

                  // Expiry-soon: within 30 days of today
                  const isExpiringSoon = (() => {
                    if (!cert.data?.expiry_date) return false;
                    const expiry = new Date(cert.data.expiry_date);
                    const now = new Date();
                    const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
                    return diffDays >= 0 && diffDays <= 30;
                  })();

                  const showRenew = status === 'rejected' || isExpiringSoon;

                  return (
                    <tr key={cert.certificate_id} className="hover:bg-stone-50">
                      <td className="px-4 md:px-6 py-4">
                        <p className="font-medium text-stone-950">{cert.product_name}</p>
                        <p className="text-xs text-stone-500 md:hidden">
                          {cert.certificate_type || 'General'}
                        </p>
                      </td>
                      <td className="px-4 md:px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-stone-500">
                          {cert.certificate_type || 'General'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[status].bg} ${STATUS_CONFIG[status].color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{STATUS_CONFIG[status].label}</span>
                          </span>
                          {isExpiringSoon && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                              Caduca pronto
                            </span>
                          )}
                        </div>
                        {status === 'rejected' && cert.rejection_reason && (
                          <p className="text-xs text-stone-500 mt-1">
                            {cert.rejection_reason}
                          </p>
                        )}
                        {showRenew && (
                          <button
                            type="button"
                            onClick={() => setShowCreateForm(true)}
                            className="mt-1.5 px-3 py-1 text-xs font-medium bg-stone-950 text-white rounded-full hover:bg-stone-800 transition-colors"
                          >
                            Renovar
                          </button>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 hidden sm:table-cell">
                        <p className="text-stone-500 text-sm">
                          {cert.created_at ? new Date(cert.created_at).toLocaleDateString('es-ES') : 'N/A'}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-stone-50 border border-stone-200 rounded-2xl p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-stone-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-stone-700 mb-1">
              {t('certificates.infoTitle', '¿Cómo funcionan los certificados?')}
            </p>
            <ul className="text-sm text-stone-600 space-y-1">
              <li>• {t('certificates.info1', 'Los certificados aumentan la confianza del cliente en tus productos')}</li>
              <li>• {t('certificates.info2', 'Se genera un código QR automático para verificación')}</li>
              <li>• {t('certificates.info3', 'Los certificados pendientes se revisan en 24-48 horas')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
