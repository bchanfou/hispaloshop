import React from 'react';
import { 
  Globe, HandMetal, Leaf, MapPin, 
  Award, Users, Heart, Clock 
} from 'lucide-react';
import type { CertificateType } from '../../types/certificate';

export interface CertificateCardProps {
  certificate: {
    certificate_id: string;
    type: CertificateType;
    type_label: string;
    issued_at: string;
    qr_code_url?: string;
    product?: {
      name: string;
      image?: string;
    };
  };
  onClick?: () => void;
  compact?: boolean;
}

const CERTIFICATE_ICONS: Record<CertificateType, React.ElementType> = {
  origin: Globe,
  artisan: HandMetal,
  sustainable: Leaf,
  organic: Leaf,
  local: MapPin,
  traditional: Award,
  women_owned: Heart,
  family_business: Users,
};

export default function CertificateCard({ 
  certificate, 
  onClick, 
  compact = false 
}: CertificateCardProps) {
  const Icon = CERTIFICATE_ICONS[certificate.type] || Award;
  const issuedDate = new Date(certificate.issued_at).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left bg-white border border-stone-200 rounded-lg p-3 
                   hover:border-stone-300 hover:shadow-sm transition-all duration-200
                   active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-stone-600" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-stone-900 text-sm truncate">
              {certificate.type_label}
            </p>
            {certificate.product && (
              <p className="text-stone-500 text-xs truncate">
                {certificate.product.name}
              </p>
            )}
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 
                 hover:border-stone-300 hover:shadow-sm transition-all duration-200
                 active:scale-[0.99]"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-stone-600" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-900">
            {certificate.type_label}
          </p>
          {certificate.product && (
            <p className="text-stone-500 text-sm mt-0.5 truncate">
              {certificate.product.name}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-stone-400">
            <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="text-xs">{issuedDate}</span>
          </div>
        </div>
        {certificate.qr_code_url && (
          <div className="w-16 h-16 bg-stone-50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img 
              src={certificate.qr_code_url} 
              alt="QR"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </button>
  );
}
