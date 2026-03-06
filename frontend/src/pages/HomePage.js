import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HeroSection from '../components/HeroSection';
import { ROLE_OPTIONS } from '../components/RoleSelector';
import RolePills from '../components/RolePills';
import CategoryNav from '../components/CategoryNav';
import SocialFeed from '../components/SocialFeed';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { API } from '../utils/api';
import { demoProducts } from '../data/demoData';
import { DEMO_MODE } from '../config/featureFlags';
import SEO from '../components/SEO';
import useGeolocation from '../hooks/useGeolocation';
import { trackMarketingEvent } from '../utils/analytics';

const ROLE_STORAGE_KEY = 'hispaloshop_home_role';

function FeaturedProducts({ products, t }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="pb-5" data-testid="featured-products-section">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#7A7A7A]">Descubiertos recientemente</h2>
          <Link to="/products" className="flex items-center gap-0.5 text-xs text-[#2D5A27] hover:underline" data-testid="view-all-products">
            {t('home.viewAll')} <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {products.map((product) => (
            <Link
              key={product.product_id}
              to={`/products/${product.product_id}`}
              className="group w-28 shrink-0"
              data-testid={`featured-product-${product.product_id}`}
            >
              <div className="h-24 w-28 overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 transition-colors group-hover:border-[#2D5A27]">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0].startsWith('http') ? product.images[0] : product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-stone-300">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                )}
              </div>
              <p className="mt-1.5 truncate text-xs font-medium text-[#1C1C1C]">{product.name}</p>
              <p className="text-xs font-semibold text-[#2D5A27]">{product.price?.toFixed(2)} EUR</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FollowedReelsStrip({ user }) {
  const [reels, setReels] = useState([]);

  useEffect(() => {
    if (!user) {
      setReels([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`${API}/reels?limit=40`, { withCredentials: true });
        const all = res.data?.items || res.data || [];
        const followed = all.filter((reel) => reel?.user?.is_followed_by_me);
        if (mounted) setReels(followed.slice(0, 12));
      } catch {
        if (mounted) setReels([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  if (!user || reels.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A7A7A]">Reels de perfiles que sigues</p>
        <Link to="/discover?tab=reels" className="flex items-center gap-0.5 text-xs text-[#2D5A27] hover:underline">
          Ver todos <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
        {reels.map((reel) => {
          const reelId = reel.id || reel.post_id;
          const thumb = reel.thumbnail_url || reel.media?.[0]?.thumbnail_url || reel.media?.[0]?.url;
          const name = reel.user?.full_name || reel.user_name || 'Perfil';
          return (
            <Link key={reelId} to="/discover?tab=reels" className="w-24 shrink-0" data-testid={`followed-reel-${reelId}`}>
              <div className="h-36 w-24 overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
                {thumb ? (
                  <img src={thumb} alt={name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">Reel</div>
                )}
              </div>
              <p className="mt-1 truncate text-[10px] text-[#555]">{name}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [selectedRole] = useState(() => {
    if (typeof window === 'undefined') return 'buyer';
    return window.localStorage.getItem(ROLE_STORAGE_KEY) || 'buyer';
  });
  const [feedCategory, setFeedCategory] = useState('');
  const { user } = useAuth();
  const { country, countries } = useLocale();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    error: geolocationError,
    hasLocationPreference,
    locationLabel,
    requestGeolocation,
    savePostalCode,
    status: geolocationStatus,
  } = useGeolocation();

  useEffect(() => {
    axios.get(`${API}/products?approved_only=true`).then((response) => {
      const data = (response.data.products || response.data || []).slice(0, 15);
      setFeatured(data.length > 0 ? data : (DEMO_MODE ? demoProducts.slice(0, 15) : []));
    }).catch(() => {
      setFeatured(DEMO_MODE ? demoProducts.slice(0, 15) : []);
    });
  }, []);

  const activeRole = useMemo(
    () => ROLE_OPTIONS.find((role) => role.id === selectedRole) || ROLE_OPTIONS[0],
    [selectedRole]
  );
  const geoSummary = hasLocationPreference ? locationLabel : (countries?.[country]?.name || country || 'Tu zona');
  const seoTitle = `${activeRole.seoTitle} | Hispaloshop`;
  const seoDescription = activeRole.seoDescription;
  const structuredData = useMemo(() => ([
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Hispaloshop',
      url: 'https://www.hispaloshop.com',
      description: 'Productos artesanales de tu zona y delicatessen importadas con pago seguro y trazabilidad real.',
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: ROLE_OPTIONS.map((role, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: role.headline,
          description: role.seoDescription,
          url: role.canonical,
        })),
      },
    },
  ]), []);

  const handleDiscover = useCallback(() => {
    trackMarketingEvent('home_primary_cta_click', {
      role: activeRole.id,
      has_location_preference: hasLocationPreference,
      location_hint: geoSummary,
    });
    navigate('/products');
  }, [activeRole.id, geoSummary, hasLocationPreference, navigate]);

  const handleRequestLocation = useCallback(async () => {
    trackMarketingEvent('home_location_request', {
      role: activeRole.id,
    });
    return requestGeolocation();
  }, [activeRole.id, requestGeolocation]);

  const handleSecondaryCtaClick = useCallback(() => {
    trackMarketingEvent('home_secondary_cta_click', {
      role: activeRole.id,
      destination: '/info/productor',
    });
  }, [activeRole.id]);

  const handleSavePostalCode = useCallback((postalCode) => {
    const saved = savePostalCode(postalCode);
    if (saved) {
      trackMarketingEvent('home_postal_code_saved', {
        role: activeRole.id,
        postal_code: String(postalCode).trim().toUpperCase(),
      });
    }
    return saved;
  }, [activeRole.id, savePostalCode]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FDFCF8]">

      <SEO
        title={seoTitle}
        description={seoDescription}
        url="https://www.hispaloshop.com"
        structuredData={structuredData}
      />

      <Header />

      <HeroSection
        locationLabel={geoSummary}
        hasLocationPreference={hasLocationPreference}
        geolocationError={geolocationError}
        geolocationStatus={geolocationStatus}
        onDiscover={handleDiscover}
        onRequestLocation={handleRequestLocation}
        onSavePostalCode={handleSavePostalCode}
        onSecondaryCtaClick={handleSecondaryCtaClick}
      />

      <RolePills />

      <CategoryNav
        products={featured.length ? featured : demoProducts}
        activeCategory={feedCategory}
        title="Categorias"
        getCategoryHref={(slug) => `/products?category=${slug}`}
        onSelectCategory={(slug) => setFeedCategory((current) => (current === slug ? '' : slug))}
        variant="home-minimal"
      />

      <FeaturedProducts products={featured} t={t} />

      <div className="max-w-6xl mx-auto px-4">
        <div className="border-t border-stone-200/60" />
      </div>

      <section className="pb-10 pt-6" data-testid="social-feed-section">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7A7A7A]">Feed</p>
                <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-[#111111]">
                  {user ? t('home.yourFeed') : t('home.feed')}
                </h2>
              </div>
              <Link to="/discover?tab=feeds" className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50">
                Ver mas
              </Link>
            </div>
            <SocialFeed selectedCategory={feedCategory} />
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-4">
              <FollowedReelsStrip user={user} />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
