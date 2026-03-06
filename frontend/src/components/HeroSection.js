import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  LocateFixed,
  MapPin,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { demoProducts, demoStores } from '../data/demoData';

const heroStats = [
  {
    value: 200,
    suffix: '+',
    label: 'Productores locales verificados',
    accent: 'from-emerald-100 via-emerald-50 to-white',
  },
  {
    value: 1,
    suffix: '',
    label: 'De tu pueblo a tu mesa',
    accent: 'from-stone-100 via-stone-50 to-white',
  },
  {
    value: 100,
    suffix: '%',
    label: 'Pago seguro: el productor cobra cuando tu recibes',
    accent: 'from-sky-100 via-sky-50 to-white',
  },
  {
    value: 50,
    suffix: '%',
    label: 'Precio justo: sin intermediarios que se lleven el 50%',
    accent: 'from-orange-100 via-orange-50 to-white',
  },
];

const storeMeta = new Map(demoStores.map((store) => [store.slug, store]));

function AnimatedStat({ stat, delay }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frameId;
    let timeoutId;
    const duration = 1200;

    timeoutId = window.setTimeout(() => {
      const startedAt = performance.now();

      const step = (now) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = 1 - ((1 - progress) ** 3);
        setCount(Math.round(stat.value * eased));
        if (progress < 1) {
          frameId = window.requestAnimationFrame(step);
        }
      };

      frameId = window.requestAnimationFrame(step);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(frameId);
    };
  }, [delay, stat.value]);

  return (
    <div className={`rounded-[1.5rem] border border-white/70 bg-gradient-to-br ${stat.accent} p-4 shadow-[0_16px_45px_rgba(28,28,28,0.07)]`}>
      <p className="text-3xl font-semibold tracking-tight text-[#1C1C1C] md:text-4xl">
        {count}
        {stat.suffix}
      </p>
      <p className="mt-2 text-sm leading-5 text-[#4F4943]">{stat.label}</p>
    </div>
  );
}

export default function HeroSection({
  featuredProducts = [],
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

  const collageProducts = useMemo(() => {
    const source = featuredProducts.length >= 3 ? featuredProducts : demoProducts;
    return source.slice(0, 4).map((product, index) => {
      const store = storeMeta.get(product.store_slug);
      return {
        id: product.product_id || `hero-product-${index}`,
        name: product.name,
        image: product.images?.[0],
        location: store?.location || 'Producto real',
        badge: index === 0 ? 'Directo del productor' : index === 1 ? 'Importado ya en tu pais' : 'Trazabilidad activa',
      };
    });
  }, [featuredProducts]);

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
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(140deg,_rgba(255,255,255,0.94),_rgba(249,243,235,0.96)_48%,_rgba(240,247,241,0.94)_100%)] px-5 py-6 shadow-[0_28px_80px_rgba(28,28,28,0.10)] md:px-8 md:py-8">
          <div className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-emerald-100/45 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-amber-100/45 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#2D5A27] shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Producto real, trazabilidad y pago protegido
              </div>

              <h1 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-[1.02] tracking-tight text-[#1C1C1C] md:text-6xl">
                Lo Bueno Esta Mas Cerca de Lo Que Crees
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-[#4F4943] md:text-lg">
                Productos artesanales de tu zona y delicatessen importadas, sin intermediarios, directo del que lo hace al que lo disfruta.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-[#5E5851]">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-1.5">
                  <MapPin className="h-4 w-4 text-[#2D5A27]" />
                  {locationLabel}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#2D5A27]" />
                  Pago seguro y trazabilidad activa
                </span>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handlePrimaryClick}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#232323]"
                >
                  <LocateFixed className="h-4 w-4" />
                  Descubrir Productos Cerca de Mi
                </button>
                <Link
                  to="/info/productor"
                  onClick={onSecondaryCtaClick}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#111111] bg-transparent px-6 py-3 text-sm font-semibold text-[#111111] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/60"
                >
                  <Store className="h-4 w-4" />
                  Quiero Vender Mis Productos
                </Link>
              </div>

              <AnimatePresence>
                {isLocationPanelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="mt-4 max-w-xl rounded-[1.5rem] border border-stone-200 bg-white/90 p-4 shadow-[0_16px_45px_rgba(28,28,28,0.08)]"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#1C1C1C]">Primero, dinos tu zona</p>
                        <p className="mt-1 text-sm leading-6 text-[#5E5851]">
                          Usa tu ubicacion actual o escribe tu codigo postal. No pedimos permiso hasta que tu lo eliges.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLocationPanelOpen(false)}
                        className="text-sm font-medium text-stone-500 hover:text-stone-700"
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 md:flex-row">
                      <button
                        type="button"
                        onClick={handleUseLocation}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-stone-100 px-4 py-3 text-sm font-medium text-[#1C1C1C] transition-colors hover:bg-stone-200"
                      >
                        <LocateFixed className="h-4 w-4" />
                        {geolocationStatus === 'requesting' ? 'Buscando tu ubicacion...' : 'Usar mi ubicacion'}
                      </button>

                      <form onSubmit={handlePostalSubmit} className="flex flex-1 gap-2">
                        <input
                          value={postalCode}
                          onChange={(event) => setPostalCode(event.target.value)}
                          placeholder="Codigo postal"
                          className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-[#1C1C1C]"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-[#1C1C1C] transition-colors hover:border-stone-300 hover:bg-stone-50"
                        >
                          Guardar
                        </button>
                      </form>
                    </div>

                    {geolocationError && (
                      <p className="mt-3 text-sm text-[#8B5E34]">{geolocationError}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <div className="grid gap-3 sm:grid-cols-[1.05fr_0.95fr]">
                <div className="grid gap-3">
                  {collageProducts.slice(0, 2).map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.32, delay: index * 0.08, ease: 'easeOut' }}
                      className="relative overflow-hidden rounded-[1.6rem] border border-white/70 bg-stone-100 shadow-[0_16px_45px_rgba(28,28,28,0.10)]"
                    >
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-44 w-full object-cover md:h-52" />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center bg-stone-200 text-sm text-stone-500 md:h-52">
                          Producto real
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-4 text-white">
                        <p className="inline-flex rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
                          {product.badge}
                        </p>
                        <p className="mt-2 text-base font-semibold">{product.name}</p>
                        <p className="mt-1 text-sm text-white/85">{product.location}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid gap-3">
                  <div className="grid gap-3">
                    {heroStats.slice(0, 2).map((stat, index) => (
                      <AnimatedStat key={stat.label} stat={stat} delay={index * 110} />
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: 0.16, ease: 'easeOut' }}
                    className="rounded-[1.6rem] border border-white/70 bg-[#1C1C1C] p-5 text-white shadow-[0_18px_45px_rgba(28,28,28,0.16)]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Sin letra pequena</p>
                    <p className="mt-3 text-xl font-semibold leading-8">
                      Tu pagas seguro. El productor mantiene el control de su precio y su envio.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/90">
                      Ver como funciona <ArrowRight className="h-4 w-4" />
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {heroStats.slice(2).map((stat, index) => (
                  <AnimatedStat key={stat.label} stat={stat} delay={(index + 2) * 110} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
