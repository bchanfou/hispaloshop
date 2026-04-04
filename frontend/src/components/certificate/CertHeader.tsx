import React, { useState } from 'react';
import { Shield, Globe, ChevronDown, CheckCircle2 } from 'lucide-react';
import { CERT_LANGUAGES, getTexts } from './constants';
import type { CertLangCode } from './constants';

interface CertHeaderProps {
  certLang: string;
  translating: boolean;
  onLangChange: (code: string) => void;
}

export default function CertHeader({ certLang, translating, onLangChange }: CertHeaderProps) {
  const [langOpen, setLangOpen] = useState(false);
  const txt = getTexts(certLang);
  const currentFlag = CERT_LANGUAGES.find(l => l.code === certLang)?.flag;

  return (
    <div className="flex items-center justify-between bg-stone-950 px-5 py-3.5">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-stone-400" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
          {txt.cert_title}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* Language selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 rounded-full bg-stone-800 px-2.5 py-1 text-xs font-medium text-stone-300 hover:bg-stone-700 transition-colors"
          >
            <Globe className="h-3 w-3" />
            {currentFlag}
            <ChevronDown className={`h-3 w-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-2xl border border-stone-200 bg-white py-1 shadow-lg max-h-64 overflow-y-auto">
                {CERT_LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => { onLangChange(l.code); setLangOpen(false); }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      certLang === l.code
                        ? 'bg-stone-100 font-semibold text-stone-950'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span className="text-base">{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {translating && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stone-500 border-t-white" />}
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2} />
          <span className="text-xs font-semibold text-white">{txt.verified}</span>
        </div>
      </div>
    </div>
  );
}
