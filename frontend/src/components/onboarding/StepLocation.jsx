/**
 * Paso 2: Ubicación
 * Código postal para mostrar productores cercanos
 */

import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

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
    if (!navigator.geolocation) {
      setZipCode('28001');
      setCity('Madrid');
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocode via free Nominatim API
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`, {
            headers: { 'User-Agent': 'HispaloShop/1.0 (https://hispaloshop.com)' },
          });
          const geo = await res.json();
          if (geo.error) throw new Error(geo.error);
          const addr = geo.address || {};
          const detectedCity = addr.city || addr.town || addr.village || addr.municipality || '';
          const detectedZip = addr.postcode || '';
          if (detectedZip) setZipCode(detectedZip);
          if (detectedCity) setCity(detectedCity);
          try { localStorage.setItem('hsp_user_coords', JSON.stringify({ lat: latitude, lng: longitude })); } catch { /* ignore */ }
          onUpdate({ zipCode: detectedZip, city: detectedCity, coordinates: { lat: latitude, lng: longitude } });
        } catch {
          setZipCode('28001');
          setCity('Madrid');
          toast('No pudimos detectar tu ubicación. Puedes introducirla manualmente.', { icon: '📍' });
        } finally {
          setLoadingLocation(false);
        }
      },
      (err) => {
        setLoadingLocation(false);
        if (err.code === 1) {
          // PERMISSION_DENIED — user said no
          // Don't fallback to Madrid, let them type manually
        } else {
          // POSITION_UNAVAILABLE or TIMEOUT — fallback
          setZipCode('28001');
          setCity('Madrid');
          toast('No pudimos obtener tu ubicación. Hemos puesto Madrid por defecto.', { icon: '📍' });
        }
      },
      { timeout: 15000, enableHighAccuracy: false }
    );
  };

  const handleNext = () => {
    onUpdate({ zipCode, city });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-stone-950">¿Dónde estás?</h2>
        <p className="text-stone-500 mt-2">
          Esto te mostrará productores cerca de ti
        </p>
      </div>

      <button
        onClick={useCurrentLocation}
        disabled={loadingLocation}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-100 text-stone-950 rounded-2xl font-medium hover:bg-stone-200 transition-colors"
      >
        <Navigation className="w-5 h-5" />
        {loadingLocation ? 'Detectando...' : 'Usar mi ubicación actual'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-stone-500">O introduce código postal</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-950 mb-2">
            Código postal
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
            <input
              type="text"
              value={zipCode}
              onChange={handleZipChange}
              placeholder="41001"
              maxLength={5}
              className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-950"
            />
          </div>
        </div>

        {city && (
          <div className="p-3 bg-stone-100 rounded-2xl">
            <p className="text-sm text-stone-950">
              <strong>Ciudad detectada:</strong> {city}, España
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 text-stone-500 hover:text-stone-950 font-medium"
        >
          ← Anterior
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => onNext()}
            className="px-6 py-3 text-stone-500 hover:text-stone-950 font-medium"
          >
            Omitir
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-3 bg-stone-950 text-white rounded-2xl font-medium hover:bg-stone-800 transition-colors"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
