import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Download, Send, Printer, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/api/client';
import type { CertUITexts } from './constants';

interface CertActionsProps {
  txt: CertUITexts;
  productId: string;
  certId: string;
  certUrl: string;
  productName: string;
  hasQrCode: boolean;
  qrSrc: string;
  /** Is current user the certificate owner or admin? Controls QR/PDF download visibility */
  isOwnerOrAdmin: boolean;
  onBuy: () => void;
}

/**
 * Authenticated file download via apiClient (sends Bearer token).
 * Creates a blob URL and triggers browser download.
 */
async function authDownload(url: string, filename: string) {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const blob = response instanceof Blob ? response : new Blob([response]);
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export default function CertActions({
  txt, productId, certId, certUrl, productName,
  hasQrCode, qrSrc, isOwnerOrAdmin, onBuy,
}: CertActionsProps) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(certUrl);
    toast.success(txt.link_copied);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${txt.cert_title} - ${productName}`, url: certUrl });
      } catch { /* cancelled */ }
    } else {
      handleCopy();
    }
  };

  const handleDownload = async (endpoint: string, filename: string) => {
    if (downloading) return;
    setDownloading(filename);
    try {
      await authDownload(endpoint, filename);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        toast.error('No tienes permisos para descargar este archivo');
      } else {
        toast.error('Error al descargar. Inténtalo de nuevo.');
      }
    } finally {
      setDownloading(null);
    }
  };

  const qrApiBase = `/certificates/${certId}/qr`;
  const safeProductId = productId || 'cert';

  return (
    <>
      {/* QR Verification + Share */}
      <div className="mt-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {/* QR display (visible to everyone) */}
          <div className="flex flex-col items-center gap-2">
            {hasQrCode ? (
              <img src={qrSrc} alt="QR" width={200} height={200} className="shrink-0 rounded-2xl" />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-2xl bg-stone-100 text-xs text-stone-500 text-center px-4">
                QR no disponible
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold text-stone-950">{txt.verify}</p>
            <p className="mt-1 text-xs text-stone-500">{txt.scan_qr}</p>

            {/* Copy + Share buttons (public) */}
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                <Copy className="h-3 w-3" /> {txt.copy_link}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                <Send className="h-3 w-3" /> {txt.share}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Producer assets — QR + PDF downloads (owner/admin only) */}
      {isOwnerOrAdmin && certId && (
        <div className="mt-4 rounded-[28px] border border-dashed border-stone-300 bg-stone-50 p-6">
          <div className="flex items-start gap-3">
            <Printer className="h-5 w-5 text-stone-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-stone-950">{txt.producer_assets}</p>
              <p className="mt-1 text-xs text-stone-500">{txt.assets_desc}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {/* Standard PNG */}
                <DownloadButton
                  label={`${txt.download_qr} (PNG)`}
                  loading={downloading === `qr-${safeProductId}.png`}
                  onClick={() => handleDownload(`${qrApiBase}?format=png&resolution=standard`, `qr-${safeProductId}.png`)}
                />
                {/* High-res PNG */}
                <DownloadButton
                  label={txt.download_print}
                  loading={downloading === `qr-${safeProductId}-hires.png`}
                  onClick={() => handleDownload(`${qrApiBase}?format=png&resolution=hires`, `qr-${safeProductId}-hires.png`)}
                />
                {/* SVG */}
                <DownloadButton
                  label="SVG (vector)"
                  loading={downloading === `qr-${safeProductId}.svg`}
                  onClick={() => handleDownload(`${qrApiBase}?format=svg`, `qr-${safeProductId}.svg`)}
                />
                {/* PDF certificate */}
                <button
                  type="button"
                  disabled={!!downloading}
                  onClick={() => handleDownload(`/certificates/${certId}/pdf`, `certificado-${safeProductId}.pdf`)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-4 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
                >
                  {downloading === `certificado-${safeProductId}.pdf` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Download className="h-3 w-3" />
                  )}
                  {txt.download_pdf}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy CTA */}
      <div className="mt-5 flex items-center justify-between rounded-[28px] bg-stone-950 px-6 py-5">
        <div>
          <p className="font-semibold text-white">{txt.buy}</p>
          <p className="text-xs text-stone-400">{txt.buy_sub}</p>
        </div>
        <button type="button" onClick={onBuy} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-stone-950 hover:bg-stone-100">
          {txt.buy_btn}
        </button>
      </div>

      {/* More certificates link */}
      <div className="mt-5 flex justify-center">
        <Link to="/certificates" className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600">
          {txt.more_certs} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </>
  );
}

/** Small download button with loading state */
function DownloadButton({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
      {label}
    </button>
  );
}
