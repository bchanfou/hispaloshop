// @ts-nocheck
import React from 'react';
import { Globe } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import LocaleSelector from '../components/LocaleSelector';

export default function LocaleSettingsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <div className="mx-auto max-w-md px-4 py-6">
        <BackButton />
        <div className="flex items-center gap-2 mb-6 mt-4">
          <Globe className="h-5 w-5 text-stone-500" />
          <h1 className="text-xl font-semibold text-stone-950">Idioma y región</h1>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <LocaleSelector />
        </div>
      </div>
      <Footer />
    </div>
  );
}
