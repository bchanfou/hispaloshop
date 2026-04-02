import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LocateFixed, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const HERO_STATS = [
  '200+ productores locales',
  'Pago seguro',
  'Sin intermediarios',
];

export default function HeroSection({
  locationLabel,
  hasLocationPreference,
  geolocationError,
  geolocationStatus,
  onDiscover,
  onRequestLocation,
  onSavePostalCode,
  onSecondaryCtaClick,
}) {
  const [isLocationPanelOpen, setIsLocationPanelOpen] = useState(false);
  const [postalCode, setPostalCode] = useState('');

  const handlePrimaryClick = async () => {
    if (hasLocationPreference) {
      onDiscover();
      return;
    }
    setIsLocationPanelOpen(true);
  };

  const handleUseLocation = async () => {
    const result = await onRequestLocation();
    if (result) {
      setIsLocationPanelOpen(false);
      onDiscover();
    }
  };

  const handlePostalSubmit = (event) => {
    event.preventDefault();
    if (onSavePostalCode(postalCode)) {
      setIsLocationPanelOpen(false);
      setPostalCode('');
      onDiscover();
    }
  };

  return (
    <section className="pb-6 pt-4 md:pb-8 md:pt-6" data-testid="hero-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="rounded-[2rem] border border-stone-200/70 bg-white/88 px-5 py-7 md:px-8 md:py-9">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-500">
              <MapPin className="h-3.5 w-3.5 text-stone-500" />
              {locationLabel}
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-stone-950 md:text-6xl">
            Lo Bueno Está Más Cerca
            </h1>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium tracking-[0.08em] text-stone-500 uppercase md:text-[11px]">
              {HERO_STATS.map((stat) => (
                <span key={stat}>{stat}</span>
              ))}
            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handlePrimaryClick}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-stone-800"
              >
                <LocateFixed className="h-4 w-4" />
              Descubrir Cerca de Mí
              </button>
              <Link
                to="/info/productor"
                onClick={onSecondaryCtaClick}
                className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-stone-200 bg-transparent px-6 py-3 text-sm font-medium text-stone-950 transition-colors duration-200 hover:border-stone-400 hover:bg-white"
              >
              Quiero vender
              </Link>
            </div>

            <AnimatePresence>
              {isLocationPanelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="mx-auto mt-5 max-w-2xl rounded-[1.5rem] border border-stone-200 bg-stone-50 p-4 text-left"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-stone-950">Primero, tu zona</p>
                      <p className="mt-1 text-sm leading-6 text-stone-500">
            Usa tu ubicación actual o escribe tu código postal para priorizar lo que tengas más cerca.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLocationPanelOpen(false)}
                      className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-700"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <button
                      type="button"
                      onClick={handleUseLocation}
                      className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-stone-950 transition-colors hover:bg-stone-100"
                    >
                      <LocateFixed className="h-4 w-4" />
                {geolocationStatus === 'requesting' ? t('hero_section.buscandoTuUbicacion', 'Buscando tu ubicación...') : 'Usar mi ubicación'}
                    </button>

                    <form onSubmit={handlePostalSubmit} className="flex flex-1 gap-2">
                      <input
                        value={postalCode}
                        onChange={(event) => setPostalCode(event.target.value)}
                        placeholder={t('checkout.codigoPostal', 'Código postal')}
                        className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-stone-950"
                      />
                      <button
                        type="submit"
                        className="inline-flex min-h-[46px] items-center justify-center rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-950 transition-colors hover:bg-stone-50"
                      >
                        Guardar
                      </button>
                    </form>
                  </div>

                  {geolocationError && (
                    <p className="mt-3 text-sm text-stone-700">{geolocationError}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
