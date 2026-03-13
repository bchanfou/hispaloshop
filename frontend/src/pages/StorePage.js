import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Bell,
  CheckCircle,
  ExternalLink,
  Globe,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  ShoppingBag,
  SquareLibrary,
  Star,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';
import Footer from '../components/Footer';
import Header from '../components/Header';
import PostViewer from '../components/PostViewer';
import ProductDetailOverlay from '../components/store/ProductDetailOverlay';
import PremiumSelect from '../components/ui/PremiumSelect';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';
import { useStoreFollow } from '../features/products/hooks';

const normalizeEntityId = (value) => (value == null ? '' : String(value));

function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm transition-all duration-150 ease-out ${
        active ? 'bg-stone-950 text-white shadow-sm' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-white/15 text-white' : 'bg-white text-stone-500'}`}>
        {count}
      </span>
    </button>
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="rounded-3xl border border-stone-100 bg-white px-6 py-16 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-stone-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">{description}</p>
    </div>
  );
}

function ProductTile({ product, onOpen, formatPrice }) {
  const primaryImage = product.images?.[0] || product.image_url || null;

  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className="group block text-left"
      aria-label={`Abrir detalle de ${product.name}`}
    >
      <div className="overflow-hidden rounded-[26px] border border-stone-100 bg-white p-3 shadow-sm transition-all duration-150 ease-out hover:-translate-y-[1px] hover:shadow-md">
        <div className="relative overflow-hidden rounded-2xl bg-stone-100">
          <div className="aspect-square">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400">
                <ShoppingBag className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-4 pt-10">
            <p className="text-base font-semibold text-white">{formatPrice(product)}</p>
          </div>
        </div>
        <div className="px-1 pb-1 pt-4">
          <h3 className="line-clamp-2 text-sm font-medium text-stone-950">{product.name}</h3>
          <p className="mt-1 text-xs text-stone-500">
            {product.category_name || product.category || 'Selección de tienda'}
          </p>
        </div>
      </div>
    </button>
  );
}

function PostTile({ post, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(post)}
      className="group relative block overflow-hidden rounded-[24px] bg-stone-100 text-left"
      aria-label="Abrir publicación"
    >
      <div className="aspect-square">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.caption || 'Publicación de tienda'}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-end bg-stone-900 p-4">
            <p className="line-clamp-4 text-sm leading-relaxed text-white/80">{post.caption || 'Publicación sin imagen'}</p>
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-4 pt-12">
        <p className="line-clamp-2 text-sm text-white">{post.caption || 'Abrir publicación'}</p>
      </div>
    </button>
  );
}

export default function StorePage() {
  const { storeSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { convertAndFormatPrice } = useLocale();
  const [activeTab, setActiveTab] = useState('posts');
  const [productSort, setProductSort] = useState('featured');
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const requestedProductId = searchParams.get('product');

  const storeQuery = useQuery({
    queryKey: ['store', storeSlug],
    queryFn: () => apiClient.get(`/store/${storeSlug}`),
    enabled: Boolean(storeSlug),
  });

  const store = storeQuery.data ?? null;

  const postsQuery = useQuery({
    queryKey: ['store', storeSlug, 'posts', store?.producer_id],
    queryFn: () => apiClient.get(`/users/${store.producer_id}/posts`),
    enabled: Boolean(store?.producer_id),
  });

  const productsQuery = useQuery({
    queryKey: ['store', storeSlug, 'products', productSort],
    queryFn: () => apiClient.get(`/store/${storeSlug}/products`, { params: { sort: productSort, limit: 100 } }),
    enabled: Boolean(storeSlug),
  });

  const reviewsQuery = useQuery({
    queryKey: ['store', storeSlug, 'reviews'],
    queryFn: () => apiClient.get(`/store/${storeSlug}/reviews`, { params: { limit: 50 } }),
    enabled: Boolean(storeSlug),
  });

  const certificatesQuery = useQuery({
    queryKey: ['store', storeSlug, 'certificates'],
    queryFn: () => apiClient.get(`/store/${storeSlug}/certificates`),
    enabled: Boolean(storeSlug),
  });

  const posts = Array.isArray(postsQuery.data) ? postsQuery.data : [];
  const products = Array.isArray(productsQuery.data?.products) ? productsQuery.data.products : [];
  const reviews = Array.isArray(reviewsQuery.data?.reviews) ? reviewsQuery.data.reviews : [];
  const certificates = Array.isArray(certificatesQuery.data) ? certificatesQuery.data : [];
  const productTotal = productsQuery.data?.total || products.length || store?.product_count || 0;
  const reviewsTotal = reviewsQuery.data?.total || reviews.length || store?.review_count || 0;
  const avgRating = reviewsQuery.data?.average_rating || store?.rating || 0;
  const hasFastShipping = Boolean(store?.delivery_time);
  const isVerified = Boolean(store?.verified || store?.producer_verified);
  const { isFollowing, followLoading, handleFollowStore } = useStoreFollow(store?.slug || store?.store_slug);

  const ownerLabel = useMemo(() => {
    if (!store) return '';
    if (store.owner_type === 'importer' || store.store_type === 'importer') return 'Importador';
    return t('store.seller', 'Productor');
  }, [store, t]);

  const productSortOptions = [
    { value: 'featured', label: t('store.sortFeatured', 'Destacados') },
    { value: 'newest', label: t('store.sortNewest', 'Recientes') },
    { value: 'price_asc', label: t('store.sortPriceAsc', 'Precio: menor') },
    { value: 'price_desc', label: t('store.sortPriceDesc', 'Precio: mayor') },
    { value: 'rating', label: t('store.sortRating', 'Mejor valorados') },
  ];

  const handleToggleFollow = async () => {
    if (!user) {
      toast.error(t('store.loginToFollow', 'Inicia sesión para seguir tiendas'));
      return;
    }

    try {
      await handleFollowStore();
      toast.success(
        isFollowing
          ? t('store.unfollowed', 'Has dejado de seguir esta tienda')
          : t('store.followed', 'Ahora sigues esta tienda'),
      );
    } catch {
      toast.error(t('store.followError', 'No hemos podido actualizar el seguimiento'));
    }
  };

  const formatPrice = (product) =>
    convertAndFormatPrice(product.display_price || product.price || 0, product.display_currency || product.currency || 'EUR');

  useEffect(() => {
    if (!requestedProductId || products.length === 0) return;

    const matchedProduct = products.find(
      (product) => normalizeEntityId(product.product_id || product.id) === normalizeEntityId(requestedProductId),
    );
    if (!matchedProduct) return;

    setActiveTab('products');
    setSelectedProduct((current) => (
      normalizeEntityId(current?.product_id || current?.id) === normalizeEntityId(matchedProduct.product_id || matchedProduct.id)
        ? current
        : matchedProduct
    ));
  }, [products, requestedProductId]);

  if (storeQuery.isLoading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-stone-950" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <BackButton />
          <div className="mx-auto mt-8 max-w-xl rounded-[32px] border border-stone-200 bg-white p-10">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.28em] text-stone-500">Tienda</p>
            <h1 className="mb-3 text-2xl font-semibold text-stone-950">{t('store.notFound', 'Tienda no encontrada')}</h1>
            <p className="mb-6 text-sm leading-relaxed text-stone-500">
              {t('store.notFoundDesc', 'La tienda que buscas no existe o ya no está disponible.')}
            </p>
            <Link to="/stores">
              <Button className="rounded-full bg-stone-950 text-white hover:bg-stone-800">
                {t('store.viewAll', 'Ver todas las tiendas')}
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
          <BackButton />
          <div className="mt-5 overflow-hidden rounded-[32px] border border-stone-100 bg-white shadow-sm">
            <div className="relative h-[180px] bg-stone-100 md:h-[280px]">
              {store.hero_image ? (
                <img
                  src={store.hero_image}
                  alt={`Banner de ${store.name}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-stone-100" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            </div>

            <div className="relative px-5 pb-6 md:px-8">
              <div className="-mt-14 flex flex-col gap-5 md:-mt-16 md:flex-row md:items-end md:justify-between">
                <div className="flex items-end gap-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-stone-100 shadow-sm md:h-28 md:w-28">
                    {store.logo ? (
                      <img src={store.logo} alt={`Logo de ${store.name}`} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-9 w-9 text-stone-400" />
                    )}
                  </div>

                  <div className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold tracking-tight text-stone-950 md:text-3xl">{store.name}</h1>
                      {isVerified ? <CheckCircle className="h-5 w-5 text-stone-950" /> : null}
                    </div>
                    {store.location ? (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-500">
                        <MapPin className="h-4 w-4" />
                        {store.location}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={followLoading}
                    variant={isFollowing ? 'outline' : 'default'}
                    className={`rounded-full ${
                      isFollowing
                        ? 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                        : 'bg-stone-950 text-white hover:bg-stone-800'
                    }`}
                    aria-label={isFollowing ? 'Dejar de seguir tienda' : 'Seguir tienda'}
                  >
                    {isFollowing ? <Bell className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
                    {followLoading
                      ? t('common.loading', 'Cargando...')
                      : isFollowing
                        ? t('store.following', 'Siguiendo')
                        : t('store.followStore', 'Seguir tienda')}
                  </Button>
                  {store.contact_email ? (
                    <a href={`mailto:${store.contact_email}`}>
                      <Button type="button" variant="outline" className="rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50">
                        <Mail className="h-4 w-4" />
                        Contactar
                      </Button>
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-stone-950 px-3 py-1 text-sm font-medium text-white">
                  {ownerLabel}
                </span>
                {store.specialization ? (
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">{store.specialization}</span>
                ) : null}
                {hasFastShipping ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
                    <Truck className="h-3.5 w-3.5" />
                    Envío {store.delivery_time}
                  </span>
                ) : null}
              </div>

              {store.tagline ? (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-600">{store.tagline}</p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
                <div className="rounded-3xl bg-stone-50 p-4">
                  <p className="text-xl font-semibold text-stone-950">{posts.length}</p>
                  <p className="text-xs text-stone-500">Publicaciones</p>
                </div>
                <div className="rounded-3xl bg-stone-50 p-4">
                  <p className="text-xl font-semibold text-stone-950">{productTotal}</p>
                  <p className="text-xs text-stone-500">Productos</p>
                </div>
                <div className="rounded-3xl bg-stone-50 p-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-stone-950 stroke-stone-950" />
                    <p className="text-xl font-semibold text-stone-950">{Number(avgRating || 0).toFixed(1)}</p>
                  </div>
                  <p className="text-xs text-stone-500">{store.follower_count || 0} seguidores</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_340px]">
          <div className="space-y-6">
            {store.story || store.founder_quote ? (
              <section className="rounded-[32px] border border-stone-100 bg-white p-6 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-400">Perfil</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">Una tienda con contexto</h2>
                {store.story ? (
                  <p className="mt-4 text-sm leading-relaxed text-stone-600">{store.story}</p>
                ) : null}
                {store.founder_quote ? (
                  <blockquote className="mt-4 rounded-3xl bg-stone-50 px-5 py-4 text-sm leading-relaxed text-stone-700">
                    “{store.founder_quote}”
                  </blockquote>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-[32px] border border-stone-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <TabButton active={activeTab === 'posts'} onClick={() => setActiveTab('posts')} icon={SquareLibrary} label="Publicaciones" count={posts.length} />
                <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={ShoppingBag} label="Productos" count={productTotal} />
                <TabButton active={activeTab === 'certificates'} onClick={() => setActiveTab('certificates')} icon={Award} label="Certificados" count={certificates.length} />
              </div>

              <div className="mt-6">
                {activeTab === 'posts' ? (
                  postsQuery.isLoading ? (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-stone-950" />
                      <p className="text-sm text-stone-500">{t('common.loading', 'Cargando...')}</p>
                    </div>
                  ) : posts.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {posts.map((post) => (
                        <PostTile key={post.post_id} post={post} onOpen={setSelectedPost} />
                      ))}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="Todavía no hay publicaciones"
                      description="Cuando la tienda comparta historias o novedades, aparecerán aquí en una cuadrícula visual."
                    />
                  )
                ) : null}

                {activeTab === 'products' ? (
                  <div>
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-stone-950">Selección de productos</h3>
                        <p className="mt-1 text-sm text-stone-500">Cada producto se abre en una ficha flotante, sin sacarte del perfil.</p>
                      </div>
                      <div className="w-full sm:w-56">
                        <PremiumSelect
                          value={productSort}
                          onChange={setProductSort}
                          options={productSortOptions}
                          ariaLabel="Ordenar productos"
                        />
                      </div>
                    </div>

                    {productsQuery.isLoading ? (
                      <div className="py-16 text-center">
                        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-stone-950" />
                        <p className="text-sm text-stone-500">{t('common.loading', 'Cargando...')}</p>
                      </div>
                    ) : products.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                        {products.map((product) => (
                          <ProductTile key={product.product_id} product={product} onOpen={setSelectedProduct} formatPrice={formatPrice} />
                        ))}
                      </div>
                    ) : (
                      <EmptyPanel
                        title="No hay productos disponibles"
                        description="La tienda todavía no ha publicado artículos visibles en el catálogo."
                      />
                    )}
                  </div>
                ) : null}

                {activeTab === 'certificates' ? (
                  certificates.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {certificates.map((certificate) => {
                        const certificateProductId = certificate.product_id || certificate.product?.product_id || certificate.product?.id;

                        return (
                        <div key={certificate.certificate_id || certificateProductId} className="rounded-3xl border border-stone-100 bg-stone-50 p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-stone-700">
                              <Award className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-stone-950">
                                {certificate.product_name || 'Certificado digital'}
                              </p>
                              <p className="mt-1 text-sm text-stone-500">Documento validado para este producto.</p>
                              {certificateProductId ? (
                                <Link to={`/certificate/${certificateProductId}`} className="mt-3 inline-flex">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-full border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                                    aria-label={`Ver certificado digital de ${certificate.product_name || 'producto'}`}
                                  >
                                    Ver certificado digital
                                  </Button>
                                </Link>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="mt-3 rounded-full border-stone-200 bg-white text-stone-700"
                                  disabled
                                  aria-label={`Certificado no disponible para ${certificate.product_name || 'producto'}`}
                                >
                                  Ver certificado digital
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );})}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="No hay certificados visibles"
                      description="Los certificados aparecerán aquí cuando la tienda complete su documentación digital."
                    />
                  )
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[32px] border border-stone-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-stone-950">Información clave</h3>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex items-start gap-3 text-stone-600">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-stone-700" />
                  <div>
                    <p className="font-medium text-stone-900">{store.follower_count || 0} seguidores</p>
                    <p className="text-stone-500">Comunidad que sigue esta tienda.</p>
                  </div>
                </div>
                {store.full_address ? (
                  <div className="flex items-start gap-3 text-stone-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-700" />
                    <div>
                      <p className="font-medium text-stone-900">Ubicación</p>
                      <p className="text-stone-500">{store.full_address}</p>
                    </div>
                  </div>
                ) : null}
                {store.delivery_time ? (
                  <div className="flex items-start gap-3 text-stone-600">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-stone-700" />
                    <div>
                      <p className="font-medium text-stone-900">Entrega</p>
                      <p className="text-stone-500">{store.delivery_time}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[32px] border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-stone-950" />
                <h3 className="text-lg font-semibold text-stone-950">Contacto</h3>
              </div>
              <div className="space-y-3 text-sm text-stone-600">
                {store.contact_email ? (
                  <a href={`mailto:${store.contact_email}`} className="flex items-center gap-3 transition-colors hover:text-stone-950">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{store.contact_email}</span>
                  </a>
                ) : null}
                {store.contact_phone ? (
                  <a href={`tel:${store.contact_phone}`} className="flex items-center gap-3 transition-colors hover:text-stone-950">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{store.contact_phone}</span>
                  </a>
                ) : null}
                {store.website ? (
                  <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 transition-colors hover:text-stone-950">
                    <Globe className="h-4 w-4 shrink-0" />
                    <span>Sitio web</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-[32px] border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-stone-950" />
                <h3 className="text-lg font-semibold text-stone-950">Reseñas recientes</h3>
              </div>
              <div className="rounded-3xl bg-stone-50 p-4">
                <div className="flex items-center gap-2 text-stone-950">
                  <Star className="h-5 w-5 fill-stone-950 stroke-stone-950" />
                  <span className="text-xl font-semibold">{Number(avgRating || 0).toFixed(1)}</span>
                  <span className="text-sm text-stone-500">({reviewsTotal})</span>
                </div>
                <p className="mt-2 text-sm text-stone-500">
                  Las reseñas completas se muestran dentro de cada producto para mantener el contexto.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {selectedPost ? (
        <PostViewer
          post={selectedPost}
          posts={posts}
          profile={{ name: store.name, profile_image: store.logo }}
          currentUser={user}
          onClose={() => setSelectedPost(null)}
          onNavigate={setSelectedPost}
        />
      ) : null}

      {selectedProduct ? (
        <ProductDetailOverlay
          product={selectedProduct}
          store={store}
          reviews={reviews}
          certificates={certificates}
          onClose={() => {
            setSelectedProduct(null);
            if (requestedProductId) {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('product');
              setSearchParams(nextParams, { replace: true });
            }
          }}
        />
      ) : null}

      <Footer />
    </div>
  );
}
