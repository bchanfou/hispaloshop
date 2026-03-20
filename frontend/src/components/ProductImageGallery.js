import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductImage from './ui/ProductImage.tsx';

export default function ProductImageGallery({ images, productName, isOutOfStock }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);
  const galleryRef = useRef(null);

  const productImages = images && images.length > 0
    ? images.slice(0, 7).filter(Boolean)
    : [null];

  // Reset index when images change
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [images]);

  const showThumbnails = productImages.length > 1;
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && selectedImageIndex < productImages.length - 1) {
      setSelectedImageIndex((prev) => prev + 1);
    }
    if (isRightSwipe && selectedImageIndex > 0) {
      setSelectedImageIndex((prev) => prev - 1);
    }
  };

  const goToNext = () => {
    if (selectedImageIndex < productImages.length - 1) {
      setSelectedImageIndex((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (selectedImageIndex > 0) {
      setSelectedImageIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div
        className="relative"
        ref={galleryRef}
      >
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-2xl" data-testid="out-of-stock-overlay">
            <div className="bg-stone-950 text-white px-4 md:px-6 py-2 md:py-3 rounded-full font-medium text-sm md:text-lg">
              Agotado
            </div>
          </div>
        )}

        <div
          className={`aspect-square rounded-2xl overflow-hidden bg-white border border-stone-200 transition-opacity duration-300 ${isOutOfStock ? 'opacity-60' : ''}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          data-testid="product-main-image"
        >
          <ProductImage
            src={productImages[selectedImageIndex]}
            productName={productName}
            alt={`${productName} - Imagen ${selectedImageIndex + 1}`}
            className="h-full w-full"
            imageClassName="transition-opacity duration-300"
            preferThumbnail={false}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        {showThumbnails && (
          <>
            <button
              onClick={goToPrev}
              className={`absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 shadow-md flex items-center justify-center transition-opacity ${
                selectedImageIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              disabled={selectedImageIndex === 0}
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="w-5 h-5 text-stone-950" />
            </button>
            <button
              onClick={goToNext}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 shadow-md flex items-center justify-center transition-opacity ${
                selectedImageIndex === productImages.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
              disabled={selectedImageIndex === productImages.length - 1}
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="w-5 h-5 text-stone-950" />
            </button>
          </>
        )}

        {showThumbnails && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5 md:hidden">
            {productImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className="flex items-center justify-center w-11 h-11"
                aria-label={`Ir a imagen ${idx + 1}`}
              >
                <span
                  className={`block rounded-full transition-all ${
                    selectedImageIndex === idx ? 'bg-stone-950 w-4 h-2' : 'bg-white/70 w-2 h-2'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {showThumbnails && (
        <div className="hidden md:flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-200 scrollbar-track-transparent">
          {productImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImageIndex(idx)}
              className={`
                flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-2xl overflow-hidden bg-white border-2
                transition-all duration-200 hover:scale-105
                ${selectedImageIndex === idx
                  ? 'border-stone-950 ring-2 ring-stone-200'
                  : 'border-stone-200 hover:border-stone-300'
                }
              `}
              data-testid={`product-thumbnail-${idx}`}
              aria-label={`Ver imagen ${idx + 1}`}
            >
              <ProductImage
                src={img}
                productName={productName}
                alt={`${productName} miniatura ${idx + 1}`}
                className="h-full w-full"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {showThumbnails && (
        <div className="hidden md:block text-center">
          <p className="text-xs text-stone-500">
            {selectedImageIndex + 1} / {productImages.length}
          </p>
        </div>
      )}
    </div>
  );
}
