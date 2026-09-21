import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ProductCard } from './ProductCard';
import { HoodieSize } from '../types';
import { SlidersHorizontal, Search, Sparkles, Filter, X } from 'lucide-react';

export const ProductGrid: React.FC = () => {
  const {
    products,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedSizeFilter,
    setSelectedSizeFilter,
    setIsSizeAdvisorOpen
  } = useStore();

  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const categories = [
    { id: 'all', label: 'جميع الهوديز' },
    { id: 'oversized', label: 'أوفر سايز بوكسي' },
    { id: 'basic', label: 'بيسيك كلاسيك' },
    { id: 'zipup', label: 'بسحاب كامل (Zip-Up)' }
  ];

  const sizeOptions: (HoodieSize | 'ALL')[] = ['ALL', 'M', 'L', 'XL', '2XL'];

  // Filter products (memoized)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }
      // Size Filter
      if (selectedSizeFilter !== 'ALL') {
        const stock = p.sizesStock[selectedSizeFilter] || 0;
        if (stock <= 0) return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(query);
        const matchSubtitle = p.subtitle.toLowerCase().includes(query);
        const matchDesc = p.description.toLowerCase().includes(query);
        if (!matchName && !matchSubtitle && !matchDesc) return false;
      }
      return true;
    });
  }, [products, selectedCategory, selectedSizeFilter, searchQuery]);

  // Sort products (memoized)
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return b.rating - a.rating;
    });
  }, [filteredProducts, sortBy]);

  return (
    <section id="hoodies-catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-100">
            الهوديز
          </h2>
        </div>

        {/* Size advisor button */}
        <button
          id="catalog-open-size-advisor-btn"
          type="button"
          onClick={() => setIsSizeAdvisorOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-amber-400 text-xs font-semibold transition-colors shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>دليل تحديد المقاس</span>
        </button>
      </div>

      {/* Products Grid Display */}
      {sortedProducts.length === 0 ? (
        <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-10 text-center text-stone-400 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center mx-auto text-stone-500">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-200">لم يتم العثور على هوديز مطابقة</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              جرب تغيير خيارات الفلترة أو إلغاء كلمات البحث للوصول لكافة القطع.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedSizeFilter('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
          >
            عرض كافة الهوديز
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};
