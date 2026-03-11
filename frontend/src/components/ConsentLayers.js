import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Check, AlertTriangle, X, Info } from 'lucide-react';
import { Button } from './ui/button';
import { useTranslation } from 'react-i18next';

/**
 * 3-Layer Consent Component for GDPR-compliant AI data processing consent
 * 
 * Layer 1: Quick Summary (always visible) - 5 bullet points
 * Layer 2: Full Legal Disclosure (expandable accordion)
 * Layer 3: Settings Control (toggle with immediate effect)
 */

// Layer 1: Quick Summary Component
export function ConsentSummary({ className = '' }) {
  const { t } = useTranslation();
  
  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="font-medium text-stone-950 flex items-center gap-2 text-sm">
        <Info className="w-4 h-4 text-stone-950" />
        {t('consent.layer1.title', 'Resumen rápido')}
      </h4>
      <ul className="space-y-1.5 text-sm text-stone-600">
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <span>{t('consent.layer1.bullet1', 'Analizamos tus conversaciones con HI para inferir preferencias de compra')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <span>{t('consent.layer1.bullet2', 'NUNCA almacenamos tus mensajes de chat sin procesar con fines analíticos')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <span>{t('consent.layer1.bullet3', 'Tus datos se usan únicamente para recomendaciones personalizadas')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <span>{t('consent.layer1.bullet4', 'Puedes retirar tu consentimiento en cualquier momento desde tu perfil')}</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
          <span>{t('consent.layer1.bullet5', 'Los datos anónimos agregados ayudan a mejorar nuestro catálogo')}</span>
        </li>
      </ul>
    </div>
  );
}

// Layer 2: Full Legal Disclosure Component
export function ConsentFullDisclosure({ isExpanded, onToggle }) {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language === 'en';
  
  const sections = [
    {
      title: t('consent.layer2.section1Title'),
      content: t('consent.layer2.section1Text')
    },
    {
      title: t('consent.layer2.section2Title'),
      content: t('consent.layer2.section2Text')
    },
    {
      title: t('consent.layer2.section3Title'),
      content: t('consent.layer2.section3Text')
    },
    {
      title: t('consent.layer2.section4Title'),
      content: t('consent.layer2.section4Text'),
      list: [
        t('consent.layer2.section4List1'),
        t('consent.layer2.section4List2'),
        t('consent.layer2.section4List3'),
        t('consent.layer2.section4List4')
      ].filter(item => item)
    },
    {
      title: t('consent.layer2.section5Title'),
      content: t('consent.layer2.section5Text')
    },
    {
      title: t('consent.layer2.section6Title'),
      content: t('consent.layer2.section6Text')
    },
    {
      title: t('consent.layer2.section7Title'),
      content: t('consent.layer2.section7Text'),
      list: [
        t('consent.layer2.section7List1'),
        t('consent.layer2.section7List2'),
        t('consent.layer2.section7List3'),
        t('consent.layer2.section7List4'),
        t('consent.layer2.section7List5')
      ].filter(item => item)
    },
    {
      title: t('consent.layer2.section8Title'),
      content: t('consent.layer2.section8Text')
    },
    {
      title: t('consent.layer2.section9Title'),
      content: t('consent.layer2.section9Text'),
      list: [
        t('consent.layer2.section9List1'),
        t('consent.layer2.section9List2'),
        t('consent.layer2.section9List3'),
        t('consent.layer2.section9List4'),
        t('consent.layer2.section9List5')
      ].filter(item => item)
    },
    {
      title: t('consent.layer2.section10Title'),
      content: t('consent.layer2.section10Text')
    },
    {
      title: t('consent.layer2.section11Title'),
      content: t('consent.layer2.section11Text')
    },
    {
      title: t('consent.layer2.section12Title'),
      content: t('consent.layer2.section12Text')
    }
  ];

  return (
    <div className="border border-stone-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 bg-stone-50 flex items-center justify-between hover:bg-stone-100 transition-colors"
        data-testid="expand-legal-disclosure"
      >
        <span className="font-medium text-stone-950 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-stone-950" />
          {t('consent.layer2.title', 'Texto legal completo')}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-stone-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-stone-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 py-4 space-y-4 text-sm text-stone-600 max-h-[400px] overflow-y-auto">
          <p className="font-medium text-stone-950 text-xs">
            {t('consent.version', 'Version 1.0')}
          </p>
          
          {sections.map((section, idx) => (
            <div key={idx}>
              <h4 className="font-semibold text-stone-950 mb-1">{section.title}</h4>
              <p className="mb-2">{section.content}</p>
              {section.list && (
                <ul className="list-disc pl-5 space-y-1">
                  {section.list.map((item, listIdx) => (
                    <li key={listIdx}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          
          {/* Disclaimer for non-English versions */}
          {!isEnglish && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 italic">
                {t('consent.layer2.disclaimer', 'En caso de discrepancia entre traducciones, prevalecerá la versión española de este documento.')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Layer 3: Consent Settings Control (for profile page)
export function ConsentSettings({ hasConsent, onWithdraw, onReactivate, loading = false }) {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);
  
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-stone-950 flex items-center gap-2">
        <Shield className="w-5 h-5 text-stone-950" />
        {t('consent.layer3.title', 'Configuración de consentimiento')}
      </h3>
      
      {/* Current Status */}
      <div className={`p-4 rounded-lg ${hasConsent ? 'bg-green-50 border border-green-200' : 'bg-stone-100 border border-stone-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-stone-950">
              {hasConsent ? t('consent.layer3.statusActive') : t('consent.layer3.statusInactive')}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            hasConsent ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-600'
          }`}>
            {hasConsent ? t('common.active', 'Activo') : t('common.disabled', 'Desactivado')}
          </span>
        </div>
      </div>
      
      {hasConsent ? (
        <>
          {/* Withdraw Section */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {t('consent.layer3.withdrawTitle')}
            </h4>
            <p className="text-sm text-amber-700 mb-3">
              {t('consent.layer3.withdrawDescription')}
            </p>
            <ul className="text-sm text-amber-700 space-y-1 mb-4">
              <li>• {t('consent.layer3.withdrawEffect1')}</li>
              <li>• {t('consent.layer3.withdrawEffect2')}</li>
              <li>• {t('consent.layer3.withdrawEffect3')}</li>
            </ul>
            
            {!showConfirm ? (
              <Button
                variant="outline"
                onClick={() => setShowConfirm(true)}
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
                data-testid="withdraw-consent-btn"
              >
                {t('consent.layer3.withdrawButton')}
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="destructive"
                  onClick={() => {
                    onWithdraw();
                    setShowConfirm(false);
                  }}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="confirm-withdraw-btn"
                >
                  {loading ? t('common.loading') : t('common.confirm')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirm(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Reactivate Section */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <h4 className="font-medium text-stone-950 mb-2">
              {t('consent.layer3.reactivateTitle')}
            </h4>
            <p className="text-sm text-stone-600 mb-4">
              {t('consent.layer3.reactivateDescription')}
            </p>
            <Button
              onClick={onReactivate}
              disabled={loading}
              className="bg-stone-950 hover:bg-stone-800"
              data-testid="reactivate-consent-btn"
            >
              {loading ? t('common.loading') : t('consent.layer3.reactivateButton')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Complete Consent Modal for Registration
export function ConsentModal({ isOpen, onClose, onAccept, onDecline }) {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const isEnglish = i18n.language === 'en';
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="consent-modal">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-full">
              <Shield className="w-6 h-6 text-stone-950" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-stone-950">
                {t('consent.title', 'Consentimiento de procesamiento de datos IA')}
              </h2>
              <p className="text-xs text-stone-500">{t('consent.version')} • {t('consent.required')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            data-testid="close-consent-modal"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Layer 1: Summary (always visible) */}
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <ConsentSummary />
          </div>
          
          {/* Layer 2: Full Disclosure (expandable) */}
          <ConsentFullDisclosure 
            isExpanded={isExpanded} 
            onToggle={() => setIsExpanded(!isExpanded)} 
          />
          
          {/* Translation disclaimer */}
          {!isEnglish && (
            <p className="text-xs text-stone-500 text-center italic">
              {t('consent.layer2.disclaimer')}
            </p>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-stone-200 px-6 py-4 flex justify-between gap-3">
          <Button 
            variant="outline" 
            onClick={onDecline}
            data-testid="decline-consent-btn"
          >
            {t('consent.modal.decline', 'Rechazar')}
          </Button>
          <Button
            onClick={onAccept}
            className="bg-stone-950 hover:bg-stone-800 px-8"
            data-testid="accept-consent-btn"
          >
            {t('consent.modal.accept', 'Aceptar')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConsentModal;
