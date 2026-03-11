import React, { useState } from 'react';
import { onboardingApi } from '../../lib/onboardingApi';

const COUNTRIES = [
  'España',
  'Portugal',
  'Francia',
  'Italia',
  'Alemania',
  'Reino Unido',
  'Estados Unidos',
  'México',
  'Argentina',
  'Colombia',
  'Chile',
  'Perú',
  'Corea del Sur',
  'Japón',
  'China',
  'Otro',
];

export default function LocationStep({ onNext, onBack, onError }) {
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!country) {
      onError?.('Selecciona un país.');
      return;
    }
    if (!postalCode.trim()) {
      onError?.('Introduce tu código postal.');
      return;
    }

    setLoading(true);
    try {
      await onboardingApi.saveLocation({
        country,
        postal_code: postalCode.trim(),
        city: city.trim(),
      });
      onNext();
    } catch (error) {
      onError?.(error?.response?.data?.detail || 'No hemos podido guardar tu ubicación todavía.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'mt-2 h-12 w-full rounded-2xl border border-stone-200 bg-white px-3 text-base md:h-11 md:text-sm';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-stone-950">¿Dónde estás?</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Usamos tu zona para mostrar catálogo disponible, sugerencias más cercanas y mejores opciones de envío.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="location-country" className="text-sm font-medium text-stone-800">País *</label>
          <select id="location-country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass}>
            <option value="">Selecciona tu país</option>
            {COUNTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="location-postal" className="text-sm font-medium text-stone-800">Código postal *</label>
          <input id="location-postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputClass} placeholder="28001" />
        </div>

        <div>
          <label htmlFor="location-city" className="text-sm font-medium text-stone-800">Ciudad</label>
          <input id="location-city" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="Madrid" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack} className="px-2 py-2 text-sm font-medium text-stone-600 transition-colors hover:text-stone-950">
          Atrás
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!country || !postalCode.trim() || loading}
          className="rounded-full bg-stone-950 px-6 py-3 font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
