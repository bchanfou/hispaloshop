import React from 'react';
import ImporterProfileForm from '../../components/b2b/ImporterProfileForm';
import VerificationUploader from '../../components/b2b/VerificationUploader';

export default function ImporterRegisterPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Registro Importador</h1>
      <ImporterProfileForm />
      <VerificationUploader />
    </div>
  );
}
