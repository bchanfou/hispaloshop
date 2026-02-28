import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductImageGallery from '../components/ProductImageGallery';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { ShoppingCart, FileCheck, AlertTriangle, AlertCircle, Star, CheckCircle, User, Package, Store, MapPin, Truck, Shield, ChevronRight, Heart, Users, Leaf } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { API } from '../utils/api';
import SEO from '../components/SEO';

// Strip emojis from text (data may contain unwanted emoji chars)
const stripEmoji = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '').trim();
};

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice, country, language } = useLocale();
  const { t, i18n } = useTranslation();
  const [product, setProduct] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  
  // Follow store state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Wishlist state
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  
  // Variant & Pack selection state
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedPack, setSelectedPack] = useState(null);
  
  // Flavor variants (related products with different flavors)
  const [flavorVariants, setFlavorVariants] = useState([]);
  
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [canReview, setCanReview] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(8);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const currentLang = i18n.language || language || 'es';

  useEffect(() => {
    fetchProduct();
    fetchCertificate();
    fetchReviews();
    fetchFlavorVariants();
  }, [productId, country, currentLang]);

  useEffect(() => {
    if (user) {
      checkCanReview();
      // Check wishlist status
      axios.get(`${API}/wishlist/check/${productId}`, { withCredentials: true })
        .then(r => setInWishlist(r.data?.in_wishlist || false))
        .catch(() => {});
    }
  }, [user, productId]);

  useEffect(() => {
    if (product?.variants?.length > 0) {
      const firstVariant = product.variants[0];
      setSelectedVariant(firstVariant);
      if (firstVariant.packs?.length > 0) {
        setSelectedPack(firstVariant.packs[0]);
      }
    }
  }, [product]);

  // Fetch store info when product loads
  useEffect(() => {
    if (product?.store_id) {
      fetchStoreInfo(product.store_id);
    } else if (product?.seller_id || product?.producer_id) {
      fetchStoreByUserId(product.seller_id || product.producer_id);
    }
  }, [product]);

  // Check if user is following the store
  useEffect(() => {
    if (user && storeInfo?.slug) {
      checkFollowStatus();
    }
  }, [user, storeInfo]);

  const fetchProduct = async () => {
    try {
      setTranslating(true);
      const response = await axios.get(`${API}/products/${productId}?country=${country}&lang=${currentLang}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error(t('errors.notFound'));
    } finally {
      setLoading(false);
      setTranslating(false);
    }
  };

  const toggleWishlist = async () => {
    if (!user) { toast.info(t('auth.loginRequired', 'Inicia sesion para guardar')); return; }
    setWishlistLoading(true);
    try {
      if (inWishlist) {
        await axios.delete(`${API}/wishlist/${productId}`, { withCredentials: true });
        setInWishlist(false);
        toast.success(t('wishlist.removed', 'Eliminado de la lista de deseos'));
      } else {
        await axios.post(`${API}/wishlist/${productId}`, {}, { withCredentials: true });
        setInWishlist(true);
        toast.success(t('wishlist.added', 'Guardado en tu lista de deseos'));
      }
    } catch { toast.error(t('errors.generic', 'Error')); }
    finally { setWishlistLoading(false); }
  };

  const fetchStoreInfo = async (storeId) => {
    try {
      const response = await axios.get(`${API}/store/id/${storeId}`);
      setStoreInfo(response.data);
    } catch (error) {
      console.log('Store not found by ID');
    }
  };

  const fetchStoreByUserId = async (userId) => {
    try {
      const response = await axios.get(`${API}/stores?seller_id=${userId}`);
      if (response.data && response.data.length > 0) {
        setStoreInfo(response.data[0]);
      }
    } catch (error) {
      console.log('Store not found by user ID');
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await axios.get(`${API}/store/${storeInfo.slug}/following`, { withCredentials: true });
      setIsFollowing(response.data.following);
    } catch (error) {
      setIsFollowing(false);
    }
  };

  const handleFollowStore = async () => {
    if (!user) {
      toast.error(t('errors.unauthorized', 'Inicia sesión para seguir tiendas'));
      return;
    }
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await axios.delete(`${API}/store/${storeInfo.slug}/follow`, { withCredentials: true });
        setIsFollowing(false);
        setStoreInfo(prev => ({ ...prev, follower_count: Math.max(0, (prev.follower_count || 1) - 1) }));
        toast.success(t('store.unfollowed', 'Has dejado de seguir la tienda'));
      } else {
        await axios.post(`${API}/store/${storeInfo.slug}/follow`, {}, { withCredentials: true });
        setIsFollowing(true);
        setStoreInfo(prev => ({ ...prev, follower_count: (prev.follower_count || 0) + 1 }));
        toast.success(t('store.followed', '¡Ahora sigues esta tienda!'));
      }
    } catch (error) {
      toast.error(t('errors.generic', 'Error al procesar la solicitud'));
    } finally {
      setFollowLoading(false);
    }
  };

  const fetchFlavorVariants = async () => {
    try {
      const response = await axios.get(`${API}/products/${productId}/variants`);
      if (response.data && response.data.length > 1) {
        setFlavorVariants(response.data);
      } else {
        setFlavorVariants([]);
      }
    } catch (error) {
      setFlavorVariants([]);
    }
  };

  const fetchCertificate = async () => {
    try {
      const response = await axios.get(`${API}/certificates/product/${productId}?lang=${currentLang}`);
      setCertificate(response.data);
    } catch (error) {
      console.log('No certificate found for product');
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/products/${productId}/reviews`);
      setReviews(response.data.reviews);
      setAverageRating(response.data.average_rating);
      setTotalReviews(response.data.total_reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkCanReview = async () => {
    try {
      const response = await axios.get(`${API}/reviews/can-review/${productId}`, { withCredentials: true });
      setCanReview(response.data.can_review);
      if (response.data.order_id) {
        setReviewOrderId(response.data.order_id);
      }
    } catch (error) {
      setCanReview(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      toast.error('Please write a comment');
      return;
    }
    
    setSubmittingReview(true);
    try {
      await axios.post(`${API}/reviews/create`, {
        product_id: productId,
        order_id: reviewOrderId,
        rating: reviewRating,
        comment: reviewComment
      }, { withCredentials: true });
      
      toast.success('Review submitted successfully!');
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(8);
      fetchReviews();
      checkCanReview();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Stock calculations
  const trackStock = product?.track_stock !== false;
  const stock = product?.stock ?? 100;
  const lowStockThreshold = product?.low_stock_threshold ?? 5;
  const isOutOfStock = trackStock && stock <= 0;
  const isLowStock = trackStock && stock > 0 && stock <= lowStockThreshold;
  const maxQuantity = trackStock ? stock : 99;

  // Check if product has variants
  const hasVariants = product?.variants && product.variants.length > 0;
  
  // Current price based on selection
  const currentPrice = selectedPack?.price || selectedVariant?.price || product?.price;

  // Get current ingredients (from variant if selected, otherwise from product)
  const currentIngredients = selectedVariant?.ingredients || product?.ingredients || [];
  
  // Get current nutritional info (from variant if selected, otherwise from product)
  const currentNutritionalInfo = selectedVariant?.nutritional_info || product?.nutritional_info || null;
  
  // Get current allergens (from variant if selected, otherwise from product)
  const currentAllergens = selectedVariant?.allergens || product?.allergens || [];

  const handleAddToCart = async () => {
    if (!user) {
      toast.error(t('errors.loginRequired', 'Inicia sesión para añadir productos'), {
        action: {
          label: t('auth.login', 'Login'),
          onClick: () => window.location.href = '/login'
        }
      });
      return;
    }
    if (isOutOfStock) {
      toast.error(t('productDetail.outOfStock'));
      return;
    }
    
    toast.loading(t('cart.adding', 'Añadiendo...'), { id: 'add-to-cart' });
    
    // Pass variant and pack IDs if product has variants
    const variantId = selectedVariant?.variant_id || null;
    const packId = selectedPack?.pack_id || null;
    
    const success = await addToCart(productId, quantity, variantId, packId);
    if (success) {
      toast.success(t('success.added', '¡Añadido al carrito!'), { id: 'add-to-cart' });
    } else {
      toast.error(t('errors.generic', 'Error al añadir'), { id: 'add-to-cart' });
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error(t('errors.loginRequired', 'Inicia sesión para comprar'), {
        action: {
          label: t('auth.login', 'Login'),
          onClick: () => window.location.href = '/login'
        }
      });
      return;
    }
    if (isOutOfStock) {
      toast.error(t('productDetail.outOfStock'));
      return;
    }
    
    toast.loading(t('cart.processing', 'Procesando...'), { id: 'buy-now' });
    
    // Pass variant and pack IDs if product has variants
    const variantId = selectedVariant?.variant_id || null;
    const packId = selectedPack?.pack_id || null;
    
    const success = await addToCart(productId, quantity, variantId, packId);
    if (success) {
      toast.dismiss('buy-now');
      window.location.href = '/cart';
    } else {
      toast.error(t('errors.generic', 'Error al procesar'), { id: 'buy-now' });
    }
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    if (variant.packs?.length > 0) {
      setSelectedPack(variant.packs[0]);
    } else {
      setSelectedPack(null);
    }
  };

  // Calculate pack savings
  const calculateSavings = (pack, variant) => {
    if (!variant?.price || !pack?.quantity) return null;
    const regularTotal = variant.price * pack.quantity;
    const packTotal = pack.price;
    const savings = regularTotal - packTotal;
    return savings > 0 ? savings : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ds-primary mx-auto mb-4"></div>
          <p className="text-text-muted">{t('productDetail.loading')}</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
          <p className="text-text-muted text-lg mb-4">{t('productDetail.notFound')}</p>
          <Link to="/products">
            <Button className="rounded-full bg-ds-primary text-white">{t('productDetail.backToProducts')}</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Shipping info
  const isFreeShipping = !product.shipping_cost || product.shipping_cost === 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={product?.name || 'Producto'}
        description={product?.description?.slice(0, 160) || ''}
        image={product?.images?.[0]}
        type="product"
        product={product}
      />
      <Header />
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-8 pb-32 md:pb-8">
        {/* Breadcrumbs - Hidden on mobile */}
        <div className="hidden md:block">
          <Breadcrumbs 
            className="mb-6"
            customItems={[
              { label: t('breadcrumbs.products'), href: '/products' },
              { label: product.name }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">
          {/* Left Column: Product Images */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <ProductImageGallery 
                images={product.images}
                productName={product.name}
                isOutOfStock={isOutOfStock}
              />
            </div>
          </div>

          {/* Center Column: Product Info */}
          <div className="lg:col-span-4">
            {/* Certifications */}
            {product.certifications && product.certifications.length > 0 && (
              <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4" data-testid="product-certifications">
                {product.certifications.map((cert, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium border border-green-200"
                    data-testid={`cert-badge-${cert}`}
                  >
                    <Shield className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    {cert}
                  </span>
                ))}
              </div>
            )}

            {/* Product Title */}
            <h1 className="font-heading text-xl md:text-2xl lg:text-3xl font-semibold text-text-primary mb-2 md:mb-3 leading-tight" data-testid="product-title">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-amber-400 stroke-amber-400" />
                <span className="font-semibold text-text-primary text-sm md:text-base">{averageRating?.toFixed(1) || '0.0'}</span>
              </div>
              <span className="text-text-muted text-xs md:text-sm">({totalReviews} {t('productDetail.reviews', 'reviews')})</span>
              {product.units_sold > 0 && (
                <>
                  <span className="text-stone-300 hidden md:inline">·</span>
                  <span className="text-text-muted text-xs md:text-sm">{product.units_sold} {t('products.sold', 'vendidos')}</span>
                </>
              )}
            </div>

            {/* Stock Status */}
            {isOutOfStock && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 md:px-4 py-2 mb-3 md:mb-4">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-red-700 text-xs md:text-sm font-medium">{t('productDetail.outOfStock')}</span>
              </div>
            )}
            {isLowStock && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 md:px-4 py-2 mb-3 md:mb-4">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-amber-700 text-xs md:text-sm font-medium">{t('productDetail.lowStockWarning', { count: stock })}</span>
              </div>
            )}

            {/* Price - Larger on mobile since it's key info */}
            <div className="mb-4 md:mb-6">
              <span className="font-heading text-2xl md:text-3xl font-bold text-text-primary" data-testid="product-price">
                {convertAndFormatPrice(currentPrice || product.price, product.currency || 'EUR')}
              </span>
            </div>

            {/* Shipping Info */}
            <div className="flex items-center gap-2 mb-4 md:mb-6 p-2.5 md:p-3 bg-white rounded-lg border border-border-default">
              <Truck className={`w-4 h-4 md:w-5 md:h-5 ${isFreeShipping ? 'text-green-600' : 'text-text-muted'}`} />
              {isFreeShipping ? (
                <span className="text-green-600 font-medium text-sm">{t('products.freeShipping', 'Envío gratis')}</span>
              ) : (
                <div className="text-xs md:text-sm">
                  <span className="text-text-secondary font-medium">
                    {t('products.shippingCost', 'Envío')}: {convertAndFormatPrice(product.shipping_cost, 'EUR')}
                  </span>
                  {product.free_shipping_min_qty && (
                    <span className="text-text-muted ml-1 md:ml-2">
                      ({t('products.freeFrom', 'gratis desde')} {product.free_shipping_min_qty} uds)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-4 md:mb-6">
              <h3 className="font-medium text-text-primary mb-2 text-sm md:text-base">{t('productDetail.description', 'Descripción')}</h3>
              <p className="text-text-secondary text-xs md:text-sm leading-relaxed" data-testid="product-description">
                {product.description}
              </p>
            </div>

            {/* Ingredients Section */}
            {currentIngredients && currentIngredients.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6" data-testid="ingredients-section">
                <h3 className="font-medium text-stone-900 mb-3 flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-green-600" />
                  {t('productDetail.ingredients', 'Ingredientes')}
                  {selectedVariant && (
                    <span className="text-xs text-stone-500 font-normal">({selectedVariant.name})</span>
                  )}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentIngredients.map((ingredient, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 bg-green-50 text-green-800 px-3 py-1.5 rounded-full text-sm border border-green-200"
                    >
                      {typeof ingredient === 'object' ? (
                        <>
                          <span className="font-medium">{stripEmoji(ingredient.name)}</span>
                          {ingredient.origin && (
                            <span className="text-green-600 text-xs">({stripEmoji(ingredient.origin)})</span>
                          )}
                        </>
                      ) : (
                        stripEmoji(ingredient)
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nutritional Information */}
            {currentNutritionalInfo && Object.keys(currentNutritionalInfo).length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6" data-testid="nutritional-section">
                <h3 className="font-medium text-stone-900 mb-3">
                  {t('productDetail.nutritionalInfo', 'Información Nutricional')}
                  {selectedVariant && (
                    <span className="text-xs text-stone-500 font-normal ml-2">({selectedVariant.name})</span>
                  )}
                </h3>
                <p className="text-xs text-stone-500 mb-3">{t('productDetail.per100g', 'Por 100g')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currentNutritionalInfo.calories !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-stone-900">{currentNutritionalInfo.calories}</p>
                      <p className="text-xs text-stone-500">{t('certificate.calories', 'Calorías')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.protein !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-stone-900">{currentNutritionalInfo.protein}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.protein', 'Proteínas')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.carbohydrates !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-stone-900">{currentNutritionalInfo.carbohydrates}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.carbohydrates', 'Carbohidratos')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.sugars !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-stone-900">{currentNutritionalInfo.sugars}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.sugars', 'Azúcares')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.fat !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-stone-900">{currentNutritionalInfo.fat}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.fat', 'Grasas')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.saturated_fat !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-stone-900">{currentNutritionalInfo.saturated_fat}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.saturatedFat', 'Grasas Sat.')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.fiber !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-stone-900">{currentNutritionalInfo.fiber}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.fiber', 'Fibra')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.sodium !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-stone-900">{currentNutritionalInfo.sodium}mg</p>
                      <p className="text-xs text-stone-500">{t('certificate.sodium', 'Sodio')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.salt !== undefined && (
                    <div className="bg-stone-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold text-stone-900">{currentNutritionalInfo.salt}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.salt', 'Sal')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Allergens */}
            {currentAllergens && currentAllergens.length > 0 && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-6" data-testid="allergens-section">
                <h3 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  {t('productDetail.allergens', 'Alérgenos')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentAllergens.map((allergen, idx) => (
                    <span 
                      key={idx} 
                      className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium"
                    >
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Product Details */}
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
              <h3 className="font-medium text-stone-900 mb-3">{t('productDetail.details', 'Detalles')}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-stone-500">{t('productDetail.origin', 'Origen')}</span>
                  <p className="text-stone-900 font-medium">{product.country_origin}</p>
                </div>
                <div>
                  <span className="text-stone-500">{t('productDetail.category', 'Categoría')}</span>
                  <p className="text-stone-900 font-medium capitalize">{product.category_id?.replace('cat_', '').replace(/-/g, ' ')}</p>
                </div>
                {product.sku && (
                  <div>
                    <span className="text-stone-500">SKU</span>
                    <p className="text-stone-900 font-medium">{product.sku}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Variant Selector (for products with internal variants like flavors) */}
            {hasVariants && product.variants.length > 1 && (
              <div className="mb-6">
                <h3 className="font-medium text-stone-900 mb-3">{t('productDetail.selectVariant', 'Seleccionar Variante')}</h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.variant_id}
                      onClick={() => handleVariantChange(variant)}
                      data-testid={`variant-button-${variant.variant_id}`}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        selectedVariant?.variant_id === variant.variant_id
                          ? 'bg-amber-500 text-white border border-amber-500'
                          : 'bg-white text-stone-700 border border-stone-200 hover:border-amber-400'
                      }`}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Packs Selector - Show packs from selected variant or product level */}
            {((selectedVariant?.packs && selectedVariant.packs.length > 1) || (product.packs && product.packs.length > 0)) && (
              <div className="mb-6">
                <h3 className="font-medium text-stone-900 mb-3">{t('productDetail.selectPack', 'Seleccionar Pack')}</h3>
                <div className="space-y-2">
                  {/* Use variant packs if available, otherwise product packs */}
                  {(selectedVariant?.packs || product.packs || []).map((pack, idx) => {
                    const isSelected = selectedPack?.pack_id === pack.pack_id;
                    return (
                      <button
                        key={pack.pack_id || idx}
                        onClick={() => {
                          // Toggle: if already selected, deselect. Otherwise select.
                          if (isSelected) {
                            setSelectedPack(null);
                          } else {
                            setSelectedPack(pack);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                            : 'bg-white border-stone-200 hover:border-stone-400'
                        }`}
                        data-testid={`pack-option-${pack.pack_id || idx}`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Checkbox indicator */}
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'bg-amber-500 border-amber-500' 
                              : 'border-stone-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-medium">{pack.label || `${pack.units || pack.quantity || 1} unidades`}</span>
                          {calculateSavings(pack, selectedVariant) && (
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                              {t('productDetail.savingsNote', 'Ahorra')} €{calculateSavings(pack, selectedVariant).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <span className="font-semibold">{convertAndFormatPrice(pack.price, 'EUR')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Purchase & Store Info */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 space-y-4">
              {/* Purchase Card */}
              <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm">
                {/* Quantity Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-stone-700 mb-2">{t('productDetail.quantity', 'Cantidad')}</label>
                  <div className="flex items-center border border-stone-200 rounded-lg w-fit">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 text-stone-600 hover:text-stone-900 transition-colors"
                      disabled={isOutOfStock}
                    >
                      −
                    </button>
                    <span className="px-4 py-2 font-medium text-stone-900 min-w-[50px] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                      className="px-4 py-2 text-stone-600 hover:text-stone-900 transition-colors"
                      disabled={isOutOfStock}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-stone-100">
                  <span className="text-stone-600">Total</span>
                  <span className="font-serif text-2xl font-bold text-stone-900">
                    {convertAndFormatPrice((selectedPack?.price || currentPrice || product.price) * quantity, product.currency || 'EUR')}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleBuyNow}
                    disabled={isOutOfStock}
                    className="w-full bg-stone-900 text-white hover:bg-stone-800 rounded-full py-6 font-medium"
                    data-testid="buy-now-button"
                  >
                    {t('products.buyNow', 'Comprar ahora')}
                  </Button>
                  <Button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    variant="outline"
                    className="w-full border-stone-300 text-stone-700 hover:bg-stone-50 rounded-full py-6 font-medium"
                    data-testid="add-to-cart-button"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {t('products.addToCart', 'Anadir al carrito')}
                  </Button>
                  <Button
                    onClick={toggleWishlist}
                    disabled={wishlistLoading}
                    variant="ghost"
                    className={`w-full rounded-full py-5 font-medium transition-colors ${inWishlist ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
                    data-testid="wishlist-button"
                  >
                    <Heart className={`w-4 h-4 mr-2 ${inWishlist ? 'fill-red-500' : ''}`} />
                    {inWishlist ? t('wishlist.inWishlist', 'En tu lista de deseos') : t('wishlist.addToWishlist', 'Guardar en lista de deseos')}
                  </Button>
                </div>

                {/* Trust Signals */}
                <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{t('productDetail.securePayment', 'Pago 100% seguro')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Truck className="w-4 h-4 text-green-500" />
                    <span>{t('productDetail.fastShipping', 'Envío en 24-48h')}</span>
                  </div>
                </div>
              </div>

              {/* Producer/Store Card - Enhanced */}
              <Link 
                to={storeInfo ? `/store/${storeInfo.slug}` : '#'}
                className="block bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md hover:border-stone-300 transition-all cursor-pointer" 
                data-testid="producer-card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-stone-900 flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    {t('productDetail.soldBy', 'Vendido por')}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
                
                {storeInfo ? (
                  <div>
                    {/* Store Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-full bg-stone-100 overflow-hidden flex items-center justify-center border-2 border-stone-200">
                        {storeInfo.logo ? (
                          <img src={storeInfo.logo} alt={storeInfo.name} className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-6 h-6 text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-stone-900 truncate">{storeInfo.name}</h4>
                        {storeInfo.location && (
                          <p className="text-xs text-stone-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {storeInfo.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Store Stats - 3 columns */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-stone-50 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                          <span className="font-semibold text-stone-900 text-sm">{storeInfo.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5">{storeInfo.review_count || 0} reviews</p>
                      </div>
                      <div className="bg-stone-50 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="w-3.5 h-3.5 text-stone-500" />
                          <span className="font-semibold text-stone-900 text-sm">{storeInfo.product_count || 0}</span>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5">{t('store.products', 'productos')}</p>
                      </div>
                      <div className="bg-stone-50 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5 text-stone-500" />
                          <span className="font-semibold text-stone-900 text-sm">{storeInfo.follower_count || 0}</span>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5">{t('store.followers', 'seguidores')}</p>
                      </div>
                    </div>

                    {/* Store Tagline */}
                    {storeInfo.tagline && (
                      <p className="text-xs text-stone-600 mb-4 line-clamp-2">{storeInfo.tagline}</p>
                    )}

                    {/* Follow Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleFollowStore();
                      }}
                      disabled={followLoading}
                      className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        isFollowing
                          ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                          : 'bg-stone-900 text-white hover:bg-stone-800'
                      }`}
                      data-testid="follow-store-button"
                    >
                      <Heart className={`w-4 h-4 ${isFollowing ? 'fill-red-500' : ''}`} />
                      {followLoading 
                        ? t('common.loading', 'Cargando...')
                        : isFollowing 
                          ? t('store.following', 'Siguiendo')
                          : t('store.follow', 'Seguir tienda')
                      }
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center">
                        <User className="w-6 h-6 text-stone-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-stone-900">{product.producer_name || 'Hispaloshop'}</h4>
                        <p className="text-xs text-stone-500">{t('productDetail.verifiedSeller', 'Vendedor verificado')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </Link>

              {/* Certificate Link */}
              {certificate && (
                <Link 
                  to={`/certificate/${productId}`}
                  className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors"
                  data-testid="certificate-link"
                >
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">{t('productDetail.viewCertificate', 'Ver certificado')}</p>
                      <p className="text-xs text-green-600">{t('productDetail.verifiedProduct', 'Producto verificado')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-green-600" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 pt-8 border-t border-stone-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-semibold text-stone-900">
              {t('productDetail.customerReviews', 'Reseñas de clientes')}
            </h2>
            {canReview && !showReviewForm && (
              <Button
                onClick={() => setShowReviewForm(true)}
                variant="outline"
                className="rounded-full"
              >
                {t('productDetail.writeReview', 'Escribir reseña')}
              </Button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
              <h3 className="font-medium text-stone-900 mb-4">{t('productDetail.yourReview', 'Tu reseña')}</h3>
              <div className="mb-4">
                <label className="block text-sm text-stone-600 mb-2">{t('productDetail.rating', 'Puntuación')}</label>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setReviewRating(num)}
                      className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                        num <= reviewRating ? 'bg-amber-400 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-stone-600 mb-2">{t('productDetail.comment', 'Comentario')}</label>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t('productDetail.reviewPlaceholder', 'Comparte tu experiencia con este producto...')}
                  rows={4}
                  className="rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="rounded-full"
                >
                  {submittingReview ? t('common.loading', 'Enviando...') : t('productDetail.submitReview', 'Enviar reseña')}
                </Button>
                <Button
                  onClick={() => setShowReviewForm(false)}
                  variant="outline"
                  className="rounded-full"
                >
                  {t('common.cancel', 'Cancelar')}
                </Button>
              </div>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-stone-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-stone-400" />
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{review.user_name || 'Cliente'}</p>
                        {review.verified_purchase && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {t('productDetail.verifiedPurchase', 'Compra verificada')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
                      <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                      <span className="font-semibold text-amber-700">{review.rating}</span>
                    </div>
                  </div>
                  <p className="text-stone-600 text-sm">{review.comment}</p>
                  <p className="text-xs text-stone-400 mt-3">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 bg-white rounded-xl border border-border-default">
              <Star className="w-10 h-10 md:w-12 md:h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-text-muted text-sm md:text-base">{t('productDetail.noReviews', 'Aún no hay reseñas')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Buy Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border-default p-4 z-40 md:hidden shadow-floating" data-testid="mobile-buy-bar">
        <div className="flex items-center gap-3">
          {/* Price */}
          <div className="flex-1 min-w-0">
            <span className="font-heading text-lg font-bold text-text-primary">
              {convertAndFormatPrice((selectedPack?.price || currentPrice || product.price) * quantity, product.currency || 'EUR')}
            </span>
            {quantity > 1 && (
              <span className="text-xs text-text-muted ml-1">× {quantity}</span>
            )}
          </div>
          
          {/* Quantity Controls - Compact */}
          <div className="flex items-center border border-border-default rounded-lg">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 text-text-secondary"
              disabled={isOutOfStock}
            >
              −
            </button>
            <span className="px-2 py-2 font-medium text-text-primary min-w-[32px] text-center text-sm">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              className="px-3 py-2 text-text-secondary"
              disabled={isOutOfStock}
            >
              +
            </button>
          </div>
          
          {/* Buy Button */}
          <Button
            onClick={handleBuyNow}
            disabled={isOutOfStock}
            className="bg-ds-primary text-white hover:bg-ds-primary/90 rounded-full px-6 font-medium min-h-touch"
            data-testid="mobile-buy-button"
          >
            {isOutOfStock ? t('products.soldOut', 'Agotado') : t('products.buyNow', 'Comprar')}
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
