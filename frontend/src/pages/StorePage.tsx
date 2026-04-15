// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Award, CheckCircle, ChefHat, ChevronLeft, Clock, ExternalLink, Globe, Heart, Info, Loader2, Mail, MapPin, MessageCircle, Package, Phone, Search, Send, Star, Store, Truck, User } from 'lucide-react';
import { toast } from 'sonner';
// @ts-ignore — JS module
import ReportButton from '../components/moderation/ReportButton';
import PostViewer from '../components/PostViewer';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import apiClient from '../services/api/client';
import { useStoreFollow } from '../features/products/hooks';
import { useChatContext } from '../context/chat/ChatProvider';
import SEO from '../components/SEO';
import { useTranslation } from 'react-i18next';
import i18n from "../locales/i18n";
import { trackEvent } from '../utils/analytics';
const normalizeEntityId = v => v == null ? '' : String(v);
export default function StorePage() {
  const {
    storeSlug
  } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user
  } = useAuth();
  const {
    convertAndFormatPrice
  } = useLocale();
  const [activeTab, setActiveTab] = useState('products');
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [unavailable, setUnavailable] = useState(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [bulkRequesting, setBulkRequesting] = useState(false);
  const requestedProductId = searchParams.get('product');

  /* ── Data fetching ── */
  const storeQuery = useQuery({
    queryKey: ['store', storeSlug],
    queryFn: () => apiClient.get(`/store/${storeSlug}`),
    enabled: Boolean(storeSlug)
  });
  const store = storeQuery.data ?? null;
  const productsQuery = useQuery({
    queryKey: ['store', storeSlug, 'products'],
    queryFn: () => apiClient.get(`/store/${storeSlug}/products`, {
      params: {
        sort: 'featured',
        limit: 100
      }
    }),
    enabled: Boolean(storeSlug)
  });
  const recipesQuery = useQuery({
    queryKey: ['store', storeSlug, 'recipes', store?.producer_id],
    queryFn: () => apiClient.get(`/users/${store?.producer_id}/recipes`),
    enabled: Boolean(store?.producer_id)
  });
  const reviewsQuery = useQuery({
    queryKey: ['store', storeSlug, 'reviews'],
    queryFn: () => apiClient.get(`/store/${storeSlug}/reviews`, {
      params: {
        limit: 50
      }
    }),
    enabled: Boolean(storeSlug)
  });
  const certificatesQuery = useQuery({
    queryKey: ['store', storeSlug, 'certificates'],
    queryFn: () => apiClient.get(`/store/${storeSlug}/certificates`),
    enabled: Boolean(storeSlug)
  });
  const allProducts = Array.isArray(productsQuery.data?.products) ? productsQuery.data.products : Array.isArray(productsQuery.data) ? productsQuery.data : [];
  const recipes = Array.isArray(recipesQuery.data) ? recipesQuery.data : Array.isArray(recipesQuery.data?.recipes) ? recipesQuery.data.recipes : [];
  const reviews = Array.isArray(reviewsQuery.data?.reviews) ? reviewsQuery.data.reviews : [];
  const certificates = Array.isArray(certificatesQuery.data) ? certificatesQuery.data : [];
  const productTotal = productsQuery.data?.total || allProducts.length || store?.product_count || 0;
  const reviewsTotal = reviewsQuery.data?.total || reviews.length || store?.review_count || 0;
  const avgRating = reviewsQuery.data?.average_rating || store?.rating || 0;
  const isVerified = Boolean(store?.verified || store?.producer_verified);
  const storePlan = store?.plan || null;
  const {
    isFollowing,
    followLoading,
    handleFollowStore
  } = useStoreFollow(store?.slug || store?.store_slug);
  const {
    openConversation
  } = useChatContext();

  /* ── Product category pills ── */
  const productCategories = useMemo(() => {
    const cats = new Set();
    allProducts.forEach(p => {
      const cat = p.category_name || p.category || p.category_id;
      if (cat) cats.add(cat);
    });
    return ['all', ...Array.from(cats)];
  }, [allProducts]);
  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (categoryFilter !== 'all') {
      list = list.filter(p => (p.category_name || p.category || p.category_id) === categoryFilter);
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(p => (p.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [allProducts, categoryFilter, productSearch]);

  /* ── Handlers ── */
  const handleToggleFollow = async () => {
    if (!user) {
      toast.error(i18n.t('store.loginToFollow', 'Inicia sesión para seguir tiendas'));
      return;
    }
    try {
      await handleFollowStore();
      if (!isFollowing) trackEvent('store_followed', { store_slug: store?.slug });
      toast.success(isFollowing ? 'Dejaste de seguir' : 'Ahora sigues esta tienda');
    } catch {
      toast.error('Error');
    }
  };
  const handleChat = async () => {
    if (!user) {
      toast.error(i18n.t('store.iniciaSesionParaEnviarUnMensaje', 'Inicia sesión para enviar un mensaje'));
      return;
    }
    const storeUserId = store?.user_id || store?.producer_id;
    if (!storeUserId) {
      toast.error('Esta tienda no tiene chat disponible');
      return;
    }
    try {
      const conv = await openConversation(storeUserId, 'b2c');
      const conversationId = conv?.id || conv?.conversation_id;
      if (conversationId) navigate(`/messages/${conversationId}`);
    } catch {
      toast.error(i18n.t('product_detail.noSePudoAbrirElChat', 'No se pudo abrir el chat'));
    }
  };
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: store?.name, url });
        trackEvent('store_shared', { store_slug: store?.slug, method: 'native' });
      } catch {/* cancelled */}
    } else {
      await navigator.clipboard.writeText(url);
      trackEvent('store_shared', { store_slug: store?.slug, method: 'clipboard' });
      toast.success('Enlace copiado');
    }
  };
  useEffect(() => {
    if (!requestedProductId || allProducts.length === 0) return;
    const matched = allProducts.find(p => normalizeEntityId(p.product_id || p.id) === normalizeEntityId(requestedProductId));
    if (matched) {
      setActiveTab('products');
      setSelectedProduct(prev => normalizeEntityId(prev?.product_id || prev?.id) === normalizeEntityId(matched.product_id || matched.id) ? prev : matched);
    }
  }, [allProducts, requestedProductId]);
  // Analytics: track store view
  useEffect(() => {
    if (store?.slug) trackEvent('store_viewed', { store_slug: store.slug, producer_id: store.producer_id });
  }, [store?.slug]);

  // Unavailable products in viewer's country
  useEffect(() => {
    if (!storeSlug || !user?.country) return;
    apiClient.get(`/store/${storeSlug}/unavailable-count`, { params: { country: user.country } })
      .then(d => setUnavailable(d))
      .catch(() => setUnavailable(null));
  }, [storeSlug, user?.country]);

  const handleBulkRequest = async () => {
    if (!unavailable?.products?.length) return;
    if (!window.confirm(i18n.t('store.unavailableProducts.confirmAll', '¿Solicitar los {{n}} productos?').replace('{{n}}', unavailable.products.length))) return;
    setBulkRequesting(true);
    let ok = 0;
    for (const p of unavailable.products) {
      try { await apiClient.post('/market-requests', { product_id: p.product_id }); ok++; } catch { /* skip duplicates */ }
    }
    setBulkRequesting(false);
    if (ok > 0) toast.success(`${ok} productos solicitados`);
    setUnavailable(prev => prev ? { ...prev, count: 0, products: [] } : null);
  };

  const tabs = [{
    id: 'products',
    icon: <Package size={14} />,
    label: 'Productos',
    count: productTotal
  }, {
    id: 'recipes',
    icon: <ChefHat size={14} />,
    label: 'Recetas',
    count: recipes.length
  }, {
    id: 'reviews',
    icon: <Star size={14} />,
    label: i18n.t('store.reviews', 'Reseñas'),
    count: reviewsTotal
  }, {
    id: 'about',
    icon: <Info size={14} />,
    label: 'Sobre nosotros',
    count: null
  }];
  const tagline = store?.tagline || store?.long_description || store?.story || '';
  const showVerMas = tagline.length > 120;

  /* ── Loading ── */
  if (storeQuery.isLoading) {
    return <div aria-busy="true" aria-label="Cargando tienda" className="min-h-screen bg-stone-50">
        <div className="w-full aspect-[3/1] bg-stone-100" />
        <div className="px-4 -mt-10">
          <div className="skeleton-shimmer w-20 h-20 rounded-[14px] border-[3px] border-white" />
          <div className="skeleton-shimmer mt-3 h-[18px] w-1/2 rounded" />
          <div className="skeleton-shimmer mt-2 h-3.5 w-[30%] rounded" />
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton-shimmer flex-1 h-10 rounded-xl" />)}
          </div>
        </div>
      </div>;
  }

  /* ── Error ── */
  if (storeQuery.isError) {
    return <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle size={48} className="text-stone-300" strokeWidth={1.5} />
        <p className="text-lg font-semibold text-stone-950 mt-4">Error al cargar</p>
        <p className="text-sm text-stone-500 mt-1">{i18n.t('store.noSePudoCargarLaTiendaCompruebaT', 'No se pudo cargar la tienda. Comprueba tu conexión.')}</p>
        <button onClick={() => storeQuery.refetch()} className="mt-4 bg-stone-950 text-white border-none rounded-full px-6 py-3 min-h-[44px] text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors">
          Reintentar
        </button>
      </div>;
  }

  /* ── Not found ── */
  if (!store) {
    return <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-8 text-center">
        <Store size={64} className="text-stone-500" strokeWidth={1.2} />
        <p className="text-lg font-semibold text-stone-950 mt-4">Tienda no encontrada</p>
        <p className="text-sm text-stone-500 mt-1">Esta tienda no existe o ha sido eliminada.</p>
        <button onClick={() => navigate('/stores')} className="mt-4 bg-stone-950 text-white border-none rounded-full px-6 py-3 min-h-[44px] text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors">
          Explorar tiendas
        </button>
      </div>;
  }
  return <div className="min-h-screen bg-stone-50 pb-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <SEO title={`${store?.name || 'Tienda'} — Hispaloshop`} description={store?.tagline || store?.story?.slice(0, 160) || `Tienda de productos artesanales en Hispaloshop`} image={store?.hero_image || store?.logo} structuredData={[{
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: store?.name,
      image: store?.hero_image || store?.logo,
      url: `https://www.hispaloshop.com/store/${storeSlug}`,
      ...(store?.location && {
        address: {
          '@type': 'PostalAddress',
          addressLocality: store.location
        }
      }),
      ...(avgRating > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: avgRating,
          reviewCount: reviewsTotal || 1
        }
      })
    }]} />

      {/* ── Hero Banner 3:1 with overlaid TopBar ── */}
      <div className="relative w-full aspect-[3/1] bg-gradient-to-br from-stone-900 to-stone-950">
        {/* TopBar (absolute over hero — scrolls away with it) */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[52px] pt-[env(safe-area-inset-top,0px)]">
          <button type="button" onClick={() => navigate(-1)} className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm border-none cursor-pointer flex items-center justify-center" aria-label="Volver">
            <ChevronLeft size={20} strokeWidth={2} className="text-white" />
          </button>
          <span className="text-[15px] font-semibold text-white drop-shadow-md">
            {store.name}
          </span>
          <button type="button" onClick={handleShare} className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-sm border-none cursor-pointer flex items-center justify-center" aria-label="Compartir">
            <Send size={18} strokeWidth={1.8} className="text-white" />
          </button>
        </div>
        {store.hero_image && <img src={store.hero_image} alt={`Banner de ${store.name}`} loading="eager" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* ── Desktop 2-col layout ── */}
      <div className="lg:flex lg:gap-10 lg:items-start">
        {/* ── Store Info (left sidebar on desktop) ── */}
        <aside className="lg:w-[320px] xl:w-[360px] lg:shrink-0 lg:sticky lg:top-[60px] lg:self-start">
          <div className="relative px-0 -mt-10 lg:mt-4 lg:pt-2">
            <div className="flex items-end gap-3.5">
              {/* Avatar — square rounded */}
              <div className="w-20 h-20 rounded-[14px] overflow-hidden border-[3px] border-white bg-stone-100 flex items-center justify-center shrink-0 shadow-md">
                {store.logo ? <img src={store.logo} alt={store.name} className="w-full h-full object-cover" /> : <Store size={28} className="text-stone-500" />}
              </div>

              {/* Name + username */}
              <div className="flex-1 min-w-0 pb-1">
                <h1 className="text-xl font-bold text-stone-950 m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {store.name}
                </h1>
                {store.username && <p className="text-[13px] text-stone-500 mt-0.5 m-0">@{store.username}</p>}
              </div>
              {/* Section 3.5b — Report this store */}
              {(store.store_id || store.slug) && (
                <div className="flex items-center text-stone-500">
                  <ReportButton contentType="store" contentId={store.store_id || store.slug} contentOwnerId={store.user_id} />
                </div>
              )}
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {isVerified && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded-full bg-stone-950 text-white"><CheckCircle size={11} /> Verificado</span>}
              {storePlan && storePlan !== 'free' && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded-full bg-stone-100 text-stone-950">{storePlan.toUpperCase()}</span>}
              {store.country && <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-[3px] rounded-full bg-stone-100 text-stone-950">
                  {store.country === 'ES' ? '🇪🇸' : store.country === 'FR' ? '🇫🇷' : '🌍'} {store.location || store.country}
                </span>}
            </div>

            {/* Description with Ver más */}
            {tagline && <p className={`text-sm text-stone-500 leading-relaxed mt-2.5 ${!descExpanded && showVerMas ? 'line-clamp-2' : ''}`}>
                {tagline}
              </p>}
            {showVerMas && <button onClick={() => setDescExpanded(!descExpanded)} className="bg-transparent border-none cursor-pointer text-[13px] font-semibold text-stone-950 py-1 px-0 min-h-[44px] mt-0.5">
                {descExpanded ? 'Ver menos' : i18n.t('common.seeMore', 'Ver más')}
              </button>}

            {/* Stats inline */}
            <div className="flex items-center gap-1 mt-3 text-sm font-medium text-stone-950">
              <span>{productTotal} productos</span>
              <span className="text-stone-500">·</span>
              <span>{store.follower_count || 0} seguidores</span>
              <span className="text-stone-500">·</span>
              {avgRating > 0 ? <>
                  <Star size={13} fill="#0c0a09" stroke="#0c0a09" />
                  <span>{Number(avgRating).toFixed(1)}</span>
                </> : <span className="text-stone-400">{i18n.t('store.sinResenas', 'Sin reseñas')}</span>}
            </div>

            {/* 3 Action buttons */}
            <div className="flex gap-2 mt-3.5">
              <button type="button" onClick={handleToggleFollow} disabled={followLoading} className={`flex-1 h-11 rounded-full text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${isFollowing ? 'border border-stone-200 bg-white text-stone-950' : 'border-none bg-stone-950 text-white'}`}>
                <Heart size={15} fill={isFollowing ? '#0c0a09' : 'none'} />
                {followLoading ? '...' : isFollowing ? 'Siguiendo' : 'Seguir'}
              </button>
              <button type="button" onClick={handleChat} className="flex-1 h-11 rounded-full text-[13px] font-semibold border border-stone-200 bg-white text-stone-950 cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                <MessageCircle size={15} /> Mensaje
              </button>
              <button type="button" onClick={handleShare} className="flex-1 h-11 rounded-full text-[13px] font-semibold border border-stone-200 bg-white text-stone-950 cursor-pointer flex items-center justify-center gap-1.5 transition-colors">
                <Send size={15} /> Compartir
              </button>
            </div>

            {/* Free shipping bar */}
            {(storePlan === 'pro' || storePlan === 'elite') && store.free_shipping_min && <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-stone-100 flex items-center gap-2">
                <Truck size={16} className="text-stone-950" />
                <span className="text-[13px] font-medium text-stone-950">
                  Envío gratis desde {convertAndFormatPrice(store.free_shipping_min, 'EUR')} en esta tienda
                </span>
              </div>}
          </div>
        </aside>

        {/* ── Tabs + Content (right column on desktop) ── */}
        <div className="lg:flex-1 lg:min-w-0">
          {/* ── Sticky Tab Bar ── */}
          <div className="sticky top-0 z-40 bg-stone-50 border-b border-stone-200 mt-4 lg:mt-6">
            <div role="tablist" aria-label={i18n.t('store.seccionesDeLaTienda', 'Secciones de la tienda')} className="flex overflow-x-auto px-4 lg:px-0 scrollbar-hide">
              {tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-3 whitespace-nowrap min-h-[44px] text-[13px] bg-transparent border-none cursor-pointer border-b-2 transition-colors ${activeTab === tab.id ? 'font-semibold text-stone-950 border-b-stone-950' : 'font-normal text-stone-500 border-b-transparent'}`}>
                  {tab.icon} {tab.label}
                  {tab.count !== null && <span className="ml-1 text-[11px]">{tab.count}</span>}
                </button>)}
            </div>
          </div>

          {/* ── Tab Content ── */}
          <div className="px-4 lg:px-0 pt-3 pb-8">

        {/* ════ TAB: PRODUCTOS ════ */}
        {activeTab === 'products' && <>
            {/* Unavailable in your country banner */}
            {unavailable && unavailable.count > 0 && (
              <div className="mb-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-sm text-stone-700">
                  {i18n.t('store.unavailableProducts.banner', 'Este productor tiene {{n}} productos no disponibles en tu pais').replace('{{n}}', unavailable.count)}
                </p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setShowUnavailable(!showUnavailable)} className="rounded-full bg-white border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-700 min-h-[36px]">
                    {showUnavailable ? i18n.t('store.unavailableProducts.showAll', 'Ver todos') : i18n.t('store.unavailableProducts.viewAll', 'Ver cuales')}
                  </button>
                  <button onClick={handleBulkRequest} disabled={bulkRequesting} className="rounded-full bg-stone-950 px-3.5 py-2 text-xs font-semibold text-white min-h-[36px] disabled:opacity-50">
                    {bulkRequesting ? <Loader2 size={14} className="animate-spin mx-auto" /> : i18n.t('store.unavailableProducts.requestAll', 'Pedir todos')}
                  </button>
                </div>
                {showUnavailable && unavailable.products?.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {unavailable.products.map(p => (
                      <div key={p.product_id} className="flex items-center gap-2 rounded-xl bg-white p-2 border border-stone-100">
                        {p.image && <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-stone-950">{p.name}</p>
                          {p.price != null && <p className="text-[10px] text-stone-500">{p.price} {p.currency || 'EUR'}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Category filter pills */}
            {productCategories.length > 1 && <div className="flex gap-2 overflow-x-auto mb-3 pb-1 scrollbar-hide">
                {productCategories.map(cat => <button key={cat} onClick={() => setCategoryFilter(cat)} className={`shrink-0 px-3.5 py-2.5 min-h-[44px] rounded-full text-xs font-semibold cursor-pointer transition-colors ${categoryFilter === cat ? 'border-none bg-stone-950 text-white' : 'border border-stone-200 bg-white text-stone-950'}`}>
                    {cat === 'all' ? 'Todo' : cat}
                  </button>)}
              </div>}

            {/* Inline search (if > 12 products) */}
            {allProducts.length > 12 && <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar en esta tienda..." aria-label="Buscar productos en esta tienda" className="w-full h-11 pl-9 pr-3 text-[13px] text-stone-950 bg-stone-100 border-none rounded-full outline-none" />
              </div>}

            {productsQuery.isError ? <InlineError onRetry={() => productsQuery.refetch()} /> : productsQuery.isLoading ? <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton-shimmer rounded-2xl aspect-[4/5]" />)}
              </div> : filteredProducts.length > 0 ? <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map(product => <ProductCard key={product.product_id || product.id} product={product} showAddButton={false} />)}
              </div> : <EmptyState text={i18n.t('store.estaTiendaNoTieneProductosAun', 'Esta tienda no tiene productos aún')} />}
          </>}

        {/* ════ TAB: RECETAS ════ */}
        {activeTab === 'recipes' && (recipesQuery.isError ? <InlineError onRetry={() => recipesQuery.refetch()} /> : recipesQuery.isLoading ? <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="aspect-[3/4] rounded-xl bg-stone-100 animate-pulse" />)}
            </div> : recipes.length > 0 ? <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {recipes.map(recipe => {
          const recipeId = recipe.recipe_id || recipe.post_id || recipe.id;
          if (!recipeId) return null;
          return <button key={recipeId} type="button" onClick={() => navigate(`/recipes/${recipeId}`)} className="block w-full overflow-hidden bg-white shadow-sm rounded-[14px] cursor-pointer p-0 text-left">
                  {recipe.image_url && <img src={recipe.image_url} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover" />}
                  <div className="p-2.5">
                    <p className="text-[13px] font-semibold text-stone-950 m-0 line-clamp-2">
                      {recipe.title || recipe.caption || 'Receta'}
                    </p>
                    <div className="flex gap-2 mt-1.5 text-[11px] text-stone-500">
                      {recipe.prep_time && <span>⏱ {recipe.prep_time} min</span>}
                      {recipe.difficulty && <span>📊 {recipe.difficulty}</span>}
                    </div>
                  </div>
                </button>;
        })}
            </div> : <EmptyState text={i18n.t('store.estaTiendaNoHaCompartidoRecetasAun', 'Esta tienda no ha compartido recetas aún')} />)}

        {/* ════ TAB: RESEÑAS ════ */}
        {activeTab === 'reviews' && (reviewsQuery.isError ? <InlineError onRetry={() => reviewsQuery.refetch()} /> : reviewsQuery.isLoading ? <LoadingSpinner /> : reviews.length > 0 ? <div>
              {/* Rating summary card */}
              <div className="bg-stone-100 rounded-[14px] p-5 mb-4 text-center">
                <p className="text-5xl font-bold text-stone-950 m-0 leading-none">
                  {Number(avgRating || 0).toFixed(1)}
                </p>
                <div role="img" aria-label={`Valoración: ${Number(avgRating || 0).toFixed(1)} de 5 estrellas`} className="flex gap-[3px] justify-center mt-2">
                  {Array.from({
              length: 5
            }).map((_, i) => <Star key={i} size={18} aria-hidden="true" fill={i < Math.round(avgRating || 0) ? '#0c0a09' : '#e7e5e4'} stroke={i < Math.round(avgRating || 0) ? '#0c0a09' : '#e7e5e4'} />)}
                </div>
                <p className="text-[13px] text-stone-500 mt-1.5">
                  {reviewsTotal} reseñas verificadas
                </p>

                {/* Distribution bars */}
                <div className="mt-4 max-w-[280px] mx-auto">
                  {[5, 4, 3, 2, 1].map(star => {
              const count = reviews.filter(r => r.rating === star).length;
              const pct = reviewsTotal > 0 ? count / reviewsTotal * 100 : 0;
              return <div key={star} className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-stone-500 w-4 text-right">{star}★</span>
                        <div className="flex-1 h-2 rounded bg-stone-200 overflow-hidden">
                          <div className="h-full rounded bg-stone-950 transition-[width] duration-500" style={{
                    width: `${pct}%`
                  }} />
                        </div>
                        <span className="text-[11px] text-stone-500 w-[30px] text-right">
                          {Math.round(pct)}%
                        </span>
                      </div>;
            })}
                </div>
              </div>

              {/* Review list */}
              <div className="flex flex-col gap-3">
                {reviews.map((review, idx) => <div key={review.review_id || idx} className="bg-white rounded-xl shadow-sm p-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center">
                        <User size={16} className="text-stone-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-stone-950 m-0">
                          {review.user_name || review.username || i18n.t('store.anonimo', 'Anónimo')}
                        </p>
                        <div role="img" aria-label={`${review.rating || 0} de 5 estrellas`} className="flex items-center gap-0.5 mt-0.5">
                          {Array.from({
                    length: 5
                  }).map((_, i) => <Star key={i} size={11} aria-hidden="true" fill={i < (review.rating || 0) ? '#0c0a09' : '#e7e5e4'} stroke={i < (review.rating || 0) ? '#0c0a09' : '#e7e5e4'} />)}
                        </div>
                      </div>
                      {review.created_at && <span className="text-[11px] text-stone-500">
                          {new Date(review.created_at).toLocaleDateString('es-ES', {
                  month: 'short',
                  year: 'numeric'
                })}
                        </span>}
                    </div>
                    {(review.comment || review.text) && <p className="text-[13px] text-stone-500 leading-relaxed mt-2.5">
                        {review.comment || review.text}
                      </p>}
                    {review.product_name && <span className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                        {review.product_name}
                      </span>}
                    {review.seller_reply && <div className="mt-2.5 p-2 px-3 rounded-xl bg-stone-100 border-l-2 border-stone-200">
                        <p className="text-[11px] font-semibold text-stone-500 mb-1">Respuesta del vendedor</p>
                        <p className="text-[13px] text-stone-500">{review.seller_reply}</p>
                      </div>}
                  </div>)}
              </div>
            </div> : <EmptyState text={i18n.t('empty.reviews', 'Sin reseñas todavía')} />)}

        {/* ════ TAB: SOBRE NOSOTROS ════ */}
        {activeTab === 'about' && <div className="flex flex-col gap-6">
            {/* Story */}
            {(store.long_description || store.story || store.tagline) && <div>
                <SectionTitle>NUESTRA HISTORIA</SectionTitle>
                <p className="text-[15px] leading-[1.7] text-stone-500 whitespace-pre-line">
                  {store.long_description || store.story || store.tagline}
                </p>
              </div>}

            {store.founder_quote && <blockquote className="bg-stone-100 rounded-xl p-4 text-sm leading-relaxed text-stone-950 italic">
                &ldquo;{store.founder_quote}&rdquo;
              </blockquote>}

            {/* Contact info */}
            <div>
              <SectionTitle>CONTACTO</SectionTitle>
              <div className="bg-stone-100 rounded-xl p-4 flex flex-col gap-3">
                {store.location && <InfoRow icon={<MapPin size={16} />} text={store.location} />}
                {store.business_hours && <InfoRow icon={<Clock size={16} />} text={store.business_hours} />}
                {store.contact_email && <a href={`mailto:${store.contact_email}`} className="no-underline">
                    <InfoRow icon={<Mail size={16} />} text={store.contact_email} />
                  </a>}
                {store.website && <a href={store.website.startsWith('http') ? store.website : `https://${store.website}`} target="_blank" rel="noopener noreferrer" className="no-underline">
                    <InfoRow icon={<Globe size={16} />} text={store.website} extra={<ExternalLink size={12} className="text-stone-500" />} />
                  </a>}
                {store.contact_phone && <a href={`tel:${store.contact_phone}`} className="no-underline">
                    <InfoRow icon={<Phone size={16} />} text={store.contact_phone} />
                  </a>}
                {store.social_instagram && <a href={store.social_instagram.startsWith('http') ? store.social_instagram : `https://instagram.com/${store.social_instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="no-underline">
                    <InfoRow icon={<ExternalLink size={16} />} text={`Instagram: ${store.social_instagram}`} />
                  </a>}
                {store.social_tiktok && <a href={store.social_tiktok.startsWith('http') ? store.social_tiktok : `https://tiktok.com/@${store.social_tiktok.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="no-underline">
                    <InfoRow icon={<ExternalLink size={16} />} text={`TikTok: ${store.social_tiktok}`} />
                  </a>}
              </div>
            </div>

            {/* Certifications */}
            {certificates.length > 0 && <div>
                <SectionTitle>CERTIFICACIONES</SectionTitle>
                <div className="flex flex-wrap gap-1.5">
                  {certificates.map((cert, i) => <span key={i} className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full bg-stone-100 text-stone-950">
                      <Award size={13} /> {cert.certificate_type || cert.product_name || 'Certificado'}
                    </span>)}
                </div>
              </div>}

            {/* Member since */}
            {store.created_at && <p className="text-[13px] text-stone-500">
                Miembro desde {new Date(store.created_at).getFullYear()}
              </p>}

            {/* Video */}
            {store.video_url && <div>
                <SectionTitle>VIDEO</SectionTitle>
                <a href={store.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium text-stone-950 hover:underline no-underline">
                  <ExternalLink size={14} /> Ver video de presentacion
                </a>
              </div>}

            {/* Process photos */}
            {store.process_photos?.length > 0 && <div>
                <SectionTitle>NUESTRO PROCESO</SectionTitle>
                <div className="grid grid-cols-2 gap-1.5">
                  {store.process_photos.map((photo, i) => <img key={i} src={photo} alt={`Proceso ${i + 1}`} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-xl" />)}
                </div>
              </div>}

            {/* Community */}
            {store.community_slug && <div>
                <SectionTitle>COMUNIDAD</SectionTitle>
                <div className="bg-stone-100 rounded-xl p-4">
                  <p className="text-sm font-medium text-stone-950">{store.community_name || `Comunidad de ${store.name}`}</p>
                  {store.community_member_count > 0 && <p className="text-xs text-stone-500 mt-1">{store.community_member_count} miembros</p>}
                  <button type="button" onClick={() => navigate(`/communities/${store.community_slug}`)} className="mt-2 text-sm font-semibold text-stone-950 hover:underline bg-transparent border-none cursor-pointer p-0">
                    Unirme a la comunidad →
                  </button>
                </div>
              </div>}

            {/* Certificate digital */}
            {certificates.length > 0 && <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                <p className="text-sm font-medium text-stone-950">Certificado digital</p>
                <p className="text-xs text-stone-500 mt-1">Escanea el QR de nuestros productos para ver toda la info en tu idioma.</p>
              </div>}
          </div>}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {selectedPost && <PostViewer post={selectedPost} posts={recipes} profile={{
      name: store.name,
      profile_image: store.logo
    }} currentUser={user} onClose={() => setSelectedPost(null)} onNavigate={setSelectedPost} />}

      {selectedProduct && <ProductDetailOverlay product={selectedProduct} store={store} reviews={reviews} certificates={certificates} onClose={() => {
      setSelectedProduct(null);
      if (requestedProductId) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('product');
        setSearchParams(nextParams, {
          replace: true
        });
      }
    }} />}
    </div>;
}

/* ── Helpers ── */

function SectionTitle({
  children
}) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500 mb-2.5 m-0">
      {children}
    </p>;
}
function InfoRow({
  icon,
  text,
  extra
}) {
  return <div className="flex items-center gap-2 text-[13px] text-stone-500">
      <span className="text-stone-500 flex">{icon}</span>
      <span>{text}</span>
      {extra}
    </div>;
}
function EmptyState({
  text
}) {
  return <div className="text-center py-12 px-4 bg-white rounded-xl shadow-sm">
      <p className="text-sm text-stone-500">{text}</p>
    </div>;
}
function InlineError({
  onRetry
}) {
  return <div className="flex flex-col items-center justify-center py-12 px-4 bg-white rounded-xl shadow-sm gap-3">
      <AlertTriangle size={32} className="text-stone-300" strokeWidth={1.5} />
      <p className="text-sm font-semibold text-stone-950">Error al cargar</p>
      <button onClick={onRetry} className="bg-stone-950 text-white border-none rounded-full px-5 py-2.5 min-h-[44px] text-sm font-semibold cursor-pointer hover:bg-stone-800 transition-colors">
        Reintentar
      </button>
    </div>;
}
function LoadingSpinner() {
  return <div className="text-center py-12">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-950" />
    </div>;
}