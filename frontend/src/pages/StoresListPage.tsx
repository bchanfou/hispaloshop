// @ts-nocheck
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Star, MapPin, Package, Truck, X, Map as MapIcon, List, Navigation, Check, AlertTriangle, Store as StoreIcon } from 'lucide-react';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import SEO from '../components/SEO';

/* ══════════════════════════════════════════
   Region / Country mapping
   ══════════════════════════════════════════ */

const IBEROESFERA = new Set([
  'ES','PT','MX','CO','AR','CL','PE','VE','EC','BO','PY','UY','CR','PA',
  'DO','CU','GT','HN','SV','NI','BR','GQ','PH',
]);

const REGIONS = [
  { id: 'iberoesfera', emoji: '\u{1F30D}', label: 'Iberoesfera', countries: IBEROESFERA },
  { id: 'europa', emoji: '\u{1F1EA}\u{1F1FA}', label: 'Europa', countries: new Set([
    'ES','PT','FR','DE','IT','NL','BE','AT','CH','IE','GB','DK','SE','NO','FI',
    'PL','CZ','SK','HU','RO','BG','HR','SI','GR','EE','LV','LT','LU','MT','CY',
  ])},
  { id: 'americas', emoji: '\u{1F30E}', label: 'Am\u00e9ricas', countries: new Set([
    'US','CA','MX','CO','AR','CL','PE','VE','EC','BO','PY','UY','CR','PA',
    'DO','CU','GT','HN','SV','NI','BR','JM','TT','HT',
  ])},
  { id: 'asia', emoji: '\u{1F30F}', label: 'Asia', countries: new Set([
    'CN','JP','KR','IN','TH','VN','ID','MY','SG','PH','TW','HK','PK','BD',
    'LK','NP','MM','KH','LA','MN','KZ','UZ','TM','KG','TJ',
  ])},
  { id: 'mena', emoji: '\u{1F54C}', label: 'MENA', countries: new Set([
    'MA','DZ','TN','LY','EG','SA','AE','QA','KW','BH','OM','JO','LB','IQ',
    'SY','YE','IR','IL','PS','TR',
  ])},
  { id: 'africa', emoji: '\u{1F30D}', label: '\u00c1frica', countries: new Set([
    'NG','GH','KE','TZ','UG','ET','ZA','SN','CI','CM','CD','AO','MZ','MG',
    'ZW','RW','ML','BF','NE','TD','GQ','GA','CG','BJ','TG','SL','LR','GW',
    'MR','SO','DJ','ER','SS','MW','ZM','BW','NA','LS','SZ',
  ])},
];

const COUNTRY_NAMES = {
  ES:'Espa\u00f1a',PT:'Portugal',FR:'Francia',DE:'Alemania',IT:'Italia',NL:'Pa\u00edses Bajos',
  BE:'B\u00e9lgica',AT:'Austria',CH:'Suiza',IE:'Irlanda',GB:'Reino Unido',DK:'Dinamarca',
  SE:'Suecia',NO:'Noruega',FI:'Finlandia',PL:'Polonia',CZ:'Chequia',GR:'Grecia',
  RO:'Ruman\u00eda',HU:'Hungr\u00eda',HR:'Croacia',BG:'Bulgaria',
  US:'Estados Unidos',CA:'Canad\u00e1',MX:'M\u00e9xico',CO:'Colombia',AR:'Argentina',
  CL:'Chile',PE:'Per\u00fa',VE:'Venezuela',EC:'Ecuador',BO:'Bolivia',PY:'Paraguay',
  UY:'Uruguay',CR:'Costa Rica',PA:'Panam\u00e1',DO:'Rep. Dominicana',CU:'Cuba',
  GT:'Guatemala',HN:'Honduras',SV:'El Salvador',NI:'Nicaragua',BR:'Brasil',
  GQ:'Guinea Ecuatorial',PH:'Filipinas',
  CN:'China',JP:'Jap\u00f3n',KR:'Corea del Sur',IN:'India',TH:'Tailandia',
  VN:'Vietnam',ID:'Indonesia',MY:'Malasia',SG:'Singapur',TW:'Taiw\u00e1n',
  MA:'Marruecos',DZ:'Argelia',TN:'T\u00fanez',EG:'Egipto',SA:'Arabia Saud\u00ed',
  AE:'Emiratos \u00c1rabes',QA:'Qatar',TR:'Turqu\u00eda',IL:'Israel',JO:'Jordania',LB:'L\u00edbano',
  NG:'Nigeria',GH:'Ghana',KE:'Kenia',TZ:'Tanzania',ZA:'Sud\u00e1frica',SN:'Senegal',
  ET:'Etiop\u00eda',UG:'Uganda',CI:'Costa de Marfil',CM:'Camer\u00fan',
};

const COUNTRY_FLAGS = {
  ES:'\u{1F1EA}\u{1F1F8}',PT:'\u{1F1F5}\u{1F1F9}',FR:'\u{1F1EB}\u{1F1F7}',DE:'\u{1F1E9}\u{1F1EA}',IT:'\u{1F1EE}\u{1F1F9}',NL:'\u{1F1F3}\u{1F1F1}',BE:'\u{1F1E7}\u{1F1EA}',AT:'\u{1F1E6}\u{1F1F9}',CH:'\u{1F1E8}\u{1F1ED}',
  IE:'\u{1F1EE}\u{1F1EA}',GB:'\u{1F1EC}\u{1F1E7}',DK:'\u{1F1E9}\u{1F1F0}',SE:'\u{1F1F8}\u{1F1EA}',NO:'\u{1F1F3}\u{1F1F4}',FI:'\u{1F1EB}\u{1F1EE}',PL:'\u{1F1F5}\u{1F1F1}',CZ:'\u{1F1E8}\u{1F1FF}',GR:'\u{1F1EC}\u{1F1F7}',
  RO:'\u{1F1F7}\u{1F1F4}',HU:'\u{1F1ED}\u{1F1FA}',HR:'\u{1F1ED}\u{1F1F7}',BG:'\u{1F1E7}\u{1F1EC}',
  US:'\u{1F1FA}\u{1F1F8}',CA:'\u{1F1E8}\u{1F1E6}',MX:'\u{1F1F2}\u{1F1FD}',CO:'\u{1F1E8}\u{1F1F4}',AR:'\u{1F1E6}\u{1F1F7}',CL:'\u{1F1E8}\u{1F1F1}',PE:'\u{1F1F5}\u{1F1EA}',VE:'\u{1F1FB}\u{1F1EA}',
  EC:'\u{1F1EA}\u{1F1E8}',BO:'\u{1F1E7}\u{1F1F4}',PY:'\u{1F1F5}\u{1F1FE}',UY:'\u{1F1FA}\u{1F1FE}',CR:'\u{1F1E8}\u{1F1F7}',PA:'\u{1F1F5}\u{1F1E6}',DO:'\u{1F1E9}\u{1F1F4}',CU:'\u{1F1E8}\u{1F1FA}',
  GT:'\u{1F1EC}\u{1F1F9}',HN:'\u{1F1ED}\u{1F1F3}',SV:'\u{1F1F8}\u{1F1FB}',NI:'\u{1F1F3}\u{1F1EE}',BR:'\u{1F1E7}\u{1F1F7}',GQ:'\u{1F1EC}\u{1F1F6}',PH:'\u{1F1F5}\u{1F1ED}',
  CN:'\u{1F1E8}\u{1F1F3}',JP:'\u{1F1EF}\u{1F1F5}',KR:'\u{1F1F0}\u{1F1F7}',IN:'\u{1F1EE}\u{1F1F3}',TH:'\u{1F1F9}\u{1F1ED}',VN:'\u{1F1FB}\u{1F1F3}',ID:'\u{1F1EE}\u{1F1E9}',MY:'\u{1F1F2}\u{1F1FE}',SG:'\u{1F1F8}\u{1F1EC}',TW:'\u{1F1F9}\u{1F1FC}',
  MA:'\u{1F1F2}\u{1F1E6}',DZ:'\u{1F1E9}\u{1F1FF}',TN:'\u{1F1F9}\u{1F1F3}',EG:'\u{1F1EA}\u{1F1EC}',SA:'\u{1F1F8}\u{1F1E6}',AE:'\u{1F1E6}\u{1F1EA}',QA:'\u{1F1F6}\u{1F1E6}',TR:'\u{1F1F9}\u{1F1F7}',IL:'\u{1F1EE}\u{1F1F1}',JO:'\u{1F1EF}\u{1F1F4}',LB:'\u{1F1F1}\u{1F1E7}',
  NG:'\u{1F1F3}\u{1F1EC}',GH:'\u{1F1EC}\u{1F1ED}',KE:'\u{1F1F0}\u{1F1EA}',TZ:'\u{1F1F9}\u{1F1FF}',ZA:'\u{1F1FF}\u{1F1E6}',SN:'\u{1F1F8}\u{1F1F3}',ET:'\u{1F1EA}\u{1F1F9}',UG:'\u{1F1FA}\u{1F1EC}',CI:'\u{1F1E8}\u{1F1EE}',CM:'\u{1F1E8}\u{1F1F2}',
};

/* ══════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════ */

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ══════════════════════════════════════════
   Map Component (Leaflet) — minimalista B&W
   ══════════════════════════════════════════ */

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Grayscale tile provider — CartoDB Positron (free, no API key, light/minimal)
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

function StoreMap({ stores }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(null);
  const [L, setL] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Dynamic import of Leaflet — once
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([leaflet]) => {
      if (!cancelled) setL(leaflet.default || leaflet);
    });
    return () => { cancelled = true; };
  }, []);

  // Create map instance — once
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    // S-09: Try to center on user's saved location, fallback to Spain center
    let initialCenter = [40.4168, -3.7038];
    let initialZoom = 5;
    try {
      const saved = localStorage.getItem('hsp_user_coords');
      if (saved) {
        const coords = JSON.parse(saved);
        if (typeof coords.lat === 'number' && typeof coords.lng === 'number' && Math.abs(coords.lat) <= 90 && Math.abs(coords.lng) <= 180) { initialCenter = [coords.lat, coords.lng]; initialZoom = 8; }
      }
    } catch { /* ignore */ }

    const map = L.map(mapRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    mapInstanceRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = null;
      setMapReady(false);
    };
  }, [L]);

  // Update markers when stores change — without recreating the map
  useEffect(() => {
    if (!mapReady || !L || !markersRef.current || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const group = markersRef.current;
    group.clearLayers();

    const storesWithCoords = stores.filter(s => s.coordinates?.lat && s.coordinates?.lng);
    if (storesWithCoords.length === 0) return;

    const dotIcon = L.divIcon({
      className: '',
      html: '<div style="width:10px;height:10px;border-radius:50%;background:#0c0a09;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25)"></div>',
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    storesWithCoords.forEach(store => {
      const logoUrl = store.logo;
      const icon = logoUrl
        ? L.divIcon({
            className: '',
            html: `<div style="width:32px;height:32px;border-radius:50%;overflow:hidden;border:2px solid #0c0a09;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.15)"><img src="${escapeHtml(logoUrl)}" style="width:100%;height:100%;object-fit:cover" alt="" loading="lazy" /></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })
        : dotIcon;

      const marker = L.marker(
        [store.coordinates.lat, store.coordinates.lng],
        { icon }
      );

      const slug = store.slug || store.store_slug;
      const ratingHtml = store.rating > 0 ? `<span style="font-size:10px;color:#78716c">★ ${Number(store.rating).toFixed(1)}</span>` : '';
      const productsHtml = store.product_count > 0 ? `<span style="font-size:10px;color:#78716c">${store.product_count} productos</span>` : '';
      const metaHtml = (ratingHtml || productsHtml) ? `<p style="margin:0 0 4px;display:flex;gap:6px">${ratingHtml}${productsHtml}</p>` : '';
      marker.bindPopup(
        `<div style="font-family:inherit;min-width:140px;padding:2px 0">` +
        `<p style="font-size:13px;font-weight:600;color:#0c0a09;margin:0 0 2px">${escapeHtml(store.name)}</p>` +
        (store.location ? `<p style="font-size:11px;color:#78716c;margin:0 0 4px">${escapeHtml(store.location)}</p>` : '') +
        metaHtml +
        `<a href="/store/${encodeURIComponent(slug)}" style="font-size:11px;font-weight:600;color:#0c0a09;text-decoration:none">Ver tienda \u2192</a>` +
        `</div>`,
        { closeButton: false, className: 'hs-popup', maxWidth: 220 }
      );

      group.addLayer(marker);
    });

    // Fit bounds with animation
    const bounds = L.latLngBounds(storesWithCoords.map(s => [s.coordinates.lat, s.coordinates.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true, duration: 0.4 });
  }, [stores, mapReady, L]);

  return (
    <div className="relative">
      <style>{`
        .hs-popup .leaflet-popup-content-wrapper {
          border-radius: 14px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.06);
          padding: 0;
        }
        .hs-popup .leaflet-popup-content { margin: 10px 14px; }
        .hs-popup .leaflet-popup-tip { display: none; }
        .leaflet-control-zoom a {
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
          font-size: 14px !important;
          border-radius: 8px !important;
          background: #fff !important;
          color: #0c0a09 !important;
          border: 1px solid rgba(0,0,0,0.08) !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08) !important;
        }
        .leaflet-control-zoom { border: none !important; border-radius: 10px !important; overflow: hidden; }
        .leaflet-control-attribution { font-size: 9px !important; opacity: 0.5; }
      `}</style>
      <div
        ref={mapRef}
        className="w-full overflow-hidden rounded-2xl"
        style={{ height: 'min(calc(100vh - 200px), 500px)' }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════
   StoreCard
   ══════════════════════════════════════════ */

function StoreCard({ store }) {
  const slug = store.slug || store.store_slug;
  const rating = store.average_rating || store.rating;
  const category = store.category || store.store_type || '';

  return (
    <Link
      to={`/store/${slug}`}
      aria-label={`Tienda ${store.name}`}
      className="block rounded-2xl bg-white p-3 no-underline transition-shadow hover:shadow-sm"
    >
      {/* Avatar + Name row */}
      <div className="flex items-center gap-2.5">
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-stone-100">
            {store.logo ? (
              <img src={store.logo} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg font-bold text-stone-400">{(store.name || 'T')[0]}</span>
            )}
          </div>
          {(store.verified || store.producer_verified) && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-stone-950">
              <Check size={10} className="text-white" strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-950">{store.name}</p>
          {category && (
            <p className="truncate text-[11px] text-stone-500">{category}</p>
          )}
        </div>
      </div>

      {/* Location */}
      {store.location && (
        <p className="mt-1.5 truncate text-[11px] text-stone-400 flex items-center gap-1">
          <MapPin size={9} className="shrink-0" /> {store.location}
        </p>
      )}

      {/* Meta row */}
      <div className="mt-1 flex items-center gap-3 text-[11px] text-stone-500">
        {store.product_count > 0 && (
          <span className="flex items-center gap-1">
            <Package size={10} /> {store.product_count}
          </span>
        )}
        {rating > 0 && (
          <span className="flex items-center gap-1">
            <Star size={10} className="fill-stone-950 text-stone-950" />
            {Number(rating).toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════
   FeaturedStoreCard (horizontal scroll)
   ══════════════════════════════════════════ */

function FeaturedCard({ store }) {
  const slug = store.slug || store.store_slug;
  const hero = store.hero_image || store.banner_image || store.logo;

  return (
    <Link
      to={`/store/${slug}`}
      aria-label={`Tienda destacada: ${store.name}`}
      className="shrink-0 w-[260px] no-underline rounded-2xl overflow-hidden bg-stone-950 relative aspect-video"
    >
      {hero && <img src={hero} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3">
        <div className="flex items-center gap-2">
          {store.logo && <img loading="lazy" src={store.logo} alt="" className="w-7 h-7 rounded-full object-cover border-[1.5px] border-white/40" />}
          <div>
            <p className="text-[13px] font-semibold text-white m-0">{store.name}</p>
            <p className="text-[10px] text-white/70 m-0 flex items-center gap-[3px]">
              <MapPin size={9} /> {store.location || 'Espa\u00f1a'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════ */

export default function StoresListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { country: localeCountry } = useLocale?.() || {};
  const userCountry = user?.country || localeCountry || 'ES';

  const [stores, setStores] = useState([]);
  const [eliteStores, setEliteStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [activeRegion, setActiveRegion] = useState(null);
  const [activeCountry, setActiveCountry] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef(null);

  /* ── fetch stores ── */
  const fetchStores = useCallback(() => {
    setLoading(true);
    setFetchError(false);
    const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
    apiClient.get(`/stores${params}`)
      .then(data => {
        const list = Array.isArray(data) ? data : data?.stores || [];
        setStores(list);
      })
      .catch(() => { setStores([]); setFetchError(true); })
      .finally(() => { setLoading(false); });
  }, [debouncedSearch]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  /* ── fetch elite stores (skip during search) ── */
  useEffect(() => {
    if (debouncedSearch) return;
    let active = true;
    apiClient.get(`/stores?plan=elite&country=${userCountry}&limit=10`)
      .then(data => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.stores || [];
        setEliteStores(list);
      })
      .catch(() => { /* elite section gracefully hidden */ });
    return () => { active = false; };
  }, [userCountry, debouncedSearch]);

  /* ── infinite scroll ── */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount(prev => prev + 12);
    }, { rootMargin: '200px' });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── filter logic ── */
  const filteredStores = useMemo(() => {
    let list = stores;

    // region filter
    if (activeRegion) {
      const region = REGIONS.find(r => r.id === activeRegion);
      if (region) {
        list = list.filter(s => {
          const c = (s.country || '').toUpperCase();
          return region.countries.has(c);
        });
      }
    }

    // country filter
    if (activeCountry) {
      list = list.filter(s => (s.country || '').toUpperCase() === activeCountry);
    }

    return list;
  }, [stores, activeRegion, activeCountry]);

  /* ── available regions (only those with stores) ── */
  const availableRegions = useMemo(() => {
    const storeCodes = new Set(stores.map(s => (s.country || '').toUpperCase()));
    return REGIONS.filter(r => {
      for (const code of storeCodes) {
        if (r.countries.has(code)) return true;
      }
      return false;
    });
  }, [stores]);

  /* ── country chips for active region ── */
  const regionCountryChips = useMemo(() => {
    if (!activeRegion) return [];
    const region = REGIONS.find(r => r.id === activeRegion);
    if (!region) return [];

    const counts = {};
    stores.forEach(s => {
      const c = (s.country || '').toUpperCase();
      if (region.countries.has(c)) {
        counts[c] = (counts[c] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([code, count]) => ({
        code,
        name: COUNTRY_NAMES[code] || code,
        flag: COUNTRY_FLAGS[code] || '\u{1F3F3}\uFE0F',
        count,
      }));
  }, [activeRegion, stores]);

  /* ── handlers ── */
  const handleRegionClick = (regionId) => {
    if (activeRegion === regionId) {
      setActiveRegion(null);
      setActiveCountry(null);
    } else {
      setActiveRegion(regionId);
      setActiveCountry(null);
    }
    setVisibleCount(12);
  };

  const handleCountryClick = (code) => {
    setActiveCountry(activeCountry === code ? null : code);
    setVisibleCount(12);
  };

  const visibleStores = filteredStores.slice(0, visibleCount);

  /* ── render ── */
  return (
    <div className="min-h-screen bg-white pb-20">
      <SEO
        title="Tiendas — Hispaloshop"
        description="Explora tiendas de productores artesanales de alimentación saludable local. Filtra por región y país."
        structuredData={stores.length > 0 ? [{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Tiendas en Hispaloshop',
          numberOfItems: stores.length,
          itemListElement: stores.slice(0, 20).map((s, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            url: `https://www.hispaloshop.com/store/${s.slug || s.store_slug}`,
            name: s.name,
          })),
        }] : []}
      />
      <style>{`
        @keyframes storesPulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .stores-grid { display:grid; gap:12px; grid-template-columns:1fr; }
        @media(min-width:640px){ .stores-grid{grid-template-columns:repeat(2,1fr);gap:14px} }
        @media(min-width:1024px){ .stores-grid{grid-template-columns:repeat(3,1fr);gap:16px} }
      `}</style>

      {/* ── TOPBAR ── */}
      <div className="sticky top-0 z-20 h-[52px] flex items-center justify-between px-4 bg-white border-b border-stone-200 max-w-[975px] mx-auto">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="bg-transparent border-none cursor-pointer p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ArrowLeft size={22} className="text-stone-950" />
        </button>
        <span className="text-base font-semibold text-stone-950">Tiendas</span>
        <button
          onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          className="bg-transparent border-none cursor-pointer p-1 flex text-stone-950"
          aria-label={viewMode === 'list' ? 'Ver mapa' : 'Ver lista'}
        >
          {viewMode === 'list' ? <MapIcon size={22} /> : <List size={22} />}
        </button>
      </div>

      <div className="px-4 pt-3 max-w-[975px] mx-auto">

        {/* ── SEARCH ── */}
        <div className="relative mb-3">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Buscar tiendas..."
            aria-label="Buscar tiendas"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-full border-none bg-stone-100 pl-10 text-sm text-stone-950 outline-none placeholder:text-stone-400"
            style={{ paddingRight: searchQuery ? 40 : 16 }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Borrar b\u00fasqueda"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-none bg-stone-200 text-stone-500 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* ── REGION PILLS ── */}
        <div className="scrollbar-hide flex gap-2 overflow-x-auto mb-2 pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => { setActiveRegion(null); setActiveCountry(null); }}
            aria-pressed={!activeRegion}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-[7px] rounded-full text-[13px] font-medium whitespace-nowrap cursor-pointer transition-all duration-150 ${
              !activeRegion ? 'bg-stone-950 text-white border-none' : 'bg-white text-stone-950 border border-stone-200'
            }`}
          >
            Todas
          </button>
          {availableRegions.map(r => (
            <button
              key={r.id}
              onClick={() => handleRegionClick(r.id)}
              aria-pressed={activeRegion === r.id}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-[7px] rounded-full text-[13px] font-medium whitespace-nowrap cursor-pointer transition-all duration-150 ${
                activeRegion === r.id ? 'bg-stone-950 text-white border-none' : 'bg-white text-stone-950 border border-stone-200'
              }`}
            >
              {r.emoji} {r.label}
            </button>
          ))}
        </div>

        {/* ── COUNTRY CHIPS (appear when region selected) ── */}
        {regionCountryChips.length > 0 && (
          <div className="scrollbar-hide flex gap-1.5 overflow-x-auto mb-3 pb-1" style={{ scrollbarWidth: 'none' }}>
            {regionCountryChips.map(c => (
              <button
                key={c.code}
                onClick={() => handleCountryClick(c.code)}
                aria-pressed={activeCountry === c.code}
                className={`shrink-0 flex items-center gap-1 px-3 py-[5px] rounded-full text-xs font-medium cursor-pointer transition-all duration-150 ${
                  activeCountry === c.code ? 'bg-stone-950 text-white border-none' : 'bg-stone-100 text-stone-950 border border-stone-200'
                }`}
              >
                {c.flag} {c.name} <span className="opacity-50">({c.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* ── MAP VIEW ── */}
        {viewMode === 'map' && (
          <div className="mb-6">
            <StoreMap stores={filteredStores} />
            {/* mini list below map */}
            {filteredStores.length > 0 && (
              <div className="mt-4">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500 mb-3">{filteredStores.length} tiendas</span>
                <div className="flex flex-col gap-2">
                  {filteredStores.slice(0, 8).map(store => {
                    const slug = store.slug || store.store_slug;
                    return (
                      <Link key={store.store_id || slug} to={`/store/${slug}`} aria-label={`Tienda ${store.name}`} className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-[14px] border border-stone-200 no-underline">
                        {store.logo ? (
                          <img loading="lazy" src={store.logo} alt={store.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-sm font-semibold text-stone-500">
                            {(store.name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-stone-950 m-0">{store.name}</p>
                          <p className="text-[11px] text-stone-500 mt-px m-0">{store.location || ''}</p>
                        </div>
                        {(store.average_rating || store.rating) > 0 && (
                          <span className="text-xs font-semibold text-stone-950 flex items-center gap-0.5">
                            <Star size={12} className="fill-stone-950 text-stone-950" />
                            {Number(store.average_rating || store.rating).toFixed(1)}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <>
            {/* ELITE featured scroll */}
            {eliteStores.length > 0 && !debouncedSearch && !activeRegion && (
              <div className="mb-6">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500 mb-3">Destacadas</span>
                <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {eliteStores.map(store => (
                    <FeaturedCard key={store.store_id || store.slug} store={store} />
                  ))}
                </div>
              </div>
            )}

            {/* ALL STORES grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500">
                  {activeRegion || activeCountry
                    ? `${filteredStores.length} tiendas`
                    : 'Todas las tiendas'}
                </span>
              </div>

              {loading ? (
                <div className="stores-grid" aria-busy="true" aria-label="Cargando tiendas">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} aria-hidden="true" className="rounded-2xl bg-white p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-stone-100" />
                        <div className="flex-1">
                          <div className="mb-1.5 h-3 w-3/5 animate-pulse rounded bg-stone-100" />
                          <div className="h-2.5 w-2/5 animate-pulse rounded bg-stone-100" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <AlertTriangle className="w-10 h-10 text-stone-300" />
                  <p className="text-base font-semibold text-stone-950">Error al cargar</p>
                  <p className="text-sm text-stone-500">Comprueba tu conexi\u00f3n e int\u00e9ntalo de nuevo</p>
                  <button onClick={fetchStores} className="bg-stone-950 text-white rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-stone-800 transition-colors">
                    Reintentar
                  </button>
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <StoreIcon size={48} className="text-stone-300" strokeWidth={1.5} />
                  <p className="text-base font-semibold text-stone-950">A\u00fan no hay tiendas</p>
                  <p className="text-sm text-stone-500">
                    {debouncedSearch ? 'Prueba con otro t\u00e9rmino de b\u00fasqueda' : 'No hay tiendas en esta regi\u00f3n todav\u00eda'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="stores-grid">
                    {visibleStores.map(store => (
                      <StoreCard key={store.store_id || store.slug || store.id} store={store} />
                    ))}
                  </div>
                  {visibleCount < filteredStores.length && (
                    <div ref={sentinelRef} className="h-px" />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
