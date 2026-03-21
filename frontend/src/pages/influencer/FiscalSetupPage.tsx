// @ts-nocheck
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileCheck, AlertTriangle, Loader2, Check, X,
  CreditCard, Building2, Clock, ChevronDown,
} from 'lucide-react';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useLocale } from '../../context/LocaleContext';

/* ─── Country list (subset, popular first) ─── */
const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'FR', name: 'Francia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'BR', name: 'Brasil' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'JP', name: 'Japón' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Suecia' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'PL', name: 'Polonia' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'GR', name: 'Grecia' },
  { code: 'RO', name: 'Rumanía' },
  { code: 'CZ', name: 'República Checa' },
  { code: 'HU', name: 'Hungría' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croacia' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'SK', name: 'Eslovaquia' },
  { code: 'SI', name: 'Eslovenia' },
  { code: 'LT', name: 'Lituania' },
  { code: 'LV', name: 'Letonia' },
  { code: 'EE', name: 'Estonia' },
  { code: 'CY', name: 'Chipre' },
  { code: 'LU', name: 'Luxemburgo' },
  { code: 'MT', name: 'Malta' },
  { code: 'CH', name: 'Suiza' },
  { code: 'NO', name: 'Noruega' },
  { code: 'MA', name: 'Marruecos' },
  { code: 'TR', name: 'Turquía' },
  { code: 'IN', name: 'India' },
  { code: 'CN', name: 'China' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canadá' },
  { code: 'PE', name: 'Perú' },
  { code: 'EC', name: 'Ecuador' },
];

const EU_CODES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR',
  'DE','GR','HU','IE','IT','LV','LT','LU','MT','NL',
  'PL','PT','RO','SK','SI','ES','SE',
]);

function getWithholdingInfo(code) {
  if (!code) return null;
  if (code === 'ES') return { pct: 15, label: 'Retención 15% IRPF', color: 'stone-dark' };
  return { pct: 0, label: 'Sin retención', color: 'stone-light' };
}

export default function FiscalSetupPage() {
  const navigate = useNavigate();
  const { convertAndFormatPrice } = useLocale();
  const [searchParams] = useSearchParams();
  const fileRef = useRef(null);

  const [fiscal, setFiscal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [certStatus, setCertStatus] = useState(null); // null | 'uploading' | 'verified' | 'rejected' | 'manual_review'
  const [payoutMethod, setPayoutMethod] = useState('');
  const [iban, setIban] = useState('');
  const [accountName, setAccountName] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);
  const [balance, setBalance] = useState(0);

  // Load fiscal status
  const loadFiscal = useCallback(async () => {
    try {
      const data = await apiClient.get('/influencer/fiscal/status');
      setFiscal(data);
      if (data.tax_country) setCountry(data.tax_country);
      if (data.payout_method) setPayoutMethod(data.payout_method === 'sepa' ? 'sepa' : 'stripe');
      if (data.sepa_account_name) setAccountName(data.sepa_account_name);

      if (data.certificate_verified) setCertStatus('verified');
      else if (data.needs_manual_review) setCertStatus('manual_review');
      else if (data.certificate_url && !data.certificate_verified) setCertStatus('rejected');
    } catch {
      // not an influencer or other error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiscal();
    // Load balance for preview
    apiClient.get('/influencer/dashboard').then(d => {
      setBalance(d?.available_to_withdraw || d?.available_balance || 0);
    }).catch(() => {});
  }, [loadFiscal]);

  // Handle Stripe Connect return
  useEffect(() => {
    if (searchParams.get('stripe') === 'complete') {
      toast.success('Cuenta de Stripe conectada');
      loadFiscal();
    }
  }, [searchParams, loadFiscal]);

  // Upload certificate
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!country) {
      toast.error('Selecciona un país de residencia fiscal primero');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo no puede superar 5MB');
      return;
    }

    setUploading(true);
    setCertStatus('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tax_country', country);
      const res = await apiClient.post('/influencer/fiscal/certificate', formData);
      if (res.status === 'verified') {
        setCertStatus('verified');
        toast.success('Certificado verificado');
      } else if (res.status === 'manual_review') {
        setCertStatus('manual_review');
        toast.info('Certificado en revisión manual');
      } else {
        setCertStatus('rejected');
        toast.error(res.reason || 'Certificado no válido');
      }
      await loadFiscal();
    } catch (err) {
      setCertStatus('rejected');
      toast.error('Error al subir el certificado');
    } finally {
      setUploading(false);
    }
  };

  // Configure payout method
  const handlePayoutSave = async (method) => {
    setSavingPayout(true);
    try {
      const body = { method };
      if (method === 'sepa') {
        if (!iban.trim() || !accountName.trim()) {
          toast.error('IBAN y nombre del titular son obligatorios');
          setSavingPayout(false);
          return;
        }
        // Basic IBAN format validation
        const ibanClean = iban.replace(/\s/g, '').toUpperCase();
        if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,}$/.test(ibanClean)) {
          toast.error('Formato de IBAN no válido. Debe empezar con código de país (ej: ES12...)');
          setSavingPayout(false);
          return;
        }
        body.iban = iban.trim();
        body.account_name = accountName.trim();
      }
      const res = await apiClient.post('/influencer/fiscal/payout-method', body);
      if (res.onboarding_url) {
        window.location.href = res.onboarding_url;
        return;
      }
      setPayoutMethod(method);
      toast.success(method === 'stripe' ? 'Stripe conectado' : 'Datos bancarios guardados');
      await loadFiscal();
    } catch (err) {
      toast.error(err?.message || 'Error al configurar método de cobro');
    } finally {
      setSavingPayout(false);
    }
  };

  // Computed
  const withholdingInfo = getWithholdingInfo(country);
  const canSave = country && certStatus === 'verified' && payoutMethod;
  const isBlocked = fiscal?.affiliate_blocked !== false;

  // Payout preview
  const grossPreview = balance;
  const withholdingPreview = country === 'ES' ? grossPreview * 0.15 : 0;
  const feePreview = payoutMethod === 'stripe' ? 0.25 : 0;
  const netPreview = Math.max(0, grossPreview - withholdingPreview - feePreview);

  // Filtered countries
  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : COUNTRIES;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#78716c' }} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'inherit', background: '#fafaf9', minHeight: '100vh' }}>
      {/* TopBar */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="shrink-0" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft className="w-5 h-5" style={{ color: '#0c0a09' }} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: '#0c0a09' }}>Configuración fiscal</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6 px-1">
        {['País fiscal', 'Certificado', 'Método de cobro', 'Resumen'].map((stepLabel, i) => {
          const stepNum = i + 1;
          const isComplete = (stepNum === 1 && country) || (stepNum === 2 && certStatus === 'verified') || (stepNum === 3 && payoutMethod) || (stepNum === 4 && canSave);
          const isCurrent = (!country && stepNum === 1) || (country && certStatus !== 'verified' && stepNum === 2) || (country && certStatus === 'verified' && !payoutMethod && stepNum === 3) || (canSave && stepNum === 4);
          return (
            <div key={stepLabel} className="flex items-center gap-1.5">
              <div
                style={{
                  width: 20, height: 20, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  background: isComplete || isCurrent ? '#0c0a09' : 'transparent',
                  color: isComplete || isCurrent ? '#fff' : '#78716c',
                  border: isComplete || isCurrent ? 'none' : '1.5px solid #e7e5e4',
                }}
              >
                {isComplete ? <Check size={10} /> : stepNum}
              </div>
              <span style={{ fontSize: 10, color: isCurrent ? '#0c0a09' : '#78716c', fontWeight: isCurrent ? 600 : 400, fontFamily: 'inherit' }}>
                {stepLabel}
              </span>
              {i < 3 && <span style={{ fontSize: 10, color: '#e7e5e4', margin: '0 2px' }}>—</span>}
            </div>
          );
        })}
      </div>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="p-4 mb-5" style={{ background: '#f5f5f4', borderRadius: '16px', border: '1px solid #d6d3d1' }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#57534e' }} />
            <p className="text-sm font-medium" style={{ color: '#0c0a09' }}>
              Necesitas completar tu configuración fiscal para activar tus links de afiliado
            </p>
          </div>
        </div>
      )}

      {/* 1. Tax country */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: '#0c0a09' }}>Residencia fiscal</h2>
          {country && certStatus !== 'verified' && (
            <button
              onClick={() => { setCountry(''); setCertStatus(null); }}
              className="text-xs font-semibold"
              style={{ color: '#78716c', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cambiar
            </button>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            className="w-full flex items-center justify-between p-3.5 text-sm text-left"
            style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4', color: country ? '#0c0a09' : '#78716c' }}
          >
            {country ? COUNTRIES.find(c => c.code === country)?.name || country : 'Selecciona tu país'}
            <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#78716c' }} />
          </button>

          {showCountryDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCountryDropdown(false)} />
              <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e7e5e4', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
                <div className="p-2">
                  <input
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Buscar país..."
                    autoFocus
                    className="w-full px-3 py-2 text-sm rounded-2xl focus:outline-none"
                    style={{ background: '#f5f5f4', color: '#0c0a09' }}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredCountries.map(c => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCountry(c.code);
                        setShowCountryDropdown(false);
                        setCountrySearch('');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-stone-50 flex items-center justify-between"
                      style={{ color: '#0c0a09' }}
                    >
                      {c.name}
                      {c.code === country && <Check className="w-4 h-4" style={{ color: '#0c0a09' }} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Withholding badge */}
        {withholdingInfo && (
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{
            background: withholdingInfo.color === 'stone-dark' ? '#e7e5e4' : '#f5f5f4',
            color: withholdingInfo.color === 'stone-dark' ? '#44403c' : '#0c0a09',
          }}>
            {withholdingInfo.label}
          </div>
        )}
      </div>

      {/* 2. Certificate */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3" style={{ color: '#0c0a09' }}>Certificado de residencia fiscal</h2>

        {certStatus === null && (
          <>
            <div className="p-4 mb-3" style={{ background: '#f5f5f4', borderRadius: '16px' }}>
              <p className="text-sm" style={{ color: '#78716c' }}>
                <strong style={{ color: '#0c0a09' }}>¿Qué es esto?</strong> El certificado de residencia fiscal acredita que pagas tus impuestos en{' '}
                {country ? (COUNTRIES.find(c => c.code === country)?.name || country) : 'tu país'}.
                Lo emite tu agencia tributaria.
                {country === 'ES' && ' En España: Agencia Tributaria (AEAT) → Certificados → Residencia fiscal.'}
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!country || uploading}
              className="w-full flex flex-col items-center gap-2 p-6 transition-colors"
              style={{
                borderRadius: '16px',
                border: '2px dashed #e7e5e4',
                background: '#ffffff',
                opacity: !country ? 0.5 : 1,
                cursor: !country ? 'not-allowed' : 'pointer',
              }}
            >
              <Upload className="w-6 h-6" style={{ color: '#78716c' }} />
              <p className="text-sm font-semibold" style={{ color: '#0c0a09' }}>Sube tu certificado</p>
              <p className="text-xs" style={{ color: '#78716c' }}>PDF, JPG o PNG · Máx 5MB</p>
            </button>
          </>
        )}

        {certStatus === 'uploading' && (
          <div className="p-5 flex items-center gap-3" style={{ background: '#f5f5f4', borderRadius: '16px' }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#0c0a09' }} />
            <p className="text-sm font-medium" style={{ color: '#0c0a09' }}>
              Analizando tu certificado... esto tarda unos segundos
            </p>
          </div>
        )}

        {certStatus === 'verified' && (
          <div className="p-4" style={{ background: '#f5f5f4', borderRadius: '16px', border: '1px solid #e7e5e4' }}>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#0c0a09' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0c0a09' }}>Certificado verificado</p>
                <p className="text-xs mt-1" style={{ color: '#78716c' }}>
                  País: {COUNTRIES.find(c => c.code === country)?.name || country}
                  {withholdingInfo && ` · Retención: ${withholdingInfo.label}`}
                </p>
                {fiscal?.verified_at && (
                  <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>
                    Verificado el {new Date(fiscal.verified_at).toLocaleDateString('es-ES')}
                  </p>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 text-xs font-semibold underline"
                  style={{ color: '#78716c', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Actualizar certificado
                </button>
              </div>
            </div>
          </div>
        )}

        {certStatus === 'rejected' && (
          <div className="p-4" style={{ background: '#f5f5f4', borderRadius: '16px', border: '1px solid #d6d3d1' }}>
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#57534e' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0c0a09' }}>Certificado no válido</p>
                {fiscal?.block_reason && (
                  <p className="text-xs mt-1" style={{ color: '#78716c' }}>{fiscal.block_reason}</p>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 px-4 py-2 text-sm font-semibold transition-colors"
                  style={{ background: '#0c0a09', color: '#fff', borderRadius: '16px', border: 'none', cursor: 'pointer' }}
                >
                  Subir nuevo certificado
                </button>
              </div>
            </div>
          </div>
        )}

        {certStatus === 'manual_review' && (
          <div className="p-4" style={{ background: '#f5f5f4', borderRadius: '16px', border: '1px solid #d6d3d1' }}>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#57534e' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: '#0c0a09' }}>En revisión manual</p>
                <p className="text-xs mt-1" style={{ color: '#78716c' }}>
                  Nuestro equipo revisará tu certificado en 48-72h hábiles
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Payout method */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3" style={{ color: '#0c0a09' }}>
          ¿Cómo quieres recibir tus comisiones?
        </h2>
        <div className="space-y-2">
          {/* Stripe */}
          <button
            onClick={() => {
              if (payoutMethod === 'stripe' && fiscal?.stripe_onboarding_complete) return;
              handlePayoutSave('stripe');
            }}
            disabled={savingPayout}
            className="w-full text-left p-4 transition-all"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: payoutMethod === 'stripe' ? '2px solid #0c0a09' : '1px solid #e7e5e4',
              cursor: savingPayout ? 'wait' : 'pointer',
            }}
          >
            <div className="flex items-center gap-3 mb-1">
              <CreditCard className="w-5 h-5 shrink-0" style={{ color: '#78716c' }} />
              <span className="text-sm font-semibold" style={{ color: '#0c0a09' }}>Stripe</span>
              {payoutMethod === 'stripe' && fiscal?.stripe_onboarding_complete && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f5f5f4', color: '#0c0a09' }}>
                  Conectado
                </span>
              )}
            </div>
            <p className="text-xs ml-8" style={{ color: '#78716c' }}>
              Recibe en minutos en tu cuenta Stripe
            </p>
            <p className="text-xs ml-8 mt-0.5" style={{ color: '#78716c', opacity: 0.7 }}>
              Fee: 0,25 por transferencia (se descuenta de tu comisión)
            </p>
          </button>

          {/* SEPA */}
          <div
            className="p-4 transition-all"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: payoutMethod === 'sepa' ? '2px solid #0c0a09' : '1px solid #e7e5e4',
            }}
          >
            <button
              onClick={() => setPayoutMethod('sepa')}
              className="w-full text-left"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <div className="flex items-center gap-3 mb-1">
                <Building2 className="w-5 h-5 shrink-0" style={{ color: '#78716c' }} />
                <span className="text-sm font-semibold" style={{ color: '#0c0a09' }}>Transferencia bancaria (SEPA)</span>
                {payoutMethod === 'sepa' && fiscal?.sepa_iban_last4 && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f5f5f4', color: '#0c0a09' }}>
                    Configurado
                  </span>
                )}
              </div>
              <p className="text-xs ml-8" style={{ color: '#78716c' }}>
                Sin comisión adicional · Procesado en 1-3 días hábiles
              </p>
            </button>

            {payoutMethod === 'sepa' && (
              <div className="mt-4 ml-8 space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#78716c' }}>IBAN</label>
                  <input
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="ES00 0000 0000 0000 0000 0000"
                    className="w-full px-3 py-2.5 text-sm focus:outline-none"
                    style={{ background: '#f5f5f4', borderRadius: '12px', border: '1px solid #e7e5e4', color: '#0c0a09' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#78716c' }}>Titular de la cuenta</label>
                  <input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full px-3 py-2.5 text-sm focus:outline-none"
                    style={{ background: '#f5f5f4', borderRadius: '12px', border: '1px solid #e7e5e4', color: '#0c0a09' }}
                  />
                </div>
                <button
                  onClick={() => handlePayoutSave('sepa')}
                  disabled={savingPayout || !iban.trim() || !accountName.trim()}
                  className="px-4 py-2 text-sm font-semibold transition-colors"
                  style={{
                    background: '#0c0a09', color: '#fff',
                    borderRadius: '16px', border: 'none',
                    cursor: savingPayout ? 'wait' : 'pointer',
                    opacity: (!iban.trim() || !accountName.trim()) ? 0.5 : 1,
                  }}
                >
                  {savingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar datos bancarios'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Payout preview */}
      {grossPreview > 0 && (
        <div className="mb-5 p-4" style={{ background: '#f5f5f4', borderRadius: '16px' }}>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#0c0a09' }}>Preview del cobro</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: '#78716c' }}>Balance bruto</span>
              <span className="font-semibold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(grossPreview || 0))}</span>
            </div>
            {country === 'ES' && withholdingPreview > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#78716c' }}>Retención IRPF (15%)</span>
                <span className="font-semibold" style={{ color: '#78716c' }}>−{convertAndFormatPrice(Number(withholdingPreview || 0))}</span>
              </div>
            )}
            {feePreview > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#78716c' }}>Fee de transferencia</span>
                <span className="font-semibold" style={{ color: '#78716c' }}>−{convertAndFormatPrice(Number(feePreview || 0))}</span>
              </div>
            )}
            <div className="pt-2 flex justify-between text-sm" style={{ borderTop: '1px solid #e7e5e4' }}>
              <span className="font-bold" style={{ color: '#0c0a09' }}>RECIBIRÁS</span>
              <span className="font-bold" style={{ color: '#0c0a09' }}>{convertAndFormatPrice(Number(netPreview || 0))}</span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Save button */}
      <button
        onClick={() => {
          toast.success('Configuración fiscal guardada. Afiliados activados.');
          navigate('/influencer/affiliate-links');
        }}
        disabled={!canSave}
        className="w-full py-3.5 text-sm font-semibold transition-colors mb-8"
        style={{
          background: canSave ? '#0c0a09' : '#f5f5f4',
          color: canSave ? '#fff' : '#78716c',
          borderRadius: '16px',
          border: 'none',
          cursor: canSave ? 'pointer' : 'not-allowed',
        }}
      >
        {canSave ? 'Guardar y activar afiliados' : 'Completa todos los campos para continuar'}
      </button>
    </div>
  );
}
