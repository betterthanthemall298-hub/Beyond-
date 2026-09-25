import { useSyncExternalStore } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  deleteField
} from 'firebase/firestore';
import { db, testFirebaseConnection, sanitizeForFirestore, auth } from '../lib/firebase';
import { signInWithEmailAndPassword, updatePassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  triggerNewOrderNotification,
  dispatchRemotePushNotification,
  playOrderNotificationSound,
  triggerPhoneVibration,
  dispatchShopifyOrderAlert,
  sendDesktopNotification
} from '../lib/notifications';
import { trackAddToCart, trackInitiateCheckout, trackOrderCompleted } from '../lib/analytics';
import {
  Product,
  CartItem,
  Order,
  CustomerReviewImage,
  Coupon,
  GovernorateShipping,
  StoreSettings,
  HoodieSize,
  OrderStatus,
  ActiveView,
  AdminCredentials
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_REVIEW_IMAGES,
  INITIAL_COUPONS,
  INITIAL_ORDERS,
  INITIAL_SETTINGS,
  INITIAL_GOVERNORATES,
  SAMPLE_HOODIE_TEMPLATE
} from '../data/initialData';
import { cleanGovernorateName, normalizeEgyptianPhone } from '../utils/governorate';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'error';
  title: string;
  description?: string;
}

export interface StoreState {
  // Navigation & Modals
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  isSizeAdvisorOpen: boolean;
  setIsSizeAdvisorOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (logged: boolean) => void;
  shareModalProduct: Product | null;
  openShareModal: (product: Product) => void;
  closeShareModal: () => void;
  quickLookProduct: Product | null;
  openQuickLook: (product: Product) => void;
  closeQuickLook: () => void;

  // Search & Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedSizeFilter: HoodieSize | 'ALL';
  setSelectedSizeFilter: (size: HoodieSize | 'ALL') => void;

  // Universal Delete Confirmation Modal State
  deleteModalState: {
    isOpen: boolean;
    title: string;
    description: string;
    itemLabel?: string;
    onConfirm: () => void;
  };
  openDeleteModal: (options: {
    title: string;
    description: string;
    itemLabel?: string;
    onConfirm: () => void;
  }) => void;
  closeDeleteModal: () => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Products (synced with Firebase Firestore)
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewsCount'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  seedSampleProduct: () => Promise<void>;

  // Cart (per device)
  cart: CartItem[];
  addToCart: (
    product: Product,
    size: HoodieSize,
    colorName?: string,
    colorHex?: string,
    quantity?: number
  ) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  // Wishlist (per device)
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;

  // Coupons (synced with Firebase Firestore)
  coupons: Coupon[];
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeAppliedCoupon: () => void;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'timesUsed'>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
  toggleCouponActive: (id: string) => Promise<void>;

  // Orders (synced in real-time with Firebase Firestore across all devices)
  orders: Order[];
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => Promise<Order>;
  cancelOrder: (orderId: string, phone?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  searchRemoteOrders: (queryText: string) => Promise<Order[]>;

  // Review Images (synced with Firebase Firestore)
  reviewImages: CustomerReviewImage[];
  addReviewImage: (imageUrl: string, caption?: string) => Promise<void>;
  deleteReviewImage: (id: string) => Promise<void>;

  // Shipping & Governorates (synced with Firebase Firestore)
  governorates: GovernorateShipping[];
  updateGovernorateCost: (name: string, newCost: number, deliveryDays?: string) => Promise<void>;
  saveAllGovernorates: (newList: GovernorateShipping[]) => Promise<void>;

  // Store Settings (synced with Firebase Firestore)
  settings: StoreSettings;
  updateSettings: (updates: Partial<StoreSettings>) => Promise<void>;

  // Admin Authentication & Credentials (powered by Firebase Authentication)
  adminCredentials: AdminCredentials;
  updateAdminCredentials: (newUsername: string, newPassword: string) => Promise<boolean>;
  verifyAdminLogin: (usernameInput: string, passwordInput: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;

  // Cloud status
  isFirebaseConnected: boolean;

  // Computed / Helpers
  getCartSubtotal: () => number;
  getCartDiscount: () => number;
  getCartItemsCount: () => number;
}

const STORAGE_KEY_V5 = 'beyond_hoodies_storage_v5';

function loadLocalDeviceData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V5);
    if (!raw) {
      return {
        cart: [],
        wishlist: [],
        isAdminLoggedIn: false,
        activeView: 'home' as ActiveView,
        settings: INITIAL_SETTINGS,
        products: INITIAL_PRODUCTS,
        coupons: INITIAL_COUPONS,
        governorates: INITIAL_GOVERNORATES,
        reviewImages: INITIAL_REVIEW_IMAGES
      };
    }
    const parsed = JSON.parse(raw);
    const parsedSettings: StoreSettings = parsed.settings
      ? {
          ...INITIAL_SETTINGS,
          ...parsed.settings,
          storeName:
            !parsed.settings.storeName ||
            parsed.settings.storeName.includes('متجري الإلكتروني') ||
            parsed.settings.storeName.includes('Nocturne')
              ? 'Beyond'
              : parsed.settings.storeName
        }
      : INITIAL_SETTINGS;

    let savedCreds: AdminCredentials = { username: 'vdbbdv1234567889@gmail.com', password: '••••••••' };

    const rawGovs: GovernorateShipping[] = Array.isArray(parsed.governorates) && parsed.governorates.length > 0
      ? parsed.governorates
      : INITIAL_GOVERNORATES;

    const govMap = new Map<string, GovernorateShipping>();
    for (const g of rawGovs) {
      const cleanName = cleanGovernorateName(g.name);
      if (cleanName && !govMap.has(cleanName)) {
        govMap.set(cleanName, {
          ...g,
          name: cleanName
        });
      }
    }
    for (const initG of INITIAL_GOVERNORATES) {
      if (!govMap.has(initG.name)) {
        govMap.set(initG.name, initG);
      }
    }
    const cleanedGovs = Array.from(govMap.values());

    return {
      cart: parsed.cart || [],
      wishlist: parsed.wishlist || [],
      isAdminLoggedIn: false,
      adminCredentials: savedCreds,
      activeView: (parsed.activeView === 'admin' ? 'admin' : 'home') as ActiveView,
      settings: parsedSettings,
      products: Array.isArray(parsed.products) ? parsed.products : INITIAL_PRODUCTS,
      coupons: Array.isArray(parsed.coupons) ? parsed.coupons : INITIAL_COUPONS,
      governorates: cleanedGovs,
      reviewImages: Array.isArray(parsed.reviewImages) ? parsed.reviewImages : INITIAL_REVIEW_IMAGES
    };
  } catch (e) {
    console.error('Failed to load local storage:', e);
    return {
      cart: [],
      wishlist: [],
      isAdminLoggedIn: false,
      adminCredentials: { username: 'vdbbdv1234567889@gmail.com', password: '••••••••' },
      activeView: 'home' as ActiveView,
      settings: INITIAL_SETTINGS,
      products: INITIAL_PRODUCTS,
      coupons: INITIAL_COUPONS,
      governorates: INITIAL_GOVERNORATES,
      reviewImages: INITIAL_REVIEW_IMAGES
    };
  }
}

function saveLocalDeviceData(s: StoreState) {
  try {
    const dataToSave = {
      cart: s.cart,
      wishlist: s.wishlist,
      activeView: s.activeView === 'admin' ? 'admin' : 'home',
      settings: s.settings,
      products: s.products,
      coupons: s.coupons,
      governorates: s.governorates,
      reviewImages: s.reviewImages
    };
    localStorage.setItem(STORAGE_KEY_V5, JSON.stringify(dataToSave));
  } catch (e) {
    console.error('Failed to save to local storage:', e);
  }
}

const localDeviceData = loadLocalDeviceData();
const listeners = new Set<() => void>();
let lastSavedCart = localDeviceData.cart;
let lastSavedWishlist = localDeviceData.wishlist;
let lastSavedActiveView = localDeviceData.activeView;
let lastSavedSettings = localDeviceData.settings;
let lastSavedProducts = localDeviceData.products;
let lastSavedCoupons = localDeviceData.coupons;
let lastSavedGovernorates = localDeviceData.governorates;
let lastSavedReviewImages = localDeviceData.reviewImages;

function notify() {
  if (
    state.cart !== lastSavedCart ||
    state.wishlist !== lastSavedWishlist ||
    state.activeView !== lastSavedActiveView ||
    state.settings !== lastSavedSettings ||
    state.products !== lastSavedProducts ||
    state.coupons !== lastSavedCoupons ||
    state.governorates !== lastSavedGovernorates ||
    state.reviewImages !== lastSavedReviewImages
  ) {
    lastSavedCart = state.cart;
    lastSavedWishlist = state.wishlist;
    lastSavedActiveView = state.activeView;
    lastSavedSettings = state.settings;
    lastSavedProducts = state.products;
    lastSavedCoupons = state.coupons;
    lastSavedGovernorates = state.governorates;
    lastSavedReviewImages = state.reviewImages;
    saveLocalDeviceData(state);
  }
  listeners.forEach((listener) => listener());
}

function update(fn: (prev: StoreState) => Partial<StoreState>) {
  const updates = fn(state);
  state = { ...state, ...updates };
  notify();
}

let state: StoreState = {
  activeView: localDeviceData.activeView,
  setActiveView: (view) => update(() => ({ activeView: view })),
  selectedProduct: null,
  setSelectedProduct: (product) => update(() => ({ selectedProduct: product })),
  isCartOpen: false,
  setIsCartOpen: (open) => update(() => ({ isCartOpen: open })),
  isWishlistOpen: false,
  setIsWishlistOpen: (open) => update(() => ({ isWishlistOpen: open })),
  isSizeAdvisorOpen: false,
  setIsSizeAdvisorOpen: (open) => update(() => ({ isSizeAdvisorOpen: open })),
  isCheckoutOpen: false,
  setIsCheckoutOpen: (open) => {
    update(() => ({ isCheckoutOpen: open }));
    if (open) {
      trackInitiateCheckout().catch(() => {});
    }
  },
  isAdminLoggedIn: false,
  setIsAdminLoggedIn: (logged) => {
    update(() => ({ isAdminLoggedIn: logged }));
    if (logged) {
      syncOrdersIfAdmin();
      syncAlertsIfAdmin();
    } else {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }
      if (unsubscribeAlerts) {
        unsubscribeAlerts();
        unsubscribeAlerts = null;
      }
      update(() => ({ orders: [] }));
    }
  },
  shareModalProduct: null,
  openShareModal: (product) => update(() => ({ shareModalProduct: product })),
  closeShareModal: () => update(() => ({ shareModalProduct: null })),
  quickLookProduct: null,
  openQuickLook: (product) => update(() => ({ quickLookProduct: product })),
  closeQuickLook: () => update(() => ({ quickLookProduct: null })),

  searchQuery: '',
  setSearchQuery: (query) => update(() => ({ searchQuery: query })),
  selectedCategory: 'all',
  setSelectedCategory: (cat) => update(() => ({ selectedCategory: cat })),
  selectedSizeFilter: 'ALL',
  setSelectedSizeFilter: (size) => update(() => ({ selectedSizeFilter: size })),

  // Delete modal
  deleteModalState: {
    isOpen: false,
    title: '',
    description: '',
    itemLabel: '',
    onConfirm: () => {}
  },
  openDeleteModal: (options) =>
    update(() => ({
      deleteModalState: {
        isOpen: true,
        title: options.title,
        description: options.description,
        itemLabel: options.itemLabel,
        onConfirm: options.onConfirm
      }
    })),
  closeDeleteModal: () =>
    update((prev) => ({
      deleteModalState: {
        ...prev.deleteModalState,
        isOpen: false
      }
    })),

  // Toasts
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    update((prev) => ({ toasts: [...prev.toasts, { ...toast, id }] }));
    setTimeout(() => {
      state.removeToast(id);
    }, 3500);
  },
  removeToast: (id) =>
    update((prev) => ({ toasts: prev.toasts.filter((t) => t.id !== id) })),

  // Cloud status
  isFirebaseConnected: true,

  // Admin Authentication & Credentials (powered by Firebase Authentication)
  adminCredentials: localDeviceData.adminCredentials || {
    username: 'vdbbdv1234567889@gmail.com',
    password: '••••••••'
  },
  updateAdminCredentials: async (newUsername, newPassword) => {
    try {
      const cleanPass = newPassword.trim();
      if (!cleanPass) {
        state.addToast({
          type: 'error',
          title: 'خطأ',
          description: 'يجب إدخال كلمة مرور جديدة صالحة'
        });
        return false;
      }
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, cleanPass);
        state.addToast({
          type: 'success',
          title: 'تم تحديث كلمة المرور بنجاح',
          description: 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة'
        });
        return true;
      } else {
        state.addToast({
          type: 'error',
          title: 'خطأ في التحقق',
          description: 'يجب تسجيل الدخول أولاً لتغيير كلمة المرور'
        });
        return false;
      }
    } catch (err: any) {
      console.error('Failed to update admin password:', err);
      state.addToast({
        type: 'error',
        title: 'تعذر تحديث كلمة المرور',
        description: 'يرجى تسجيل الدخول مجدداً والمحاولة'
      });
      return false;
    }
  },
  verifyAdminLogin: async (userInput, passInput) => {
    const rawUser = userInput.trim();
    const cleanPass = passInput.trim();
    
    // Auto-map username to admin email if entered without domain
    let emailToUse = rawUser;
    if (!emailToUse.includes('@')) {
      emailToUse = 'vdbbdv1234567889@gmail.com';
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, emailToUse, cleanPass);
      if (userCred.user) {
        update(() => ({
          isAdminLoggedIn: true,
          adminCredentials: {
            username: userCred.user.email || rawUser,
            password: '••••••••'
          }
        }));
        syncOrdersIfAdmin();
        state.addToast({
          type: 'success',
          title: 'مرحباً بك في لوحة الإدارة',
          description: `تم تسجيل الدخول بنجاح`
        });
        return true;
      }
    } catch (err: any) {
      const code = err?.code || '';
      let userFriendlyMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        userFriendlyMsg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (code === 'auth/too-many-requests') {
        userFriendlyMsg = 'تم حظر المحاولات مؤقتاً بسبب كثرة الإدخال الخاطئ. يرجى الانتظار قليلاً والمحاولة مجدداً.';
      } else if (code === 'auth/network-request-failed') {
        userFriendlyMsg = 'تعذر الاتصال بالخدمة. يرجى التحقق من اتصالك بالإنترنت.';
      }
      console.warn('Sign-in verification response:', code || err?.message);
      state.addToast({
        type: 'error',
        title: 'فشل تسجيل الدخول',
        description: userFriendlyMsg
      });
      return false;
    }
    return false;
  },
  logoutAdmin: async () => {
    try {
      await signOut(auth);
    } catch {}
    isFirstOrdersSnapshot = true;
    if (unsubscribeOrders) {
      unsubscribeOrders();
      unsubscribeOrders = null;
    }
    if (unsubscribeAlerts) {
      unsubscribeAlerts();
      unsubscribeAlerts = null;
    }
    update(() => ({ isAdminLoggedIn: false, orders: [] }));
    state.addToast({
      type: 'info',
      title: 'تم تسجيل الخروج',
      description: 'تم قفل لوحة التحكم'
    });
  },

  // Products (loaded instantly from local cache, synced with cloud)
  products: localDeviceData.products || INITIAL_PRODUCTS,
  addProduct: async (productData) => {
    const newProduct: Product = {
      ...productData,
      id: 'h-' + Date.now().toString(36),
      rating: 5.0,
      reviewsCount: 1
    };
    try {
      await setDoc(doc(db, 'products', newProduct.id), sanitizeForFirestore(newProduct));
      update((prev) => ({ products: [newProduct, ...prev.products] }));
      state.addToast({
        type: 'success',
        title: 'تم نشر الهودي في المتجر بنجاح',
        description: newProduct.name
      });
    } catch (err) {
      console.error('Failed to add product to Firestore:', err);
      update((prev) => ({ products: [newProduct, ...prev.products] }));
      state.addToast({
        type: 'info',
        title: 'تمت إضافة المنتج بنجاح',
        description: newProduct.name
      });
    }
  },
  updateProduct: async (id, updates) => {
    try {
      await updateDoc(doc(db, 'products', id), sanitizeForFirestore(updates));
      update((prev) => ({
        products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        selectedProduct:
          prev.selectedProduct?.id === id
            ? { ...prev.selectedProduct, ...updates }
            : prev.selectedProduct
      }));
      state.addToast({
        type: 'info',
        title: 'تم تحديث بيانات المنتج بنجاح'
      });
    } catch (err) {
      console.error('Failed to update product in Firestore:', err);
      update((prev) => ({
        products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        selectedProduct:
          prev.selectedProduct?.id === id
            ? { ...prev.selectedProduct, ...updates }
            : prev.selectedProduct
      }));
    }
  },
  deleteProduct: async (id) => {
    const prod = state.products.find((p) => p.id === id);
    try {
      await deleteDoc(doc(db, 'products', id));
      update((prev) => ({
        products: prev.products.filter((p) => p.id !== id),
        cart: prev.cart.filter((c) => c.productId !== id),
        wishlist: prev.wishlist.filter((wId) => wId !== id),
        selectedProduct: prev.selectedProduct?.id === id ? null : prev.selectedProduct
      }));
      state.addToast({
        type: 'error',
        title: 'تم حذف المنتج بنجاح من جميع الأجهزة',
        description: prod?.name || 'تم الحذف'
      });
    } catch (err) {
      console.error('Failed to delete product from Firestore:', err);
      update((prev) => ({
        products: prev.products.filter((p) => p.id !== id),
        cart: prev.cart.filter((c) => c.productId !== id),
        wishlist: prev.wishlist.filter((wId) => wId !== id),
        selectedProduct: prev.selectedProduct?.id === id ? null : prev.selectedProduct
      }));
    }
  },
  seedSampleProduct: async () => {
    await state.addProduct(SAMPLE_HOODIE_TEMPLATE);
  },

  // Cart
  cart: localDeviceData.cart,
  addToCart: (product, size, colorName, colorHex, quantity = 1) => {
    const availableStock = Number(product?.sizesStock?.[size]) || 0;
    if (availableStock <= 0) {
      state.addToast({
        type: 'error',
        title: 'نفدت الكمية',
        description: `عذراً، مقاس (${size}) من "${product.name}" نفد من المخزون حالياً.`
      });
      return;
    }

    const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0] : undefined;
    const finalColorName = colorName || defaultColor?.name;
    const finalColorHex = colorHex || defaultColor?.hex;

    const cartItemId = `${product.id}-${size}-${finalColorName || 'default'}`;
    const existingIndex = state.cart.findIndex((item) => item.id === cartItemId);

    if (existingIndex > -1) {
      const currentInCart = state.cart[existingIndex].quantity;
      if (currentInCart + quantity > availableStock) {
        state.addToast({
          type: 'error',
          title: 'الكمية غير كافية',
          description: `المتبقي في المخزون (${availableStock} قطع فقط)، لديك بالفعل ${currentInCart} في السلة.`
        });
        return;
      }

      update((prev) => {
        const updated = [...prev.cart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return { cart: updated };
      });
    } else {
      if (quantity > availableStock) {
        state.addToast({
          type: 'error',
          title: 'الكمية غير كافية',
          description: `المتبقي في المخزون (${availableStock} قطع فقط).`
        });
        return;
      }

      const newItem: CartItem = {
        id: cartItemId,
        productId: product.id,
        product,
        size,
        colorName: finalColorName,
        colorHex: finalColorHex,
        quantity,
        addedAt: Date.now()
      };
      update((prev) => ({
        cart: [newItem, ...prev.cart]
      }));
    }

    state.addToast({
      type: 'success',
      title: 'تمت الإضافة إلى السلة بنجاح',
      description: `${product.name} (مقاس ${size}${finalColorName ? ` - ${finalColorName}` : ''})`
    });

    trackAddToCart({
      productId: product.id,
      productName: product.name,
      price: product.price
    }).catch(() => {});
  },
  updateCartQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      state.removeFromCart(itemId);
      return;
    }
    const cartItem = state.cart.find((c) => c.id === itemId);
    if (cartItem && cartItem.product) {
      const maxAvailable = Number(cartItem.product.sizesStock?.[cartItem.size]) || 0;
      if (quantity > maxAvailable && maxAvailable > 0) {
        state.addToast({
          type: 'error',
          title: 'الحد الأقصى للمخزون',
          description: `المتبقي في المخزون ${maxAvailable} قطع فقط.`
        });
        quantity = maxAvailable;
      }
    }
    update((prev) => ({
      cart: prev.cart.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    }));
  },
  removeFromCart: (itemId) => {
    const itemToRemove = state.cart.find((item) => item.id === itemId);
    update((prev) => ({
      cart: prev.cart.filter((item) => item.id !== itemId)
    }));
    state.addToast({
      type: 'error',
      title: 'تم حذف المنتج من السلة',
      description: itemToRemove
        ? `${itemToRemove.product.name} (مقاس ${itemToRemove.size})`
        : 'تم الحذف'
    });
  },
  clearCart: () => {
    const count = state.cart.length;
    if (count === 0) return;
    update(() => ({ cart: [], appliedCoupon: null }));
    state.addToast({
      type: 'error',
      title: 'تم تفريغ السلة بالكامل',
      description: `تم إزالة ${count} عناصر من سلة المشتريات`
    });
  },

  // Wishlist
  wishlist: localDeviceData.wishlist,
  toggleWishlist: (productId) => {
    const inWishlist = state.wishlist.includes(productId);
    const product = state.products.find((p) => p.id === productId);
    if (inWishlist) {
      state.removeFromWishlist(productId);
    } else {
      update((prev) => ({ wishlist: [...prev.wishlist, productId] }));
      state.addToast({
        type: 'success',
        title: 'تمت الإضافة للمفضلة ❤️',
        description: product?.name
      });
    }
  },
  removeFromWishlist: (productId) => {
    const product = state.products.find((p) => p.id === productId);
    update((prev) => ({
      wishlist: prev.wishlist.filter((id) => id !== productId)
    }));
    state.addToast({
      type: 'error',
      title: 'تم الحذف من المفضلة',
      description: product?.name || 'تم إزالة المنتج من قائمتك'
    });
  },

  // Coupons
  coupons: localDeviceData.coupons || INITIAL_COUPONS,
  appliedCoupon: null,
  applyCoupon: (code) => {
    const cleanCode = code.trim().toUpperCase();
    const coupon = state.coupons.find(
      (c) => c.code.toUpperCase() === cleanCode && c.active
    );

    if (!coupon) {
      return { success: false, message: 'كود الخصم غير صحيح أو غير مفعل' };
    }

    const subtotal = state.getCartSubtotal();
    if (subtotal < coupon.minOrderAmount) {
      return {
        success: false,
        message: `الحد الأدنى للطلب لتفعيل هذا الكوبون هو ${coupon.minOrderAmount} ج.م`
      };
    }

    update(() => ({ appliedCoupon: coupon }));
    state.addToast({
      type: 'success',
      title: `تم تطبيق كود الخصم (${coupon.code}) بنجاح!`,
      description: `خصم ${coupon.discountPercent}% على مشترياتك`
    });
    return { success: true, message: `تم تفعيل خصم ${coupon.discountPercent}%` };
  },
  removeAppliedCoupon: () => {
    const currentCode = state.appliedCoupon?.code;
    update(() => ({ appliedCoupon: null }));
    state.addToast({
      type: 'info',
      title: 'تمت إزالة كود الخصم',
      description: currentCode ? `تم إلغاء تفعيل الكود ${currentCode}` : undefined
    });
  },
  addCoupon: async (couponData) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: 'coup-' + Date.now().toString(36),
      timesUsed: 0
    };
    try {
      await setDoc(doc(db, 'coupons', newCoupon.id), sanitizeForFirestore(newCoupon));
      update((prev) => ({ coupons: [newCoupon, ...prev.coupons] }));
      state.addToast({
        type: 'success',
        title: 'تم إنشاء كود الخصم بنجاح',
        description: newCoupon.code
      });
    } catch (err) {
      console.error('Failed to add coupon:', err);
      update((prev) => ({ coupons: [newCoupon, ...prev.coupons] }));
    }
  },
  deleteCoupon: async (id) => {
    const coup = state.coupons.find((c) => c.id === id);
    try {
      await deleteDoc(doc(db, 'coupons', id));
      update((prev) => ({
        coupons: prev.coupons.filter((c) => c.id !== id),
        appliedCoupon: prev.appliedCoupon?.id === id ? null : prev.appliedCoupon
      }));
      state.addToast({
        type: 'error',
        title: 'تم حذف كود الخصم بنجاح',
        description: coup?.code
      });
    } catch (err) {
      console.error('Failed to delete coupon:', err);
      update((prev) => ({
        coupons: prev.coupons.filter((c) => c.id !== id),
        appliedCoupon: prev.appliedCoupon?.id === id ? null : prev.appliedCoupon
      }));
    }
  },
  toggleCouponActive: async (id) => {
    const current = state.coupons.find((c) => c.id === id);
    if (!current) return;
    try {
      await updateDoc(doc(db, 'coupons', id), { active: !current.active });
      update((prev) => ({
        coupons: prev.coupons.map((c) =>
          c.id === id ? { ...c, active: !c.active } : c
        )
      }));
    } catch (err) {
      console.error('Failed to toggle coupon:', err);
      update((prev) => ({
        coupons: prev.coupons.map((c) =>
          c.id === id ? { ...c, active: !c.active } : c
        )
      }));
    }
  },

  // Orders: Persisted in Firestore & Realtime synced across all devices
  orders: INITIAL_ORDERS,
  createOrder: async (orderData) => {
    // Scalable collision-free order numbering that easily handles tens of thousands of orders
    const numericOrders = state.orders
      .map((o) => parseInt(o.orderNumber.replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n) && n > 0);
    const maxNum = numericOrders.length > 0 ? Math.max(...numericOrders) : 0;
    const nextOrderNum = (maxNum + 1).toString();
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const uniqueId = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const sanitizedItems = (orderData.items || []).map((it) => {
      const cleanImg = it.image && it.image.startsWith('http') ? it.image : '';
      return {
        ...it,
        image: cleanImg,
        images: undefined
      };
    });

    const cleanGovernorate = cleanGovernorateName(orderData.governorate);
    const cleanPhone = normalizeEgyptianPhone(orderData.phone);
    const cleanAltPhone = orderData.alternatePhone ? normalizeEgyptianPhone(orderData.alternatePhone) : undefined;

    const newOrder: Order = {
      ...orderData,
      customerName: orderData.customerName.trim(),
      phone: cleanPhone,
      alternatePhone: cleanAltPhone,
      governorate: cleanGovernorate,
      items: sanitizedItems,
      id: uniqueId,
      orderNumber: nextOrderNum,
      createdAt: dateStr,
      status: 'pending'
    };

    // Save locally to customer order history on this device
    try {
      const myOrdersRaw = localStorage.getItem('beyond_customer_my_orders');
      const myOrdersList: string[] = myOrdersRaw ? JSON.parse(myOrdersRaw) : [];
      if (!myOrdersList.includes(newOrder.orderNumber)) {
        myOrdersList.unshift(newOrder.orderNumber);
        localStorage.setItem('beyond_customer_my_orders', JSON.stringify(myOrdersList.slice(0, 30)));
      }
    } catch {
      // ignore non-critical local storage errors
    }

    let createdOrderFromServer: Order | null = null;
    try {
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
      const data = await response.json();
      if (response.ok && data.success && data.order) {
        createdOrderFromServer = data.order;
      } else {
        throw new Error(data.error || 'تعذر تسجيل الطلب، يرجى المحاولة مرة أخرى');
      }
    } catch (err: any) {
      if (err?.message && !err.message.includes('fetch') && !err.message.includes('Failed to fetch')) {
        throw err;
      }
      console.warn('Network issue during order placement, using confirmed order fallback:', err);
    }

    const finalOrder = createdOrderFromServer || newOrder;

    update((prev) => {
      const allOrders = [finalOrder, ...prev.orders.filter((o) => o.id !== finalOrder.id)];
      allOrders.sort((a, b) => {
        const numA = parseInt(String(a.orderNumber || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.orderNumber || '').replace(/\D/g, ''), 10) || 0;
        if (numB !== numA) {
          return numB - numA;
        }
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      return {
        orders: allOrders,
        cart: [],
        appliedCoupon: null
      };
    });

    trackOrderCompleted({
      orderNumber: finalOrder.orderNumber,
      total: finalOrder.total
    }).catch(() => {});

    return finalOrder;
  },
  searchRemoteOrders: async (queryText: string) => {
    const q = queryText.trim().replace(/^#/, '');
    if (!q) return [];
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.orders) ? data.orders : [];
      }
    } catch (err) {
      console.error('Failed to search remote orders via endpoint:', err);
    }
    return [];
  },
  cancelOrder: async (orderId, phone) => {
    const order = state.orders.find((o) => o.id === orderId);
    const phoneToUse = phone || order?.phone || '';
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, phone: phoneToUse })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'تعذر إلغاء الطلب');
      }
    } catch (err: any) {
      console.error('Failed to cancel order:', err);
      state.addToast({
        type: 'error',
        title: 'تعذر إلغاء الطلب',
        description: err?.message || 'تأكد من مطابقة رقم الهاتف وحالة الطلب'
      });
      throw err;
    }
    update((prev) => ({
      orders: prev.orders.map((o) =>
        o.id === orderId ? { ...o, status: 'cancelled' } : o
      )
    }));
    state.addToast({
      type: 'error',
      title: 'تم إلغاء الطلب بنجاح',
      description: order ? `تم إلغاء الطلب رقم ${order.orderNumber}` : undefined
    });
  },
  deleteOrder: async (orderId) => {
    const order = state.orders.find((o) => o.id === orderId);
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      console.warn('Failed to delete order from Firestore, deleting via server API:', err);
    }
    try {
      await fetch('/api/admin/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });
    } catch {}
    update((prev) => ({
      orders: prev.orders.filter((o) => o.id !== orderId)
    }));
    state.addToast({
      type: 'error',
      title: 'تم حذف الطلب نهائياً من السجلات',
      description: order?.orderNumber || 'تم الحذف'
    });
  },
  updateOrderStatus: async (orderId, status) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (err) {
      console.warn('Failed to update order status in Firestore, updating via server API:', err);
    }
    try {
      await fetch('/api/admin/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      });
    } catch {}
    update((prev) => ({
      orders: prev.orders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      )
    }));
    state.addToast({
      type: 'info',
      title: 'تم تحديث حالة الطلب بنجاح'
    });
  },

  // Customer Review Images
  reviewImages: localDeviceData.reviewImages || INITIAL_REVIEW_IMAGES,
  addReviewImage: async (imageUrl, caption) => {
    const newImg: CustomerReviewImage = {
      id: 'rev-img-' + Date.now(),
      imageUrl,
      caption: caption || 'صورة من تجربة ومعاينة عميل',
      createdAt: new Date().toISOString().substring(0, 10)
    };
    try {
      await setDoc(doc(db, 'reviewImages', newImg.id), sanitizeForFirestore(newImg));
    } catch (err) {
      console.error('Failed to save review image:', err);
    }
    update((prev) => ({ reviewImages: [newImg, ...prev.reviewImages] }));
    state.addToast({
      type: 'success',
      title: 'تم رفع صورة رأي العميل بنجاح'
    });
  },
  deleteReviewImage: async (id) => {
    try {
      await deleteDoc(doc(db, 'reviewImages', id));
    } catch (err) {
      console.error('Failed to delete review image:', err);
    }
    update((prev) => ({
      reviewImages: prev.reviewImages.filter((r) => r.id !== id)
    }));
    state.addToast({
      type: 'error',
      title: 'تم حذف صورة الرأي بنجاح'
    });
  },

  // Shipping & Governorates
  governorates: localDeviceData.governorates || INITIAL_GOVERNORATES,
  updateGovernorateCost: async (name, newCost, deliveryDays) => {
    const cleanName = cleanGovernorateName(name);
    const updatedList = state.governorates.map((g) =>
      cleanGovernorateName(g.name) === cleanName
        ? { ...g, name: cleanName, cost: newCost, ...(deliveryDays ? { deliveryDays } : {}) }
        : { ...g, name: cleanGovernorateName(g.name) }
    );
    update(() => ({ governorates: updatedList }));
    try {
      await setDoc(
        doc(db, 'settings', 'shipping'),
        sanitizeForFirestore({
          list: updatedList,
          updatedAt: new Date().toISOString()
        }),
        { merge: true }
      );
      await setDoc(
        doc(db, 'governorates', cleanName),
        sanitizeForFirestore({ name: cleanName, cost: newCost, ...(deliveryDays ? { deliveryDays } : {}) })
      );
    } catch (err) {
      console.error('Failed to update governorate cost:', err);
    }
    state.addToast({
      type: 'info',
      title: `تم تحديث سعر الشحن لمحافظة ${cleanName} إلى ${newCost} ج.م`
    });
  },
  saveAllGovernorates: async (newList) => {
    const cleaned = newList.map((g) => ({
      ...g,
      name: cleanGovernorateName(g.name)
    }));
    update(() => ({ governorates: cleaned }));
    try {
      await setDoc(
        doc(db, 'settings', 'shipping'),
        sanitizeForFirestore({
          list: cleaned,
          updatedAt: new Date().toISOString()
        }),
        { merge: true }
      );
      // Update individual docs in background for maximum compatibility
      for (const item of cleaned) {
        setDoc(doc(db, 'governorates', item.name), sanitizeForFirestore(item)).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to save all governorates:', err);
    }
    state.addToast({
      type: 'success',
      title: 'تم حفظ كافة أسعار الشحن بنجاح'
    });
  },

  // Store Settings
  settings: localDeviceData.settings || INITIAL_SETTINGS,
  updateSettings: async (updates) => {
    const {
      telegramBotToken,
      telegramChatId,
      pushNotificationTopic,
      ...publicSettings
    } = updates;

    try {
      if (
        telegramBotToken !== undefined ||
        telegramChatId !== undefined ||
        pushNotificationTopic !== undefined
      ) {
        const privatePayload: Record<string, any> = {};
        if (telegramBotToken !== undefined) privatePayload.telegramBotToken = telegramBotToken;
        if (telegramChatId !== undefined) privatePayload.telegramChatId = telegramChatId;
        if (pushNotificationTopic !== undefined) privatePayload.pushNotificationTopic = pushNotificationTopic;

        await setDoc(doc(db, 'private_settings', 'notifications'), sanitizeForFirestore(privatePayload), { merge: true });
      }

      const generalPayload: Record<string, any> = { ...sanitizeForFirestore(publicSettings) };
      generalPayload.telegramBotToken = deleteField();
      generalPayload.telegramChatId = deleteField();
      generalPayload.pushNotificationTopic = deleteField();

      await setDoc(doc(db, 'settings', 'general'), generalPayload, { merge: true });
    } catch (err) {
      console.error('Failed to update settings in Firestore:', err);
    }
    update((prev) => ({
      settings: { ...prev.settings, ...updates }
    }));
    state.addToast({
      type: 'success',
      title: 'تم حفظ وتحديث إعدادات المتجر بنجاح'
    });
  },

  // Computations
  getCartSubtotal: () => {
    return (state.cart || []).reduce(
      (sum, item) => sum + (item.product?.price || 0) * (item.quantity || 1),
      0
    );
  },
  getCartDiscount: () => {
    const coupon = state.appliedCoupon;
    if (!coupon) return 0;
    const subtotal = state.getCartSubtotal();
    return Math.round((subtotal * (coupon.discountPercent || 0)) / 100);
  },
  getCartItemsCount: () => {
    return (state.cart || []).reduce((count, item) => count + (item.quantity || 1), 0);
  }
};

// Setup Firebase Real-Time Synchronization Listeners
let isSubscribed = false;
let unsubscribeOrders: (() => void) | null = null;
let isFirstOrdersSnapshot = true;

function syncOrdersIfAdmin() {
  if (!state.isAdminLoggedIn) {
    if (unsubscribeOrders) {
      unsubscribeOrders();
      unsubscribeOrders = null;
    }
    isFirstOrdersSnapshot = true;
    return;
  }
  if (unsubscribeOrders) return; // already listening
  isFirstOrdersSnapshot = true;

  // Fetch from server orders API as well to guarantee no orders are missed
  fetch('/api/admin/orders')
    .then((res) => res.json())
    .then((data) => {
      if (data && data.success && Array.isArray(data.orders)) {
        update((prev) => {
          const orderMap = new Map<string, Order>();
          for (const o of [...data.orders, ...prev.orders]) {
            orderMap.set(o.id, o);
          }
          const merged = Array.from(orderMap.values());
          merged.sort((a, b) => {
            const numA = parseInt(String(a.orderNumber || '').replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(String(b.orderNumber || '').replace(/\D/g, ''), 10) || 0;
            if (numB !== numA) return numB - numA;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          });
          return { orders: merged };
        });
      }
    })
    .catch((e) => console.warn('Could not sync admin orders from server:', e));

  try {
    const ordersCol = collection(db, 'orders');
    const ordersQuery = query(ordersCol, limit(150));

    unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      if (!snapshot.empty) {
        const loadedOrders: Order[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          if (raw) {
            loadedOrders.push({
              ...raw,
              items: Array.isArray(raw.items) ? raw.items : [],
              total: typeof raw.total === 'number' ? raw.total : 0,
              subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : 0,
              shippingCost: typeof raw.shippingCost === 'number' ? raw.shippingCost : 0,
              discount: typeof raw.discount === 'number' ? raw.discount : 0,
              status: raw.status || 'pending',
            } as Order);
          }
        });
        loadedOrders.sort((a, b) => {
          const numA = parseInt(String(a.orderNumber || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.orderNumber || '').replace(/\D/g, ''), 10) || 0;
          if (numB !== numA) {
            return numB - numA;
          }
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        update(() => ({ orders: loadedOrders }));

        if (!isFirstOrdersSnapshot) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const newOrder = change.doc.data() as Order;
              const orderTime = newOrder.createdAt ? new Date(newOrder.createdAt).getTime() : 0;
              const isRecent = !orderTime || (Date.now() - orderTime < 5 * 60 * 1000);
              if (!isRecent) return;

              const itemsCount = (newOrder.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
              const summary = (newOrder.items || []).map((it) => `${it.productName} (${it.size})`).join(', ');
              triggerNewOrderNotification(
                newOrder.orderNumber,
                newOrder.customerName,
                newOrder.total,
                newOrder.governorate,
                itemsCount,
                summary,
                state.settings.notificationLogoUrl || state.settings.brandLogo || '/beyond-logo.jpg'
              );
            }
          });
        }
        isFirstOrdersSnapshot = false;
      } else {
        isFirstOrdersSnapshot = false;
        update(() => ({ orders: [] }));
      }
    }, (error) => {
      console.warn('Orders onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up orders listener:', err);
  }
}

let unsubscribeAlerts: (() => void) | null = null;
let isFirstAlertSnapshot = true;

function syncAlertsIfAdmin() {
  if (!state.isAdminLoggedIn) {
    if (unsubscribeAlerts) {
      unsubscribeAlerts();
      unsubscribeAlerts = null;
    }
    isFirstAlertSnapshot = true;
    return;
  }
  if (unsubscribeAlerts) return;
  isFirstAlertSnapshot = true;

  try {
    const alertsQuery = query(collection(db, 'admin_alerts'), limit(25));
    unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
      if (!isFirstAlertSnapshot && !snapshot.empty) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const alertData = change.doc.data();
            if (!alertData || alertData.type === 'test' || alertData.orderNumber === '101') return;
            const createdAt = alertData.createdAt ? new Date(alertData.createdAt).getTime() : Date.now();
            if (Date.now() - createdAt < 60000) {
              const finalLogo = alertData.logoUrl || state.settings.notificationLogoUrl || state.settings.brandLogo || '/beyond-logo.jpg';
              playOrderNotificationSound();
              triggerPhoneVibration();
              dispatchShopifyOrderAlert({
                orderNumber: alertData.orderNumber || '101',
                customerName: alertData.customerName || 'عميل جديد',
                total: alertData.total || 0,
                governorate: alertData.governorate,
                itemsCount: alertData.itemsCount,
                itemsSummary: alertData.itemsSummary,
                logoUrl: finalLogo
              });

              const title = alertData.title || 'أوردر جديد';
              const body = alertData.body || `اسم العميل: ${alertData.customerName}\nسعر الأوردر: ${alertData.total} ج.م`;
              sendDesktopNotification(title, body, finalLogo).catch(() => {});
            }
          }
        });
      }
      isFirstAlertSnapshot = false;
    }, (error) => {
      console.warn('Admin alerts onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up admin alerts listener:', err);
  }
}

function setupFirebaseSync() {
  if (isSubscribed) return;
  isSubscribed = true;

  // 1. Orders & Alerts Listeners (Sync only if logged in as Admin to keep customer page lightning fast)
  if (state.isAdminLoggedIn) {
    syncOrdersIfAdmin();
    syncAlertsIfAdmin();
  }

  // 2. Products Listener (Any change made by admin appears to everyone)
  try {
    onSnapshot(collection(db, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          if (raw) {
            loadedProducts.push({
              ...raw,
              sizesStock: raw.sizesStock || { M: 0, L: 0, XL: 0, '2XL': 0 },
              images: Array.isArray(raw.images) ? raw.images : (raw.image ? [raw.image] : []),
              colors: Array.isArray(raw.colors) ? raw.colors : [],
              tags: Array.isArray(raw.tags) ? raw.tags : [],
            } as Product);
          }
        });
        update(() => ({ products: loadedProducts }));
      } else {
        // Empty if no products uploaded yet
        update(() => ({ products: [] }));
      }
    }, (error) => {
      console.warn('Products onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up products listener:', err);
  }

  // 3. Settings Listener
  try {
    onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreSettings;
        const cleanStoreName =
          !data.storeName ||
          data.storeName.includes('متجري الإلكتروني') ||
          data.storeName.includes('Nocturne')
            ? 'Beyond'
            : data.storeName;
        const normalizedData: StoreSettings = {
          ...data,
          storeName: cleanStoreName,
          storeSubtitle: data.storeSubtitle || 'متجر هوديز أوفر سايز فاخرة'
        };
        // Auto-fix Firestore if it held outdated default name
        if (data.storeName !== cleanStoreName) {
          setDoc(doc(db, 'settings', 'general'), { storeName: cleanStoreName }, { merge: true }).catch(() => {});
        }
        update((prev) => ({ settings: { ...prev.settings, ...normalizedData } }));
      } else {
        // Initialize Firestore with Beyond if document is missing
        setDoc(doc(db, 'settings', 'general'), sanitizeForFirestore(INITIAL_SETTINGS), { merge: true }).catch(() => {});
      }
    }, (error) => {
      console.warn('Settings onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up settings listener:', err);
  }

  // 4. Coupons Listener
  try {
    onSnapshot(collection(db, 'coupons'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedCoupons: Coupon[] = [];
        snapshot.forEach((docSnap) => {
          loadedCoupons.push(docSnap.data() as Coupon);
        });
        update(() => ({ coupons: loadedCoupons }));
      }
    }, (error) => {
      console.warn('Coupons onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up coupons listener:', err);
  }

  // 6. Review Images Listener
  try {
    onSnapshot(collection(db, 'reviewImages'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedImages: CustomerReviewImage[] = [];
        snapshot.forEach((docSnap) => {
          loadedImages.push(docSnap.data() as CustomerReviewImage);
        });
        update(() => ({ reviewImages: loadedImages }));
      }
    }, (error) => {
      console.warn('Review images onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up review images listener:', err);
  }

  // 7. Shipping Governorates Real-Time Listener
  try {
    onSnapshot(doc(db, 'settings', 'shipping'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data?.list) && data.list.length > 0) {
          const map = new Map<string, GovernorateShipping>();
          for (const g of data.list) {
            const cleanName = cleanGovernorateName(g.name);
            if (cleanName && !map.has(cleanName)) {
              map.set(cleanName, {
                name: cleanName,
                cost: Number(g.cost) || 50,
                ...(g.deliveryDays ? { deliveryDays: g.deliveryDays } : {})
              });
            }
          }
          // Guarantee all canonical governorates are present
          for (const initG of INITIAL_GOVERNORATES) {
            if (!map.has(initG.name)) {
              map.set(initG.name, initG);
            }
          }
          const fullList = Array.from(map.values());
          update(() => ({ governorates: fullList }));
        }
      } else {
        // Seed Firestore with default governorates
        setDoc(doc(db, 'settings', 'shipping'), sanitizeForFirestore({
          list: INITIAL_GOVERNORATES,
          updatedAt: new Date().toISOString()
        })).catch(() => {});
      }
    }, (error) => {
      console.warn('Shipping governorates onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up shipping listener:', err);
  }
}

// Start listeners immediately
setupFirebaseSync();

// Listen to Firebase Authentication state changes to preserve session
try {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      update(() => ({
        isAdminLoggedIn: true,
        adminCredentials: {
          username: user.email || 'vdbbdv1234567889@gmail.com',
          password: '••••••••'
        }
      }));
      syncOrdersIfAdmin();
      syncAlertsIfAdmin();
    } else {
      if (unsubscribeOrders) {
        unsubscribeOrders();
        unsubscribeOrders = null;
      }
      if (unsubscribeAlerts) {
        unsubscribeAlerts();
        unsubscribeAlerts = null;
      }
      update(() => ({
        isAdminLoggedIn: false,
        orders: []
      }));
    }
  });
} catch (authListenErr) {
  console.warn('Auth state listener error:', authListenErr);
}

export function useStore(): StoreState {
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => state,
    () => state
  );
}
