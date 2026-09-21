import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export const HeroCoverflow: React.FC = () => {
  const { products, setSelectedProduct, setActiveView } = useStore();

  const featured = products.filter((p) => p.isFeatured);
  const items = featured.length >= 3 ? featured : products;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = items.length;

  // Infinite loop auto-play (pauses on hover)
  useEffect(() => {
    if (isPaused || total <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 3200);
    return () => clearInterval(interval);
  }, [isPaused, total]);

  if (total === 0) return null;

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleCardClick = (product: (typeof items)[0], isCenter: boolean, index: number) => {
    if (isCenter) {
      // Navigate to product detail page
      setSelectedProduct(product);
      setActiveView('product');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Slide this card to center
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
    <div
      className="relative overflow-hidden bg-gradient-to-b from-stone-950 via-stone-900/60 to-stone-950 pt-8 pb-12 sm:pt-10 sm:pb-16 border-b border-stone-800/80 select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-600/5 blur-[140px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Simple Centered Heading as requested: مكتوب فوقها منتجات مميزة عادي */}
        <div className="text-center max-w-xl mx-auto mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-stone-100 tracking-tight">
            منتجات مميزة
          </h2>
        </div>

        {/* 3D Stretched Infinite Coverflow Stage - Enlarged Cards as requested */}
        <div className="relative max-w-5xl mx-auto h-[400px] sm:h-[490px] md:h-[540px] flex items-center justify-center [perspective:1200px] touch-pan-y">
          {/* Navigation Controls - Hidden on mobile (swipe only) */}
          <button
            id="coverflow-prev-btn"
            type="button"
            onClick={handlePrev}
            className="hidden md:flex absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-stone-950/80 hover:bg-stone-900 border border-stone-700/80 text-stone-200 hover:text-white items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95"
            aria-label="السابق"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <button
            id="coverflow-next-btn"
            type="button"
            onClick={handleNext}
            className="hidden md:flex absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-stone-950/80 hover:bg-stone-900 border border-stone-700/80 text-stone-200 hover:text-white items-center justify-center shadow-2xl backdrop-blur-md transition-all active:scale-95"
            aria-label="التالي"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Cards Stream */}
          <div className="relative w-full h-full flex items-center justify-center">
            {items.map((product, idx) => {
              const offset = getOffset(idx);
              const isCenter = offset === 0;
              const isVisible = Math.abs(offset) <= 2;

              if (!isVisible) return null;

              // Stretched & Pulled 3D coverflow styling math
              let transformStyle = '';
              let opacityStyle = 1;
              let zIndexStyle = 30;

              if (isCenter) {
                transformStyle = 'translateX(0%) scale(1.06) rotateY(0deg)';
                opacityStyle = 1;
                zIndexStyle = 30;
              } else if (offset === -1) {
                // Pulled to the right/previous with 3D slant
                transformStyle = 'translateX(62%) scale(0.84) scaleX(0.9) rotateY(-26deg)';
                opacityStyle = 0.6;
                zIndexStyle = 20;
              } else if (offset === 1) {
                // Pulled to the left/next with 3D slant
                transformStyle = 'translateX(-62%) scale(0.84) scaleX(0.9) rotateY(26deg)';
                opacityStyle = 0.6;
                zIndexStyle = 20;
              } else if (offset === -2) {
                transformStyle = 'translateX(110%) scale(0.68) scaleX(0.8) rotateY(-38deg)';
                opacityStyle = 0.25;
                zIndexStyle = 10;
              } else if (offset === 2) {
                transformStyle = 'translateX(-110%) scale(0.68) scaleX(0.8) rotateY(38deg)';
                opacityStyle = 0.25;
                zIndexStyle = 10;
              }

              return (
                <div
                  key={product.id}
                  id={`hero-coverflow-card-${product.id}`}
                  onClick={() => handleCardClick(product, isCenter, idx)}
                  style={{
                    transform: transformStyle,
                    opacity: opacityStyle,
                    zIndex: zIndexStyle,
                    willChange: 'transform, opacity',
                    transition: 'transform 450ms cubic-bezier(0.25, 1, 0.5, 1), opacity 450ms ease-out'
                  }}
                  className={`absolute w-[265px] sm:w-[325px] md:w-[370px] aspect-[4/5] rounded-2xl overflow-hidden bg-stone-900 border cursor-pointer group shadow-2xl ${
                    isCenter
                      ? 'border-amber-500/60 shadow-black/90 ring-2 ring-amber-500/30'
                      : 'border-stone-800 shadow-black/60'
                  }`}
                >
                  {/* The Image ONLY as requested */}
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    loading={isCenter ? 'eager' : 'lazy'}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isCenter ? 'group-hover:scale-105' : ''
                    }`}
                  />

                  {/* Subtle click cue on center card hover */}
                  {isCenter && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 pointer-events-none">
                      <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-bold text-amber-300">
                        اضغط لعرض المنتج والمقاسات
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center items-center gap-2 mt-6">
          {items.map((_, idx) => (
            <button
              key={idx}
              id={`coverflow-dot-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                activeIndex === idx
                  ? 'w-6 bg-amber-500'
                  : 'w-2 bg-stone-700 hover:bg-stone-500'
              }`}
              aria-label={`شريحة رقم ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

