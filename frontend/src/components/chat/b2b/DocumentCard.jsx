import React from 'react';
import { FileText } from 'lucide-react';

const V2 = {
  black: '#0A0A0A',
  green: '#2E7D52',
  greenLight: '#E8F5EE',
  stone: '#8A8881',
  border: '#E5E2DA',
  surface: '#F0EDE8',
  fontSans: 'Inter, sans-serif',
  radiusMd: 12,
};

function formatSize(sizeInBytes) {
  if (!sizeInBytes) return '';
  if (sizeInBytes >= 1048576) {
    return `${(sizeInBytes / 1048576).toFixed(1)} MB`;
  }
  return `${Math.round(sizeInBytes / 1024)} KB`;
}

export default function DocumentCard({ document, isSigned }) {
  if (!document) return null;

  const signed = isSigned || document.signed;

  return (
    <div
      className="flex flex-col"
      style={{
        maxWidth: 260,
        backgroundColor: V2.surface,
        border: `1px solid ${V2.border}`,
        borderRadius: V2.radiusMd,
        padding: 12,
        fontFamily: V2.fontSans,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0" style={{ paddingTop: 2 }}>
          <FileText
            size={16}
            style={{ color: signed ? V2.green : V2.stone }}
          />
        </div>

        {/* Info */}
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: V2.black,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {document.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: V2.stone,
              marginTop: 2,
            }}
          >
            {formatSize(document.size)}
          </div>
          {signed && (
            <span
              style={{
                display: 'inline-block',
                marginTop: 4,
                fontSize: 10,
                fontWeight: 500,
                color: V2.green,
                backgroundColor: V2.greenLight,
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              Firmado
            </span>
          )}
        </div>
      </div>

      {/* Download link */}
      <button
        onClick={() => window.open(document.url, '_blank')}
        style={{
          marginTop: 10,
          fontSize: 12,
          fontWeight: 500,
          color: V2.black,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          fontFamily: V2.fontSans,
        }}
      >
        Descargar
      </button>
    </div>
  );
}
