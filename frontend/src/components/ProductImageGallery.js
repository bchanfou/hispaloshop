import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductImage from './ui/ProductImage.tsx';

export default function ProductImageGallery({ images, productName, isOutOfStock }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const galleryRef = useRef(null);

  const productImages = images && images.length > 0
    ? images.slice(0, 7).filter(Boolean)
    : [null];

  const showThumbnails = productImages.length > 1;
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
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
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-lg" data-testid="out-of-stock-overlay">
            <div className="bg-stone-950 text-white px-4 md:px-6 py-2 md:py-3 rounded-full font-medium text-sm md:text-lg">
              Agotado
            </div>
          </div>
        )}

        <div
          className={`aspect-square rounded-lg md:rounded-xl overflow-hidden bg-white border border-stone-200 transition-opacity duration-300 ${isOutOfStock ? 'opacity-60' : ''}`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          data-testid="product-main-image"
        >
          <ProductImage
            src={productImages[selectedImageIndex]}
            productName={productName}
            alt={`${productName} - Image ${selectedImageIndex + 1}`}
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
              className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 md:hidden rounded-full bg-white/90 shadow-md flex items-center justify-center transition-opacity ${
                selectedImageIndex === 0 ? 'opacity-30' : 'opacity-100'
              }`}
              disabled={selectedImageIndex === 0}
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 text-stone-950" />
            </button>
            <button
              onClick={goToNext}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:hidden rounded-full bg-white/90 shadow-md flex items-center justify-center transition-opacity ${
                selectedImageIndex === productImages.length - 1 ? 'opacity-30' : 'opacity-100'
              }`}
              disabled={selectedImageIndex === productImages.length - 1}
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 text-stone-950" />
            </button>
          </>
        )}

        {showThumbnails && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
            {productImages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  selectedImageIndex === idx ? 'bg-stone-950 w-4' : 'bg-white/70'
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
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
                flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden bg-white border-2
                transition-all duration-200 hover:scale-105
                ${selectedImageIndex === idx
                  ? 'border-stone-950 ring-2 ring-stone-200'
                  : 'border-stone-200 hover:border-stone-400'
                }
              `}
              data-testid={`product-thumbnail-${idx}`}
              aria-label={`View image ${idx + 1}`}
            >
              <ProductImage
                src={img}
                productName={productName}
                alt={`${productName} thumbnail ${idx + 1}`}
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
