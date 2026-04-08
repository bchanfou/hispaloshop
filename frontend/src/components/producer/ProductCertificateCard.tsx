import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, Download, BarChart3, ExternalLink, Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/button';
import Modal from '../ui/Modal';

interface ProductCertificateCardProps {
  productId: string;
  productName: string;
  scanCount?: number;
}

export default function ProductCertificateCard({ 
  productId, 
  productName,
  scanCount = 0 
}: ProductCertificateCardProps) {
  const { t } = useTranslation();
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'png' | 'svg' | 'pdf'>('png');

  const certificateUrl = `${window.location.origin}/c/${productId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(certificateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = (format: 'png' | 'svg' | 'pdf') => {
    const url = `/api/certificates/${productId}/qr.${format}${format === 'png' ? '?size=400&frame=true' : ''}`;
    
    // Para SVG y PNG, abrir en nueva pestaña
    if (format === 'svg' || format === 'png') {
      window.open(url, '_blank');
    } else {
      // Para PDF, forzar descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${productId}.${format}`;
      link.click();
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">
                {t('producer.certificate.title', 'Certificado Digital')}
              </h3>
              <p className="text-sm text-stone-500">
                {t('producer.certificate.subtitle', 'QR para turistas e importadores')}
              </p>
            </div>
          </div>
          
          {scanCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-stone-600 bg-stone-50 px-3 py-1.5 rounded-full">
              <BarChart3 className="w-4 h-4" />
              <span>{scanCount} escaneos</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => setShowQRModal(true)}
            className="w-full flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            {t('producer.certificate.downloadQR', 'Descargar QR')}
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 text-sm"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">{t('common.copied', 'Copiado')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  {t('producer.certificate.copyLink', 'Copiar link')}
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              to={`/c/${productId}`}
              target="_blank"
              className="flex-1 flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              {t('producer.certificate.preview', 'Ver')}
            </Button>
          </div>
        </div>

        <p className="text-xs text-stone-400 mt-4">
          {t('producer.certificate.help', 'Los clientes escanean el QR para ver tu producto en su idioma y comprar online.')}
        </p>
      </div>

      {/* QR Download Modal */}
      <AnimatePresence>
        {showQRModal && (
          <Modal
            isOpen={showQRModal}
            onClose={() => setShowQRModal(false)}
            title={t('producer.certificate.downloadQRTitle', 'Descargar código QR')}
          >
            <div className="space-y-6">
              {/* Format Tabs */}
              <div className="flex gap-2 p-1 bg-stone-100 rounded-lg">
                {(['png', 'svg', 'pdf'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setActiveTab(format)}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === format
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Preview */}
              <div className="flex justify-center">
                <div className="p-4 bg-stone-50 rounded-xl">
                  <img
                    src={`/api/certificates/${productId}/qr.png?size=200&frame=true`}
                    alt="QR Code"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              {/* Format Info */}
              <div className="text-sm text-stone-600 space-y-2">
                {activeTab === 'png' && (
                  <p>{t('producer.certificate.pngInfo', 'PNG: Para web, apps y redes sociales. Tamaño: 400x400px con marco.')}</p>
                )}
                {activeTab === 'svg' && (
                  <p>{t('producer.certificate.svgInfo', 'SVG: Vectorial para impresión grande (banners, carteles). Escalable sin pérdida.')}</p>
                )}
                {activeTab === 'pdf' && (
                  <p>{t('producer.certificate.pdfInfo', 'PDF: Listo para imprimir en etiquetas. Incluye marco e instrucciones.')}</p>
                )}
              </div>

              {/* Download Button */}
              <Button
                onClick={() => {
                  downloadQR(activeTab);
                  setShowQRModal(false);
                }}
                variant="primary"
                className="w-full flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                {t('producer.certificate.download', 'Descargar {{format}}', { format: activeTab.toUpperCase() })}
              </Button>

              {/* URL Display */}
              <div className="p-3 bg-stone-50 rounded-lg">
                <p className="text-xs text-stone-500 mb-1">URL del certificado:</p>
                <code className="text-xs text-stone-700 break-all">{certificateUrl}</code>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
