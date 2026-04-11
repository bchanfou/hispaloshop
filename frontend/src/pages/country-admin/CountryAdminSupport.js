import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeadphonesIcon } from 'lucide-react';

export default function CountryAdminSupport() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-950 tracking-tight">
          {t('countryAdmin.support.title', 'Soporte')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('countryAdmin.support.subtitle', 'Tickets de soporte de tu país.')}
        </p>
      </header>

      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
          <HeadphonesIcon className="w-6 h-6 text-stone-400" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-stone-500">
          {t('countryAdmin.support.placeholder', 'Conectado en sección 3.4. La estructura está lista; los tickets se enlazarán cuando el sistema de tickets country-scoped esté en producción.')}
        </p>
      </div>
    </div>
  );
}
