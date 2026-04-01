// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Loader2, ExternalLink, Award, AlertTriangle } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';

const FILTER_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'expiring', label: 'Vencen pronto' },
  { id: 'expired', label: 'Vencidos' },
];

function CertificateRow({ cert }) {
  const isExpired = cert.days_until_expiry != null && cert.days_until_expiry <= 0;
  const isExpiring = cert.days_until_expiry != null && cert.days_until_expiry > 0 && cert.days_until_expiry <= 30;
  const isWarning = cert.days_until_expiry != null && cert.days_until_expiry > 30 && cert.days_until_expiry <= 60;

  return (
    <div className={`bg-white rounded-2xl p-3.5 flex items-center gap-3 border ${
      isExpired ? 'border-stone-400' : isExpiring ? 'border-stone-200' : 'border-stone-200'
    }`}>
      {/* Status icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${
        isExpired ? 'bg-stone-200' : isExpiring ? 'bg-stone-100' : 'bg-stone-50'
      }`}>
        {isExpired ? '❌' : isExpiring ? '⚠️' : '✅'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-950 truncate">
          {cert.certification_name || cert.name || 'Certificado'}
        </p>
        <p className="text-xs text-stone-500 flex items-center gap-1.5 flex-wrap">
          <span>{cert.producer_name || 'Proveedor'}</span>
          {cert.expiry_date && cert.days_until_expiry != null && (
            <span className={`font-semibold ${
              isExpired ? 'text-stone-700'
                : isExpiring ? 'text-stone-700'
                  : isWarning ? 'text-stone-600'
                    : 'text-stone-400'
            }`}>
              · {isExpired
                ? `Venció hace ${Math.abs(cert.days_until_expiry)} días`
                : `Vence en ${cert.days_until_expiry} días`}
            </span>
          )}
        </p>
      </div>

      {/* Verified badge */}
      {cert.is_verified && (
        <span className="text-[10px] bg-stone-100 text-stone-600 rounded-full px-2 py-0.5 font-medium shrink-0">
          ✓ Verificado
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-1.5 shrink-0">
        {cert.certificate_id && (
          <a
            href={`/certificate/${cert.product_id || cert.certificate_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 border border-stone-200 rounded-2xl text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Ver
          </a>
        )}
        {cert.pdf_url && (
          <a
            href={cert.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 border border-stone-200 rounded-2xl text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export default function ImporterCertificatesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { producerId: paramProducerId } = useParams();
  const [searchParams] = useSearchParams();
  const producerId = paramProducerId || searchParams.get('producer_id') || searchParams.get('producerId');

  const loadCerts = useCallback(async () => {
    if (!producerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      // Try supplier-certificates endpoint first
      let data;
      try {
        data = await apiClient.get(`/importer/supplier-certificates?producer_id=${producerId}`);
      } catch {
        // Fallback: fetch certificates for the specific producer
        data = await apiClient.get(`/b2b/producers/${producerId}/certificates`);
      }
      const items = data?.certificates || (Array.isArray(data) ? data : []);
      setCerts(items);
    } catch {
      setCerts([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [producerId]);

  useEffect(() => {
    loadCerts();
  }, [loadCerts]);

  const expiring = certs.filter(c => c.days_until_expiry != null && c.days_until_expiry > 0 && c.days_until_expiry <= 30);
  const expired = certs.filter(c => c.days_until_expiry != null && c.days_until_expiry <= 0);

  const filteredCerts = (
    statusFilter === 'expiring' ? expiring
      : statusFilter === 'expired' ? expired
        : certs
  ).filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.certification_name || c.name || '').toLowerCase().includes(q) ||
      (c.producer_name || '').toLowerCase().includes(q);
  });

  if (!producerId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="bg-white shadow-sm rounded-2xl p-8 text-center max-w-sm w-full">
          <Award className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-950 mb-1">Selecciona un proveedor para ver sus certificados</p>
          <Link
            to="/b2b/marketplace"
            className="inline-block mt-4 text-sm font-medium text-stone-950 underline underline-offset-2"
          >
            Ir al directorio B2B →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-stone-950">Certificados de proveedores</h1>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por proveedor o tipo..."
            className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-2xl text-sm bg-white focus:outline-none focus:border-stone-400"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {FILTER_TABS.map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f.id
                  ? 'bg-stone-950 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {f.label}
              {f.id === 'expiring' && expiring.length > 0 && ` (${expiring.length})`}
              {f.id === 'expired' && expired.length > 0 && ` (${expired.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Certificate list */}
      {error ? (
        <div className="text-center py-16">
          <AlertTriangle className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-950 mb-1">Error al cargar los certificados</p>
          <button
            onClick={loadCerts}
            className="mt-3 px-5 py-2 bg-stone-950 text-white text-sm font-medium rounded-2xl hover:bg-stone-800 transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-[72px] rounded-2xl bg-stone-100 animate-pulse" />
          ))}
        </div>
      ) : filteredCerts.length === 0 ? (
        <div className="text-center py-16">
          <Award className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-950">Sin certificados registrados</p>
          <p className="text-sm text-stone-500">Los certificados de tus proveedores aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCerts.map((cert, i) => (
            <CertificateRow key={cert.certificate_id || cert.id || i} cert={cert} />
          ))}
        </div>
      )}
    </div>
  );
}
