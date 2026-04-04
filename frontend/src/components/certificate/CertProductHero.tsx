import React from 'react';
import { Award, Eye, MapPin, Package } from 'lucide-react';
import { abbreviateCount, getTexts } from './constants';
import type { CertUITexts } from './constants';

interface CertProductHeroProps {
  txt: CertUITexts;
  certLang: string;
  productImage: string | null;
  productName: string;
  description: string;
  countryOrigin: string;
  producerName: string;
  certifications: string[];
  certNumber: string;
  issueDate: string;
  scanCount: number;
}

export default function CertProductHero({
  txt, certLang, productImage, productName, description,
  countryOrigin, producerName, certifications,
  certNumber, issueDate, scanCount,
}: CertProductHeroProps) {
  return (
    <div className="flex flex-col sm:flex-row">
      {/* Image */}
      <div className="flex flex-none items-center justify-center border-b border-stone-100 bg-stone-50 p-8 sm:w-52 sm:border-b-0 sm:border-r">
        {productImage ? (
          <img src={productImage} alt={productName} loading="lazy" className="max-h-[300px] w-full rounded-2xl object-cover" />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-full bg-stone-100">
            <Package className="h-10 w-10 text-stone-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">{txt.product}</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-stone-950">{productName}</h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-stone-600">{description}</p>
        )}

        {/* Meta pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {countryOrigin && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
              <MapPin className="h-3 w-3" /> {countryOrigin}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
            <Package className="h-3 w-3" /> {producerName || 'Hispaloshop'}
          </span>
        </div>

        {/* Certification badges */}
        {certifications.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {certifications.map(item => (
              <span key={item} className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700">
                <Award className="h-3 w-3" /> {item}
              </span>
            ))}
          </div>
        )}

        {/* Certificate meta */}
        {certNumber && (
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-stone-400">
            <span>{txt.cert_number}: <span className="font-semibold text-stone-600">{certNumber}</span></span>
            {issueDate && !isNaN(new Date(issueDate).getTime()) && (
              <span>{txt.issued}: <span className="font-semibold text-stone-600">
                {new Date(issueDate).toLocaleDateString(certLang === 'es' ? 'es-ES' : certLang, { day: 'numeric', month: 'short', year: 'numeric' })}
              </span></span>
            )}
          </div>
        )}

        {/* Scan counter */}
        {scanCount > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-400">
            <Eye className="h-3 w-3" />
            <span>{abbreviateCount(scanCount)} {txt.verified_times}</span>
          </div>
        )}
      </div>
    </div>
  );
}
