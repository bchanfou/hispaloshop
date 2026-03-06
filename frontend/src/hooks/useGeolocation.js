import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hispaloshop_home_location';

const readStoredLocation = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function useGeolocation() {
  const [locationPreference, setLocationPreference] = useState(() => readStoredLocation());
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const sync = () => setLocationPreference(readStoredLocation());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const persistPreference = useCallback((nextValue) => {
    setLocationPreference(nextValue);

    if (typeof window === 'undefined') return;

    if (!nextValue) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextValue));
  }, []);

  const requestGeolocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      setError('Tu navegador no permite compartir ubicacion. Usa tu codigo postal.');
      return Promise.resolve(null);
    }

    setStatus('requesting');
    setError('');

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextValue = {
            type: 'coordinates',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: Date.now(),
          };
          persistPreference(nextValue);
          setStatus('granted');
          resolve(nextValue);
        },
        () => {
          setStatus('denied');
          setError('Prefieres no compartir tu ubicacion. Puedes escribir tu codigo postal.');
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 600000,
        }
      );
    });
  }, [persistPreference]);

  const savePostalCode = useCallback((postalCode) => {
    const normalized = String(postalCode || '').trim().toUpperCase();
    const isValid = /^[A-Z0-9 -]{3,10}$/.test(normalized);

    if (!isValid) {
      setStatus('invalid');
      setError('Introduce un codigo postal valido.');
      return false;
    }

    persistPreference({
      type: 'postal_code',
      postalCode: normalized,
      timestamp: Date.now(),
    });
    setStatus('granted');
    setError('');
    return true;
  }, [persistPreference]);

  const clearLocationPreference = useCallback(() => {
    persistPreference(null);
    setStatus('idle');
    setError('');
  }, [persistPreference]);

  const locationLabel = useMemo(() => {
    if (!locationPreference) return 'Sin zona guardada';
    if (locationPreference.type === 'postal_code') return `CP ${locationPreference.postalCode}`;
    if (locationPreference.type === 'coordinates') return 'Ubicacion activada';
    return 'Zona guardada';
  }, [locationPreference]);

  return {
    error,
    hasLocationPreference: Boolean(locationPreference),
    locationLabel,
    locationPreference,
    requestGeolocation,
    savePostalCode,
    clearLocationPreference,
    status,
  };
}
