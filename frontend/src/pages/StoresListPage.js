import BackButton from '../components/BackButton';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PremiumSelect from '../components/ui/PremiumSelect';
import { ArrowUpRight, Grid3X3, Map, MapPin, Search, Sparkles, Store, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api/client';
import { asLowerText } from '../utils/safe';

const FALLBACK_REGIONS = {
  ES: {
    name: 'España',
    regions: [
      { code: 'CT', name: 'Cataluña' },
      { code: 'MD', name: 'Madrid' },
      { code: 'AN', name: 'Andalucía' },
      { code: 'VC', name: 'Comunidad Valenciana' },
      { code: 'GA', name: 'Galicia' },
    ],
  },
  US: {
    name: 'Estados Unidos',
    regions: [
      { code: 'CA', name: 'California' },
      { code: 'NY', name: 'Nueva York' },
      { code: 'TX', name: 'Texas' },
    ],
  },
  KR: {
    name: 'Corea del Sur',
    regions: [
      { code: 'SEOUL', name: 'Seúl' },
      { code: 'BUSAN', name: 'Busan' },
    ],
  },
};

function GoogleMapEmbed({ stores, selectedStore, countryName, regionName }) {
  let query = 'España';
  let zoom = 5;

  if (selectedStore?.full_address) {
    query = selectedStore.full_address;
    zoom = 15;
  } else if (selectedStore?.coordinates) {
    query = `${selectedStore.coordinates.lat},${selectedStore.coordinates.lng}`;
    zoom = 15;
  } else if (regionName && countryName) {
    query = `${regionName}, ${countryName}`;
    zoom = 8;
  } else if (countryName) {
    query = countryName;
    zoom = 6;
  } else if (stores.length > 0 && stores[0]?.full_address) {
    query = stores[0].full_address;
    zoom = 6;
  }

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-black/15 to-transparent" />
      <div className="absolute left-4 top-4 z-10 rounded-full bg-white/92 px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm backdrop-blur">
        Mapa de tiendas
      </div>
      <iframe
        title="Mapa de tiendas"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`}
        className="h-full w-full"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

function StoreCard({ store, isActive, onHover, onLeave, onFocusMap, t }) {
  const location = store.location || 'España';
  const heroImage = store.hero_image || store.logo || null;
  const storeSlug = store.slug || store.store_slug || null;

  return (
    <Link
      to={storeSlug ? `/store/${storeSlug}` : '/stores'}
      className={`group block overflow-hidden rounded-2xl border bg-white transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-md ${
        isActive ? 'border-stone-950 shadow-sm' : 'border-stone-100 hover:border-stone-400'
      }`}
      onMouseEnter={() => {
        onHover();
        onFocusMap();
      }}
      onMouseLeave={onLeave}
      onFocus={() => {
        onHover();
        onFocusMap();
      }}
      data-testid={`store-card-${storeSlug || store.store_id || 'unknown'}`}
    >
      <div className="relative overflow-hidden">
        <div className="aspect-video bg-stone-100">
          {heroImage ? (
            <img
              src={heroImage}
              alt={`Vista de ${store.name}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400">
              <Store className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white shadow-sm">
          {store.logo ? (
            <img src={store.logo} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <Store className="h-5 w-5 text-stone-500" />
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-stone-950">{store.name}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{location}</span>
            </p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors group-hover:border-stone-400 group-hover:text-stone-950">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>

        {store.tagline ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-stone-600">{store.tagline}</p>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-stone-50 px-3 py-2">
            <p className="text-sm font-semibold text-stone-950">{store.product_count || 0}</p>
            <p className="text-xs text-stone-500">{t('store.products', 'Productos')}</p>
          </div>
          <div className="rounded-2xl bg-stone-50 px-3 py-2">
            <p className="text-sm font-semibold text-stone-950">{store.follower_count || 0}</p>
            <p className="text-xs text-stone-500">{t('store.followers', 'Seguidores')}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function StoresListPage() {
  const { t } = useTranslation();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedStoreForMap, setSelectedStoreForMap] = useState(null);
  const [highlightedStore, setHighlightedStore] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regions, setRegions] = useState({});
  const [availableRegions, setAvailableRegions] = useState([]);

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    if (selectedCountry && regions[selectedCountry]) {
      setAvailableRegions(regions[selectedCountry].regions || []);
    } else {
      setAvailableRegions([]);
    }
    setSelectedRegion('');
    setSelectedStoreForMap(null);
  }, [selectedCountry, regions]);

  useEffect(() => {
    fetchStores();
    setSelectedStoreForMap(null);
  }, [selectedCountry, selectedRegion]);

  const fetchRegions = async () => {
    try {
      const data = await apiClient.get('/config/regions');
      setRegions(Object.keys(data || {}).length ? data : FALLBACK_REGIONS);
    } catch (error) {
      console.error('Error fetching regions:', error);
      setRegions(FALLBACK_REGIONS);
    }
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedRegion) params.append('region', selectedRegion);
      const url = `/stores${params.toString() ? `?${params.toString()}` : ''}`;
      const data = await apiClient.get(url);
      setStores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  };

  const countryNames = {
    ES: t('countries.Spain', 'España'),
    US: t('countries.USA', 'Estados Unidos'),
    KR: t('countries.Korea', 'Corea del Sur'),
    IT: t('countries.Italy', 'Italia'),
    FR: t('countries.France', 'Francia'),
    GR: t('countries.Greece', 'Grecia'),
    PT: t('countries.Portugal', 'Portugal'),
    DE: t('countries.Germany', 'Alemania'),
    NL: t('countries.Netherlands', 'Países Bajos'),
    BE: t('countries.Belgium', 'Bélgica'),
    GB: t('countries.UnitedKingdom', 'Reino Unido'),
    CH: t('countries.Switzerland', 'Suiza'),
    AT: t('countries.Austria', 'Austria'),
    PL: t('countries.Poland', 'Polonia'),
    IE: t('countries.Ireland', 'Irlanda'),
    SE: t('countries.Sweden', 'Suecia'),
    DK: t('countries.Denmark', 'Dinamarca'),
    NO: t('countries.Norway', 'Noruega'),
    CZ: t('countries.CzechRepublic', 'República Checa'),
    HU: t('countries.Hungary', 'Hungría'),
    RO: t('countries.Romania', 'Rumanía'),
    BG: t('countries.Bulgaria', 'Bulgaria'),
    HR: t('countries.Croatia', 'Croacia'),
    TR: t('countries.Turkey', 'Turquía'),
    MX: t('countries.Mexico', 'México'),
    CO: t('countries.Colombia', 'Colombia'),
    AR: t('countries.Argentina', 'Argentina'),
    CL: t('countries.Chile', 'Chile'),
    PE: t('countries.Peru', 'Perú'),
    BR: t('countries.Brazil', 'Brasil'),
    EC: t('countries.Ecuador', 'Ecuador'),
    CA: t('countries.Canada', 'Canadá'),
    CR: t('countries.CostaRica', 'Costa Rica'),
    DO: t('countries.DominicanRepublic', 'República Dominicana'),
    JP: t('countries.Japan', 'Japón'),
    CN: t('countries.China', 'China'),
    IN: t('countries.India', 'India'),
    TH: t('countries.Thailand', 'Tailandia'),
    VN: t('countries.Vietnam', 'Vietnam'),
    ID: t('countries.Indonesia', 'Indonesia'),
    PH: t('countries.Philippines', 'Filipinas'),
    AU: t('countries.Australia', 'Australia'),
    NZ: t('countries.NewZealand', 'Nueva Zelanda'),
    MA: t('countries.Morocco', 'Marruecos'),
    TN: t('countries.Tunisia', 'Túnez'),
    EG: t('countries.Egypt', 'Egipto'),
    ZA: t('countries.SouthAfrica', 'Sudáfrica'),
    IL: t('countries.Israel', 'Israel'),
    LB: t('countries.Lebanon', 'Líbano'),
    IR: t('countries.Iran', 'Irán'),
  };

  const storeCountryGroups = [
    { label: t('regions.europe', 'Europa'), codes: ['ES', 'IT', 'FR', 'GR', 'PT', 'DE', 'NL', 'BE', 'GB', 'CH', 'AT', 'PL', 'IE', 'SE', 'DK', 'NO', 'CZ', 'HU', 'RO', 'BG', 'HR', 'TR'] },
    { label: t('regions.americas', 'Américas'), codes: ['US', 'CA', 'MX', 'CO', 'AR', 'CL', 'PE', 'BR', 'EC', 'CR', 'DO'] },
    { label: t('regions.asiaOceania', 'Asia y Oceanía'), codes: ['KR', 'JP', 'CN', 'IN', 'TH', 'VN', 'ID', 'PH', 'AU', 'NZ'] },
    { label: t('regions.africaMiddleEast', 'África y Oriente Medio'), codes: ['MA', 'TN', 'EG', 'ZA', 'IL', 'LB', 'IR'] },
  ];

  const countryGroups = useMemo(() => {
    const grouped = storeCountryGroups
      .map((group) => ({
        label: group.label,
        options: group.codes
          .filter((code) => regions[code])
          .map((code) => ({ value: code, label: countryNames[code] || code })),
      }))
      .filter((group) => group.options.length > 0);

    const groupedCodes = new Set(storeCountryGroups.flatMap((group) => group.codes));
    const extraCodes = Object.keys(regions)
      .filter((code) => !groupedCodes.has(code))
      .map((code) => ({ value: code, label: countryNames[code] || regions[code]?.name || code }));

    return [
      {
        label: null,
        options: [{ value: '', label: t('stores.allCountries', 'Todos los países') }],
      },
      ...grouped,
      ...(extraCodes.length > 0 ? [{ label: t('stores.otherCountries', 'Otros'), options: extraCodes }] : []),
    ];
  }, [countryNames, regions, storeCountryGroups, t]);

  const regionOptions = useMemo(() => ([
    { value: '', label: t('stores.allRegions', 'Todas las regiones') },
    ...availableRegions.map((region) => ({
      value: region.code,
      label: region.name,
    })),
  ]), [availableRegions, t]);

  const selectedCountryName = selectedCountry ? (regions[selectedCountry]?.name || countryNames[selectedCountry] || '') : '';
  const selectedRegionName = selectedRegion ? (availableRegions.find((region) => region.code === selectedRegion)?.name || '') : '';

  const filteredStores = stores.filter((store) => {
    if (!searchQuery) return true;
    const needle = asLowerText(searchQuery);
    return (
      asLowerText(store.name).includes(needle) ||
      asLowerText(store.location).includes(needle) ||
      asLowerText(store.tagline).includes(needle)
    );
  });

  const hasActiveFilters = Boolean(selectedCountry || selectedRegion || searchQuery);
  const activeFilterCount = [selectedCountry, selectedRegion, searchQuery].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCountry('');
    setSelectedRegion('');
    setSearchQuery('');
    setSelectedStoreForMap(null);
  };

  const emptyState = (
    <div className="rounded-3xl border border-stone-100 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500">
        <Store className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-stone-950">{t('stores.noStores', 'No se encontraron tiendas')}</h3>
      <p className="mt-2 text-sm text-stone-500">
        Ajusta los filtros o explora otra región para descubrir productores cercanos.
      </p>
      {hasActiveFilters ? (
        <button
          type="button"
          className="mt-5 rounded-full border border-stone-200 bg-white px-5 py-2 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
          onClick={clearFilters}
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
          <BackButton />
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-400">
                Descubrimiento local
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
                {t('stores.title', 'Tiendas cerca de ti')}
              </h1>
              <p className="mt-3 text-sm text-stone-500">
                Recorre perfiles de tienda con una lectura más limpia: mapa, contexto local y acceso directo a sus productos.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-full border border-stone-200 bg-stone-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-150 ease-out ${
                  viewMode === 'grid' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:bg-white'
                }`}
                aria-label="Ver tiendas en tarjetas"
              >
                <Grid3X3 className="h-4 w-4" />
                Tarjetas
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all duration-150 ease-out ${
                  viewMode === 'map' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:bg-white'
                }`}
                aria-label="Ver tiendas en mapa"
              >
                <Map className="h-4 w-4" />
                Mapa
              </button>
            </div>
          </div>

          <div className="mt-8 hidden gap-3 lg:grid lg:grid-cols-[minmax(0,1.4fr)_220px_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('stores.searchPlaceholder', 'Buscar tienda o ubicación')}
                className="h-11 w-full rounded-full border border-stone-200 bg-stone-50 pl-11 text-sm placeholder:text-stone-400 outline-none focus:border-stone-950"
                aria-label="Buscar tiendas"
                data-testid="stores-search-input"
              />
            </div>
            <PremiumSelect
              value={selectedCountry}
              onChange={setSelectedCountry}
              groups={countryGroups}
              placeholder={t('stores.filterCountry', 'País')}
              ariaLabel="Filtrar por país"
            />
            <PremiumSelect
              value={selectedRegion}
              onChange={setSelectedRegion}
              options={regionOptions}
              placeholder={t('stores.filterRegion', 'Región')}
              disabled={!selectedCountry}
              ariaLabel="Filtrar por región"
            />
            <div className="flex items-center justify-end gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 py-3 backdrop-blur lg:hidden">
        <div className="px-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('stores.searchPlaceholder', 'Buscar tienda o ubicación')}
                className="h-11 w-full rounded-full border border-stone-200 bg-stone-50 pl-11 text-sm placeholder:text-stone-400 outline-none focus:border-stone-950"
                aria-label="Buscar tiendas"
                data-testid="stores-search-input-mobile"
              />
            </div>
            <button
              type="button"
              className={`relative inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${showFilters ? 'border-stone-950 bg-stone-100 text-stone-950' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}
              onClick={() => setShowFilters((current) => !current)}
              aria-label="Abrir filtros de tiendas"
            >
              Filtros
              {activeFilterCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-950 text-[10px] text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          {showFilters ? (
            <div className="mt-3 space-y-3 rounded-3xl border border-stone-100 bg-white p-3 shadow-sm">
              <PremiumSelect
                value={selectedCountry}
                onChange={setSelectedCountry}
                groups={countryGroups}
                placeholder={t('stores.filterCountry', 'País')}
                ariaLabel="Filtrar por país"
              />
              <PremiumSelect
                value={selectedRegion}
                onChange={setSelectedRegion}
                options={regionOptions}
                placeholder={t('stores.filterRegion', 'Región')}
                disabled={!selectedCountry}
                ariaLabel="Filtrar por región"
              />
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="w-full rounded-full border border-stone-200 bg-white py-2.5 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
                  onClick={clearFilters}
                >
                  Limpiar filtros
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="py-6 md:py-8">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-stone-600 shadow-sm">
              <Sparkles className="h-4 w-4 text-stone-700" />
              <span>{filteredStores.length} tiendas visibles</span>
            </div>
            {(selectedCountryName || selectedRegionName) ? (
              <p className="text-sm text-stone-500">
                {selectedRegionName ? `${selectedRegionName}, ` : ''}
                {selectedCountryName}
              </p>
            ) : null}
          </div>

          {viewMode === 'map' ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_380px]">
              <div className="h-[320px] md:h-[400px] lg:h-[500px]">
                <GoogleMapEmbed
                  stores={filteredStores}
                  selectedStore={selectedStoreForMap}
                  countryName={selectedCountryName}
                  regionName={selectedRegionName}
                />
              </div>

              <div className="rounded-3xl border border-stone-100 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-950">Tiendas destacadas</h2>
                    <p className="mt-1 text-sm text-stone-500">Selecciona una tarjeta para enfocar el mapa.</p>
                  </div>
                </div>

                {loading ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-stone-950" />
                    <p className="text-sm text-stone-500">{t('common.loading', 'Cargando...')}</p>
                  </div>
                ) : filteredStores.length === 0 ? (
                  emptyState
                ) : (
                  <div className="max-h-[540px] space-y-4 overflow-y-auto pr-1">
                    {filteredStores.map((store) => (
                      <StoreCard
                        key={store.store_id || store.slug}
                        store={store}
                        isActive={highlightedStore === store.store_id || selectedStoreForMap?.store_id === store.store_id}
                        onHover={() => setHighlightedStore(store.store_id)}
                        onLeave={() => setHighlightedStore(null)}
                        onFocusMap={() => setSelectedStoreForMap(store)}
                        t={t}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-stone-950" />
              <p className="text-sm text-stone-500">{t('common.loading', 'Cargando...')}</p>
            </div>
          ) : filteredStores.length === 0 ? (
            emptyState
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredStores.map((store) => (
                <StoreCard
                  key={store.store_id || store.slug}
                  store={store}
                  isActive={false}
                  onHover={() => undefined}
                  onLeave={() => undefined}
                  onFocusMap={() => setSelectedStoreForMap(store)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-10 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
            ¿Eres productor local?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
            Crea un perfil de tienda con una presencia más editorial: catálogo, certificaciones y narrativa propia.
          </p>
          <Link
            to="/productor/registro"
            className="mt-5 inline-flex items-center rounded-full bg-stone-950 px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-stone-800"
          >
            Crear mi tienda
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
