import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { ActiveView } from '../types';

/**
 * Custom hook to provide native mobile app-like back button navigation.
 * Handles:
 * 1. Mobile hardware back button & swipe back gestures
 * 2. Automatic closing of modals, drawers, and lightbox popups before changing pages
 * 3. Navigating back from sub-pages (product, cart, wishlist, tracking, admin, catalog, reviews) to home
 * 4. Preventing accidental website exit on home with a polite double-back prompt
 * 5. Deep link preservation and synchronization with browser history
 */
const activeBackInterceptors: (() => boolean)[] = [];

export function registerBackInterceptor(fn: () => boolean) {
  activeBackInterceptors.push(fn);
  return () => {
    const idx = activeBackInterceptors.indexOf(fn);
    if (idx !== -1) activeBackInterceptors.splice(idx, 1);
  };
}

export function useMobileNavigation() {
  const {
    activeView,
    setActiveView,
    selectedProduct,
    setSelectedProduct,
    products,
    quickLookProduct,
    closeQuickLook,
    isCheckoutOpen,
    setIsCheckoutOpen,
    isSizeAdvisorOpen,
    setIsSizeAdvisorOpen,
    shareModalProduct,
    closeShareModal,
    isWishlistOpen,
    setIsWishlistOpen,
    deleteModalState,
    closeDeleteModal,
    addToast
  } = useStore();

  // Keep live references to prevent stale closures in event listeners
  const activeViewRef = useRef(activeView);
  activeViewRef.current = activeView;

  const selectedProductRef = useRef(selectedProduct);
  selectedProductRef.current = selectedProduct;

  const productsRef = useRef(products);
  productsRef.current = products;

  const quickLookProductRef = useRef(quickLookProduct);
  quickLookProductRef.current = quickLookProduct;

  const isCheckoutOpenRef = useRef(isCheckoutOpen);
  isCheckoutOpenRef.current = isCheckoutOpen;

  const isSizeAdvisorOpenRef = useRef(isSizeAdvisorOpen);
  isSizeAdvisorOpenRef.current = isSizeAdvisorOpen;

  const shareModalProductRef = useRef(shareModalProduct);
  shareModalProductRef.current = shareModalProduct;

  const isWishlistOpenRef = useRef(isWishlistOpen);
  isWishlistOpenRef.current = isWishlistOpen;

  const deleteModalOpenRef = useRef(deleteModalState.isOpen);
  deleteModalOpenRef.current = deleteModalState.isOpen;

  // Track if current state change was caused by browser popstate (to avoid pushing duplicate history)
  const isPoppingRef = useRef(false);

  // Track count of pushed modals to pop on programmatic close
  const pushedModalsCountRef = useRef(0);

  // Double-tap to exit on home screen tracker
  const lastExitPressRef = useRef(0);

  // Initial setup on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Seed initial root history state
    const params = new URLSearchParams(window.location.search);
    const productIdParam = params.get('product');
    const viewParam = params.get('view') as ActiveView | null;

    // If starting on a deep link product or custom view, seed 'home' as root first so back button returns home!
    if (productIdParam || (viewParam && viewParam !== 'home')) {
      const targetView = productIdParam ? 'product' : (viewParam || 'home');
      window.history.replaceState({ appNavigation: true, view: 'home', step: 1, root: true }, '', window.location.pathname);
      window.history.pushState(
        { appNavigation: true, view: targetView, productId: productIdParam || undefined, step: 2 },
        '',
        window.location.href
      );
    } else {
      // Normal clean home start
      window.history.replaceState({ appNavigation: true, view: 'home', step: 1, root: true }, '', window.location.pathname);
      // Push an app guard state so that pressing back from home triggers popstate instead of exiting immediately
      window.history.pushState({ appNavigation: true, view: 'home', step: 2, guard: true }, '', window.location.pathname);
    }

    const handlePopState = (event: PopStateEvent) => {
      isPoppingRef.current = true;

      // 1. Check custom interceptors (e.g. edit product modal or image lightbox in admin/reviews)
      if (activeBackInterceptors.length > 0) {
        for (let i = activeBackInterceptors.length - 1; i >= 0; i--) {
          const handled = activeBackInterceptors[i]();
          if (handled) {
            pushedModalsCountRef.current = Math.max(0, pushedModalsCountRef.current - 1);
            setTimeout(() => { isPoppingRef.current = false; }, 80);
            return;
          }
        }
      }

      // 2. Check universal store modals (close top-most open modal)
      if (deleteModalOpenRef.current) {
        closeDeleteModal();
        pushedModalsCountRef.current = Math.max(0, pushedModalsCountRef.current - 1);
        setTimeout(() => { isPoppingRef.current = false; }, 80);
        return;
      }

      if (shareModalProductRef.current) {
        closeShareModal();
        pushedModalsCountRef.current = Math.max(0, pushedModalsCountRef.current - 1);
        setTimeout(() => { isPoppingRef.current = false; }, 80);
        return;
      }

      if (quickLookProductRef.current) {
        closeQuickLook();
        pushedModalsCountRef.current = Math.max(0, pushedModalsCountRef.current - 1);
        setTimeout(() => { isPoppingRef.current = false; }, 80);
        return;
      }

      if (isSizeAdvisorOpenRef.current) {
        setIsSizeAdvisorOpen(false);
        pushedModalsCountRef.current = Math.max(0, pushedModalsCountRef.current - 1);
        setTimeout(() => { isPoppingRef.current = false; }, 80);
        return;
      }

      if (isCheckoutOpenRef.current) {
        setIsCheckoutOpen(false);
        pushedModalsCountRef.current = Math.max(0, pushedModalsCountRef.current - 1);
        setTimeout(() => { isPoppingRef.current = false; }, 80);
        return;
      }

      if (isWishlistOpenRef.current) {
        setIsWishlistOpen(false);
        pushedModalsCountRef.current = Math.max(0, pushedModalsCountRef.current - 1);
        setTimeout(() => { isPoppingRef.current = false; }, 80);
        return;
      }

      // 3. Modals were closed or none were open -> handle view navigation (subpages -> home)
      const currentView = activeViewRef.current;
      const targetState = event.state;
      const targetView = targetState?.view || 'home';

      if (currentView !== 'home') {
        // Returning from sub-view (product, cart, wishlist, tracking, admin, catalog, reviews)
        if (targetView === 'product' && targetState?.productId) {
          const found = productsRef.current.find((p) => p.id === targetState.productId);
          if (found) {
            setSelectedProduct(found);
            setActiveView('product');
          } else {
            setActiveView('home');
            setSelectedProduct(null);
          }
        } else {
          setActiveView(targetView);
          if (targetView !== 'product') {
            setSelectedProduct(null);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        setTimeout(() => { isPoppingRef.current = false; }, 80);
        return;
      }

      // 4. Current view is 'home' and no modals are open: Root of web app reached
      const now = Date.now();
      if (now - lastExitPressRef.current < 2500) {
        // User tapped back twice quickly on home page: allow browser exit
        window.history.back();
      } else {
        lastExitPressRef.current = now;
        addToast({
          type: 'info',
          title: 'الرجوع للخروج من المتجر',
          description: 'اضغط زر الرجوع مرة أخرى خلال ثانيتين لمغادرة المتجر.'
        });
        // Re-push guard state so subsequent back press can either exit or continue
        window.history.pushState({ appNavigation: true, view: 'home', step: 2, guard: true }, '', window.location.pathname);
      }

      setTimeout(() => { isPoppingRef.current = false; }, 80);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    setActiveView,
    setSelectedProduct,
    closeQuickLook,
    setIsCheckoutOpen,
    setIsSizeAdvisorOpen,
    closeShareModal,
    setIsWishlistOpen,
    closeDeleteModal,
    addToast
  ]);

  // Synchronize view transitions with pushState
  const prevViewRef = useRef<ActiveView>(activeView);
  const prevProductRef = useRef<string | null>(selectedProduct?.id || null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewChanged = prevViewRef.current !== activeView;
    const productChanged = prevProductRef.current !== (selectedProduct?.id || null);

    prevViewRef.current = activeView;
    prevProductRef.current = selectedProduct?.id || null;

    if (isPoppingRef.current) {
      // Don't push state when change originated from browser back button
      return;
    }

    if (viewChanged || (activeView === 'product' && productChanged)) {
      let newUrl = window.location.pathname;

      if (activeView === 'product' && selectedProduct) {
        newUrl = `${window.location.pathname}?product=${encodeURIComponent(selectedProduct.id)}`;
      } else if (activeView !== 'home') {
        newUrl = `${window.location.pathname}?view=${activeView}`;
      }

      window.history.pushState(
        {
          appNavigation: true,
          view: activeView,
          productId: selectedProduct?.id,
          step: Date.now()
        },
        '',
        newUrl
      );
    }
  }, [activeView, selectedProduct]);

  // Synchronize modal open/close states with browser history
  const anyModalOpen = Boolean(
    quickLookProduct ||
    isCheckoutOpen ||
    isSizeAdvisorOpen ||
    shareModalProduct ||
    isWishlistOpen ||
    deleteModalState.isOpen ||
    activeBackInterceptors.length > 0
  );

  const prevAnyModalOpenRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const wasOpen = prevAnyModalOpenRef.current;
    prevAnyModalOpenRef.current = anyModalOpen;

    if (isPoppingRef.current) return;

    if (!wasOpen && anyModalOpen) {
      // A modal was opened via UI click -> push state so mobile back will close it!
      pushedModalsCountRef.current += 1;
      window.history.pushState(
        {
          appNavigation: true,
          modal: true,
          view: activeViewRef.current,
          step: Date.now()
        },
        '',
        window.location.href
      );
    } else if (wasOpen && !anyModalOpen) {
      // A modal was closed via UI click ('X' button or backdrop) -> pop history so stack stays clean
      if (pushedModalsCountRef.current > 0) {
        pushedModalsCountRef.current -= 1;
        isPoppingRef.current = true;
        window.history.back();
        setTimeout(() => {
          isPoppingRef.current = false;
        }, 100);
      }
    }
  }, [anyModalOpen]);
}
