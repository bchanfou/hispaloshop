// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, Info, Loader2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/* ─── Constants ─── */

const PRIORITY_COUNTRIES = [
  { code: 'ES', name: 'Espana', flag: 'ES' },
  { code: 'KR', name: 'Corea del Sur', flag: 'KR' },
  { code: 'US', name: 'Estados Unidos', flag: 'US' },
];

const OTHER_COUNTRIES = [
  { code: 'FR', name: 'Francia', flag: 'FR' },
  { code: 'DE', name: 'Alemania', flag: 'DE' },
  { code: 'IT', name: 'Italia', flag: 'IT' },
  { code: 'PT', name: 'Portugal', flag: 'PT' },
  { code: 'GB', name: 'Reino Unido', flag: 'GB' },
  { code: 'MX', name: 'Mexico', flag: 'MX' },
  { code: 'AR', name: 'Argentina', flag: 'AR' },
  { code: 'CO', name: 'Colombia', flag: 'CO' },
  { code: 'JP', name: 'Japon', flag: 'JP' },
  { code: 'CA', name: 'Canada', flag: 'CA' },
  { code: 'AU', name: 'Australia', flag: 'AU' },
  { code: 'BR', name: 'Brasil', flag: 'BR' },
  { code: 'NL', name: 'Paises Bajos', flag: 'NL' },
  { code: 'BE', name: 'Belgica', flag: 'BE' },
  { code: 'CH', name: 'Suiza', flag: 'CH' },
  { code: 'SE', name: 'Suecia', flag: 'SE' },
  { code: 'NO', name: 'Noruega', flag: 'NO' },
  { code: 'DK', name: 'Dinamarca', flag: 'DK' },
  { code: 'PL', name: 'Polonia', flag: 'PL' },
  { code: 'AT', name: 'Austria', flag: 'AT' },
  { code: 'IE', name: 'Irlanda', flag: 'IE' },
  { code: 'IN', name: 'India', flag: 'IN' },
  { code: 'CN', name: 'China', flag: 'CN' },
  { code: 'CL', name: 'Chile', flag: 'CL' },
  { code: 'PE', name: 'Peru', flag: 'PE' },
  { code: 'TR', name: 'Turquia', flag: 'TR' },
];

const ALL_COUNTRIES = [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES];

const KOREAN_BANKS = [
  { value: 'kookmin', label: '국민은행' },
  { value: 'shinhan', label: '신한은행' },
  { value: 'woori', label: '우리은행' },
  { value: 'hana', label: '하나은행' },
  { value: 'nonghyup', label: '농협은행' },
  { value: 'ibk', label: '기업은행' },
  { value: 'sc', label: 'SC제일은행' },
  { value: 'kakao', label: '카카오뱅크' },
  { value: 'toss', label: '토스뱅크' },
  { value: 'kbank', label: '케이뱅크' },
];

const US_FEDERAL_CLASSIFICATIONS = [
  { value: 'individual', label: 'Individual / Sole proprietor' },
  { value: 'llc', label: 'LLC' },
  { value: 'c_corp', label: 'C Corporation' },
  { value: 's_corp', label: 'S Corporation' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' },
];

const TREATY_COUNTRIES = new Set(['ES', 'KR', 'FR', 'DE', 'IT', 'GB', 'JP', 'CA', 'AU', 'NL', 'BE', 'CH', 'SE', 'NO', 'DK', 'AT', 'IE', 'IN', 'CN']);

const STEP_LABELS = ['Residencia', 'Formulario', 'Banco', 'Resumen', 'Confirmacion'];

/* ─── Helper: tax ID label by country ─── */
function getTaxIdLabel(code: string): string {
  switch (code) {
    case 'ES': return 'NIF / NIE';
    case 'KR': return 'TIN (납세자번호)';
    case 'US': return 'SSN o EIN';
    case 'GB': return 'UTR / NI Number';
    case 'DE': return 'Steuerliche IdNr';
    case 'FR': return 'Numero fiscal (SPI)';
    case 'IT': return 'Codice Fiscale';
    default: return 'Tax ID / TIN';
  }
}

/* ─── Perjury texts ─── */
const W8BEN_PERJURY = 'Bajo pena de perjurio, declaro que he examinado la informacion proporcionada en este formulario y, a mi leal saber y entender, es verdadera, correcta y completa. Ademas, certifico que soy el beneficiario real de los ingresos a los que se refiere este formulario, que no soy una persona de EE.UU. y que los ingresos no estan efectivamente vinculados a la realizacion de un comercio o negocio en EE.UU.';

const W9_PERJURY = 'Under penalties of perjury, I certify that: (1) The number shown on this form is my correct taxpayer identification number, (2) I am not subject to backup withholding, (3) I am a U.S. citizen or other U.S. person, and (4) The FATCA code(s) entered on this form (if any) indicating that I am exempt from FATCA reporting is correct.';

/* ─── Component ─── */

export default function FiscalSetupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [taxCountry, setTaxCountry] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Step 2 — W-8BEN fields
  const [w8FullName, setW8FullName] = useState('');
  const [w8Citizenship, setW8Citizenship] = useState('');
  const [w8Street, setW8Street] = useState('');
  const [w8City, setW8City] = useState('');
  const [w8PostalCode, setW8PostalCode] = useState('');
  const [w8AddressCountry, setW8AddressCountry] = useState('');
  const [w8TaxId, setW8TaxId] = useState('');
  const [w8TreatyClaim, setW8TreatyClaim] = useState(false);
  const [w8PerjuryAccepted, setW8PerjuryAccepted] = useState(false);
  const [w8SignatureName, setW8SignatureName] = useState('');

  // Step 2 — W-9 fields
  const [w9FullName, setW9FullName] = useState('');
  const [w9BusinessName, setW9BusinessName] = useState('');
  const [w9Classification, setW9Classification] = useState('');
  const [w9Street, setW9Street] = useState('');
  const [w9City, setW9City] = useState('');
  const [w9State, setW9State] = useState('');
  const [w9Zip, setW9Zip] = useState('');
  const [w9TaxId, setW9TaxId] = useState('');
  const [w9PerjuryAccepted, setW9PerjuryAccepted] = useState(false);
  const [w9SignatureName, setW9SignatureName] = useState('');

  // Step 3 — Bank details
  // ES
  const [esIban, setEsIban] = useState('');
  const [esBic, setEsBic] = useState('');
  const [esHolder, setEsHolder] = useState('');
  // KR
  const [krBank, setKrBank] = useState('');
  const [krAccount, setKrAccount] = useState('');
  const [krHolderHangul, setKrHolderHangul] = useState('');
  const [krHolderEnglish, setKrHolderEnglish] = useState('');
  // US
  const [usRouting, setUsRouting] = useState('');
  const [usAccount, setUsAccount] = useState('');
  const [usAccountType, setUsAccountType] = useState('checking');
  const [usHolder, setUsHolder] = useState('');
  // Other
  const [otherSwift, setOtherSwift] = useState('');
  const [otherIban, setOtherIban] = useState('');
  const [otherHolder, setOtherHolder] = useState('');
  const [otherAddress, setOtherAddress] = useState('');

  // Step 4
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isUS = taxCountry === 'US';
  const formType = isUS ? 'W-9' : 'W-8BEN';

  // Check existing submission on load
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await apiClient.get('/api/fiscal/tax-form');
        if (res && res.form_type) {
          // Already submitted, go to confirmation
          setCurrentStep(5);
        }
      } catch {
        // Not submitted yet, stay on step 1
      } finally {
        setLoading(false);
      }
    };
    checkExisting();
  }, []);

  /* ─── Validation ─── */

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};

    if (isUS) {
      if (!w9FullName.trim()) errs.w9FullName = 'Nombre completo obligatorio';
      if (!w9Classification) errs.w9Classification = 'Selecciona una clasificacion';
      if (!w9Street.trim()) errs.w9Street = 'Direccion obligatoria';
      if (!w9City.trim()) errs.w9City = 'Ciudad obligatoria';
      if (!w9State.trim()) errs.w9State = 'Estado obligatorio';
      if (!w9Zip.trim()) errs.w9Zip = 'ZIP obligatorio';
      if (!w9TaxId.trim()) errs.w9TaxId = 'SSN o EIN obligatorio';
      else if (w9TaxId.replace(/[\s\-]/g, '').length < 9) errs.w9TaxId = 'Debe tener al menos 9 digitos';
      if (!w9PerjuryAccepted) errs.w9Perjury = 'Debes aceptar la declaracion';
      if (!w9SignatureName.trim()) errs.w9Signature = 'Firma obligatoria';
    } else {
      if (!w8FullName.trim()) errs.w8FullName = 'Nombre completo obligatorio';
      if (!w8Citizenship) errs.w8Citizenship = 'Selecciona tu nacionalidad';
      if (!w8Street.trim()) errs.w8Street = 'Direccion obligatoria';
      if (!w8City.trim()) errs.w8City = 'Ciudad obligatoria';
      if (!w8PostalCode.trim()) errs.w8PostalCode = 'Codigo postal obligatorio';
      if (!w8AddressCountry) errs.w8AddressCountry = 'Pais de direccion obligatorio';
      if (!w8TaxId.trim()) errs.w8TaxId = 'Identificacion fiscal obligatoria';
      if (!w8PerjuryAccepted) errs.w8Perjury = 'Debes aceptar la declaracion';
      if (!w8SignatureName.trim()) errs.w8Signature = 'Firma obligatoria';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};

    if (taxCountry === 'ES') {
      const ibanClean = esIban.replace(/\s/g, '').toUpperCase();
      if (!ibanClean) errs.esIban = 'IBAN obligatorio';
      else if (!/^ES\d{22}$/.test(ibanClean)) errs.esIban = 'Formato IBAN espanol no valido (ES + 22 digitos)';
      if (!esHolder.trim()) errs.esHolder = 'Titular obligatorio';
    } else if (taxCountry === 'KR') {
      if (!krBank) errs.krBank = 'Selecciona un banco';
      if (!krAccount.trim()) errs.krAccount = 'Numero de cuenta obligatorio';
      if (!krHolderHangul.trim()) errs.krHolderHangul = 'Titular en hangul obligatorio';
      if (!krHolderEnglish.trim()) errs.krHolderEnglish = 'Titular en ingles obligatorio';
    } else if (taxCountry === 'US') {
      if (!usRouting.trim()) errs.usRouting = 'Routing number obligatorio';
      else if (!/^\d{9}$/.test(usRouting.trim())) errs.usRouting = 'Routing number debe tener 9 digitos';
      if (!usAccount.trim()) errs.usAccount = 'Account number obligatorio';
      if (!usHolder.trim()) errs.usHolder = 'Titular obligatorio';
    } else {
      if (!otherSwift.trim()) errs.otherSwift = 'SWIFT/BIC obligatorio';
      if (!otherIban.trim()) errs.otherIban = 'IBAN o numero de cuenta obligatorio';
      if (!otherHolder.trim()) errs.otherHolder = 'Titular obligatorio';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ─── Submit handlers ─── */

  const submitTaxForm = async () => {
    setSubmitting(true);
    try {
      const body: Record<string, any> = {
        form_type: formType,
        tax_residence_country: taxCountry,
      };

      if (isUS) {
        body.full_name = w9FullName.trim();
        body.business_name = w9BusinessName.trim() || undefined;
        body.federal_classification = w9Classification;
        body.street = w9Street.trim();
        body.city = w9City.trim();
        body.state = w9State.trim();
        body.postal_code = w9Zip.trim();
        body.tax_id = w9TaxId.replace(/[\s\-]/g, '');
        body.perjury_accepted = true;
        body.signature_name = w9SignatureName.trim();
      } else {
        body.full_name = w8FullName.trim();
        body.citizenship = w8Citizenship;
        body.street = w8Street.trim();
        body.city = w8City.trim();
        body.postal_code = w8PostalCode.trim();
        body.address_country = w8AddressCountry;
        body.tax_id = w8TaxId.trim();
        body.treaty_claim = w8TreatyClaim;
        body.perjury_accepted = true;
        body.signature_name = w8SignatureName.trim();
      }

      await apiClient.post('/api/fiscal/tax-form', body);
      toast.success('Formulario fiscal guardado');
      setCurrentStep(3);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al enviar el formulario fiscal');
    } finally {
      setSubmitting(false);
    }
  };

  const submitBankDetails = async () => {
    setSubmitting(true);
    try {
      let body: Record<string, any> = {};

      if (taxCountry === 'ES') {
        body = {
          format: 'iban',
          iban: esIban.replace(/\s/g, '').toUpperCase(),
          bic: esBic.trim().toUpperCase() || undefined,
          holder_name: esHolder.trim(),
        };
      } else if (taxCountry === 'KR') {
        body = {
          format: 'korean',
          bank_name: krBank,
          account_number: krAccount.trim(),
          holder_hangul: krHolderHangul.trim(),
          holder_english: krHolderEnglish.trim(),
        };
      } else if (taxCountry === 'US') {
        body = {
          format: 'us_ach',
          routing_number: usRouting.trim(),
          account_number: usAccount.trim(),
          account_type: usAccountType,
          holder_name: usHolder.trim(),
        };
      } else {
        body = {
          format: 'swift',
          swift_bic: otherSwift.trim().toUpperCase(),
          iban: otherIban.trim().toUpperCase(),
          holder_name: otherHolder.trim(),
          holder_address: otherAddress.trim() || undefined,
        };
      }

      await apiClient.post('/api/fiscal/bank-details', body);
      toast.success('Datos bancarios guardados');
      setCurrentStep(4);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Error al guardar datos bancarios');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Navigation ─── */

  const goNext = () => {
    setErrors({});
    if (currentStep === 1) {
      if (!taxCountry) {
        setErrors({ taxCountry: 'Selecciona un pais' });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) {
        submitTaxForm();
      }
    } else if (currentStep === 3) {
      if (validateStep3()) {
        submitBankDetails();
      }
    } else if (currentStep === 4) {
      if (!disclaimerAccepted) {
        setErrors({ disclaimer: 'Debes aceptar la declaracion' });
        return;
      }
      setCurrentStep(5);
    }
  };

  const goBack = () => {
    setErrors({});
    if (currentStep === 1) {
      navigate('/influencer/dashboard');
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  /* ─── Summary helpers ─── */

  const getBankLast4 = (): string => {
    if (taxCountry === 'ES') return esIban.replace(/\s/g, '').slice(-4);
    if (taxCountry === 'KR') return krAccount.slice(-4);
    if (taxCountry === 'US') return usAccount.slice(-4);
    return otherIban.replace(/\s/g, '').slice(-4) || '----';
  };

  const getCountryName = (code: string) => ALL_COUNTRIES.find(c => c.code === code)?.name || code;

  /* ─── Render ─── */

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-[600px] mx-auto px-4 py-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={goBack}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-stone-200 cursor-pointer transition-colors hover:bg-stone-100"
          >
            <ArrowLeft className="w-4 h-4 text-stone-950" />
          </button>
          <h1 className="text-lg font-bold text-stone-950">Configuracion fiscal</h1>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const isComplete = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;
              return (
                <div key={label} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isComplete
                        ? 'bg-stone-950 text-white'
                        : isCurrent
                        ? 'bg-stone-950 text-white'
                        : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {isComplete ? <Check size={12} /> : stepNum}
                  </div>
                  <span className={`text-[10px] mt-1 ${isCurrent ? 'text-stone-950 font-semibold' : 'text-stone-500'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-stone-950 rounded-full"
              initial={false}
              animate={{ width: `${((currentStep - 1) / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════════════
     STEP 1 — Tax Residence Country
  ═══════════════════════════════════════════════════════════════════ */
  function renderStep1() {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-base font-bold text-stone-950 mb-1">Pais de residencia fiscal</h2>
        <p className="text-sm text-stone-500 mb-5">
          Selecciona el pais donde declaras tus impuestos. Esto determina el formulario fiscal que necesitas.
        </p>

        {/* Priority countries */}
        <div className="space-y-2 mb-4">
          {PRIORITY_COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => setTaxCountry(c.code)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                taxCountry === c.code
                  ? 'border-stone-950 bg-stone-50'
                  : 'border-stone-200 bg-white hover:bg-stone-50'
              }`}
            >
              <span className="text-xs font-mono text-stone-400 w-6">{c.code}</span>
              <span className="text-sm font-medium text-stone-950">{c.name}</span>
              {taxCountry === c.code && <Check className="w-4 h-4 ml-auto text-stone-950" />}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-400">Otro pais</span>
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        {/* Dropdown for other countries */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`w-full flex items-center justify-between h-12 px-4 text-sm text-left bg-white rounded-xl border cursor-pointer ${
              taxCountry && !PRIORITY_COUNTRIES.find(c => c.code === taxCountry)
                ? 'border-stone-950'
                : 'border-stone-200'
            }`}
          >
            <span className={taxCountry && !PRIORITY_COUNTRIES.find(c => c.code === taxCountry) ? 'text-stone-950' : 'text-stone-500'}>
              {taxCountry && !PRIORITY_COUNTRIES.find(c => c.code === taxCountry)
                ? getCountryName(taxCountry)
                : 'Seleccionar otro pais...'}
            </span>
            <ChevronDown className="w-4 h-4 text-stone-400" />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white rounded-xl border border-stone-200 shadow-lg max-h-52 overflow-y-auto">
                {OTHER_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setTaxCountry(c.code);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-stone-50 flex items-center gap-3 cursor-pointer bg-transparent border-none"
                  >
                    <span className="text-xs font-mono text-stone-400 w-6">{c.code}</span>
                    <span className="text-stone-950">{c.name}</span>
                    {taxCountry === c.code && <Check className="w-4 h-4 ml-auto text-stone-950" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {errors.taxCountry && <p className="text-xs text-stone-700 mt-2">{errors.taxCountry}</p>}

        {/* Info about form type */}
        {taxCountry && (
          <div className="mt-5 p-3 bg-stone-50 rounded-xl border border-stone-200">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-stone-500" />
              <p className="text-xs text-stone-600">
                {isUS
                  ? 'Como residente fiscal en EE.UU., completaras un formulario W-9.'
                  : `Como residente fiscal fuera de EE.UU., completaras un formulario W-8BEN.`}
              </p>
            </div>
          </div>
        )}

        {/* Next button */}
        <button
          onClick={goNext}
          disabled={!taxCountry}
          className={`w-full mt-6 py-3.5 text-sm font-semibold rounded-full border-none transition-colors ${
            taxCountry
              ? 'bg-stone-950 text-white cursor-pointer hover:bg-stone-800'
              : 'bg-stone-200 text-stone-500 cursor-not-allowed'
          }`}
        >
          Continuar
        </button>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     STEP 2 — Tax Form (W-8BEN or W-9)
  ═══════════════════════════════════════════════════════════════════ */
  function renderStep2() {
    if (isUS) return renderW9();
    return renderW8BEN();
  }

  function renderW8BEN() {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-base font-bold text-stone-950 mb-1">Formulario W-8BEN</h2>
        <p className="text-sm text-stone-500 mb-5">
          Certificate of Foreign Status of Beneficial Owner
        </p>

        <div className="space-y-4">
          {/* Full name */}
          <FieldInput
            label="Nombre completo (como aparece en tu documento)"
            value={w8FullName}
            onChange={setW8FullName}
            error={errors.w8FullName}
            placeholder="Nombre y apellidos"
          />

          {/* Citizenship */}
          <FieldSelect
            label="Nacionalidad"
            value={w8Citizenship}
            onChange={setW8Citizenship}
            error={errors.w8Citizenship}
            options={ALL_COUNTRIES.map(c => ({ value: c.code, label: c.name }))}
            placeholder="Seleccionar nacionalidad"
          />

          {/* Address */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Direccion permanente</span>
          </div>

          <FieldInput
            label="Calle y numero"
            value={w8Street}
            onChange={setW8Street}
            error={errors.w8Street}
            placeholder="Calle, numero, piso"
          />

          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Ciudad"
              value={w8City}
              onChange={setW8City}
              error={errors.w8City}
              placeholder="Ciudad"
            />
            <FieldInput
              label="Codigo postal"
              value={w8PostalCode}
              onChange={setW8PostalCode}
              error={errors.w8PostalCode}
              placeholder="Codigo postal"
            />
          </div>

          <FieldSelect
            label="Pais de direccion"
            value={w8AddressCountry}
            onChange={setW8AddressCountry}
            error={errors.w8AddressCountry}
            options={ALL_COUNTRIES.map(c => ({ value: c.code, label: c.name }))}
            placeholder="Seleccionar pais"
          />

          {/* Tax ID */}
          <FieldInput
            label={getTaxIdLabel(taxCountry)}
            value={w8TaxId}
            onChange={setW8TaxId}
            error={errors.w8TaxId}
            placeholder="Tu numero de identificacion fiscal"
          />

          {/* Treaty claim */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={w8TreatyClaim}
                onChange={(e) => setW8TreatyClaim(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-stone-950"
              />
              <div>
                <span className="text-sm text-stone-950">
                  Existe convenio de doble imposicion entre tu pais y USA
                </span>
                {TREATY_COUNTRIES.has(taxCountry) && (
                  <div className="flex items-center gap-1 mt-1">
                    <HelpCircle className="w-3 h-3 text-stone-400" />
                    <span className="text-xs text-stone-500">
                      {getCountryName(taxCountry)} tiene un convenio vigente con EE.UU.
                    </span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Perjury declaration */}
          <div className="pt-3 border-t border-stone-200">
            <p className="text-xs font-semibold text-stone-700 mb-2 uppercase tracking-wide">Declaracion jurada</p>
            <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 leading-relaxed mb-3 max-h-28 overflow-y-auto">
              {W8BEN_PERJURY}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={w8PerjuryAccepted}
                onChange={(e) => setW8PerjuryAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-stone-950"
              />
              <span className="text-sm text-stone-950">Acepto la declaracion jurada bajo pena de perjurio</span>
            </label>
            {errors.w8Perjury && <p className="text-xs text-stone-700 mt-1 ml-7">{errors.w8Perjury}</p>}
          </div>

          {/* Signature */}
          <div className="pt-3 border-t border-stone-200">
            <p className="text-xs font-semibold text-stone-700 mb-2 uppercase tracking-wide">Firma electronica</p>
            <FieldInput
              label="Nombre completo (firma)"
              value={w8SignatureName}
              onChange={setW8SignatureName}
              error={errors.w8Signature}
              placeholder="Escribe tu nombre completo como firma"
            />
            <p className="text-xs text-stone-500 mt-1">
              Fecha: {new Date().toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={goBack}
            className="flex-1 py-3.5 text-sm font-semibold rounded-full border border-stone-200 bg-white text-stone-950 cursor-pointer hover:bg-stone-50 transition-colors"
          >
            Atras
          </button>
          <button
            onClick={goNext}
            disabled={submitting}
            className="flex-1 py-3.5 text-sm font-semibold rounded-full border-none bg-stone-950 text-white cursor-pointer hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar formulario
          </button>
        </div>
      </div>
    );
  }

  function renderW9() {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-base font-bold text-stone-950 mb-1">Formulario W-9</h2>
        <p className="text-sm text-stone-500 mb-5">
          Request for Taxpayer Identification Number and Certification
        </p>

        <div className="space-y-4">
          {/* Full name */}
          <FieldInput
            label="Nombre completo (como aparece en tu tax return)"
            value={w9FullName}
            onChange={setW9FullName}
            error={errors.w9FullName}
            placeholder="Full legal name"
          />

          {/* Business name */}
          <FieldInput
            label="Nombre de negocio (opcional)"
            value={w9BusinessName}
            onChange={setW9BusinessName}
            placeholder="Business name / DBA (if different)"
          />

          {/* Federal classification */}
          <div>
            <p className="text-xs font-medium text-stone-700 mb-2">Federal tax classification</p>
            <div className="space-y-2">
              {US_FEDERAL_CLASSIFICATIONS.map((cls) => (
                <label
                  key={cls.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    w9Classification === cls.value ? 'border-stone-950 bg-stone-50' : 'border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="classification"
                    value={cls.value}
                    checked={w9Classification === cls.value}
                    onChange={(e) => setW9Classification(e.target.value)}
                    className="w-4 h-4 accent-stone-950"
                  />
                  <span className="text-sm text-stone-950">{cls.label}</span>
                </label>
              ))}
            </div>
            {errors.w9Classification && <p className="text-xs text-stone-700 mt-1">{errors.w9Classification}</p>}
          </div>

          {/* Address */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-stone-700 uppercase tracking-wide">Address</span>
          </div>

          <FieldInput
            label="Street address"
            value={w9Street}
            onChange={setW9Street}
            error={errors.w9Street}
            placeholder="Street, apt, suite"
          />

          <div className="grid grid-cols-3 gap-3">
            <FieldInput
              label="City"
              value={w9City}
              onChange={setW9City}
              error={errors.w9City}
              placeholder="City"
            />
            <FieldInput
              label="State"
              value={w9State}
              onChange={setW9State}
              error={errors.w9State}
              placeholder="FL"
            />
            <FieldInput
              label="ZIP code"
              value={w9Zip}
              onChange={setW9Zip}
              error={errors.w9Zip}
              placeholder="33101"
            />
          </div>

          {/* Tax ID (masked) */}
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">SSN o EIN</label>
            <input
              type="password"
              value={w9TaxId}
              onChange={(e) => setW9TaxId(e.target.value)}
              placeholder="XXX-XX-XXXX"
              className={`w-full h-12 px-4 text-sm bg-white rounded-xl border transition-colors focus:outline-none focus:border-stone-950 ${
                errors.w9TaxId ? 'border-stone-700' : 'border-stone-200'
              } text-stone-950`}
            />
            {errors.w9TaxId && <p className="text-xs text-stone-700 mt-1">{errors.w9TaxId}</p>}
          </div>

          {/* Perjury declaration */}
          <div className="pt-3 border-t border-stone-200">
            <p className="text-xs font-semibold text-stone-700 mb-2 uppercase tracking-wide">Certification</p>
            <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-600 leading-relaxed mb-3 max-h-28 overflow-y-auto">
              {W9_PERJURY}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={w9PerjuryAccepted}
                onChange={(e) => setW9PerjuryAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-stone-950"
              />
              <span className="text-sm text-stone-950">I certify under penalties of perjury that the information provided is correct</span>
            </label>
            {errors.w9Perjury && <p className="text-xs text-stone-700 mt-1 ml-7">{errors.w9Perjury}</p>}
          </div>

          {/* Signature */}
          <div className="pt-3 border-t border-stone-200">
            <p className="text-xs font-semibold text-stone-700 mb-2 uppercase tracking-wide">Electronic signature</p>
            <FieldInput
              label="Full name (signature)"
              value={w9SignatureName}
              onChange={setW9SignatureName}
              error={errors.w9Signature}
              placeholder="Type your full legal name"
            />
            <p className="text-xs text-stone-500 mt-1">
              Date: {new Date().toLocaleDateString('en-US')}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={goBack}
            className="flex-1 py-3.5 text-sm font-semibold rounded-full border border-stone-200 bg-white text-stone-950 cursor-pointer hover:bg-stone-50 transition-colors"
          >
            Atras
          </button>
          <button
            onClick={goNext}
            disabled={submitting}
            className="flex-1 py-3.5 text-sm font-semibold rounded-full border-none bg-stone-950 text-white cursor-pointer hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar formulario
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     STEP 3 — Bank Details
  ═══════════════════════════════════════════════════════════════════ */
  function renderStep3() {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-base font-bold text-stone-950 mb-1">Datos bancarios</h2>
        <p className="text-sm text-stone-500 mb-5">
          Introduce los datos de la cuenta donde recibiras tus pagos.
        </p>

        <div className="space-y-4">
          {taxCountry === 'ES' && renderBankES()}
          {taxCountry === 'KR' && renderBankKR()}
          {taxCountry === 'US' && renderBankUS()}
          {taxCountry !== 'ES' && taxCountry !== 'KR' && taxCountry !== 'US' && renderBankOther()}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={goBack}
            className="flex-1 py-3.5 text-sm font-semibold rounded-full border border-stone-200 bg-white text-stone-950 cursor-pointer hover:bg-stone-50 transition-colors"
          >
            Atras
          </button>
          <button
            onClick={goNext}
            disabled={submitting}
            className="flex-1 py-3.5 text-sm font-semibold rounded-full border-none bg-stone-950 text-white cursor-pointer hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar datos bancarios
          </button>
        </div>
      </div>
    );
  }

  function renderBankES() {
    return (
      <>
        <FieldInput
          label="IBAN"
          value={esIban}
          onChange={setEsIban}
          error={errors.esIban}
          placeholder="ES12 3456 7890 1234 5678 9012"
        />
        <FieldInput
          label="BIC / SWIFT (opcional)"
          value={esBic}
          onChange={setEsBic}
          placeholder="CAIXESBBXXX"
        />
        <FieldInput
          label="Titular de la cuenta"
          value={esHolder}
          onChange={setEsHolder}
          error={errors.esHolder}
          placeholder="Nombre completo del titular"
        />
      </>
    );
  }

  function renderBankKR() {
    return (
      <>
        <FieldSelect
          label="Banco"
          value={krBank}
          onChange={setKrBank}
          error={errors.krBank}
          options={KOREAN_BANKS}
          placeholder="Seleccionar banco"
        />
        <FieldInput
          label="Numero de cuenta"
          value={krAccount}
          onChange={setKrAccount}
          error={errors.krAccount}
          placeholder="계좌번호"
        />
        <FieldInput
          label="Titular (hangul)"
          value={krHolderHangul}
          onChange={setKrHolderHangul}
          error={errors.krHolderHangul}
          placeholder="예금주 (한글)"
        />
        <FieldInput
          label="Titular (English)"
          value={krHolderEnglish}
          onChange={setKrHolderEnglish}
          error={errors.krHolderEnglish}
          placeholder="Account holder name in English"
        />
      </>
    );
  }

  function renderBankUS() {
    return (
      <>
        <FieldInput
          label="Routing number (9 digits)"
          value={usRouting}
          onChange={setUsRouting}
          error={errors.usRouting}
          placeholder="021000021"
        />
        <FieldInput
          label="Account number"
          value={usAccount}
          onChange={setUsAccount}
          error={errors.usAccount}
          placeholder="Account number"
        />
        <div>
          <p className="text-xs font-medium text-stone-700 mb-2">Account type</p>
          <div className="flex gap-3">
            {['checking', 'savings'].map((type) => (
              <label
                key={type}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                  usAccountType === type ? 'border-stone-950 bg-stone-50' : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name="accountType"
                  value={type}
                  checked={usAccountType === type}
                  onChange={(e) => setUsAccountType(e.target.value)}
                  className="w-4 h-4 accent-stone-950"
                />
                <span className="text-sm text-stone-950 capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>
        <FieldInput
          label="Account holder name"
          value={usHolder}
          onChange={setUsHolder}
          error={errors.usHolder}
          placeholder="Full name on account"
        />
      </>
    );
  }

  function renderBankOther() {
    return (
      <>
        <FieldInput
          label="SWIFT / BIC"
          value={otherSwift}
          onChange={setOtherSwift}
          error={errors.otherSwift}
          placeholder="SWIFT/BIC code"
        />
        <FieldInput
          label="IBAN o numero de cuenta local"
          value={otherIban}
          onChange={setOtherIban}
          error={errors.otherIban}
          placeholder="IBAN or local account number"
        />
        <FieldInput
          label="Titular de la cuenta"
          value={otherHolder}
          onChange={setOtherHolder}
          error={errors.otherHolder}
          placeholder="Account holder name"
        />
        <FieldInput
          label="Direccion del titular (opcional)"
          value={otherAddress}
          onChange={setOtherAddress}
          placeholder="Full address"
        />
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     STEP 4 — Summary + Disclaimer
  ═══════════════════════════════════════════════════════════════════ */
  function renderStep4() {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h2 className="text-base font-bold text-stone-950 mb-5">Resumen y declaracion</h2>

        {/* Summary card */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 mb-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">Pais de residencia</span>
            <span className="text-sm font-medium text-stone-950">{getCountryName(taxCountry)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">Formulario fiscal</span>
            <span className="text-sm font-medium text-stone-950">{formType}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-stone-500">Cuenta bancaria</span>
            <span className="text-sm font-medium text-stone-950">****{getBankLast4()}</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 mb-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-stone-600" />
            <p className="text-sm text-stone-700 leading-relaxed">
              HispaloShop opera desde Estados Unidos. No retenemos impuestos locales. Eres responsable de declarar tus ingresos segun la normativa de tu pais de residencia.
            </p>
          </div>
        </div>

        {/* Acceptance checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={disclaimerAccepted}
            onChange={(e) => setDisclaimerAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-stone-950"
          />
          <span className="text-sm text-stone-950">
            He leido y acepto que soy responsable de mis obligaciones fiscales
          </span>
        </label>
        {errors.disclaimer && <p className="text-xs text-stone-700 mb-3">{errors.disclaimer}</p>}

        {/* Help center link */}
        <a
          href="/help/fiscal"
          className="text-xs text-stone-500 underline hover:text-stone-700 transition-colors"
        >
          Centro de ayuda — Preguntas fiscales frecuentes
        </a>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={goBack}
            className="flex-1 py-3.5 text-sm font-semibold rounded-full border border-stone-200 bg-white text-stone-950 cursor-pointer hover:bg-stone-50 transition-colors"
          >
            Atras
          </button>
          <button
            onClick={goNext}
            disabled={!disclaimerAccepted}
            className={`flex-1 py-3.5 text-sm font-semibold rounded-full border-none transition-colors ${
              disclaimerAccepted
                ? 'bg-stone-950 text-white cursor-pointer hover:bg-stone-800'
                : 'bg-stone-200 text-stone-500 cursor-not-allowed'
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     STEP 5 — Confirmation
  ═══════════════════════════════════════════════════════════════════ */
  function renderStep5() {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-stone-950 flex items-center justify-center mx-auto mb-5">
          <Check className="w-7 h-7 text-white" strokeWidth={2.5} />
        </div>

        <h2 className="text-lg font-bold text-stone-950 mb-2">
          Tu configuracion fiscal esta completa
        </h2>
        <p className="text-sm text-stone-500 mb-8">
          Podras recibir pagos una vez verificada tu informacion. Te notificaremos cuando el proceso haya finalizado.
        </p>

        <button
          onClick={() => navigate('/influencer/dashboard')}
          className="w-full py-3.5 text-sm font-semibold rounded-full border-none bg-stone-950 text-white cursor-pointer hover:bg-stone-800 transition-colors"
        >
          Volver al dashboard
        </button>
      </div>
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Reusable field components (inline)
═══════════════════════════════════════════════════════════════════ */

function FieldInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-12 px-4 text-sm bg-white rounded-xl border transition-colors focus:outline-none focus:border-stone-950 ${
          error ? 'border-stone-700' : 'border-stone-200'
        } text-stone-950 placeholder:text-stone-400`}
      />
      {error && <p className="text-xs text-stone-700 mt-1">{error}</p>}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  error,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-700 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-12 px-4 text-sm bg-white rounded-xl border transition-colors focus:outline-none focus:border-stone-950 appearance-none ${
          error ? 'border-stone-700' : 'border-stone-200'
        } ${value ? 'text-stone-950' : 'text-stone-400'}`}
      >
        <option value="">{placeholder || 'Seleccionar...'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-stone-700 mt-1">{error}</p>}
    </div>
  );
}
