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
        <Loader2 className="w-6 h-6 animate-spin text-stone-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 max-w-[600px] mx-auto">
      {/* TopBar */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(-1)} className="shrink-0 bg-transparent border-none cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-stone-950" />
        </button>
        <h1 className="text-lg font-bold text-stone-950">Configuración fiscal</h1>
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
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isComplete || isCurrent
                    ? 'bg-stone-950 text-white border-none'
                    : 'bg-transparent text-stone-500 border-[1.5px] border-stone-200'
                }`}
              >
                {isComplete ? <Check size={10} /> : stepNum}
              </div>
              <span className={`text-[10px] ${isCurrent ? 'text-stone-950 font-semibold' : 'text-stone-500 font-normal'}`}>
                {stepLabel}
              </span>
              {i < 3 && <span className="text-[10px] text-stone-200 mx-0.5">—</span>}
            </div>
          );
        })}
      </div>

      {/* Blocked banner */}
      {isBlocked && (
        <div className="p-4 mb-5 bg-stone-100 rounded-2xl shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-stone-600" />
            <p className="text-sm font-medium text-stone-950">
              Necesitas completar tu configuración fiscal para activar tus links de afiliado
            </p>
          </div>
        </div>
      )}

      {/* 1. Tax country */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-stone-950">Residencia fiscal</h2>
          {country && certStatus !== 'verified' && (
            <button
              onClick={() => { setCountry(''); setCertStatus(null); }}
              className="text-xs font-semibold text-stone-500 bg-transparent border-none cursor-pointer"
            >
              Cambiar
            </button>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            className={`w-full flex items-center justify-between h-12 px-3.5 text-sm text-left bg-white rounded-xl border border-stone-200 ${country ? 'text-stone-950' : 'text-stone-500'}`}
          >
            {country ? COUNTRIES.find(c => c.code === country)?.name || country : 'Selecciona tu país'}
            <ChevronDown className="w-4 h-4 shrink-0 text-stone-500" />
          </button>

          {showCountryDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCountryDropdown(false)} />
              <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden bg-white rounded-xl border border-stone-200 shadow-lg">
                <div className="p-2">
                  <input
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Buscar país..."
                    autoFocus
                    className="w-full h-12 px-3 text-sm rounded-xl bg-stone-100 text-stone-950 focus:outline-none border-none"
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
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-stone-50 flex items-center justify-between text-stone-950 bg-transparent border-none cursor-pointer"
                    >
                      {c.name}
                      {c.code === country && <Check className="w-4 h-4 text-stone-950" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Withholding badge */}
        {withholdingInfo && (
          <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            withholdingInfo.color === 'stone-dark' ? 'bg-stone-200 text-stone-700' : 'bg-stone-100 text-stone-950'
          }`}>
            {withholdingInfo.label}
          </div>
        )}
      </div>

      {/* 2. Certificate */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3 text-stone-950">Certificado de residencia fiscal</h2>

        {certStatus === null && (
          <>
            <div className="p-4 mb-3 bg-stone-100 rounded-2xl">
              <p className="text-sm text-stone-500">
                <strong className="text-stone-950">¿Qué es esto?</strong> El certificado de residencia fiscal acredita que pagas tus impuestos en{' '}
                {country ? (COUNTRIES.find(c => c.code === country)?.name || country) : 'tu país'}.
                Lo emite tu agencia tributaria.
                {country === 'ES' && ' En España: Agencia Tributaria (AEAT) → Certificados → Residencia fiscal.'}
              </p>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!country || uploading}
              className={`w-full flex flex-col items-center gap-2 p-6 transition-colors rounded-2xl border-2 border-dashed border-stone-200 bg-white ${!country ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Upload className="w-6 h-6 text-stone-500" />
              <p className="text-sm font-semibold text-stone-950">Sube tu certificado</p>
              <p className="text-xs text-stone-500">PDF, JPG o PNG · Máx 5MB</p>
            </button>
          </>
        )}

        {certStatus === 'uploading' && (
          <div className="p-5 flex items-center gap-3 bg-stone-100 rounded-2xl">
            <Loader2 className="w-5 h-5 animate-spin text-stone-950" />
            <p className="text-sm font-medium text-stone-950">
              Analizando tu certificado... esto tarda unos segundos
            </p>
          </div>
        )}

        {certStatus === 'verified' && (
          <div className="p-4 bg-stone-100 rounded-2xl shadow-sm">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 shrink-0 mt-0.5 text-stone-950" />
              <div>
                <p className="text-sm font-semibold text-stone-950">Certificado verificado</p>
                <p className="text-xs mt-1 text-stone-500">
                  País: {COUNTRIES.find(c => c.code === country)?.name || country}
                  {withholdingInfo && ` · Retención: ${withholdingInfo.label}`}
                </p>
                {fiscal?.verified_at && (
                  <p className="text-xs mt-0.5 text-stone-500">
                    Verificado el {new Date(fiscal.verified_at).toLocaleDateString('es-ES')}
                  </p>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 text-xs font-semibold underline text-stone-500 bg-transparent border-none cursor-pointer"
                >
                  Actualizar certificado
                </button>
              </div>
            </div>
          </div>
        )}

        {certStatus === 'rejected' && (
          <div className="p-4 bg-stone-100 rounded-2xl shadow-sm">
            <div className="flex items-start gap-3">
              <X className="w-5 h-5 shrink-0 mt-0.5 text-stone-600" />
              <div>
                <p className="text-sm font-semibold text-stone-950">Certificado no válido</p>
                {fiscal?.block_reason && (
                  <p className="text-xs mt-1 text-stone-500">{fiscal.block_reason}</p>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="mt-3 px-4 py-2 text-sm font-semibold bg-stone-950 text-white rounded-full border-none cursor-pointer transition-colors hover:bg-stone-800"
                >
                  Subir nuevo certificado
                </button>
              </div>
            </div>
          </div>
        )}

        {certStatus === 'manual_review' && (
          <div className="p-4 bg-stone-100 rounded-2xl shadow-sm">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 shrink-0 mt-0.5 text-stone-600" />
              <div>
                <p className="text-sm font-semibold text-stone-950">En revisión manual</p>
                <p className="text-xs mt-1 text-stone-500">
                  Nuestro equipo revisará tu certificado en 48-72h hábiles
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Payout method */}
      <div className="mb-5">
        <h2 className="text-sm font-bold mb-3 text-stone-950">
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
            className={`w-full text-left p-4 transition-all bg-white rounded-2xl ${
              payoutMethod === 'stripe' ? 'border-2 border-stone-950' : 'border border-stone-200'
            } ${savingPayout ? 'cursor-wait' : 'cursor-pointer'}`}
          >
            <div className="flex items-center gap-3 mb-1">
              <CreditCard className="w-5 h-5 shrink-0 text-stone-500" />
              <span className="text-sm font-semibold text-stone-950">Stripe</span>
              {payoutMethod === 'stripe' && fiscal?.stripe_onboarding_complete && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-950">
                  Conectado
                </span>
              )}
            </div>
            <p className="text-xs ml-8 text-stone-500">
              Recibe en minutos en tu cuenta Stripe
            </p>
            <p className="text-xs ml-8 mt-0.5 text-stone-500 opacity-70">
              Fee: 0,25 por transferencia (se descuenta de tu comisión)
            </p>
          </button>

          {/* SEPA */}
          <div
            className={`p-4 transition-all bg-white rounded-2xl ${
              payoutMethod === 'sepa' ? 'border-2 border-stone-950' : 'border border-stone-200'
            }`}
          >
            <button
              onClick={() => setPayoutMethod('sepa')}
              className="w-full text-left bg-transparent border-none cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-1">
                <Building2 className="w-5 h-5 shrink-0 text-stone-500" />
                <span className="text-sm font-semibold text-stone-950">Transferencia bancaria (SEPA)</span>
                {payoutMethod === 'sepa' && fiscal?.sepa_iban_last4 && (
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-950">
                    Configurado
                  </span>
                )}
              </div>
              <p className="text-xs ml-8 text-stone-500">
                Sin comisión adicional · Procesado en 1-3 días hábiles
              </p>
            </button>

            {payoutMethod === 'sepa' && (
              <div className="mt-4 ml-8 space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-stone-500">IBAN</label>
                  <input
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="ES00 0000 0000 0000 0000 0000"
                    className="w-full h-12 px-3 text-sm bg-stone-100 rounded-xl border border-stone-200 text-stone-950 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-stone-500">Titular de la cuenta</label>
                  <input
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full h-12 px-3 text-sm bg-stone-100 rounded-xl border border-stone-200 text-stone-950 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handlePayoutSave('sepa')}
                  disabled={savingPayout || !iban.trim() || !accountName.trim()}
                  className={`px-4 py-2 text-sm font-semibold bg-stone-950 text-white rounded-full border-none transition-colors hover:bg-stone-800 ${
                    savingPayout ? 'cursor-wait' : 'cursor-pointer'
                  } ${(!iban.trim() || !accountName.trim()) ? 'opacity-50' : 'opacity-100'}`}
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
        <div className="mb-5 p-4 bg-stone-100 rounded-2xl">
          <h3 className="text-sm font-bold mb-3 text-stone-950">Preview del cobro</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Balance bruto</span>
              <span className="font-semibold text-stone-950">{convertAndFormatPrice(Number(grossPreview || 0))}</span>
            </div>
            {country === 'ES' && withholdingPreview > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Retención IRPF (15%)</span>
                <span className="font-semibold text-stone-500">−{convertAndFormatPrice(Number(withholdingPreview || 0))}</span>
              </div>
            )}
            {feePreview > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Fee de transferencia</span>
                <span className="font-semibold text-stone-500">−{convertAndFormatPrice(Number(feePreview || 0))}</span>
              </div>
            )}
            <div className="pt-2 flex justify-between text-sm border-t border-stone-200">
              <span className="font-bold text-stone-950">RECIBIRÁS</span>
              <span className="font-bold text-stone-950">{convertAndFormatPrice(Number(netPreview || 0))}</span>
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
        className={`w-full py-3.5 text-sm font-semibold rounded-full border-none transition-colors mb-8 ${
          canSave
            ? 'bg-stone-950 text-white cursor-pointer hover:bg-stone-800'
            : 'bg-stone-100 text-stone-500 cursor-not-allowed'
        }`}
      >
        {canSave ? 'Guardar y activar afiliados' : 'Completa todos los campos para continuar'}
      </button>
    </div>
  );
}
