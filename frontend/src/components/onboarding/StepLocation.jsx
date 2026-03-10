/**
 * Paso 2: Ubicación
 * Código postal para mostrar productores cercanos
 */

import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

const SPAIN_ZIP_CODES = {
  '28001': 'Madrid',
  '41001': 'Sevilla',
  '08001': 'Barcelona',
  '18001': 'Granada',
  '23001': 'Jaén',
  '14001': 'Córdoba',
  '29001': 'Málaga',
  '46001': 'Valencia',
};

export default function StepLocation({ data, onUpdate, onNext, onBack }) {
  const [zipCode, setZipCode] = useState(data.zipCode || '');
  const [city, setCity] = useState(data.city || '');
  const [loadingLocation, setLoadingLocation] = useState(false);

  const detectCity = (zip) => {
    const cleanZip = zip.replace(/\s/g, '').substring(0, 5);
    if (SPAIN_ZIP_CODES[cleanZip]) {
      setCity(SPAIN_ZIP_CODES[cleanZip]);
    }
  };

  const handleZipChange = (e) => {
    const value = e.target.value;
    setZipCode(value);
    if (value.length >= 4) {
      detectCity(value);
    }
  };

  const useCurrentLocation = () => {
    setLoadingLocation(true);
    setZipCode('28001');
    setCity('Madrid');
    setLoadingLocation(false);
  };

  const handleNext = () => {
    onUpdate({ zipCode, city });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">¿Dónde estás?</h2>
        <p className="text-text-muted mt-2">
          Esto te mostrará productores cerca de ti
        </p>
      </div>

      <button
        onClick={useCurrentLocation}
        disabled={loadingLocation}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-background-subtle text-accent rounded-xl font-medium hover:bg-state-amber/20 transition-colors"
      >
        <Navigation className="w-5 h-5" />
        {loadingLocation ? 'Detectando...' : 'Usar mi ubicación actual'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-text-muted">O introduce código postal</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Código postal
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={zipCode}
              onChange={handleZipChange}
              placeholder="41001"
              maxLength={5}
              className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {city && (
          <div className="p-3 bg-accent/10 rounded-lg">
            <p className="text-sm text-accent">
              <strong>Ciudad detectada:</strong> {city}, España
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-text-muted hover:text-gray-900 font-medium"
        >
          ← Anterior
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => onNext()}
            className="px-6 py-3 text-text-muted hover:text-gray-900 font-medium"
          >
            Omitir
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
