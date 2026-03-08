import React, { useState, useEffect } from 'react';
import { onboardingApi } from '../../lib/onboardingApi';

const COUNTRIES = [
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'UK', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'KR', name: 'Corea del Sur', flag: '🇰🇷' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'OTHER', name: 'Otro', flag: '🌍' },
];

const CITIES_BY_COUNTRY = {
  ES: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Bilbao', 'Zaragoza', 'Otra'],
  PT: ['Lisboa', 'Oporto', 'Faro', 'Coimbra', 'Otra'],
  FR: ['París', 'Lyon', 'Marsella', 'Burdeos', 'Otra'],
  IT: ['Roma', 'Milán', 'Florencia', 'Nápoles', 'Otra'],
  DE: ['Berlín', 'Múnich', 'Hamburgo', 'Frankfurt', 'Otra'],
  UK: ['Londres', 'Manchester', 'Birmingham', 'Edimburgo', 'Otra'],
  US: ['Nueva York', 'Los Ángeles', 'Miami', 'Chicago', 'Otra'],
  MX: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Otra'],
  AR: ['Buenos Aires', 'Córdoba', 'Rosario', 'Otra'],
  CO: ['Bogotá', 'Medellín', 'Cali', 'Otra'],
  CL: ['Santiago', 'Valparaíso', 'Concepción', 'Otra'],
  PE: ['Lima', 'Arequipa', 'Cusco', 'Otra'],
  KR: ['Seúl', 'Busan', 'Incheon', 'Otra'],
  JP: ['Tokio', 'Osaka', 'Kioto', 'Otra'],
  CN: ['Pekín', 'Shanghái', 'Shenzhen', 'Otra'],
  OTHER: ['Otra'],
};

export default function LocationStep({ onNext, onBack, onError }) {
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  const cities = country ? (CITIES_BY_COUNTRY[country] || ['Otra']) : [];

  const handleContinue = async () => {
    if (!country) {
      onError?.('Selecciona un país');
      return;
    }

    setLoading(true);
    try {
      await onboardingApi.saveLocation({ country, city });
      onNext();
    } catch (err) {
      onError?.(err.response?.data?.detail || 'Error al guardar ubicación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-stone-900 mb-2">
          ¿Dónde estás?
        </h1>
        <p className="text-stone-600">
          Selecciona tu ubicación para mostrarte productos locales y envíos disponibles
        </p>
      </div>

      <div className="space-y-4">
        {/* Country selection */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            País *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COUNTRIES.map(c => (
              <button
                key={c.code}
                onClick={() => {
                  setCountry(c.code);
                  setCity('');
                }}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  country === c.code
                    ? 'border-stone-900 bg-stone-50'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <span className="text-xl block mb-1">{c.flag}</span>
                <span className={`text-xs ${
                  country === c.code ? 'text-stone-900 font-medium' : 'text-stone-600'
                }`}>
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* City selection */}
        {country && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              Ciudad (opcional)
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            >
              <option value="">Selecciona una ciudad</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 text-stone-600 hover:text-stone-900 transition-colors"
        >
          Atrás
        </button>
        <button
          onClick={handleContinue}
          disabled={!country || loading}
          className="px-6 py-2 bg-stone-900 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors"
        >
          {loading ? 'Guardando...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
