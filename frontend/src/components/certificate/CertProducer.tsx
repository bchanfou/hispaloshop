import React from 'react';
import { ChevronRight, MapPin } from 'lucide-react';
import type { CertUITexts } from './constants';

interface CertProducerProps {
  txt: CertUITexts;
  storeInfo: { name?: string; logo?: string; story?: string; tagline?: string; slug?: string } | null;
  producerName: string;
  countryOrigin: string;
  region?: string;
  onGoToStore?: () => void;
}

export default function CertProducer({ txt, storeInfo, producerName, countryOrigin, region, onGoToStore }: CertProducerProps) {
  const displayName = storeInfo?.name || producerName || 'Productor independiente';

  return (
    <div className="mt-4 rounded-[28px] border border-stone-100 bg-white p-6 shadow-sm">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.made_by}</h2>
      <div className="flex items-center gap-3 mb-3">
        {storeInfo?.logo && (
          <img src={storeInfo.logo} alt="" className="h-10 w-10 rounded-full object-cover border border-stone-200" />
        )}
        <p className="text-base font-semibold text-stone-950">{displayName}</p>
      </div>
      {(storeInfo?.story || storeInfo?.tagline) && (
        <p className="text-sm leading-relaxed text-stone-600">
          {storeInfo?.story || storeInfo?.tagline}
        </p>
      )}

      {/* Origin */}
      {countryOrigin && (
        <>
          <h3 className="mt-5 mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.origin}</h3>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600">
              <MapPin className="h-3 w-3" /> {countryOrigin}
            </span>
          </div>
        </>
      )}

      {/* Go to store */}
      {onGoToStore && (
        <button
          type="button"
          onClick={onGoToStore}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-stone-950 hover:text-stone-600"
        >
          {txt.go_store} <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
