import { useEffect, useState } from 'react';
import { useProduct as useProductQuery } from '../queries';

export function useProductPurchaseOptions(productId) {
  const { data: product } = useProductQuery(productId);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedPack, setSelectedPack] = useState(null);

  useEffect(() => {
    if (product?.variants?.length > 0) {
      setSelectedVariant((currentVariant) => {
        if (!currentVariant) {
          return product.variants[0];
        }

        return (
          product.variants.find((variant) => variant.variant_id === currentVariant.variant_id) ||
          product.variants[0]
        );
      });
      return;
    }

    setSelectedVariant(null);
    setSelectedPack(null);
  }, [product]);

  useEffect(() => {
    if (selectedVariant?.packs?.length > 0) {
      setSelectedPack((currentPack) => {
        if (!currentPack) {
          return selectedVariant.packs[0];
        }

        return (
          selectedVariant.packs.find((pack) => pack.pack_id === currentPack.pack_id) ||
          selectedVariant.packs[0]
        );
      });
      return;
    }

    if (product?.variants?.length > 0) {
      setSelectedPack(null);
    }
  }, [product, selectedVariant]);

  const trackStock = product?.track_stock !== false;
  const stock = product?.stock ?? 100;
  const lowStockThreshold = product?.low_stock_threshold ?? 5;
  const isOutOfStock = trackStock && stock <= 0;
  const isLowStock = trackStock && stock > 0 && stock <= lowStockThreshold;
  const maxQuantity = trackStock ? stock : 99;
  const hasVariants = Boolean(product?.variants?.length);
  const currentPrice = selectedPack?.price || selectedVariant?.price || product?.price;
  const currentIngredients = selectedVariant?.ingredients || product?.ingredients || [];
  const currentNutritionalInfo = selectedVariant?.nutritional_info || product?.nutritional_info || null;
  const currentAllergens = selectedVariant?.allergens || product?.allergens || [];

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    if (variant.packs?.length > 0) {
      setSelectedPack(variant.packs[0]);
      return;
    }

    setSelectedPack(null);
  };

  const calculateSavings = (pack, variant) => {
    if (!variant?.price || !pack?.quantity) {
      return null;
    }

    const regularTotal = variant.price * pack.quantity;
    const savings = regularTotal - pack.price;
    return savings > 0 ? savings : null;
  };

  return {
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
  };
}

export default useProductPurchaseOptions;
