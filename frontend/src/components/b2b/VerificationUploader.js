import React from 'react';

export default function VerificationUploader({ onUpload }) {
  return (
    <div className="border-2 border-dashed rounded p-4 text-center">
      <p className="text-sm mb-2">Sube licencia de importación, registro fiscal y seguro RC</p>
      <input type="file" multiple onChange={(e) => onUpload?.(Array.from(e.target.files || []))} />
    </div>
  );
}
