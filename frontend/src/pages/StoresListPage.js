import BackButton from '../components/BackButton';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Store, Search, MapPin, Star, Map, Grid3X3, ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API } from '../utils/api';

// Google Maps embed component (no API key needed)
function GoogleMapEmbed({ stores, selectedStore, countryName, regionName }) {
  let query;
  let zoom;

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
  } else {
    query = 'Spain';
    zoom = 5;
  }
  
  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-stone-200">
      <iframe
        title="Store locations"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`}
        className="w-full h-full"
        style={{ border: 0, minHeight: '300px' }}
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}


// Store Card Component
function StoreCard({ store, isHighlighted }) {
  const { t } = useTranslation();
  
  const getStoreType = () => {
    if (store.store_type === 'producer') return { label: t('stores.producer', 'Productor') };
    if (store.store_type === 'importer') return { label: t('stores.importer', 'Importador') };
    return { label: t('stores.seller', 'Vendedor') };
  };
  
  const storeType = getStoreType();
  
  return (
    <Link 
      to={`/store/${store.slug}`}
      className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300 group ${
        isHighlighted ? 'ring-2 ring-amber-500 shadow-lg' : 'border-stone-200'
      }`}
      data-testid={`store-card-${store.slug}`}
    >
      {/* Hero Image */}
      <div className="h-24 bg-gradient-to-br from-amber-50 to-stone-100 relative overflow-hidden">
        {store.hero_image ? (
          <img 
            src={store.hero_image} 
            alt={store.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-100 via-stone-100 to-amber-50" />
        )}
        
        {/* Logo */}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-6 w-12 h-12 rounded-full border-2 border-white bg-stone-50 overflow-hidden shadow-md flex items-center justify-center">
          {store.logo ? (
            <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
          ) : (
            <Store className="w-5 h-5 text-stone-400" />
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3 pt-8 text-center">
        <h3 className="font-serif text-sm font-semibold text-stone-900 mb-1 line-clamp-1">
          {store.name}
        </h3>
        
        <div className="flex items-center justify-center gap-1 text-[10px] text-stone-600 mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[100px]">{store.location || 'España'}</span>
          <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-full">
            {storeType.label}
          </span>
        </div>
        
        <div className="flex items-center justify-center gap-1 text-xs">
          <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
          <span className="font-medium text-stone-800">{store.rating?.toFixed(1) || '0.0'}</span>
          <span className="text-stone-500">({store.review_count || 0})</span>
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
  
  // Filter state
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [regions, setRegions] = useState({});
  const [availableRegions, setAvailableRegions] = useState([]);

  useEffect(() => {
    fetchRegions();
    fetchStores();
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
      const response = await axios.get(`${API}/config/regions`);
      setRegions(response.data || {});
    } catch (error) {
      console.error('Error fetching regions:', error);
    }
  };

  const fetchStores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCountry) params.append('country', selectedCountry);
      if (selectedRegion) params.append('region', selectedRegion);
      
      const url = `${API}/stores${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axios.get(url);
      setStores(response.data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSelectedCountry('');
    setSelectedRegion('');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCountry || selectedRegion || searchQuery;
  const activeFilterCount = [selectedCountry, selectedRegion, searchQuery].filter(Boolean).length;

  // Compute display names for map zoom
  const selectedCountryName = selectedCountry ? (regions[selectedCountry]?.name || countryNames[selectedCountry] || '') : '';
  const selectedRegionName = selectedRegion ? (availableRegions.find(r => r.code === selectedRegion)?.name || '') : '';

  const filteredStores = stores.filter(store => 
    !searchQuery || 
    store.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const countryNames = {
    'ES': t('countries.Spain', 'España'),
    'US': t('countries.USA', 'Estados Unidos'),
    'KR': t('countries.Korea', 'Corea del Sur'),
    'IT': t('countries.Italy', 'Italia'),
    'FR': t('countries.France', 'Francia'),
    'GR': t('countries.Greece', 'Grecia'),
    'PT': t('countries.Portugal', 'Portugal'),
    'DE': t('countries.Germany', 'Alemania'),
    'NL': t('countries.Netherlands', 'Paises Bajos'),
    'BE': t('countries.Belgium', 'Belgica'),
    'GB': t('countries.UnitedKingdom', 'Reino Unido'),
    'CH': t('countries.Switzerland', 'Suiza'),
    'AT': t('countries.Austria', 'Austria'),
    'PL': t('countries.Poland', 'Polonia'),
    'IE': t('countries.Ireland', 'Irlanda'),
    'SE': t('countries.Sweden', 'Suecia'),
    'DK': t('countries.Denmark', 'Dinamarca'),
    'NO': t('countries.Norway', 'Noruega'),
    'CZ': t('countries.CzechRepublic', 'Rep. Checa'),
    'HU': t('countries.Hungary', 'Hungria'),
    'RO': t('countries.Romania', 'Rumania'),
    'BG': t('countries.Bulgaria', 'Bulgaria'),
    'HR': t('countries.Croatia', 'Croacia'),
    'TR': t('countries.Turkey', 'Turquia'),
    'MX': t('countries.Mexico', 'Mexico'),
    'CO': t('countries.Colombia', 'Colombia'),
    'AR': t('countries.Argentina', 'Argentina'),
    'CL': t('countries.Chile', 'Chile'),
    'PE': t('countries.Peru', 'Peru'),
    'BR': t('countries.Brazil', 'Brasil'),
    'EC': t('countries.Ecuador', 'Ecuador'),
    'CA': t('countries.Canada', 'Canada'),
    'CR': t('countries.CostaRica', 'Costa Rica'),
    'DO': t('countries.DominicanRepublic', 'Rep. Dominicana'),
    'JP': t('countries.Japan', 'Japon'),
    'CN': t('countries.China', 'China'),
    'IN': t('countries.India', 'India'),
    'TH': t('countries.Thailand', 'Tailandia'),
    'VN': t('countries.Vietnam', 'Vietnam'),
    'ID': t('countries.Indonesia', 'Indonesia'),
    'PH': t('countries.Philippines', 'Filipinas'),
    'AU': t('countries.Australia', 'Australia'),
    'NZ': t('countries.NewZealand', 'Nueva Zelanda'),
    'MA': t('countries.Morocco', 'Marruecos'),
    'TN': t('countries.Tunisia', 'Tunez'),
    'EG': t('countries.Egypt', 'Egipto'),
    'ZA': t('countries.SouthAfrica', 'Sudafrica'),
    'IL': t('countries.Israel', 'Israel'),
    'LB': t('countries.Lebanon', 'Libano'),
    'IR': t('countries.Iran', 'Iran'),
  };

  const storeCountryGroups = [
    { region: t('regions.europe', 'Europa'), codes: ['ES','IT','FR','GR','PT','DE','NL','BE','GB','CH','AT','PL','IE','SE','DK','NO','CZ','HU','RO','BG','HR','TR'] },
    { region: t('regions.americas', 'Americas'), codes: ['US','CA','MX','CO','AR','CL','PE','BR','EC','CR','DO'] },
    { region: t('regions.asiaOceania', 'Asia y Oceania'), codes: ['KR','JP','CN','IN','TH','VN','ID','PH','AU','NZ'] },
    { region: t('regions.africaMiddleEast', 'Africa y Oriente Medio'), codes: ['MA','TN','EG','ZA','IL','LB','IR'] },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <Header />

      {/* Hero Section - Compact on mobile */}
      <section className="py-4 md:py-6 bg-white border-b border-stone-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <BackButton />
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-xl md:text-2xl lg:text-3xl font-semibold text-stone-900 mb-0.5 md:mb-1 flex items-center gap-2">
                <span className="truncate">{t('stores.nearYou', 'Tiendas cerca de ti')}</span>
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-amber-600 flex-shrink-0" />
              </h1>
              <p className="text-stone-600 text-xs md:text-sm hidden sm:block">
                {t('stores.subtitle', 'Descubre productores locales comprometidos con la calidad')}
              </p>
            </div>
            
            {/* View Mode Toggle - Icon only on mobile */}
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')}
              className="flex items-center gap-2 rounded-full px-3 md:px-4 border border-stone-300 h-9 md:h-10"
              data-testid="toggle-view-mode"
            >
              {viewMode === 'grid' ? (
                <>
                  <Map className="w-4 h-4" />
                  <span className="hidden md:inline">{t('stores.viewMap', 'Ver mapa')}</span>
                </>
              ) : (
                <>
                  <Grid3X3 className="w-4 h-4" />
                  <span className="hidden md:inline">{t('stores.viewGrid', 'Ver tarjetas')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Mobile Search + Filter Toggle */}
      <section className="md:hidden bg-white border-b border-stone-200 py-3 sticky top-0 z-40">
        <div className="px-4 flex items-center gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <Input
              placeholder={t('stores.searchPlaceholder', 'Buscar tienda...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-full border-stone-200 h-10"
              data-testid="stores-search-input-mobile"
            />
          </div>
          
          {/* Filter Toggle Button */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-full h-10 px-3 border-stone-300 relative ${hasActiveFilters ? 'border-amber-500 bg-amber-50' : ''}`}
            data-testid="mobile-filter-toggle"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            <span className="ml-1">{t('stores.filters', 'Filtros')}</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
        
        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="px-4 pt-3 pb-1 border-t border-stone-100 mt-3 space-y-3 animate-in slide-in-from-top-2">
            {/* Country Filter */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                {t('stores.filterCountry', 'País')}
              </label>
              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="appearance-none w-full px-3 py-2.5 pr-8 border border-stone-200 rounded-xl bg-white text-sm focus:outline-none focus:border-stone-400"
                  data-testid="country-filter-mobile"
                >
                  <option value="">{t('stores.allCountries', 'Todos los países')}</option>
                  {storeCountryGroups.map(g => {
                    const available = g.codes.filter(c => regions[c]);
                    if (!available.length) return null;
                    return (
                      <optgroup key={g.region} label={g.region}>
                        {available.map(code => (
                          <option key={code} value={code}>{countryNames[code] || code}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {Object.keys(regions).filter(c => !storeCountryGroups.some(g => g.codes.includes(c))).map(code => (
                    <option key={code} value={code}>{countryNames[code] || code}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                {t('stores.filterRegion', 'Región')}
              </label>
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  disabled={!selectedCountry}
                  className="appearance-none w-full px-3 py-2.5 pr-8 border border-stone-200 rounded-xl bg-white text-sm focus:outline-none focus:border-stone-400 disabled:bg-stone-50 disabled:text-stone-400"
                  data-testid="region-filter-mobile"
                >
                  <option value="">{t('stores.allRegions', 'Todas las regiones')}</option>
                  {availableRegions.map(region => (
                    <option key={region.code} value={region.code}>
                      {region.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="w-full text-stone-500 hover:text-stone-700"
              >
                <X className="w-4 h-4 mr-1" />
                {t('stores.clearFilters', 'Limpiar filtros')}
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Desktop Filters Bar */}
      <section className="hidden md:block bg-white border-b border-stone-200 py-3 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-end gap-3">
            {/* Country Filter */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                {t('stores.filterCountry', 'País')}
              </label>
              <div className="relative">
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="appearance-none w-40 px-3 py-2 pr-8 border border-stone-200 rounded-lg bg-white text-sm focus:outline-none focus:border-stone-400"
                  data-testid="country-filter"
                >
                  <option value="">{t('stores.allCountries', 'Todos')}</option>
                  {storeCountryGroups.map(g => {
                    const available = g.codes.filter(c => regions[c]);
                    if (!available.length) return null;
                    return (
                      <optgroup key={g.region} label={g.region}>
                        {available.map(code => (
                          <option key={code} value={code}>{countryNames[code] || code}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {Object.keys(regions).filter(c => !storeCountryGroups.some(g => g.codes.includes(c))).map(code => (
                    <option key={code} value={code}>{countryNames[code] || code}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Region Filter */}
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                {t('stores.filterRegion', 'Región')}
              </label>
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  disabled={!selectedCountry}
                  className="appearance-none w-44 px-3 py-2 pr-8 border border-stone-200 rounded-lg bg-white text-sm focus:outline-none focus:border-stone-400 disabled:bg-stone-50 disabled:text-stone-400"
                  data-testid="region-filter"
                >
                  <option value="">{t('stores.allRegions', 'Todas')}</option>
                  {availableRegions.map(region => (
                    <option key={region.code} value={region.code}>
                      {region.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-stone-500 mb-1">
                {t('stores.search', 'Buscar')}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  placeholder={t('stores.searchPlaceholder', 'Buscar tienda...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-lg border-stone-200 h-9"
                  data-testid="stores-search-input"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-stone-500 hover:text-stone-700"
              >
                <X className="w-4 h-4 mr-1" />
                {t('stores.clearFilters', 'Limpiar')}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-4 md:py-6 min-h-[400px] md:min-h-[600px]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {viewMode === 'map' ? (
            /* Map View - Stack on mobile, side-by-side on desktop */
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6">
              {/* Map comes first on mobile */}
              <div className="lg:col-span-2 lg:order-2 bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm h-[300px] md:h-[500px] lg:h-[650px]">
                <GoogleMapEmbed 
                  stores={filteredStores} 
                  selectedStore={selectedStoreForMap}
                  countryName={selectedCountryName}
                  regionName={selectedRegionName}
                />
              </div>

              {/* Stores List (Sidebar) - Below map on mobile */}
              <div className="lg:col-span-1 lg:order-1 space-y-3 max-h-[400px] lg:max-h-[650px] overflow-y-auto pr-2">
                <p className="text-sm text-stone-600 mb-2 sticky top-0 bg-[#FAF7F2] py-1">
                  {filteredStores.length} {t('stores.storesFound', 'tiendas encontradas')}
                </p>
                {loading ? (
                  <div className="text-center py-8 md:py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
                    <p className="text-stone-500">{t('common.loading', 'Cargando...')}</p>
                  </div>
                ) : filteredStores.length === 0 ? (
                  <div className="text-center py-8 md:py-12 bg-white rounded-xl border border-stone-200">
                    <Store className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                    <p className="text-stone-500">{t('stores.noStores', 'No hay tiendas')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                    {filteredStores.map((store) => (
                      <div 
                        key={store.store_id}
                        onClick={() => setSelectedStoreForMap(store)}
                        onMouseEnter={() => setHighlightedStore(store.store_id)}
                        onMouseLeave={() => setHighlightedStore(null)}
                        className="cursor-pointer"
                      >
                        <StoreCard store={store} isHighlighted={highlightedStore === store.store_id || selectedStoreForMap?.store_id === store.store_id} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Grid View */
            <div>
              <p className="text-sm text-stone-600 mb-3 md:mb-4">
                {filteredStores.length} {t('stores.storesFound', 'tiendas encontradas')}
              </p>
              
              {loading ? (
                <div className="text-center py-8 md:py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
                  <p className="text-stone-500">{t('common.loading', 'Cargando...')}</p>
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="text-center py-8 md:py-12 bg-white rounded-xl border border-stone-200">
                  <Store className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                  <p className="text-stone-500 mb-4">{t('stores.noStores', 'No se encontraron tiendas')}</p>
                  {hasActiveFilters && (
                    <Button variant="outline" onClick={clearFilters} className="rounded-full">
                      {t('stores.clearFilters', 'Limpiar filtros')}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                  {filteredStores.map((store) => (
                    <StoreCard key={store.store_id} store={store} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section - Compact on mobile */}
      <section className="py-8 md:py-10 bg-stone-900">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-serif text-lg md:text-xl lg:text-2xl font-semibold text-white mb-1 md:mb-2">
            {t('stores.ctaTitle', '¿Eres productor local?')}
          </h2>
          <p className="text-white/70 mb-4 md:mb-5 text-xs md:text-sm max-w-lg mx-auto">
            {t('stores.ctaText', 'Únete a nuestra comunidad de vendedores')}
          </p>
          <Link to="/become-seller">
            <Button className="bg-white text-stone-900 hover:bg-stone-100 rounded-full px-5 md:px-6 h-10 md:h-11 text-sm md:text-base">
              {t('stores.ctaButton', 'Vender en Hispaloshop')}
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
