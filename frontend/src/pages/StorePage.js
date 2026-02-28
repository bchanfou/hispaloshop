import BackButton from '../components/BackButton';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { 
  MapPin, Phone, Mail, Globe, Clock, Star, CheckCircle, 
  Truck, Shield, Users, ChevronRight, Instagram, Facebook,
  Package, Award, MessageCircle, ExternalLink, Heart, Bell
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

import { API } from '../utils/api';

// Tab Button Component
function TabButton({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active 
          ? 'border-primary text-primary' 
          : 'border-transparent text-text-secondary hover:text-text-primary hover:border-stone-300'
      }`}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      <span className="hidden sm:inline">{label}</span>
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
          active ? 'bg-primary/10 text-primary' : 'bg-stone-100 text-stone-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Gallery Component
function StoreGallery({ images, storeName, t }) {
  const [selectedImage, setSelectedImage] = useState(0);
  if (!images || images.length === 0) return null;
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-serif font-semibold text-text-primary">{t('store.gallery', 'Galeria')}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.slice(0, 6).map((img, idx) => (
          <button key={idx} onClick={() => setSelectedImage(idx)}
            className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImage === idx ? 'border-primary shadow-lg' : 'border-transparent hover:border-stone-300'}`}
          >
            <img src={img} alt={`${storeName} - ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
          </button>
        ))}
      </div>
    </div>
  );
}

// Review Card
function ReviewCard({ review, t }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary font-medium">
            {review.user_name?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-text-primary">{review.user_name || t('common.user', 'Usuario')}</span>
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">{review.rating}/10</span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {t('store.product', 'Producto')}: {review.product_name}
          </p>
          <p className="text-sm text-text-secondary mt-2">{review.comment}</p>
          <p className="text-xs text-text-muted mt-2">
            {new Date(review.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StorePage() {
  const { storeSlug } = useParams();
  const { t } = useTranslation();
  const { convertAndFormatPrice } = useLocale();
  const { user } = useAuth();
  
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [productSort, setProductSort] = useState('featured');
  const [productTotal, setProductTotal] = useState(0);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => { fetchStore(); }, [storeSlug]);
  useEffect(() => {
    if (store) {
      fetchProducts();
      fetchReviews();
      fetchCertificates();
      if (user) checkFollowStatus();
    }
  }, [store, productSort, user]);

  const fetchStore = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/store/${storeSlug}`);
      setStore(response.data);
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await axios.get(`${API}/store/${storeSlug}/following`, { withCredentials: true });
      setIsFollowing(response.data.following);
    } catch { setIsFollowing(false); }
  };

  const handleFollowToggle = async () => {
    if (!user) { toast.error(t('store.loginToFollow', 'Inicia sesion para seguir tiendas')); return; }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await axios.delete(`${API}/store/${storeSlug}/follow`, { withCredentials: true });
        setIsFollowing(false);
        toast.success(t('store.unfollowed', 'Has dejado de seguir esta tienda'));
      } else {
        await axios.post(`${API}/store/${storeSlug}/follow`, {}, { withCredentials: true });
        setIsFollowing(true);
        toast.success(t('store.followed', 'Ahora sigues esta tienda'));
      }
    } catch { toast.error(t('store.followError', 'Error')); }
    finally { setFollowLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/store/${storeSlug}/products?sort=${productSort}&limit=50`);
      setProducts(response.data.products || []);
      setProductTotal(response.data.total || 0);
    } catch (error) { console.error('Error fetching products:', error); }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/store/${storeSlug}/reviews?limit=50`);
      setReviews(response.data.reviews || []);
      setReviewsTotal(response.data.total || 0);
      setAvgRating(response.data.average_rating || 0);
    } catch (error) { console.error('Error fetching reviews:', error); }
  };

  const fetchCertificates = async () => {
    try {
      const response = await axios.get(`${API}/store/${storeSlug}/certificates`);
      setCertificates(response.data || []);
    } catch (error) { console.error('Error fetching certificates:', error); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <BackButton />
          <h1 className="text-2xl font-serif font-bold text-text-primary mb-4">{t('store.notFound', 'Tienda no encontrada')}</h1>
          <p className="text-text-secondary mb-6">{t('store.notFoundDesc', 'La tienda que buscas no existe o ha sido eliminada.')}</p>
          <Link to="/stores">
            <Button>{t('store.viewAll', 'Ver todas las tiendas')}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const badges = store.badges || [];
  const hasFastShipping = badges.includes('fast_shipping') || store.delivery_time;
  const isVerified = store.verified || badges.includes('verified');
  const isFamilyBusiness = badges.includes('family_business');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <div className="relative">
        <div 
          className="h-[160px] md:h-[280px] bg-gradient-to-r from-primary/20 to-accent/20 bg-cover bg-center"
          style={store.hero_image ? { backgroundImage: `url(${store.hero_image})` } : {}}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        
        {/* Store Info Card */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative -mt-12 md:-mt-20 bg-white rounded-xl shadow-lg border border-stone-200 p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              {/* Logo */}
              <div className="flex-shrink-0 flex md:block items-center gap-4">
                <div className="w-20 h-20 md:w-32 md:h-32 rounded-xl border-4 border-white shadow-lg overflow-hidden bg-stone-100 -mt-10 md:-mt-20">
                  {store.logo ? (
                    <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <span className="text-2xl md:text-3xl font-serif font-bold text-primary">{store.name?.[0]?.toUpperCase()}</span>
                    </div>
                  )}
                </div>
                
                {/* Mobile: Name inline with logo */}
                <div className="flex-1 md:hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg font-serif font-bold text-text-primary">{store.name}</h1>
                    {isVerified && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                  </div>
                  {store.location && (
                    <p className="text-text-secondary text-sm flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />{store.location}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Info */}
              <div className="flex-1">
                {/* Desktop: Name + Badge */}
                <div className="hidden md:flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl md:text-3xl font-serif font-bold text-text-primary">{store.name}</h1>
                      {isVerified && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                    {store.location && (
                      <p className="text-text-secondary flex items-center gap-1">
                        <MapPin className="w-4 h-4" />{store.location}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex items-center gap-4 md:gap-6 overflow-x-auto pb-2 md:pb-0 mt-2 md:mt-4 -mx-1 px-1">
                  <div className="flex flex-col items-center md:flex-row md:gap-1 min-w-fit">
                    <span className="font-bold text-text-primary text-lg md:text-base">{store.product_count || productTotal}</span>
                    <span className="text-text-muted text-xs md:text-sm">{t('store.products', 'productos')}</span>
                  </div>
                  <div className="flex flex-col items-center md:flex-row md:gap-1 min-w-fit">
                    <span className="font-bold text-text-primary text-lg md:text-base">{store.follower_count || 0}</span>
                    <span className="text-text-muted text-xs md:text-sm">{t('store.followers', 'seguidores')}</span>
                  </div>
                  <div className="flex flex-col items-center md:flex-row md:gap-1 min-w-fit">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="font-bold text-text-primary">{store.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                    <span className="text-text-muted text-xs md:text-sm">({store.review_count || 0})</span>
                  </div>
                </div>
                
                {/* Mobile: Follow + Message — icon-only on small screens */}
                <div className="flex items-center gap-2 mt-4 md:hidden">
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-full text-sm ${
                      isFollowing ? 'border-primary text-primary' : 'bg-[#1C1C1C] text-white'
                    }`}
                    data-testid="follow-store-btn-mobile"
                  >
                    {followLoading ? (
                      <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    ) : isFollowing ? (
                      <><Bell className="w-4 h-4 fill-current" /><span>{t('store.following', 'Siguiendo')}</span></>
                    ) : (
                      <><Heart className="w-4 h-4" /><span>{t('store.follow', 'Seguir')}</span></>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="px-3 rounded-full"
                    onClick={() => {
                      if (!user) { toast.error(t('store.loginToMessage', 'Inicia sesion')); return; }
                      window.dispatchEvent(new CustomEvent('open-chat-with-user', { detail: { userId: store.producer_id } }));
                    }}
                    data-testid="message-store-btn"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Desktop: Type Badge + Follow */}
                <div className="hidden md:flex items-center gap-3 mt-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize">
                    {store.store_type === 'producer' ? t('store.seller', 'Vendedor') : store.store_type}
                  </span>
                  <Button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    variant={isFollowing ? "outline" : "default"}
                    className={`flex items-center gap-2 ${isFollowing ? 'border-primary text-primary' : ''}`}
                    data-testid="follow-store-btn"
                  >
                    {followLoading ? (
                      <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    ) : isFollowing ? (
                      <><Bell className="w-4 h-4 fill-current" />{t('store.following', 'Siguiendo')}</>
                    ) : (
                      <><Heart className="w-4 h-4" />{t('store.followStore', 'Seguir tienda')}</>
                    )}
                  </Button>
                </div>
                
                {/* Tagline */}
                {store.tagline && (
                  <p className="text-text-secondary mt-3 italic text-sm md:text-base">"{store.tagline}"</p>
                )}
                
                {/* Trust Badges — icon-only on mobile, icon+text on desktop */}
                <div className="flex flex-nowrap md:flex-wrap gap-2 mt-4 overflow-x-auto pb-2 md:pb-0 -mx-1 px-1">
                  {isVerified && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs whitespace-nowrap" title={t('store.verified', 'Verificado')}>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('store.verified', 'Verificado')}</span>
                    </span>
                  )}
                  {hasFastShipping && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs whitespace-nowrap" title={t('store.shipping', 'Envio')}>
                      <Truck className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('store.shipping', 'Envio')} {store.delivery_time || '24h'}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full text-xs whitespace-nowrap" title={t('store.securePay', 'Pago Seguro')}>
                    <Shield className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('store.securePay', 'Pago Seguro')}</span>
                  </span>
                  {isFamilyBusiness && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs whitespace-nowrap" title={t('store.familyBusiness', 'Familiar')}>
                      <Users className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('store.familyBusiness', 'Familiar')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-3 space-y-8">
            {/* Story Section */}
            {(store.story || store.founder_quote) && (
              <div className="bg-white rounded-xl border border-stone-200 p-6">
                <h2 className="text-xl font-serif font-semibold text-text-primary mb-4">{t('store.ourStory', 'Nuestra Historia')}</h2>
                {store.story && <p className="text-text-secondary leading-relaxed">{store.story}</p>}
                {store.founder_quote && (
                  <blockquote className="mt-4 pl-4 border-l-4 border-primary/30 italic text-text-secondary">
                    "{store.founder_quote}"
                    {store.founder_name && (
                      <footer className="mt-2 text-sm text-text-muted not-italic">
                        — {store.founder_name}, {t('store.founder', 'Fundador')}
                      </footer>
                    )}
                  </blockquote>
                )}
                {store.gallery && store.gallery.length > 0 && (
                  <div className="mt-6">
                    <StoreGallery images={store.gallery} storeName={store.name} t={t} />
                  </div>
                )}
              </div>
            )}

            {/* Location Section */}
            {(store.full_address || store.coverage_area) && (
              <div className="bg-white rounded-xl border border-stone-200 p-6">
                <h2 className="text-xl font-serif font-semibold text-text-primary mb-4">{t('store.locationShipping', 'Ubicacion y Envio')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {store.full_address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-text-primary">{t('store.location', 'Ubicacion')}</p>
                        <p className="text-sm text-text-secondary">{store.full_address}</p>
                      </div>
                    </div>
                  )}
                  {store.coverage_area && (
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-text-primary">{t('store.shippingArea', 'Zona de envio')}</p>
                        <p className="text-sm text-text-secondary">{store.coverage_area}</p>
                      </div>
                    </div>
                  )}
                  {store.delivery_time && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-text-primary">{t('store.deliveryTime', 'Tiempo de entrega')}</p>
                        <p className="text-sm text-text-secondary">{store.delivery_time}</p>
                      </div>
                    </div>
                  )}
                </div>
                {store.map_image && (
                  <div className="mt-4 rounded-lg overflow-hidden border border-stone-200">
                    <img src={store.map_image} alt={t('store.location', 'Ubicacion')} className="w-full h-48 object-cover" />
                  </div>
                )}
              </div>
            )}

            {/* Tabs Navigation — icon+text on desktop, icon+count on mobile */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="flex border-b border-stone-200 overflow-x-auto">
                <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={Package} label={t('store.products', 'Productos')} count={productTotal} />
                <TabButton active={activeTab === 'certificates'} onClick={() => setActiveTab('certificates')} icon={Award} label={t('store.certificates', 'Certificados')} count={certificates.length} />
                <TabButton active={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} icon={Star} label={t('store.reviews', 'Resenas')} count={reviewsTotal} />
              </div>

              <div className="p-4 md:p-6">
                {/* Products Tab */}
                {activeTab === 'products' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-text-secondary">{productTotal} {t('store.products', 'productos')}</p>
                      <select value={productSort} onChange={(e) => setProductSort(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-3 py-1.5">
                        <option value="featured">{t('store.sortFeatured', 'Destacados')}</option>
                        <option value="price_asc">{t('store.sortPriceAsc', 'Precio: menor')}</option>
                        <option value="price_desc">{t('store.sortPriceDesc', 'Precio: mayor')}</option>
                        <option value="newest">{t('store.sortNewest', 'Recientes')}</option>
                        <option value="rating">{t('store.sortRating', 'Mejor valorados')}</option>
                      </select>
                    </div>
                    {products.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {products.map((product) => (
                          <ProductCard key={product.product_id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-text-muted py-8">{t('store.noProducts', 'No hay productos disponibles')}</p>
                    )}
                  </div>
                )}

                {/* Certificates Tab */}
                {activeTab === 'certificates' && (
                  <div>
                    {certificates.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {certificates.map((cert) => (
                          <Link key={cert.certificate_id} to={`/certificate/${cert.product_id}`}
                            className="flex items-center gap-4 p-4 border border-stone-200 rounded-lg hover:border-primary transition-colors"
                          >
                            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                              <Award className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text-primary truncate">{cert.product_name}</p>
                              <p className="text-sm text-text-secondary">{t('store.certVerified', 'Certificado verificado')}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-text-muted shrink-0" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-text-muted py-8">{t('store.noCertificates', 'No hay certificados disponibles')}</p>
                    )}
                  </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div>
                    <div className="flex items-center gap-4 mb-6 p-4 bg-stone-50 rounded-lg">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-8 h-8 fill-current" />
                          <span className="text-3xl font-bold text-text-primary">{avgRating.toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-text-muted">{reviewsTotal} {t('store.reviews', 'resenas')}</p>
                      </div>
                    </div>
                    {reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review) => (
                          <ReviewCard key={review.review_id || review.created_at} review={review} t={t} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-text-muted py-8">{t('store.noReviews', 'No hay resenas disponibles')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-xl border border-stone-200 p-6">
              <h3 className="font-semibold text-text-primary mb-4">{t('store.contact', 'Contacto')}</h3>
              <div className="space-y-3">
                {store.contact_email && (
                  <a href={`mailto:${store.contact_email}`} className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors">
                    <Mail className="w-4 h-4 shrink-0" /><span className="text-sm truncate">{store.contact_email}</span>
                  </a>
                )}
                {store.contact_phone && (
                  <a href={`tel:${store.contact_phone}`} className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors">
                    <Phone className="w-4 h-4 shrink-0" /><span className="text-sm">{store.contact_phone}</span>
                  </a>
                )}
                {store.whatsapp && (
                  <a href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-text-secondary hover:text-green-600 transition-colors">
                    <MessageCircle className="w-4 h-4 shrink-0" /><span className="text-sm">WhatsApp</span>
                  </a>
                )}
                {store.website && (
                  <a href={store.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors">
                    <Globe className="w-4 h-4 shrink-0" /><span className="text-sm">{t('store.website', 'Sitio web')}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {store.contact_email && (
                <a href={`mailto:${store.contact_email}`}>
                  <Button className="w-full mt-4">{t('store.contactBtn', 'Contactar')}</Button>
                </a>
              )}
            </div>

            {/* Social Links */}
            {(store.social_instagram || store.social_facebook) && (
              <div className="bg-white rounded-xl border border-stone-200 p-6">
                <h3 className="font-semibold text-text-primary mb-4">{t('store.socialMedia', 'Redes Sociales')}</h3>
                <div className="flex gap-3">
                  {store.social_instagram && (
                    <a href={store.social_instagram} target="_blank" rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white hover:opacity-90 transition-opacity">
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {store.social_facebook && (
                    <a href={store.social_facebook} target="_blank" rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white hover:opacity-90 transition-opacity">
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Business Hours */}
            {store.business_hours && (
              <div className="bg-white rounded-xl border border-stone-200 p-6">
                <h3 className="font-semibold text-text-primary mb-4">{t('store.hours', 'Horario')}</h3>
                <div className="flex items-start gap-3 text-text-secondary">
                  <Clock className="w-4 h-4 mt-0.5" />
                  <span className="text-sm whitespace-pre-line">{store.business_hours}</span>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/20 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-text-primary">{t('store.stats', 'Estadisticas')}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t('store.products', 'Productos')}</span>
                  <span className="font-medium text-text-primary">{productTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t('store.followers', 'Seguidores')}</span>
                  <span className="font-medium text-text-primary flex items-center gap-1">
                    <Users className="w-4 h-4 text-primary" />{store.follower_count || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t('store.reviews', 'Resenas')}</span>
                  <span className="font-medium text-text-primary">{reviewsTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">{t('store.rating', 'Valoracion')}</span>
                  <span className="font-medium text-text-primary flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />{(store.rating || 0).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
