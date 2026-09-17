import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ChevronRight, ChevronLeft, ZoomIn, X, Image as ImageIcon } from 'lucide-react';

export const CustomerReviewsGallery: React.FC = () => {
  const { reviewImages } = useStore();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = reviewImages.length;

  // Infinite loop auto-play
  useEffect(() => {
    if (isPaused || total <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 3400);
    return () => clearInterval(interval);
  }, [isPaused, total]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleCardClick = (imageUrl: string, isCenter: boolean, index: number) => {
    if (isCenter) {
      setSelectedImage(imageUrl);
    } else {
      setActiveIndex(index);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  // Circular wrapped offset relative to activeIndex
  const getOffset = (index: number) => {
    let diff = (index - activeIndex) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  return (
    <section
      id="customer-reviews-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-stone-800/80 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-stone-100">
          تجارب العملاء
        </h2>
      </div>

      {total === 0 ? (
        <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-10 text-center text-stone-400">
          <ImageIcon className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-stone-300">لا توجد صور تقييمات حالياً</p>
          <p className="text-xs text-stone-500 mt-1">يمكنك إضافة صور تجارب العملاء من لوحة التحكم.</p>
        </div>
      ) : (
        <div>
          {/* 3D Stretched Infinite Loop Carousel for Reviews */}
          <div className="relative max-w-4xl mx-auto h-[340px] sm:h-[420px] md:h-[460px] flex items-center justify-center [perspective:1200px]">
            {/* Nav Arrows - Hidden on mobile, swipe only */}
            <button
              id="reviews-prev-btn"
              type="button"
              onClick={handlePrev}
              className="hidden md:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-stone-950/85 hover:bg-stone-900 border border-stone-700/80 text-stone-200 hover:text-white items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95"
              aria-label="السابق"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              id="reviews-next-btn"
              type="button"
              onClick={handleNext}
              className="hidden md:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-stone-950/85 hover:bg-stone-900 border border-stone-700/80 text-stone-200 hover:text-white items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95"
              aria-label="التالي"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Reviews Stream */}
            <div className="relative w-full h-full flex items-center justify-center">
              {reviewImages.map((item, idx) => {
                const offset = getOffset(idx);
                const isCenter = offset === 0;
                const isVisible = Math.abs(offset) <= 2;

                if (!isVisible) return null;

                let transformStyle = '';
                let filterStyle = 'blur(0px)';
                let opacityStyle = 1;
                let zIndexStyle = 30;

                if (isCenter) {
                  transformStyle = 'translateX(0%) scale(1.05) rotateY(0deg)';
                  filterStyle = 'blur(0px)';
                  opacityStyle = 1;
                  zIndexStyle = 30;
                } else if (offset === -1) {
                  // Preceding item: stretched, rotated, blurred
                  transformStyle = 'translateX(62%) scale(0.82) scaleX(0.9) rotateY(-26deg)';
                  filterStyle = 'blur(4px)';
                  opacityStyle = 0.5;
                  zIndexStyle = 20;
                } else if (offset === 1) {
                  // Succeeding item: stretched, rotated, blurred
                  transformStyle = 'translateX(-62%) scale(0.82) scaleX(0.9) rotateY(26deg)';
                  filterStyle = 'blur(4px)';
                  opacityStyle = 0.5;
                  zIndexStyle = 20;
                } else if (offset === -2) {
                  transformStyle = 'translateX(110%) scale(0.68) scaleX(0.8) rotateY(-38deg)';
                  filterStyle = 'blur(7px)';
                  opacityStyle = 0.2;
                  zIndexStyle = 10;
                } else if (offset === 2) {
                  transformStyle = 'translateX(-110%) scale(0.68) scaleX(0.8) rotateY(38deg)';
                  filterStyle = 'blur(7px)';
                  opacityStyle = 0.2;
                  zIndexStyle = 10;
                }

                return (
                  <div
                    key={item.id}
                    id={`review-coverflow-card-${item.id}`}
                    onClick={() => handleCardClick(item.imageUrl, isCenter, idx)}
                    style={{
                      transform: transformStyle,
                      filter: filterStyle,
                      opacity: opacityStyle,
                      zIndex: zIndexStyle,
                      transition: 'all 500ms cubic-bezier(0.25, 1, 0.5, 1)'
                    }}
                    className={`absolute w-[210px] sm:w-[270px] md:w-[310px] aspect-[3/4] rounded-2xl overflow-hidden bg-stone-900 border cursor-pointer group shadow-2xl ${
                      isCenter
                        ? 'border-amber-500/50 shadow-black/80 ring-1 ring-amber-500/30'
                        : 'border-stone-800 shadow-black/60'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.caption || 'رأي عميل'}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        isCenter ? 'group-hover:scale-105' : ''
                      }`}
                    />

                    {/* Hover indicator on center item */}
                    {isCenter && (
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4 pointer-events-none">
                        <div className="flex justify-end">
                          <div className="w-8 h-8 rounded-full bg-stone-900/90 border border-stone-700 text-amber-400 flex items-center justify-center shadow-lg">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </div>
                        {item.caption && (
                          <div className="bg-stone-950/90 p-2 rounded-xl border border-stone-800 text-stone-200 text-xs line-clamp-2">
                            {item.caption}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center items-center gap-2 mt-6">
            {reviewImages.map((_, idx) => (
              <button
                key={idx}
                id={`reviews-dot-${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === idx
                    ? 'w-6 bg-amber-500'
                    : 'w-2 bg-stone-700 hover:bg-stone-500'
                }`}
                aria-label={`تقييم رقم ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          id="review-image-lightbox"
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <button
            id="close-review-lightbox-btn"
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-stone-900 border border-stone-700 text-stone-200 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 shadow-2xl relative"
          >
            <img
              src={selectedImage}
              alt="معاينة رأي العميل"
              referrerPolicy="no-referrer"
              className="w-full h-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
};

