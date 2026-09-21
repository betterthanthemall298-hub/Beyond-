import React from 'react';
import { useStore } from './store/useStore';
import { Navbar } from './components/Navbar';
import { HeroCoverflow } from './components/HeroCoverflow';
import { ProductGrid } from './components/ProductGrid';
import { SmartSizeAdvisorModal } from './components/SmartSizeAdvisorModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { QuickLookModal } from './components/QuickLookModal';
import { OrderTrackingView } from './components/OrderTrackingView';
import { CustomerReviewsGallery } from './components/CustomerReviewsGallery';
import { CartPage } from './components/CartPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { WishlistPage } from './components/WishlistPage';
import { AdminDashboard } from './components/AdminDashboard';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { ToastContainer } from './components/ToastContainer';
import { ProductShareModal } from './components/ProductShareModal';
import { Footer } from './components/Footer';

export default function App() {
  const {
    activeView,
    setActiveView,
    products,
    selectedProduct,
    setSelectedProduct
  } = useStore();

  // Read URL query parameters for direct product deep links (e.g. ?product=hoodie-1)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const productIdParam = params.get('product');

    if (productIdParam && products.length > 0) {
      const matched = products.find((p) => p.id === productIdParam);
      if (matched) {
        setSelectedProduct(matched);
        setActiveView('product');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [products, setSelectedProduct, setActiveView]);

  // Keep URL search params in sync when opening or closing product details
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);

    if (activeView === 'product' && selectedProduct) {
      if (params.get('product') !== selectedProduct.id) {
        params.set('product', selectedProduct.id);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', newUrl);
      }
    } else if (activeView !== 'product' && params.has('product')) {
      params.delete('product');
      const newSearch = params.toString() ? `?${params.toString()}` : '';
      window.history.replaceState(null, '', `${window.location.pathname}${newSearch}`);
    }
  }, [activeView, selectedProduct]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-stone-950 text-stone-100 selection:bg-amber-500 selection:text-black font-['Cairo',sans-serif]">
      {/* Universal Floating Modals & Alerts */}
      <ToastContainer />
      <DeleteConfirmationModal />
      <SmartSizeAdvisorModal />
      <ProductShareModal />
      <WishlistDrawer />
      <CheckoutModal />
      <QuickLookModal />

      {/* Main Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {activeView === 'home' && (
          <>
            <HeroCoverflow />

            {/* Products Grid */}
            <ProductGrid />

            {/* Customer Reviews - Image Gallery Only as requested */}
            <CustomerReviewsGallery />
          </>
        )}

        {/* Dedicated Standalone Cart Page (بدل النافذة) */}
        {activeView === 'cart' && <CartPage />}

        {/* Dedicated Wishlist Page (صفحة منفصلة بالكامل) */}
        {activeView === 'wishlist' && <WishlistPage />}

        {/* Dedicated Product Detail Page (مع زر الخروج ومنتجات قد تعجبك) */}
        {activeView === 'product' && <ProductDetailPage />}

        {/* Catalog View */}
        {activeView === 'catalog' && (
          <div className="pt-4">
            <ProductGrid />
          </div>
        )}

        {/* Order Tracking View */}
        {activeView === 'tracking' && <OrderTrackingView />}

        {/* Customer Reviews View */}
        {activeView === 'reviews' && (
          <div className="pt-4">
            <CustomerReviewsGallery />
          </div>
        )}

        {/* Admin Dashboard */}
        {activeView === 'admin' && <AdminDashboard />}
      </main>

      {/* Footer - Consistent across all views as requested */}
      <Footer />
    </div>
  );
}
