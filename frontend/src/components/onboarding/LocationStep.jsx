import React, { useState } from 'react';
import { onboardingApi } from '../../lib/onboardingApi';

const COUNTRIES = [
  { code: 'ES', name: 'España' },
  { code: 'PT', name: 'Portugal' },
  { code: 'FR', name: 'Francia' },
  { code: 'IT', name: 'Italia' },
  { code: 'DE', name: 'Alemania' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'JP', name: 'Japón' },
  { code: 'CN', name: 'China' },
  { code: 'OTHER', name: 'Otro' },
];

export default function LocationStep({ onNext, onBack, onError }) {
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!country) {
      onError?.('Selecciona un pais');
      return;
    }

    if (!postalCode.trim()) {
      onError?.('Introduce tu código postal');
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
    } catch (err) {
      onError?.(err.response?.data?.detail || 'Error al guardar la ubicacion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-900 mb-2">
          Donde estas
        </h1>
        <p className="text-stone-600">
          Necesitamos tu pais y código postal para mostrar catalogo y envios disponibles.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Pais *
          </label>
          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
          >
            <option value="">Selecciona un pais</option>
            {COUNTRIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Código postal *
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            placeholder="28001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Ciudad
          </label>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            placeholder="Madrid"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 text-stone-600 hover:text-stone-900 transition-colors"
        >
          Atras
        </button>
        <button
          onClick={handleContinue}
          disabled={!country || !postalCode.trim() || loading}
          className="px-6 py-2 bg-stone-900 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors"
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
