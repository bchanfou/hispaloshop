import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SocialFeed from '../components/SocialFeed';
import {
  ShoppingBag, Store, ChevronRight, Info,
  Flame, TrendingUp, Award,
  Building2,
  Droplets, Cookie, Milk, Apple, Beef, Snowflake, Coffee, CakeSlice,
  Wine, Salad, Soup, Cherry, Croissant,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { API } from '../utils/api';
import SEO from '../components/SEO';

function BestSellers({ products, t }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="pb-6" data-testid="best-sellers-section">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> {t('home.bestSellers')}
          </h2>
          <Link to="/products" className="text-xs text-[#2D5A27] hover:underline flex items-center gap-0.5">
            {t('home.viewAll')} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {products.map((p) => (
            <Link
              key={p.product_id}
              to={`/products/${p.product_id}`}
              className="shrink-0 w-32 group"
              data-testid={`bestseller-${p.product_id}`}
            >
              <div className="w-32 h-32 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 group-hover:border-[#2D5A27] transition-colors">
                {p.images?.[0] ? (
                  <img
                    src={p.images[0].startsWith('http') ? p.images[0] : p.images[0].startsWith('/uploads/') ? `/api${p.images[0]}` : p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-[#1C1C1C] mt-1.5 truncate">{p.name}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#2D5A27] font-semibold">{p.price?.toFixed(2)} €</span>
                {p.total_sold > 0 && <span className="text-[10px] text-[#7A7A7A]">{p.total_sold} {t('home.sold', 'sold')}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedProducts({ products, t }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="pb-4" data-testid="featured-products-section">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider">{t('home.featuredProducts')}</h2>
          <Link to="/products" className="text-xs text-[#2D5A27] hover:underline flex items-center gap-0.5" data-testid="view-all-products">
            {t('home.viewAll')} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {products.map((product) => (
            <Link
              key={product.product_id}
              to={`/products/${product.product_id}`}
              className="shrink-0 w-28 group"
              data-testid={`featured-product-${product.product_id}`}
            >
              <div className="w-28 h-28 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 group-hover:border-[#2D5A27] transition-colors">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0].startsWith('http') ? product.images[0] : product.images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-[#1C1C1C] mt-1.5 truncate">{product.name}</p>
              <p className="text-xs text-[#2D5A27] font-semibold">{product.price?.toFixed(2)} €</p>
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
        const followed = all.filter((r) => r?.user?.is_followed_by_me);
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
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] uppercase tracking-wider text-[#7A7A7A] font-semibold">Reels de perfiles que sigues</p>
        <Link to="/discover?tab=reels" className="text-xs text-[#2D5A27] hover:underline flex items-center gap-0.5">
          Ver todos <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
        {reels.map((reel) => {
          const reelId = reel.id || reel.post_id;
          const thumb = reel.thumbnail_url || reel.media?.[0]?.thumbnail_url || reel.media?.[0]?.url;
          const name = reel.user?.full_name || reel.user_name || 'Perfil';
          return (
            <Link key={reelId} to="/discover?tab=reels" className="shrink-0 w-24" data-testid={`followed-reel-${reelId}`}>
              <div className="w-24 h-36 rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                {thumb ? (
                  <img src={thumb} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">Reel</div>
                )}
              </div>
              <p className="mt-1 text-[10px] text-[#555] truncate">{name}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [activeInfoCard, setActiveInfoCard] = useState(null);
  const { user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/products?approved_only=true`).then((r) => setFeatured((r.data.products || r.data || []).slice(0, 15))).catch(() => {}),
      axios.get(`${API}/feed/best-sellers?limit=8`).then((r) => setBestSellers(r.data || [])).catch(() => {}),
    ]);
  }, []);

  const infoCards = [
    {
      id: 'about',
      icon: Info,
      label: 'Que es Hispaloshop?',
      href: '/about',
      desc: 'Marketplace social de alimentacion real: productores e importadores venden, influencers recomiendan y clientes compran con trazabilidad.',
      cta: 'Ver como funciona',
    },
    {
      id: 'influencer',
      icon: Award,
      label: 'Ser Influencer',
      href: '/influencers/registro',
      desc: 'Progresa por tiers y monetiza ventas verificables con niveles activos del 3% al 7% segun GMV.',
      cta: 'Crear perfil influencer',
    },
    {
      id: 'producer',
      icon: Store,
      label: 'Ser Productor',
      href: '/vender/registro',
      desc: 'Publica productos, genera certificado digital y QR funcional para tus lotes.',
      cta: 'Crear perfil productor',
    },
    {
      id: 'importer',
      icon: Building2,
      label: 'Ser Importador',
      href: '/importer/register',
      desc: 'Mismo alcance que Productor: catalogo, ventas y certificados digitales con QR por producto.',
      cta: 'Crear perfil importador',
    },
  ];

  const activeInfo = infoCards.find((item) => item.id === activeInfoCard);

  return (
    <div className="min-h-screen bg-[#FAF7F2] relative overflow-x-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-100/40 blur-3xl" />
      <div className="pointer-events-none absolute top-48 -right-20 w-64 h-64 rounded-full bg-amber-100/30 blur-3xl" />
      <SEO
        title="Hispaloshop - Buy, Sell & Earn | Global Food Marketplace"
        description="Buy certified food products from local producers. Sell to 18+ countries. Earn as an influencer. Secure payments, 24-48h delivery."
        url="https://www.hispaloshop.com"
      />
      <Header />

      <section className="pt-4 pb-3 md:pt-6 md:pb-5" data-testid="hero-section">
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="font-heading text-xl md:text-2xl text-[#1C1C1C] font-semibold">Descubre producto real</h1>
            <Link to="/discover" className="text-xs text-[#2D5A27] hover:underline flex items-center gap-1">
              Explorar feed <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {[
              { icon: Droplets, label: t('home.oils'), cat: 'aceite-condimentos', bg: 'bg-emerald-50', color: 'text-emerald-700' },
              { icon: Beef, label: t('home.meat'), cat: 'carnes-huevos', bg: 'bg-red-50', color: 'text-red-700' },
              { icon: Milk, label: t('home.dairy'), cat: 'lacteos', bg: 'bg-blue-50', color: 'text-blue-700' },
              { icon: Apple, label: t('home.preserves'), cat: 'conservas', bg: 'bg-green-50', color: 'text-green-700' },
              { icon: Cookie, label: t('home.snacks'), cat: 'frutos-secos-snacks', bg: 'bg-orange-50', color: 'text-orange-700' },
              { icon: CakeSlice, label: t('home.cheese'), cat: 'quesos', bg: 'bg-yellow-50', color: 'text-yellow-700' },
              { icon: Coffee, label: t('home.coffee'), cat: 'cafe-infusiones', bg: 'bg-amber-50', color: 'text-amber-700' },
              { icon: Croissant, label: t('home.bakery', 'Bakery'), cat: 'panaderia', bg: 'bg-amber-50', color: 'text-amber-600' },
              { icon: Cherry, label: t('home.fruits', 'Fruits'), cat: 'frutas-verduras', bg: 'bg-lime-50', color: 'text-lime-700' },
              { icon: Wine, label: t('home.drinks', 'Drinks'), cat: 'bebidas', bg: 'bg-purple-50', color: 'text-purple-700' },
              { icon: Soup, label: t('home.sauces', 'Sauces'), cat: 'salsas-condimentos', bg: 'bg-rose-50', color: 'text-rose-600' },
              { icon: Snowflake, label: t('home.frozen'), cat: 'congelados', bg: 'bg-cyan-50', color: 'text-cyan-700' },
              { icon: Salad, label: t('home.organic', 'Organic'), cat: 'organico', bg: 'bg-green-50', color: 'text-green-600' },
            ].map((c) => {
              const Icon = c.icon;
              const href = `/products?category=${c.cat}`;
              return (
                <Link key={c.cat} to={href} className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className={`w-14 h-14 rounded-2xl ${c.bg} border border-stone-200/50 flex items-center justify-center hover:shadow-md hover:scale-105 transition-all`}>
                    <Icon className={`w-6 h-6 ${c.color}`} strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] text-text-muted font-medium w-14 text-center truncate">{c.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <FeaturedProducts products={featured} t={t} />

      <section className="pb-3 pt-1">
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-[#7A7A7A] font-semibold">Accesos rapidos</div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {infoCards.map((item) => {
              const Icon = item.icon;
              const isActive = activeInfoCard === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveInfoCard((prev) => (prev === item.id ? null : item.id))}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' : 'bg-white text-[#1C1C1C] border-stone-200 hover:border-[#2D5A27]'}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#2D5A27]'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {activeInfo && (
            <div className="mt-3 rounded-2xl border border-stone-200 bg-white p-4 md:p-5 animate-in fade-in-50 duration-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-[#1C1C1C] text-sm md:text-base">{activeInfo.label}</h3>
                  <p className="text-xs md:text-sm text-text-muted mt-1.5 max-w-2xl">{activeInfo.desc}</p>
                </div>
                <Link
                  to={activeInfo.href}
                  className="shrink-0 inline-flex items-center gap-1 text-xs md:text-sm font-medium text-[#2D5A27] hover:underline"
                >
                  {activeInfo.cta} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4">
        <div className="border-t border-stone-200/60" />
      </div>

      <section className="py-5" data-testid="social-feed-section">
        <div className="max-w-5xl mx-auto px-4">
          <FollowedReelsStrip user={user} />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-[#7A7A7A] uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              {user ? t('home.yourFeed') : t('home.feed')}
            </h2>
            <div className="flex items-center gap-2">
              <Link to="/discover?tab=reels" className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                Reels
              </Link>
              <Link to="/discover" className="text-xs text-[#2D5A27] hover:underline flex items-center gap-0.5">
                Explorar todo <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <SocialFeed />
        </div>
      </section>

      <BestSellers products={bestSellers} t={t} />
      <Footer />
    </div>
  );
}
