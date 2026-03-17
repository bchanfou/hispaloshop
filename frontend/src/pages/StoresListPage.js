import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Star, MapPin, Package, Truck, X, Map as MapIcon, List, Navigation } from 'lucide-react';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';

/* ══════════════════════════════════════════
   Region / Country mapping
   ══════════════════════════════════════════ */

const IBEROESFERA = new Set([
  'ES','PT','MX','CO','AR','CL','PE','VE','EC','BO','PY','UY','CR','PA',
  'DO','CU','GT','HN','SV','NI','BR','GQ','PH',
]);

const REGIONS = [
  { id: 'iberoesfera', emoji: '🌍', label: 'Iberoesfera', countries: IBEROESFERA },
  { id: 'europa', emoji: '🇪🇺', label: 'Europa', countries: new Set([
    'ES','PT','FR','DE','IT','NL','BE','AT','CH','IE','GB','DK','SE','NO','FI',
    'PL','CZ','SK','HU','RO','BG','HR','SI','GR','EE','LV','LT','LU','MT','CY',
  ])},
  { id: 'americas', emoji: '🌎', label: 'Américas', countries: new Set([
    'US','CA','MX','CO','AR','CL','PE','VE','EC','BO','PY','UY','CR','PA',
    'DO','CU','GT','HN','SV','NI','BR','JM','TT','HT',
  ])},
  { id: 'asia', emoji: '🌏', label: 'Asia', countries: new Set([
    'CN','JP','KR','IN','TH','VN','ID','MY','SG','PH','TW','HK','PK','BD',
    'LK','NP','MM','KH','LA','MN','KZ','UZ','TM','KG','TJ',
  ])},
  { id: 'mena', emoji: '🕌', label: 'MENA', countries: new Set([
    'MA','DZ','TN','LY','EG','SA','AE','QA','KW','BH','OM','JO','LB','IQ',
    'SY','YE','IR','IL','PS','TR',
  ])},
  { id: 'africa', emoji: '🌍', label: 'África', countries: new Set([
    'NG','GH','KE','TZ','UG','ET','ZA','SN','CI','CM','CD','AO','MZ','MG',
    'ZW','RW','ML','BF','NE','TD','GQ','GA','CG','BJ','TG','SL','LR','GW',
    'MR','SO','DJ','ER','SS','MW','ZM','BW','NA','LS','SZ',
  ])},
];

const COUNTRY_NAMES = {
  ES:'España',PT:'Portugal',FR:'Francia',DE:'Alemania',IT:'Italia',NL:'Países Bajos',
  BE:'Bélgica',AT:'Austria',CH:'Suiza',IE:'Irlanda',GB:'Reino Unido',DK:'Dinamarca',
  SE:'Suecia',NO:'Noruega',FI:'Finlandia',PL:'Polonia',CZ:'Chequia',GR:'Grecia',
  RO:'Rumanía',HU:'Hungría',HR:'Croacia',BG:'Bulgaria',
  US:'Estados Unidos',CA:'Canadá',MX:'México',CO:'Colombia',AR:'Argentina',
  CL:'Chile',PE:'Perú',VE:'Venezuela',EC:'Ecuador',BO:'Bolivia',PY:'Paraguay',
  UY:'Uruguay',CR:'Costa Rica',PA:'Panamá',DO:'Rep. Dominicana',CU:'Cuba',
  GT:'Guatemala',HN:'Honduras',SV:'El Salvador',NI:'Nicaragua',BR:'Brasil',
  GQ:'Guinea Ecuatorial',PH:'Filipinas',
  CN:'China',JP:'Japón',KR:'Corea del Sur',IN:'India',TH:'Tailandia',
  VN:'Vietnam',ID:'Indonesia',MY:'Malasia',SG:'Singapur',TW:'Taiwán',
  MA:'Marruecos',DZ:'Argelia',TN:'Túnez',EG:'Egipto',SA:'Arabia Saudí',
  AE:'Emiratos Árabes',QA:'Qatar',TR:'Turquía',IL:'Israel',JO:'Jordania',LB:'Líbano',
  NG:'Nigeria',GH:'Ghana',KE:'Kenia',TZ:'Tanzania',ZA:'Sudáfrica',SN:'Senegal',
  ET:'Etiopía',UG:'Uganda',CI:'Costa de Marfil',CM:'Camerún',
};

const COUNTRY_FLAGS = {
  ES:'🇪🇸',PT:'🇵🇹',FR:'🇫🇷',DE:'🇩🇪',IT:'🇮🇹',NL:'🇳🇱',BE:'🇧🇪',AT:'🇦🇹',CH:'🇨🇭',
  IE:'🇮🇪',GB:'🇬🇧',DK:'🇩🇰',SE:'🇸🇪',NO:'🇳🇴',FI:'🇫🇮',PL:'🇵🇱',CZ:'🇨🇿',GR:'🇬🇷',
  RO:'🇷🇴',HU:'🇭🇺',HR:'🇭🇷',BG:'🇧🇬',
  US:'🇺🇸',CA:'🇨🇦',MX:'🇲🇽',CO:'🇨🇴',AR:'🇦🇷',CL:'🇨🇱',PE:'🇵🇪',VE:'🇻🇪',
  EC:'🇪🇨',BO:'🇧🇴',PY:'🇵🇾',UY:'🇺🇾',CR:'🇨🇷',PA:'🇵🇦',DO:'🇩🇴',CU:'🇨🇺',
  GT:'🇬🇹',HN:'🇭🇳',SV:'🇸🇻',NI:'🇳🇮',BR:'🇧🇷',GQ:'🇬🇶',PH:'🇵🇭',
  CN:'🇨🇳',JP:'🇯🇵',KR:'🇰🇷',IN:'🇮🇳',TH:'🇹🇭',VN:'🇻🇳',ID:'🇮🇩',MY:'🇲🇾',SG:'🇸🇬',TW:'🇹🇼',
  MA:'🇲🇦',DZ:'🇩🇿',TN:'🇹🇳',EG:'🇪🇬',SA:'🇸🇦',AE:'🇦🇪',QA:'🇶🇦',TR:'🇹🇷',IL:'🇮🇱',JO:'🇯🇴',LB:'🇱🇧',
  NG:'🇳🇬',GH:'🇬🇭',KE:'🇰🇪',TZ:'🇹🇿',ZA:'🇿🇦',SN:'🇸🇳',ET:'🇪🇹',UG:'🇺🇬',CI:'🇨🇮',CM:'🇨🇲',
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

const pill = (active) => ({
  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
  padding: '7px 14px', borderRadius: 'var(--radius-full)',
  fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
  whiteSpace: 'nowrap', cursor: 'pointer', transition: 'var(--transition-fast)',
  border: active ? 'none' : '1px solid var(--color-border)',
  background: active ? 'var(--color-black)' : 'var(--color-white)',
  color: active ? '#fff' : 'var(--color-black)',
});

const sLabel = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--color-stone)',
  fontFamily: 'var(--font-sans)', display: 'block', marginBottom: 12,
};

/* ══════════════════════════════════════════
   Map Component (Leaflet)
   ══════════════════════════════════════════ */

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function StoreMap({ stores, onStoreClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [L, setL] = useState(null);

  // Dynamic import of Leaflet (avoid SSR issues)
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

  useEffect(() => {
    if (!L || !mapRef.current) return;

    // Remove previous map instance when stores change
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const storesWithCoords = stores.filter(s => s.coordinates?.lat && s.coordinates?.lng);
    const center = storesWithCoords.length > 0
      ? [storesWithCoords[0].coordinates.lat, storesWithCoords[0].coordinates.lng]
      : [40.4168, -3.7038]; // Madrid default

    const map = L.map(mapRef.current, {
      center,
      zoom: storesWithCoords.length > 1 ? 5 : 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);

    // Custom icon
    const makeIcon = (store) => {
      const logoUrl = store.logo;
      if (logoUrl) {
        return L.divIcon({
          className: '',
          html: `<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;border:2px solid var(--color-black);background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
            <img src="${escapeHtml(logoUrl)}" style="width:100%;height:100%;object-fit:cover" alt="" />
          </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
      }
      return L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:var(--color-black);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.2)"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
    };

    storesWithCoords.forEach(store => {
      const marker = L.marker(
        [store.coordinates.lat, store.coordinates.lng],
        { icon: makeIcon(store) }
      ).addTo(map);

      const slug = store.slug || store.store_slug;
      marker.bindPopup(`
        <div style="font-family:var(--font-sans);min-width:160px">
          <p style="font-size:14px;font-weight:600;margin:0 0 4px">${escapeHtml(store.name)}</p>
          <p style="font-size:11px;color:#78716c;margin:0 0 8px">${escapeHtml(store.location || '')}</p>
          <a href="/store/${encodeURIComponent(slug)}" style="font-size:12px;font-weight:600;color:#0c0a09;text-decoration:none">Ver tienda →</a>
        </div>
      `, { closeButton: false, className: 'store-popup' });
    });

    // Fit bounds if multiple stores
    if (storesWithCoords.length > 1) {
      const bounds = L.latLngBounds(storesWithCoords.map(s => [s.coordinates.lat, s.coordinates.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, stores]);

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        .store-popup .leaflet-popup-content-wrapper {
          border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.12);
          padding: 0;
        }
        .store-popup .leaflet-popup-content { margin: 12px 16px; }
        .store-popup .leaflet-popup-tip { display: none; }
      `}</style>
      <div ref={mapRef} style={{ width: '100%', height: 'calc(100vh - 160px)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }} />
    </div>
  );
}

/* ══════════════════════════════════════════
   StoreCard
   ══════════════════════════════════════════ */

function StoreCard({ store }) {
  const slug = store.slug || store.store_slug;
  const hero = store.hero_image || store.banner_image || store.logo;
  const rating = store.average_rating || store.rating;

  return (
    <Link
      to={`/store/${slug}`}
      aria-label={`Tienda ${store.name}`}
      style={{
        display: 'block', textDecoration: 'none',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        background: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        transition: 'var(--transition-fast)',
      }}
    >
      {/* hero */}
      <div style={{ aspectRatio: '16/10', background: 'var(--color-surface)', position: 'relative', overflow: 'hidden' }}>
        {hero && <img src={hero} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        {/* logo overlap */}
        {store.logo && (
          <img src={store.logo} alt="" style={{
            position: 'absolute', bottom: -14, left: 12,
            width: 32, height: 32, borderRadius: '50%', objectFit: 'cover',
            border: '2px solid var(--color-white)', background: 'var(--color-white)',
          }} />
        )}
      </div>
      {/* info */}
      <div style={{ padding: '18px 12px 12px' }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {store.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
          <MapPin size={10} /> {store.location || 'España'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          {rating > 0 && (
            <span style={{ fontSize: 11, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Star size={10} style={{ fill: 'var(--color-black)', color: 'var(--color-black)' }} />
              {Number(rating).toFixed(1)}
            </span>
          )}
          {store.product_count > 0 && (
            <span style={{ fontSize: 11, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Package size={10} /> {store.product_count}
            </span>
          )}
          {store.free_shipping && (
            <span style={{ fontSize: 11, color: 'var(--color-stone)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Truck size={10} /> Gratis
            </span>
          )}
        </div>
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
      style={{
        flexShrink: 0, width: 260, textDecoration: 'none',
        borderRadius: 'var(--radius-xl)', overflow: 'hidden',
        background: 'var(--color-black)', position: 'relative',
        aspectRatio: '16/9',
      }}
    >
      {hero && <img src={hero} alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {store.logo && <img src={store.logo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.4)' }} />}
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{store.name}</p>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', margin: 0, display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={9} /> {store.location || 'España'}
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
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [activeRegion, setActiveRegion] = useState(null);
  const [activeCountry, setActiveCountry] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef(null);

  /* ── fetch stores ── */
  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
    apiClient.get(`/stores${params}`)
      .then(data => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.stores || [];
        setStores(list);
      })
      .catch(() => { if (active) setStores([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [debouncedSearch]);

  /* ── fetch elite stores ── */
  useEffect(() => {
    let active = true;
    apiClient.get(`/stores?plan=elite&country=${userCountry}&limit=10`)
      .then(data => {
        if (!active) return;
        const list = Array.isArray(data) ? data : data?.stores || [];
        setEliteStores(list);
      })
      .catch(() => { /* elite section gracefully hidden */ });
    return () => { active = false; };
  }, [userCountry]);

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
        flag: COUNTRY_FLAGS[code] || '🏳️',
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
    <div style={{ minHeight: '100vh', background: 'var(--color-cream)', fontFamily: 'var(--font-sans)', paddingBottom: 80 }}>
      <style>{`
        @keyframes storesPulse { 0%,100%{opacity:.4} 50%{opacity:1} }
        .stores-grid { display:grid; gap:12px; grid-template-columns:repeat(2,1fr); }
        @media(min-width:600px){ .stores-grid{grid-template-columns:repeat(3,1fr);gap:14px} }
        @media(min-width:1024px){ .stores-grid{grid-template-columns:repeat(4,1fr);gap:16px} }
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <button onClick={() => navigate(-1)} aria-label="Volver" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={22} color="var(--color-black)" />
        </button>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-black)' }}>Tiendas</span>
        <button
          onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex',
            color: 'var(--color-black)',
          }}
          aria-label={viewMode === 'list' ? 'Ver mapa' : 'Ver lista'}
        >
          {viewMode === 'list' ? <MapIcon size={22} /> : <List size={22} />}
        </button>
      </div>

      <div style={{ padding: '12px 16px 0' }}>

        {/* ── SEARCH ── */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-stone)' }} />
          <input
            type="text"
            placeholder="Buscar tiendas…"
            aria-label="Buscar tiendas"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', height: 44, borderRadius: 'var(--radius-full)',
              border: '1px solid var(--color-border)', background: 'var(--color-white)',
              paddingLeft: 42, paddingRight: searchQuery ? 40 : 16,
              fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--color-black)', outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Borrar búsqueda"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 10, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color="var(--color-stone)" />
            </button>
          )}
        </div>

        {/* ── REGION PILLS ── */}
        <div className="scrollbar-hide" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8, paddingBottom: 4, scrollbarWidth: 'none' }}>
          <button onClick={() => { setActiveRegion(null); setActiveCountry(null); }} aria-pressed={!activeRegion} style={pill(!activeRegion)}>
            Todas
          </button>
          {availableRegions.map(r => (
            <button key={r.id} onClick={() => handleRegionClick(r.id)} aria-pressed={activeRegion === r.id} style={pill(activeRegion === r.id)}>
              {r.emoji} {r.label}
            </button>
          ))}
        </div>

        {/* ── COUNTRY CHIPS (appear when region selected) ── */}
        {regionCountryChips.length > 0 && (
          <div className="scrollbar-hide" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4, scrollbarWidth: 'none' }}>
            {regionCountryChips.map(c => (
              <button
                key={c.code}
                onClick={() => handleCountryClick(c.code)}
                aria-pressed={activeCountry === c.code}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
                  padding: '5px 12px', borderRadius: 'var(--radius-full)',
                  fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
                  cursor: 'pointer', transition: 'var(--transition-fast)',
                  border: activeCountry === c.code ? 'none' : '1px solid var(--color-border)',
                  background: activeCountry === c.code ? 'var(--color-black)' : 'var(--color-surface)',
                  color: activeCountry === c.code ? '#fff' : 'var(--color-black)',
                }}
              >
                {c.flag} {c.name} <span style={{ opacity: 0.5 }}>({c.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* ── MAP VIEW ── */}
        {viewMode === 'map' && (
          <div style={{ marginBottom: 24 }}>
            <StoreMap stores={filteredStores} />
            {/* mini list below map */}
            {filteredStores.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span style={sLabel}>{filteredStores.length} tiendas</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredStores.slice(0, 8).map(store => {
                    const slug = store.slug || store.store_slug;
                    return (
                      <Link key={store.store_id || slug} to={`/store/${slug}`} aria-label={`Tienda ${store.name}`} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                        background: 'var(--color-white)', borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)', textDecoration: 'none',
                      }}>
                        {store.logo ? (
                          <img src={store.logo} alt={store.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: 'var(--color-stone)' }}>
                            {(store.name || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-black)', margin: 0 }}>{store.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--color-stone)', margin: '1px 0 0' }}>{store.location || ''}</p>
                        </div>
                        {(store.average_rating || store.rating) > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-black)', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Star size={12} style={{ fill: 'var(--color-black)', color: 'var(--color-black)' }} />
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
              <div style={{ marginBottom: 24 }}>
                <span style={sLabel}>Destacadas</span>
                <div className="scrollbar-hide" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                  {eliteStores.map(store => (
                    <FeaturedCard key={store.store_id || store.slug} store={store} />
                  ))}
                </div>
              </div>
            )}

            {/* ALL STORES grid */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={sLabel}>
                  {activeRegion || activeCountry
                    ? `${filteredStores.length} tiendas`
                    : 'Todas las tiendas'}
                </span>
              </div>

              {loading ? (
                <div className="stores-grid" aria-busy="true" aria-label="Cargando tiendas">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} aria-hidden="true" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--color-white)', border: '1px solid var(--color-border)' }}>
                      <div style={{ aspectRatio: '16/10', background: 'var(--color-surface)', animation: 'storesPulse 1.5s ease-in-out infinite' }} />
                      <div style={{ padding: '18px 12px 12px' }}>
                        <div style={{ height: 12, width: '60%', background: 'var(--color-surface)', borderRadius: 4, animation: 'storesPulse 1.5s ease-in-out infinite' }} />
                        <div style={{ height: 10, width: '40%', background: 'var(--color-surface)', borderRadius: 4, marginTop: 6, animation: 'storesPulse 1.5s ease-in-out infinite' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredStores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <MapPin size={36} style={{ color: 'var(--color-stone)', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-black)' }}>No hay tiendas</p>
                  <p style={{ fontSize: 13, color: 'var(--color-stone)', marginTop: 4 }}>
                    {debouncedSearch ? 'Prueba con otro término' : 'No hay tiendas en esta región todavía'}
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
                    <div ref={sentinelRef} style={{ height: 1 }} />
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
