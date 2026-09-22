import React from 'react';
import { useStore } from './store/useStore';
import { ActiveView } from './types';
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
import { ShopifyOrderBanner } from './components/ShopifyOrderBanner';
import { ProductShareModal } from './components/ProductShareModal';
import { Footer } from './components/Footer';

interface HistoryState {
  view: ActiveView;
  productId?: string | null;
  isModal?: boolean;
}

export default function App() {
  const {
    activeView,
    setActiveView,
    products,
    selectedProduct,
    setSelectedProduct,
    quickLookProduct,
    closeQuickLook,
    shareModalProduct,
    closeShareModal,
    isCheckoutOpen,
    setIsCheckoutOpen,
    isSizeAdvisorOpen,
    setIsSizeAdvisorOpen,
    isWishlistOpen,
    setIsWishlistOpen,
    deleteModalState,
    closeDeleteModal
  } = useStore();

  // Flag to know when state changes were triggered by browser popstate (back/forward)
  const isPoppingRef = React.useRef(false);
  const isInitializedRef = React.useRef(false);
  const lastPushedKeyRef = React.useRef<string>('');

  // Always keep latest state in a ref so popstate handler always sees fresh values
  const stateRef = React.useRef({
    activeView,
    selectedProduct,
    quickLookProduct,
    shareModalProduct,
    isCheckoutOpen,
    isSizeAdvisorOpen,
    isWishlistOpen,
    isDeleteOpen: deleteModalState.isOpen,
    products
  });

  React.useEffect(() => {
    stateRef.current = {
      activeView,
      selectedProduct,
      quickLookProduct,
      shareModalProduct,
      isCheckoutOpen,
      isSizeAdvisorOpen,
      isWishlistOpen,
      isDeleteOpen: deleteModalState.isOpen,
      products
    };
  });

  // Calculate whether any modal or overlay drawer is currently open
  const isAnyModalOpen = Boolean(
    quickLookProduct ||
    shareModalProduct ||
    isCheckoutOpen ||
    isSizeAdvisorOpen ||
    isWishlistOpen ||
    deleteModalState.isOpen
  );

  // 1. Initial entry point & deep link setup
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const productIdParam = params.get('product');

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;

      if (productIdParam) {
        // If loaded via a shared product link, seed 'home' as the base history entry
        // so pressing back on mobile navigates to the store home instead of exiting
        window.history.replaceState({ view: 'home', productId: null, isModal: false } as HistoryState, '', window.location.pathname);
        window.history.pushState(
          { view: 'product', productId: productIdParam, isModal: false } as HistoryState,
          '',
          `${window.location.pathname}?product=${encodeURIComponent(productIdParam)}`
        );
        lastPushedKeyRef.current = `product:${productIdParam}`;
      } else {
        const initialKey = `${activeView}:${selectedProduct?.id || ''}`;
        window.history.replaceState(
          { view: activeView, productId: selectedProduct?.id || null, isModal: false } as HistoryState,
          '',
          window.location.href
        );
        lastPushedKeyRef.current = initialKey;
      }
    }

    if (productIdParam && products.length > 0) {
      const matched = products.find((p) => p.id === productIdParam);
      if (matched && (!selectedProduct || selectedProduct.id !== matched.id)) {
        setSelectedProduct(matched);
        setActiveView('product');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [products, setSelectedProduct, setActiveView]);

  // 2. Synchronize activeView and selectedProduct with browser history
  React.useEffect(() => {
    if (typeof window === 'undefined' || !isInitializedRef.current) return;
    if (isPoppingRef.current) return;

    const currentKey = `${activeView}:${selectedProduct?.id || ''}`;
    if (currentKey === lastPushedKeyRef.current) return;

    const params = new URLSearchParams(window.location.search);
    let targetUrl = window.location.pathname;

    if (activeView === 'product' && selectedProduct) {
      params.set('product', selectedProduct.id);
      targetUrl = `${window.location.pathname}?${params.toString()}`;
    } else {
      if (params.has('product')) {
        params.delete('product');
      }
      const searchStr = params.toString();
      targetUrl = searchStr ? `${window.location.pathname}?${searchStr}` : window.location.pathname;
    }

    const stateToPush: HistoryState = {
      view: activeView,
      productId: selectedProduct?.id || null,
      isModal: false
    };

    window.history.pushState(stateToPush, '', targetUrl);
    lastPushedKeyRef.current = currentKey;
  }, [activeView, selectedProduct]);

  // 3. Synchronize open modals with history (so mobile back closes the modal)
  const prevModalOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !isInitializedRef.current) return;

    if (isAnyModalOpen && !prevModalOpenRef.current && !isPoppingRef.current) {
      // Modal just opened: push a modal history state
      window.history.pushState(
        {
          view: activeView,
          productId: selectedProduct?.id || null,
          isModal: true
        } as HistoryState,
        '',
        window.location.href
      );
    } else if (!isAnyModalOpen && prevModalOpenRef.current && !isPoppingRef.current) {
      // Modal closed via UI (e.g. clicking 'X' or backdrop): clean up the modal state from history
      if (window.history.state?.isModal) {
        window.history.back();
      }
    }

    prevModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen, activeView, selectedProduct]);

  // 4. popstate event listener for Mobile Back button & browser back/forward
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      const current = stateRef.current;
      isPoppingRef.current = true;

      // Check if any modal is currently open -> close it first without navigating away
      if (current.quickLookProduct) {
        closeQuickLook();
      } else if (current.shareModalProduct) {
        closeShareModal();
      } else if (current.isCheckoutOpen) {
        setIsCheckoutOpen(false);
      } else if (current.isSizeAdvisorOpen) {
        setIsSizeAdvisorOpen(false);
      } else if (current.isWishlistOpen) {
        setIsWishlistOpen(false);
      } else if (current.isDeleteOpen) {
        closeDeleteModal();
      } else {
        // No modal open: navigate back to previous view or home
        const state = event.state as HistoryState | null;
        const targetView = state?.view || 'home';
        const targetProductId = state?.productId;

        if (targetView === 'product' && targetProductId) {
          const matched = current.products.find((p) => p.id === targetProductId);
          if (matched) {
            setSelectedProduct(matched);
            setActiveView('product');
          } else {
            setActiveView('home');
            setSelectedProduct(null);
          }
        } else {
          setActiveView(targetView);
          setSelectedProduct(null);
        }

        lastPushedKeyRef.current = `${targetView}:${targetProductId || ''}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Allow state updates to settle before reenabling pushState
      setTimeout(() => {
        isPoppingRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    closeQuickLook,
    closeShareModal,
    setIsCheckoutOpen,
    setIsSizeAdvisorOpen,
    setIsWishlistOpen,
    closeDeleteModal,
    setActiveView,
    setSelectedProduct
  ]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-stone-950 text-stone-100 selection:bg-amber-500 selection:text-black font-['Cairo',sans-serif]">
      {/* Universal Floating Modals & Alerts */}
      <ToastContainer />
      <ShopifyOrderBanner />
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
