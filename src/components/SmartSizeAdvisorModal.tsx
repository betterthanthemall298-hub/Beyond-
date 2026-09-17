import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { HoodieSize } from '../types';
import { Sparkles, X, Ruler, CheckCircle, ArrowRight } from 'lucide-react';

export const SmartSizeAdvisorModal: React.FC = () => {
  const { isSizeAdvisorOpen, setIsSizeAdvisorOpen, selectedProduct, addToCart, addToast } = useStore();

  const [weight, setWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(176);
  const [fitPreference, setFitPreference] = useState<'oversized' | 'relaxed' | 'regular'>('oversized');

  if (!isSizeAdvisorOpen) return null;

  // Calculation logic for heavyweight oversized hoodies
  const calculateSize = (): { size: HoodieSize; explanation: string } => {
    let baseScore = weight * 0.7 + (height - 100) * 0.3;

    if (fitPreference === 'oversized') baseScore += 5;
    if (fitPreference === 'regular') baseScore -= 5;

    if (baseScore < 68) {
      return {
        size: 'M',
        explanation: 'مقاس M: عرض الصدر 60 سم، الطول 72 سم، مناسب لقصة مضبوطة.'
      };
    } else if (baseScore < 78) {
      return {
        size: 'L',
        explanation: 'مقاس L: عرض الصدر 64 سم، الطول 74 سم، أوفر سايز مريح.'
      };
    } else if (baseScore < 90) {
      return {
        size: 'XL',
        explanation: 'مقاس XL: عرض الصدر 68 سم، الطول 76 سم، قصة واسعة فضفاضة.'
      };
    } else {
      return {
        size: '2XL',
        explanation: 'مقاس 2XL: عرض الصدر 72 سم، الطول 78 سم، أقصى وسع وراحة.'
      };
    }
  };

  const { size: recommendedSize, explanation } = calculateSize();

  const handleApplySize = () => {
    if (selectedProduct) {
      addToCart(selectedProduct, recommendedSize, selectedProduct.colors[0]?.name, selectedProduct.colors[0]?.hex, 1);
      setIsSizeAdvisorOpen(false);
      addToast({
        type: 'success',
        title: `تم اختيار مقاس (${recommendedSize}) وإضافته للسلة`,
        description: selectedProduct.name
      });
    } else {
      setIsSizeAdvisorOpen(false);
      addToast({
        type: 'info',
        title: `المقاس المقترح لك: (${recommendedSize})`,
        description: 'يمكنك تحديده عند اختيار الهودي.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="size-advisor-dialog"
        className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-stone-400 to-amber-500" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-100">دليل تحديد المقاس</h3>
              <p className="text-xs text-stone-400">حساب المقاس بناءً على الطول والوزن</p>
            </div>
          </div>
          <button
            id="close-size-advisor-btn"
            onClick={() => setIsSizeAdvisorOpen(false)}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Weight Slider */}
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-stone-300 font-medium">الوزن التقريبي</span>
              <span className="text-amber-400 font-bold font-mono text-base">{weight} كجم</span>
            </div>
            <input
              id="weight-slider-input"
              type="range"
              min="50"
              max="130"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[11px] text-stone-500 mt-1">
              <span>50 كجم</span>
              <span>90 كجم</span>
              <span>130 كجم</span>
            </div>
          </div>

          {/* Height Slider */}
          <div>
            <div className="flex justify-between items-center text-sm mb-2">
              <span className="text-stone-300 font-medium">الطول التقريبي</span>
              <span className="text-amber-400 font-bold font-mono text-base">{height} سم</span>
            </div>
            <input
              id="height-slider-input"
              type="range"
              min="155"
              max="205"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[11px] text-stone-500 mt-1">
              <span>155 سم</span>
              <span>180 سم</span>
              <span>205 سم</span>
            </div>
          </div>

          {/* Fit Preference */}
          <div>
            <label className="block text-sm text-stone-300 font-medium mb-2">
              تفضيل القصة في اللبس
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="fit-pref-oversized"
                type="button"
                onClick={() => setFitPreference('oversized')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  fitPreference === 'oversized'
                    ? 'bg-amber-950/50 border-amber-600 text-amber-300'
                    : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                أوفر سايز واسع
              </button>
              <button
                id="fit-pref-relaxed"
                type="button"
                onClick={() => setFitPreference('relaxed')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  fitPreference === 'relaxed'
                    ? 'bg-amber-950/50 border-amber-600 text-amber-300'
                    : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                مرتاح معتدل
              </button>
              <button
                id="fit-pref-regular"
                type="button"
                onClick={() => setFitPreference('regular')}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                  fitPreference === 'regular'
                    ? 'bg-amber-950/50 border-amber-600 text-amber-300'
                    : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                قياسي كلاسيك
              </button>
            </div>
          </div>

          {/* Result Box */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4">
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-stone-200">المقاس المقترح بدقة:</span>
              </div>
              <div className="px-4 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 font-extrabold text-lg">
                {recommendedSize}
              </div>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              {explanation}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            id="close-advisor-secondary-btn"
            type="button"
            onClick={() => setIsSizeAdvisorOpen(false)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 transition-colors"
          >
            إغلاق
          </button>
          <button
            id="apply-recommended-size-btn"
            type="button"
            onClick={handleApplySize}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-black bg-amber-500 hover:bg-amber-400 active:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-950/50"
          >
            <span>{selectedProduct ? `اختيار مقاس ${recommendedSize} وإضافته للسلة` : `اعتماد مقاس ${recommendedSize}`}</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
