import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Bell,
  CheckCircle,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Heart,
  Mail,
  MapPin,
  Package,
  Phone,
  Shield,
  Star,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import BackButton from '../components/BackButton';
import Footer from '../components/Footer';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { useTranslation } from 'react-i18next';
import { useStoreFollow } from '../features/products/hooks';

function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        active
          ? 'border-stone-950 text-stone-950'
          : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
      {count !== undefined ? (
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-600'}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function StoreReviewCard({ review, t }) {
  return (
    <div className="rounded-[24px] border border-stone-200 bg-white p-5">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700">
          {review.user_name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-medium text-stone-900">
              {review.user_name || t('common.user', 'Usuario')}
            </span>
            <div className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">
              <Star className="h-3.5 w-3.5 fill-stone-900 stroke-stone-900" />
              <span>{review.rating || 0}/10</span>
            </div>
          </div>
          {review.product_name ? (
            <p className="mt-1 text-xs text-stone-500">
              {t('store.product', 'Producto')}: {review.product_name}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-stone-600">{review.comment}</p>
      <p className="mt-3 text-xs text-stone-400">{new Date(review.created_at).toLocaleDateString()}</p>
    </div>
  );
}

export default function StorePage() {
  const { storeSlug } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [productSort, setProductSort] = useState('featured');

  const storeQuery = useQuery({
    queryKey: ['store', storeSlug],
    queryFn: () => apiClient.get(`/store/${storeSlug}`),
    enabled: Boolean(storeSlug),
  });

  const productsQuery = useQuery({
    queryKey: ['store', storeSlug, 'products', productSort],
    queryFn: () => apiClient.get(`/store/${storeSlug}/products`, { params: { sort: productSort, limit: 50 } }),
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

  const store = storeQuery.data ?? null;
  const products = Array.isArray(productsQuery.data?.products) ? productsQuery.data.products : [];
  const reviews = Array.isArray(reviewsQuery.data?.reviews) ? reviewsQuery.data.reviews : [];
  const certificates = Array.isArray(certificatesQuery.data) ? certificatesQuery.data : [];
  const productTotal = productsQuery.data?.total || products.length || store?.product_count || 0;
  const reviewsTotal = reviewsQuery.data?.total || reviews.length || store?.review_count || 0;
  const avgRating = reviewsQuery.data?.average_rating || store?.rating || 0;
  const hasFastShipping = Boolean(store?.delivery_time);
  const isVerified = Boolean(store?.verified);
  const { isFollowing, followLoading, handleFollowStore } = useStoreFollow(store?.slug);

  const ownerLabel = useMemo(() => {
    if (!store) return '';
    if (store.owner_type === 'importer' || store.store_type === 'importer') return 'Importador';
    return t('store.seller', 'Productor');
  }, [store, t]);

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
              <Button className="rounded-full bg-stone-950 text-white hover:bg-black">
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

      <div className="relative overflow-hidden border-b border-stone-200 bg-white">
        <div
          className="h-[160px] bg-stone-200 bg-cover bg-center md:h-[280px]"
          style={store.hero_image ? { backgroundImage: `url(${store.hero_image})` } : undefined}
        >
          <div className="h-full w-full bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
        </div>

        <div className="mx-auto max-w-[1400px] px-4">
          <div className="relative -mt-14 rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm md:-mt-20 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border border-stone-200 bg-stone-100 md:h-28 md:w-28">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-8 w-8 text-stone-400" />
                  )}
                </div>

                <div className="md:hidden">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold text-stone-950">{store.name}</h1>
                    {isVerified ? <CheckCircle className="h-4 w-4 text-stone-950" /> : null}
                  </div>
                  {store.location ? (
                    <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {store.location}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex-1">
                <div className="hidden items-start justify-between md:flex">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-semibold text-stone-950">{store.name}</h1>
                      {isVerified ? <CheckCircle className="h-5 w-5 text-stone-950" /> : null}
                    </div>
                    {store.location ? (
                      <p className="mt-2 flex items-center gap-1 text-sm text-stone-500">
                        <MapPin className="h-4 w-4" />
                        {store.location}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-sm font-medium text-white">
                    {ownerLabel}
                  </span>
                  {store.specialization ? (
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                      {store.specialization}
                    </span>
                  ) : null}
                  {hasFastShipping ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-600">
                      <Truck className="h-3.5 w-3.5" />
                      {t('store.shipping', 'Envío')} {store.delivery_time}
                    </span>
                  ) : null}
                </div>

                {store.tagline ? (
                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-600">“{store.tagline}”</p>
                ) : null}

                <div className="mt-5 grid grid-cols-3 gap-3 md:max-w-xl">
                  <div className="rounded-2xl bg-stone-50 p-3 text-center">
                    <p className="text-lg font-semibold text-stone-950">{productTotal}</p>
                    <p className="text-xs text-stone-500">{t('store.products', 'productos')}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-3 text-center">
                    <p className="text-lg font-semibold text-stone-950">{store.follower_count || 0}</p>
                    <p className="text-xs text-stone-500">{t('store.followers', 'seguidores')}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-stone-950 stroke-stone-950" />
                      <p className="text-lg font-semibold text-stone-950">{Number(avgRating || 0).toFixed(1)}</p>
                    </div>
                    <p className="text-xs text-stone-500">({reviewsTotal})</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 md:w-56">
                <Button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`rounded-full ${
                    isFollowing
                      ? 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
                      : 'bg-stone-950 text-white hover:bg-black'
                  }`}
                  variant={isFollowing ? 'outline' : 'default'}
                  data-testid="follow-store-btn"
                >
                  {isFollowing ? <Bell className="mr-2 h-4 w-4" /> : <Heart className="mr-2 h-4 w-4" />}
                  {followLoading
                    ? t('common.loading', 'Cargando...')
                    : isFollowing
                      ? t('store.following', 'Siguiendo')
                      : t('store.followStore', 'Seguir tienda')}
                </Button>

                {store.contact_email ? (
                  <a href={`mailto:${store.contact_email}`}>
                    <Button variant="outline" className="w-full rounded-full border-stone-300 text-stone-700 hover:bg-stone-50">
                      <Mail className="mr-2 h-4 w-4" />
                      {t('store.contactBtn', 'Contactar')}
                    </Button>
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-3">
            {store.story || store.founder_quote ? (
              <section className="rounded-[32px] border border-stone-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-semibold text-stone-950">{t('store.ourStory', 'Nuestra historia')}</h2>
                {store.story ? <p className="text-sm leading-relaxed text-stone-600">{store.story}</p> : null}
                {store.founder_quote ? (
                  <blockquote className="mt-4 border-l-2 border-stone-300 pl-4 text-sm italic leading-relaxed text-stone-600">
                    “{store.founder_quote}”
                    {store.founder_name ? (
                      <footer className="mt-2 text-xs not-italic text-stone-500">
                        {store.founder_name}, {t('store.founder', 'Fundador')}
                      </footer>
                    ) : null}
                  </blockquote>
                ) : null}
              </section>
            ) : null}

            {(store.full_address || store.coverage_area || store.delivery_time) ? (
              <section className="rounded-[32px] border border-stone-200 bg-white p-6">
                <h2 className="mb-4 text-xl font-semibold text-stone-950">{t('store.locationShipping', 'Ubicación y envío')}</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {store.full_address ? (
                    <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4">
                      <MapPin className="mt-0.5 h-5 w-5 text-stone-700" />
                      <div>
                        <p className="font-medium text-stone-900">{t('store.location', 'Ubicación')}</p>
                        <p className="text-sm text-stone-600">{store.full_address}</p>
                      </div>
                    </div>
                  ) : null}
                  {store.coverage_area ? (
                    <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4">
                      <Truck className="mt-0.5 h-5 w-5 text-stone-700" />
                      <div>
                        <p className="font-medium text-stone-900">{t('store.shippingArea', 'Zona de envío')}</p>
                        <p className="text-sm text-stone-600">{store.coverage_area}</p>
                      </div>
                    </div>
                  ) : null}
                  {store.delivery_time ? (
                    <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4">
                      <Clock className="mt-0.5 h-5 w-5 text-stone-700" />
                      <div>
                        <p className="font-medium text-stone-900">{t('store.deliveryTime', 'Tiempo de entrega')}</p>
                        <p className="text-sm text-stone-600">{store.delivery_time}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-[32px] border border-stone-200 bg-white">
              <div className="flex overflow-x-auto border-b border-stone-200">
                <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={Package} label={t('store.products', 'Productos')} count={productTotal} />
                <TabButton active={activeTab === 'certificates'} onClick={() => setActiveTab('certificates')} icon={Award} label={t('store.certificates', 'Certificados')} count={certificates.length} />
                <TabButton active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} icon={Star} label={t('store.reviews', 'Reseñas')} count={reviewsTotal} />
              </div>

              <div className="p-5 md:p-6">
                {activeTab === 'products' ? (
                  <div>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-stone-500">
                        {productTotal} {t('store.products', 'productos')}
                      </p>
                      <select
                        value={productSort}
                        onChange={(event) => setProductSort(event.target.value)}
                        className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none focus:border-stone-950"
                      >
                        <option value="featured">{t('store.sortFeatured', 'Destacados')}</option>
                        <option value="price_asc">{t('store.sortPriceAsc', 'Precio: menor')}</option>
                        <option value="price_desc">{t('store.sortPriceDesc', 'Precio: mayor')}</option>
                        <option value="newest">{t('store.sortNewest', 'Recientes')}</option>
                        <option value="rating">{t('store.sortRating', 'Mejor valorados')}</option>
                      </select>
                    </div>

                    {productsQuery.isLoading ? (
                      <div className="py-16 text-center">
                        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-stone-950" />
                        <p className="text-sm text-stone-500">{t('common.loading', 'Cargando...')}</p>
                      </div>
                    ) : products.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        {products.map((product) => (
                          <ProductCard key={product.product_id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-stone-200 bg-stone-50 py-12 text-center text-sm text-stone-500">
                        {t('store.noProducts', 'No hay productos disponibles')}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === 'certificates' ? (
                  certificates.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {certificates.map((cert) => (
                        <Link
                          key={cert.certificate_id || cert.product_id}
                          to={`/certificate/${cert.product_id}`}
                          className="flex items-center gap-4 rounded-[24px] border border-stone-200 p-4 transition-colors hover:border-stone-300"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                            <Award className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-stone-900">{cert.product_name}</p>
                            <p className="text-sm text-stone-500">{t('store.certVerified', 'Certificado verificado')}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-stone-400" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-stone-200 bg-stone-50 py-12 text-center text-sm text-stone-500">
                      {t('store.noCertificates', 'No hay certificados disponibles')}
                    </div>
                  )
                ) : null}

                {activeTab === 'reviews' ? (
                  <div>
                    <div className="mb-6 flex items-center gap-4 rounded-[24px] bg-stone-50 p-4">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-stone-950">
                          <Star className="h-7 w-7 fill-stone-950 stroke-stone-950" />
                          <span className="text-3xl font-semibold">{Number(avgRating || 0).toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-stone-500">
                          {reviewsTotal} {t('store.reviews', 'reseñas')}
                        </p>
                      </div>
                    </div>

                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <StoreReviewCard key={review.review_id || review.created_at} review={review} t={t} />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-stone-200 bg-stone-50 py-12 text-center text-sm text-stone-500">
                        {t('store.noReviews', 'No hay reseñas disponibles')}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:col-span-1">
            <div className="rounded-[32px] border border-stone-200 bg-white p-6">
              <h3 className="mb-4 font-semibold text-stone-950">{t('store.contact', 'Contacto')}</h3>
              <div className="space-y-3 text-sm">
                {store.contact_email ? (
                  <a href={`mailto:${store.contact_email}`} className="flex items-center gap-3 text-stone-600 transition-colors hover:text-stone-950">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{store.contact_email}</span>
                  </a>
                ) : null}
                {store.contact_phone ? (
                  <a href={`tel:${store.contact_phone}`} className="flex items-center gap-3 text-stone-600 transition-colors hover:text-stone-950">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{store.contact_phone}</span>
                  </a>
                ) : null}
                {store.website ? (
                  <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-stone-600 transition-colors hover:text-stone-950">
                    <Globe className="h-4 w-4 shrink-0" />
                    <span>{t('store.website', 'Sitio web')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>

            {(store.social_instagram || store.social_facebook || store.business_hours) ? (
              <div className="rounded-[32px] border border-stone-200 bg-white p-6">
                <h3 className="mb-4 font-semibold text-stone-950">{t('store.moreInfo', 'Más información')}</h3>
                <div className="space-y-3 text-sm text-stone-600">
                  {store.social_instagram ? (
                    <a href={store.social_instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 transition-colors hover:text-stone-950">
                      <ExternalLink className="h-4 w-4" />
                      <span>Instagram</span>
                    </a>
                  ) : null}
                  {store.social_facebook ? (
                    <a href={store.social_facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 transition-colors hover:text-stone-950">
                      <ExternalLink className="h-4 w-4" />
                      <span>Facebook</span>
                    </a>
                  ) : null}
                  {store.business_hours ? (
                    <div className="flex items-start gap-3">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="whitespace-pre-line">{store.business_hours}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="rounded-[32px] border border-stone-200 bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-stone-950" />
                <h3 className="font-semibold text-stone-950">{t('store.stats', 'Estadísticas')}</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>{t('store.products', 'Productos')}</span>
                  <span className="font-medium text-stone-950">{productTotal}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>{t('store.followers', 'Seguidores')}</span>
                  <span className="flex items-center gap-1 font-medium text-stone-950">
                    <Users className="h-4 w-4" />
                    {store.follower_count || 0}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>{t('store.reviews', 'Reseñas')}</span>
                  <span className="font-medium text-stone-950">{reviewsTotal}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>{t('store.rating', 'Valoración')}</span>
                  <span className="flex items-center gap-1 font-medium text-stone-950">
                    <Star className="h-4 w-4 fill-stone-950 stroke-stone-950" />
                    {Number(avgRating || 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
