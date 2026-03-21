import React from 'react';
import { FileText } from 'lucide-react';

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
    <div className="flex flex-col max-w-[260px] bg-stone-100 border border-stone-200 rounded-2xl p-3">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 pt-0.5">
          <FileText
            size={16}
            className={signed ? 'text-stone-950' : 'text-stone-500'}
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-stone-950 overflow-hidden text-ellipsis whitespace-nowrap">
            {document.name}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {formatSize(document.size)}
          </div>
          {signed && (
            <span className="inline-block mt-1 text-[10px] font-medium text-stone-950 bg-stone-200 rounded-full px-2 py-0.5">
              Firmado
            </span>
          )}
        </div>
      </div>

      {/* Download link */}
      <button
        onClick={() => window.open(document.url, '_blank')}
        className="mt-2.5 text-xs font-medium text-stone-950 bg-transparent border-none cursor-pointer p-0 text-left"
      >
        Descargar
      </button>
    </div>
  );
}
