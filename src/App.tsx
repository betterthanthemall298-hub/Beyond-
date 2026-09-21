import React from 'react';
import { useStore } from './store/useStore';
import { Navbar } from './components/Navbar';
import { HeroCoverflow } from './components/HeroCoverflow';
import { ProductGrid } from './components/ProductGrid';
import { SmartSizeAdvisorModal } from './components/SmartSizeAdvisorModal';
import { WishlistDrawer } from './components/WishlistDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingView } from './components/OrderTrackingView';
import { CustomerReviewsGallery } from './components/CustomerReviewsGallery';
import { CartPage } from './components/CartPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { WishlistPage } from './components/WishlistPage';
import { AdminDashboard } from './components/AdminDashboard';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ToastContainer } from './components/ToastContainer';
import { Footer } from './components/Footer';

export default function App() {
  const { activeView } = useStore();

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-stone-950 text-stone-100 selection:bg-amber-500 selection:text-black font-['Cairo',sans-serif]">
      {/* Universal Floating Modals & Alerts */}
      <ToastContainer />
      <DeleteConfirmationModal />
      <SmartSizeAdvisorModal />
      <ProductDetailModal />
      <WishlistDrawer />
      <CheckoutModal />

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
