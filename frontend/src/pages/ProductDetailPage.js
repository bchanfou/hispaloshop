import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductImageGallery from '../components/ProductImageGallery';
import { ShoppingCart, FileCheck, AlertTriangle, AlertCircle, Star, CheckCircle, User, Package, Store, MapPin, Truck, Shield, ChevronRight, Heart, Users, Leaf } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import {
  useProductDetail,
  useProductPurchaseOptions,
  useProductReviews as useProductReviewsHook,
  useStoreFollow,
} from '../features/products/hooks';

// Strip emojis from text (data may contain unwanted emoji chars)
const stripEmoji = (text) => {
  if (typeof text !== 'string') return text;
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
};

export default function ProductDetailPage() {
  const { productId } = useParams();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { convertAndFormatPrice } = useLocale();
  const { t } = useTranslation();
  const {
    product,
    certificate,
    storeInfo,
    inWishlist,
    isLoading: loading,
    isError: hasProductError,
    wishlistLoading,
    toggleWishlist: toggleWishlistMutation,
  } = useProductDetail(productId);
  const {
    quantity,
    setQuantity,
    selectedVariant,
    selectedPack,
    setSelectedPack,
    hasVariants,
    currentPrice,
    currentIngredients,
    currentNutritionalInfo,
    currentAllergens,
    trackStock,
    stock,
    lowStockThreshold,
    isOutOfStock,
    isLowStock,
    maxQuantity,
    handleVariantChange,
    calculateSavings,
  } = useProductPurchaseOptions(productId);
  const {
    reviews,
    averageRating,
    totalReviews,
    canReview,
    reviewOrderId,
    isSubmitting: submittingReview,
    submitReview,
  } = useProductReviewsHook(productId);
  const {
    isFollowing,
    followLoading,
    handleFollowStore: toggleStoreFollow,
  } = useStoreFollow(storeInfo?.slug || storeInfo?.store_slug);
  const storeSlug = storeInfo?.slug || storeInfo?.store_slug || null;
  const normalizedAverageRating = Number(averageRating || 0);
  const normalizedStoreRating = Number(storeInfo?.rating || 0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (hasProductError) {
      toast.error(t('errors.notFound'));
    }
  }, [hasProductError, t]);

  const handleFollowStore = async () => {
    if (!user) {
      toast.error(t('errors.unauthorized', 'Inicia sesión para seguir tiendas'));
      return;
    }

    try {
      await toggleStoreFollow();
      toast.success(
        isFollowing
          ? t('store.unfollowed', 'Has dejado de seguir la tienda')
          : t('store.followed', 'Ahora sigues esta tienda'),
      );
    } catch {
      toast.error(t('errors.generic', 'Error al procesar la solicitud'));
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      toast.error('Escribe un comentario antes de enviar la reseña');
      return;
    }

    try {
      await submitReview({
        orderId: reviewOrderId,
        rating: reviewRating,
        comment: reviewComment,
      });

      toast.success('Reseña enviada correctamente');
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
    } catch (error) {
      toast.error(error.message || 'No hemos podido enviar la reseña');
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      toast.info(t('auth.loginRequired', 'Inicia sesión para guardar'));
      return;
    }

    try {
      await toggleWishlistMutation();
      toast.success(
        inWishlist
          ? t('wishlist.removed', 'Eliminado de la lista de deseos')
          : t('wishlist.added', 'Guardado en tu lista de deseos'),
      );
    } catch {
      toast.error(t('errors.generic', 'Error'));
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error(t('errors.loginRequired', 'Inicia sesión para añadir productos'), {
        action: {
          label: t('auth.login', 'Entrar'),
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
          label: t('auth.login', 'Entrar'),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950 mx-auto mb-4"></div>
          <p className="text-stone-500">{t('productDetail.loading')}</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
          <p className="text-stone-500 text-lg mb-4">{t('productDetail.notFound')}</p>
          <Link
            to="/products"
            className="inline-flex items-center rounded-full bg-stone-950 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-stone-800"
          >
            {t('productDetail.backToProducts')}
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Shipping info
  const isFreeShipping = !product.shipping_cost || product.shipping_cost === 0;

  return (
    <div className="min-h-screen bg-stone-50">
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
                    className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700 md:px-2.5 md:py-1 md:text-xs"
                    data-testid={`cert-badge-${cert}`}
                  >
                    <Shield className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    {cert}
                  </span>
                ))}
              </div>
            )}

            {/* Certificate badge */}
            {product.certificate_id && (
              <a
                href={`/certificate/${product.product_id || product.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-200 transition-colors mb-2"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" className="text-stone-700"><circle cx="8" cy="8" r="8" fill="currentColor"/><path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                {t('productDetail.certified', 'Certificado Hispaloshop verificado')}
              </a>
            )}

            {/* Product Title */}
            <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-stone-950 mb-2 md:mb-3 leading-tight" data-testid="product-title">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 md:w-5 md:h-5 fill-stone-950 stroke-stone-950" />
                <span className="font-semibold text-stone-950 text-sm md:text-base">{Number.isFinite(normalizedAverageRating) ? normalizedAverageRating.toFixed(1) : '0.0'}</span>
              </div>
              <span className="text-stone-500 text-xs md:text-sm">({totalReviews} {t('productDetail.reviews', 'reseñas')})</span>
              {product.units_sold > 0 && (
                <>
                  <span className="text-stone-300 hidden md:inline">·</span>
                  <span className="text-stone-500 text-xs md:text-sm">{product.units_sold} {t('products.sold', 'vendidos')}</span>
                </>
              )}
            </div>

            {/* Stock Status */}
            {isOutOfStock && (
              <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 mb-3 md:px-4 md:mb-4">
                <AlertTriangle className="w-4 h-4 text-stone-700 shrink-0" />
                <span className="text-stone-700 text-xs md:text-sm font-medium">{t('productDetail.outOfStock')}</span>
              </div>
            )}
            {isLowStock && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-100 px-3 py-2 md:mb-4 md:px-4">
                <AlertCircle className="h-4 w-4 text-stone-700" />
                <span className="text-xs font-medium text-stone-700 md:text-sm">{t('productDetail.lowStockWarning', { count: stock })}</span>
              </div>
            )}

            {/* Price - Larger on mobile since it's key info */}
            <div className="mb-4 md:mb-6">
              <span className="text-2xl md:text-3xl font-bold text-stone-950" data-testid="product-price">
                {convertAndFormatPrice(currentPrice || product.price, product.currency || 'EUR')}
              </span>
            </div>

            {/* Shipping Info */}
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-2.5 md:mb-6 md:p-3">
              <Truck className={`w-4 h-4 md:w-5 md:h-5 ${isFreeShipping ? 'text-stone-950' : 'text-stone-500'}`} />
              {isFreeShipping ? (
                <span className="text-sm font-medium text-stone-950">{t('products.freeShipping', 'Envío gratis')}</span>
              ) : (
                <div className="text-xs md:text-sm">
                  <span className="font-medium text-stone-700">
                    {t('products.shippingCost', 'Envío')}: {convertAndFormatPrice(product.shipping_cost, 'EUR')}
                  </span>
                  {product.free_shipping_min_qty && (
                    <span className="ml-1 text-stone-500 md:ml-2">
                      ({t('products.freeFrom', 'gratis desde')} {product.free_shipping_min_qty} uds)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mb-4 md:mb-6">
              <h3 className="mb-2 text-sm font-medium text-stone-950 md:text-base">{t('productDetail.description', 'Descripción')}</h3>
              <p className="text-xs leading-relaxed text-stone-600 md:text-sm" data-testid="product-description">
                {product.description}
              </p>
            </div>

            {/* Ingredients Section */}
            {currentIngredients && currentIngredients.length > 0 && (
              <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6" data-testid="ingredients-section">
                <h3 className="font-medium text-stone-950 mb-3 flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-stone-700" />
                  {t('productDetail.ingredients', 'Ingredientes')}
                  {selectedVariant && (
                    <span className="text-xs text-stone-500 font-normal">({selectedVariant.name})</span>
                  )}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentIngredients.map((ingredient, idx) => (
                    <span 
                      key={idx} 
                      className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-3 py-1.5 text-sm text-stone-700"
                    >
                      {typeof ingredient === 'object' ? (
                        <>
                          <span className="font-medium">{stripEmoji(ingredient.name)}</span>
                          {ingredient.origin && (
                            <span className="text-xs text-stone-500">({stripEmoji(ingredient.origin)})</span>
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
                <h3 className="font-medium text-stone-950 mb-3">
                  {t('productDetail.nutritionalInfo', 'Información Nutricional')}
                  {selectedVariant && (
                    <span className="text-xs text-stone-500 font-normal ml-2">({selectedVariant.name})</span>
                  )}
                </h3>
                <p className="text-xs text-stone-500 mb-3">{t('productDetail.per100g', 'Por 100g')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currentNutritionalInfo.calories !== undefined && (
                    <div className="bg-stone-50 rounded-xl p-2 text-center">
                      <p className="text-lg font-semibold text-stone-950">{currentNutritionalInfo.calories}</p>
                      <p className="text-xs text-stone-500">{t('certificate.calories', 'Calorías')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.protein !== undefined && (
                    <div className="bg-stone-50 rounded-xl p-2 text-center">
                      <p className="text-lg font-semibold text-stone-950">{currentNutritionalInfo.protein}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.protein', 'Proteínas')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.carbohydrates !== undefined && (
                    <div className="bg-stone-50 rounded-xl p-2 text-center">
                      <p className="text-lg font-semibold text-stone-950">{currentNutritionalInfo.carbohydrates}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.carbohydrates', 'Carbohidratos')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.sugars !== undefined && (
                    <div className="bg-stone-50 rounded-xl p-2 text-center">
                      <p className="text-lg font-semibold text-stone-950">{currentNutritionalInfo.sugars}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.sugars', 'Azúcares')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.fat !== undefined && (
                    <div className="bg-stone-50 rounded-xl p-2 text-center">
                      <p className="text-lg font-semibold text-stone-950">{currentNutritionalInfo.fat}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.fat', 'Grasas')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.saturated_fat !== undefined && (
                    <div className="bg-stone-50 rounded-xl p-2 text-center">
                      <p className="text-lg font-semibold text-stone-950">{currentNutritionalInfo.saturated_fat}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.saturatedFat', 'Grasas Sat.')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.fiber !== undefined && (
                    <div className="bg-stone-50 rounded-xl p-2 text-center">
                      <p className="text-lg font-semibold text-stone-950">{currentNutritionalInfo.fiber}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.fiber', 'Fibra')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.sodium !== undefined && (
                    <div className="bg-stone-50 rounded-xl p-2 text-center">
                      <p className="text-lg font-semibold text-stone-950">{currentNutritionalInfo.sodium}mg</p>
                      <p className="text-xs text-stone-500">{t('certificate.sodium', 'Sodio')}</p>
                    </div>
                  )}
                  {currentNutritionalInfo.salt !== undefined && (
                    <div className="bg-stone-50 rounded-xl p-2 text-center">
                      <p className="text-lg font-semibold text-stone-950">{currentNutritionalInfo.salt}g</p>
                      <p className="text-xs text-stone-500">{t('certificate.salt', 'Sal')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Allergens */}
            {currentAllergens && currentAllergens.length > 0 && (
              <div className="mb-6 rounded-xl border border-stone-200 bg-stone-100 p-4" data-testid="allergens-section">
                <h3 className="mb-2 flex items-center gap-2 font-medium text-stone-950">
                  <AlertTriangle className="h-4 w-4 text-stone-700" />
                  {t('productDetail.allergens', 'Alérgenos')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {currentAllergens.map((allergen, idx) => (
                    <span 
                      key={idx} 
                      className="rounded-full bg-white px-2 py-1 text-xs font-medium text-stone-700"
                    >
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Product Details */}
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
              <h3 className="font-medium text-stone-950 mb-3">{t('productDetail.details', 'Detalles')}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-stone-500">{t('productDetail.origin', 'Origen')}</span>
                  <p className="text-stone-950 font-medium">{product.country_origin}</p>
                </div>
                <div>
                  <span className="text-stone-500">{t('productDetail.category', 'Categoría')}</span>
                  <p className="text-stone-950 font-medium capitalize">{product.category_id?.replace('cat_', '').replace(/-/g, ' ')}</p>
                </div>
                {product.sku && (
                  <div>
                    <span className="text-stone-500">SKU</span>
                    <p className="text-stone-950 font-medium">{product.sku}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Variant Selector (for products with internal variants like flavors) */}
            {hasVariants && product.variants.length > 1 && (
              <div className="mb-6">
                <h3 className="font-medium text-stone-950 mb-3">{t('productDetail.selectVariant', 'Seleccionar Variante')}</h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.variant_id}
                      onClick={() => handleVariantChange(variant)}
                      data-testid={`variant-button-${variant.variant_id}`}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        selectedVariant?.variant_id === variant.variant_id
                          ? 'border border-stone-950 bg-stone-950 text-white'
                          : 'border border-stone-200 bg-white text-stone-700 hover:border-stone-400'
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
                <h3 className="font-medium text-stone-950 mb-3">{t('productDetail.selectPack', 'Seleccionar Pack')}</h3>
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
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-stone-950 bg-stone-100 ring-2 ring-stone-950/10'
                            : 'bg-white border-stone-200 hover:border-stone-400'
                        }`}
                        data-testid={`pack-option-${pack.pack_id || idx}`}
                      >
                        <div className="flex items-center gap-2">
                          {/* Checkbox indicator */}
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'border-stone-950 bg-stone-950' 
                              : 'border-stone-200'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm font-medium">{pack.label || `${pack.units || pack.quantity || 1} unidades`}</span>
                          {calculateSavings(pack, selectedVariant) && (
                            <span className="rounded-full bg-stone-950 px-2 py-0.5 text-xs text-white">
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
                  <div className="flex items-center border border-stone-200 rounded-xl w-fit">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 text-stone-600 hover:text-stone-950 transition-colors"
                      disabled={isOutOfStock}
                    >
                      −
                    </button>
                    <span className="px-4 py-2 font-medium text-stone-950 min-w-[50px] text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                      className="px-4 py-2 text-stone-600 hover:text-stone-950 transition-colors"
                      disabled={isOutOfStock}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-stone-100">
                  <span className="text-stone-600">Total</span>
                  <span className="text-[22px] font-semibold text-stone-950">
                    {convertAndFormatPrice((selectedPack?.price || currentPrice || product.price) * quantity, product.currency || 'EUR')}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`flex-1 rounded-full py-3 text-[14px] font-semibold transition-colors ${
                      isOutOfStock
                        ? 'cursor-not-allowed bg-stone-100 text-stone-400'
                        : 'bg-stone-950 text-white hover:bg-stone-800 active:scale-[0.98]'
                    }`}
                    data-testid="add-to-cart-button"
                  >
                    {isOutOfStock ? t('products.soldOut', 'Agotado') : t('products.addToCart', 'Añadir al carrito')}
                  </button>
                  <button
                    type="button"
                    onClick={toggleWishlist}
                    disabled={wishlistLoading}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 transition-colors hover:bg-stone-50 active:scale-95"
                    data-testid="wishlist-button"
                    aria-label={inWishlist ? t('wishlist.inWishlist', 'En tu lista') : t('wishlist.addToWishlist', 'Guardar')}
                  >
                    <Heart
                      className={`h-5 w-5 transition-all duration-150 ${inWishlist ? 'fill-stone-950 text-stone-950' : 'text-stone-500'}`}
                      strokeWidth={inWishlist ? 0 : 1.8}
                    />
                  </button>
                </div>

                {/* Trust Signals */}
                <div className="mt-4 pt-4 border-t border-stone-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <CheckCircle className="w-4 h-4 text-stone-700" />
                    <span>{t('productDetail.securePayment', 'Pago 100% seguro')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Truck className="w-4 h-4 text-stone-700" />
                    <span>{t('productDetail.fastShipping', 'Envío en 24-48h')}</span>
                  </div>
                </div>
              </div>

              {/* Producer/Store Card - Enhanced */}
              {storeInfo ? (
                <Link 
                  to={storeSlug ? `/store/${storeSlug}` : '/stores'}
                  className="block bg-white rounded-xl border border-stone-200 p-5 shadow-sm hover:shadow-md hover:border-stone-400 transition-all cursor-pointer"
                  data-testid="producer-card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-stone-950 flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      {t('productDetail.soldBy', 'Vendido por')}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </div>
                  
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
                        <h4 className="font-semibold text-stone-950 truncate">{storeInfo.name}</h4>
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
                      <div className="bg-stone-50 rounded-xl p-2">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-stone-950 stroke-stone-950" />
                          <span className="font-semibold text-stone-950 text-sm">{Number.isFinite(normalizedStoreRating) ? normalizedStoreRating.toFixed(1) : '0.0'}</span>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5">{storeInfo.review_count || 0} reviews</p>
                      </div>
                      <div className="bg-stone-50 rounded-xl p-2">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="w-3.5 h-3.5 text-stone-500" />
                          <span className="font-semibold text-stone-950 text-sm">{storeInfo.product_count || 0}</span>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5">{t('store.products', 'productos')}</p>
                      </div>
                      <div className="bg-stone-50 rounded-xl p-2">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-3.5 h-3.5 text-stone-500" />
                          <span className="font-semibold text-stone-950 text-sm">{storeInfo.follower_count || 0}</span>
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
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        isFollowing
                          ? 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
                          : 'bg-stone-950 text-white hover:bg-stone-800'
                      }`}
                      data-testid="follow-store-button"
                    >
                      <Heart className={`w-4 h-4 ${isFollowing ? 'fill-stone-950' : ''}`} />
                      {followLoading 
                        ? t('common.loading', 'Cargando...')
                        : isFollowing 
                          ? t('store.following', 'Siguiendo')
                          : t('store.follow', 'Seguir tienda')
                      }
                    </button>
                  </div>
                </Link>
              ) : (
                <div
                  className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
                  data-testid="producer-card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-stone-950 flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      {t('productDetail.soldBy', 'Vendido por')}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-stone-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-950">{product.producer_name || 'Hispaloshop'}</h4>
                      <p className="text-xs text-stone-500">{t('productDetail.verifiedSeller', 'Productor verificado')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Certificate Link */}
              {certificate && (
                <Link 
                  to={`/certificate/${productId}`}
                  className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-stone-400 hover:bg-stone-50"
                  data-testid="certificate-link"
                >
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-5 h-5 text-stone-700" />
                    <div>
                      <p className="font-medium text-stone-950">{t('productDetail.viewCertificate', 'Ver certificado')}</p>
                      <p className="text-xs text-stone-500">{t('productDetail.verifiedProduct', 'Producto verificado')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-400" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12 pt-8 border-t border-stone-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[18px] font-semibold text-stone-950">
              {t('productDetail.customerReviews', 'Reseñas de clientes')}
            </h2>
            {canReview && !showReviewForm && (
              <button
                type="button"
                onClick={() => setShowReviewForm(true)}
                className="rounded-full border border-stone-200 px-4 py-2 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50 active:scale-95"
              >
                {t('productDetail.writeReview', 'Escribir reseña')}
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && (
            <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
              <h3 className="font-medium text-stone-950 mb-4">{t('productDetail.yourReview', 'Tu reseña')}</h3>
              <div className="mb-4">
                <label className="block text-sm text-stone-600 mb-2">{t('productDetail.rating', 'Puntuación')}</label>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setReviewRating(num)}
                      className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                        num <= reviewRating ? 'bg-stone-950 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-stone-600 mb-2">{t('productDetail.comment', 'Comentario')}</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t('productDetail.reviewPlaceholder', 'Comparte tu experiencia con este producto...')}
                  rows={4}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-950 placeholder:text-stone-400 focus:outline-none focus:border-stone-950 resize-none"
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="rounded-full bg-stone-950 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
                >
                  {submittingReview ? t('common.loading', 'Enviando...') : t('productDetail.submitReview', 'Enviar reseña')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="rounded-full border border-stone-200 px-5 py-2.5 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
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
                        <p className="font-medium text-stone-950">{review.user_name || 'Cliente'}</p>
                        {review.verified_purchase && (
                          <p className="flex items-center gap-1 text-xs text-stone-500">
                            <CheckCircle className="w-3 h-3" />
                            {t('productDetail.verifiedPurchase', 'Compra verificada')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 rounded-full bg-stone-100 px-2 py-1">
                      <Star className="w-4 h-4 fill-stone-950 stroke-stone-950" />
                      <span className="font-semibold text-stone-700">{review.rating}</span>
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
            <div className="text-center py-8 md:py-12 bg-white rounded-xl border border-stone-200">
              <Star className="w-10 h-10 md:w-12 md:h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-sm text-stone-500 md:text-base">{t('productDetail.noReviews', 'Aún no hay reseñas')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Buy Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 bg-white p-4 shadow-sm md:hidden" data-testid="mobile-buy-bar">
        <div className="flex items-center gap-3">
          {/* Price */}
          <div className="flex-1 min-w-0">
            <span className="text-lg font-bold text-stone-950">
              {convertAndFormatPrice((selectedPack?.price || currentPrice || product.price) * quantity, product.currency || 'EUR')}
            </span>
            {quantity > 1 && (
              <span className="ml-1 text-xs text-stone-500">× {quantity}</span>
            )}
          </div>
          
          {/* Quantity Controls - Compact */}
          <div className="flex items-center rounded-xl border border-stone-200">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 text-stone-600"
              disabled={isOutOfStock}
            >
              −
            </button>
            <span className="min-w-[32px] px-2 py-2 text-center text-sm font-medium text-stone-950">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              className="px-3 py-2 text-stone-600"
              disabled={isOutOfStock}
            >
              +
            </button>
          </div>
          
          {/* Buy Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`rounded-full px-6 py-2.5 text-[14px] font-semibold transition-colors active:scale-[0.98] ${
              isOutOfStock
                ? 'cursor-not-allowed bg-stone-100 text-stone-400'
                : 'bg-stone-950 text-white hover:bg-stone-800'
            }`}
            data-testid="mobile-buy-button"
          >
            {isOutOfStock ? t('products.soldOut', 'Agotado') : t('products.addToCart', 'Añadir')}
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

