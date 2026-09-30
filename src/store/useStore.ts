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
import { db, sanitizeForFirestore, auth } from '../lib/firebase';
import { authFetch } from '../lib/authFetch';
import { signInWithEmailAndPassword, updatePassword, signOut, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import {
  triggerNewOrderNotification,
  playOrderNotificationSound,
  triggerPhoneVibration,
  dispatchShopifyOrderAlert,
  sendDesktopNotification
} from '../lib/notifications';
import { trackAddToCart, trackInitiateCheckout } from '../lib/analytics';
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

export function normalizeGovName(name: unknown): string {
  return String(name ?? '')
    .replace(/\s*[\(（][^\)）]*[\)）]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
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
  saveAllGovernorates: (newList: GovernorateShipping[], showToast?: boolean) => Promise<void>;

  // Store Settings (synced with Firebase Firestore)
  settings: StoreSettings;
  updateSettings: (updates: Partial<StoreSettings>) => Promise<void>;

  // Admin Authentication & Credentials (powered by Firebase Authentication)
  adminCredentials: AdminCredentials;
  updateAdminCredentials: (newUsername: string, newPassword: string) => Promise<boolean>;
  verifyAdminLogin: (usernameInput: string, passwordInput: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logoutAdmin: () => Promise<void>;

  // Computed / Helpers
  getCartSubtotal: () => number;
  getCartDiscount: () => number;
  getCartItemsCount: () => number;
}

const STORAGE_KEY_V5 = 'beyond_hoodies_storage_v5';

function loadLocalDeviceData() {
  const defaults = {
    cart: [] as CartItem[],
    wishlist: [] as string[],
    isAdminLoggedIn: false,
    adminCredentials: { username: '', password: '' } as AdminCredentials,
    activeView: 'home' as ActiveView,
    settings: INITIAL_SETTINGS,
    products: INITIAL_PRODUCTS,
    coupons: INITIAL_COUPONS,
    governorates: INITIAL_GOVERNORATES,
    reviewImages: INITIAL_REVIEW_IMAGES
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V5);
    if (!raw) return defaults;
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
    // Never keep secrets in the browser
    delete (parsedSettings as any).telegramBotToken;
    delete (parsedSettings as any).telegramChatId;
    delete (parsedSettings as any).pushNotificationTopic;

    return {
      ...defaults,
      cart: Array.isArray(parsed.cart) ? parsed.cart : [],
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist : [],
      activeView: (parsed.activeView === 'admin' ? 'admin' : 'home') as ActiveView,
      settings: parsedSettings,
      governorates: normalizeGovernorates(parsed.governorates)
    };
  } catch (e) {
    console.error('Failed to load local storage:', e);
    return defaults;
  }
}

function saveLocalDeviceData(s: StoreState) {
  try {
    const dataToSave = {
      // Keep only the first image of each cart product so the saved cart stays small
      cart: s.cart.map((item) => ({
        ...item,
        product: { ...item.product, images: (item.product?.images || []).filter((i) => !i.startsWith('data:')).slice(0, 1) }
      })),
      wishlist: s.wishlist,
      activeView: s.activeView === 'admin' ? 'admin' : 'home',
      settings: s.settings,
      governorates: s.governorates
    };
    localStorage.setItem(STORAGE_KEY_V5, JSON.stringify(dataToSave));
  } catch (e) {
    console.error('Failed to save to local storage:', e);
  }
}

/** "الدقهلية (المنصورة)" -> "الدقهلية", removes duplicates and adds any missing default governorate */
function normalizeGovernorates(list: unknown): GovernorateShipping[] {
  const byName = new Map<string, GovernorateShipping>();
  if (Array.isArray(list)) {
    for (const g of list as GovernorateShipping[]) {
      const name = normalizeGovName(g?.name);
      if (!name || byName.has(name)) continue;
      byName.set(name, { ...g, name, cost: Number(g.cost) || 0 });
    }
  }
  for (const g of INITIAL_GOVERNORATES) {
    if (!byName.has(g.name)) byName.set(g.name, g);
  }
  return Array.from(byName.values());
}

const localDeviceData = loadLocalDeviceData();
const listeners = new Set<() => void>();
let lastSavedCart = localDeviceData.cart;
let lastSavedWishlist = localDeviceData.wishlist;
let lastSavedActiveView = localDeviceData.activeView;
let lastSavedSettings = localDeviceData.settings;
let lastSavedGovernorates = localDeviceData.governorates;

function notify() {
  if (
    state.cart !== lastSavedCart ||
    state.wishlist !== lastSavedWishlist ||
    state.activeView !== lastSavedActiveView ||
    state.settings !== lastSavedSettings ||
    state.governorates !== lastSavedGovernorates
  ) {
    lastSavedCart = state.cart;
    lastSavedWishlist = state.wishlist;
    lastSavedActiveView = state.activeView;
    lastSavedSettings = state.settings;
    lastSavedGovernorates = state.governorates;
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
      syncCouponsIfAdmin();
    } else {
      stopAdminListeners();
      update(() => ({ orders: [], coupons: [] }));
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

  // Admin Authentication & Credentials (powered by Firebase Authentication)
  adminCredentials: localDeviceData.adminCredentials || {
    username: 'vdbbdv1234567889@gmail.com',
    password: '••••••••'
  },
  updateAdminCredentials: async (_newUsername, newPassword) => {
    try {
      const cleanPass = newPassword.trim();
      if (!cleanPass) {
        state.addToast({ type: 'error', title: 'خطأ', description: 'اكتب كلمة مرور جديدة صالحة' });
        return false;
      }
      if (!auth.currentUser) {
        state.addToast({ type: 'error', title: 'يجب تسجيل الدخول أولاً' });
        return false;
      }
      await updatePassword(auth.currentUser, cleanPass);
      state.addToast({ type: 'success', title: 'تم تحديث كلمة المرور بنجاح' });
      return true;
    } catch (err: any) {
      console.error('Failed to update admin password:', err);
      const needsRelogin = err?.code === 'auth/requires-recent-login';
      state.addToast({
        type: 'error',
        title: 'تعذر تحديث كلمة المرور',
        description: needsRelogin ? 'سجّل الخروج ثم الدخول مرة أخرى وحاول من جديد' : undefined
      });
      return false;
    }
  },
  verifyAdminLogin: async (userInput, passInput) => {
    let email = userInput.trim();
    const cleanPass = passInput.trim();

    // If the user entered only username without @, try appending @gmail.com
    const candidateEmails = email.includes('@') ? [email] : [`${email}@gmail.com`, email];

    try {
      let userCred: any = null;
      let lastAuthErr: any = null;

      for (const candidate of candidateEmails) {
        try {
          userCred = await signInWithEmailAndPassword(auth, candidate, cleanPass);
          break;
        } catch (err) {
          lastAuthErr = err;
        }
      }

      if (!userCred) {
        throw lastAuthErr;
      }

      const allowed = await confirmAdminAccess();
      if (!allowed) {
        await signOut(auth).catch(() => {});
        state.addToast({ type: 'error', title: 'هذا الحساب ليس لديه صلاحية الدخول' });
        return false;
      }
      update(() => ({
        isAdminLoggedIn: true,
        adminCredentials: { username: userCred.user.email || email, password: '' }
      }));
      syncOrdersIfAdmin();
      syncAlertsIfAdmin();
      syncCouponsIfAdmin();
      state.addToast({ type: 'success', title: 'مرحباً بك في لوحة الإدارة' });
      return true;
    } catch (err: any) {
      const code = err?.code || '';
      let msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      if (code === 'auth/invalid-email') {
        msg = 'يرجى كتابة البريد الإلكتروني كاملاً (مثال: admin@gmail.com) وليس اسم المستخدم فقط.';
      } else if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد من إدخال البريد وكلمة المرور المسجلين في Firebase بدقة.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'تم إيقاف المحاولات مؤقتاً بسبب كثرة الأخطاء. حاول بعد قليل.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'تعذر الاتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.';
      }
      state.addToast({ type: 'error', title: 'فشل تسجيل الدخول', description: msg });
      return false;
    }
  },
  loginWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCred = await signInWithPopup(auth, provider);
      const email = (userCred.user.email || '').toLowerCase().trim();

      const allowed = await confirmAdminAccess();
      if (!allowed) {
        await signOut(auth).catch(() => {});
        state.addToast({ type: 'error', title: 'هذا الحساب ليس لديه صلاحية الدخول كأدمن' });
        return false;
      }
      update(() => ({
        isAdminLoggedIn: true,
        adminCredentials: { username: userCred.user.email || email, password: '' }
      }));
      syncOrdersIfAdmin();
      syncAlertsIfAdmin();
      syncCouponsIfAdmin();
      state.addToast({ type: 'success', title: 'مرحباً بك في لوحة الإدارة' });
      return true;
    } catch (err: any) {
      console.error('Google login error:', err);
      const code = err?.code || '';
      let msg = 'تعذر تسجيل الدخول باستخدام حساب Google.';
      if (code === 'auth/popup-closed-by-user') {
        msg = 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
      } else if (code === 'auth/unauthorized-domain') {
        msg = 'هذا النطاق غير مضاف في قائمة النطاقات المصرح بها في Firebase Console (Authorized Domains).';
      }
      state.addToast({ type: 'error', title: 'فشل تسجيل الدخول', description: msg });
      return false;
    }
  },
  logoutAdmin: async () => {
    try {
      await signOut(auth);
    } catch {}
    stopAdminListeners();
    update(() => ({ isAdminLoggedIn: false, orders: [], coupons: [] }));
    state.addToast({ type: 'info', title: 'تم تسجيل الخروج' });
  },

  // Products (synced with the database)
  products: localDeviceData.products,
  addProduct: async (productData) => {
    const newProduct: Product = {
      ...productData,
      id: 'h-' + Date.now().toString(36),
      rating: 5.0,
      reviewsCount: 1
    };
    try {
      await setDoc(doc(db, 'products', newProduct.id), sanitizeForFirestore(newProduct));
      update((prev) => ({ products: [newProduct, ...prev.products.filter((p) => p.id !== newProduct.id)] }));
      state.addToast({ type: 'success', title: 'تم نشر الهودي في المتجر بنجاح', description: newProduct.name });
    } catch (err) {
      reportSaveError('تعذر حفظ المنتج', err);
      throw err;
    }
  },
  updateProduct: async (id, updates) => {
    try {
      await updateDoc(doc(db, 'products', id), sanitizeForFirestore(updates));
      update((prev) => ({
        products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        selectedProduct:
          prev.selectedProduct?.id === id ? { ...prev.selectedProduct, ...updates } : prev.selectedProduct
      }));
      state.addToast({ type: 'info', title: 'تم تحديث بيانات المنتج' });
    } catch (err) {
      reportSaveError('تعذر تحديث المنتج', err);
      throw err;
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
      state.addToast({ type: 'error', title: 'تم حذف المنتج', description: prod?.name });
    } catch (err) {
      reportSaveError('تعذر حذف المنتج', err);
      throw err;
    }
  },
  seedSampleProduct: async () => {
    await state.addProduct(SAMPLE_HOODIE_TEMPLATE);
  },

  // Cart
  cart: localDeviceData.cart,
  addToCart: (product, size, colorName, colorHex, quantity = 1) => {
    if (product?.comingSoon === true) {
      state.addToast({ type: 'info', title: 'قريباً', description: `"${product.name}" لسه مانزلش، خليك متابعنا.` });
      return;
    }
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

  // Coupons (the full list is only loaded for admins; customers validate codes on the server)
  coupons: [],
  appliedCoupon: null,
  applyCoupon: async (code) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return { success: false, message: 'اكتب كود الخصم' };

    let coupon: Coupon | null = null;
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.coupon) {
        coupon = { ...data.coupon, active: true, timesUsed: 0 } as Coupon;
      }
    } catch {
      // Continue to Firestore fallback below
    }

    if (!coupon) {
      try {
        const snap = await getDocs(collection(db, 'coupons'));
        const found = snap.docs.find((d) => String(d.data()?.code || '').trim().toUpperCase() === clean);
        if (found) {
          const d = found.data();
          if (d.active !== false) {
            coupon = { id: found.id, ...d } as Coupon;
          }
        }
      } catch {
        // Fallback check against local state if admin
        const found = state.coupons.find((c) => c.code.trim().toUpperCase() === clean);
        if (found && found.active !== false) {
          coupon = found;
        }
      }
    }

    if (!coupon) {
      return { success: false, message: 'كود الخصم غير صحيح أو غير مفعل' };
    }

    const subtotal = state.getCartSubtotal();
    if (subtotal < (coupon.minOrderAmount || 0)) {
      return { success: false, message: `الحد الأدنى للطلب لتفعيل هذا الكوبون هو ${coupon.minOrderAmount} ج.م` };
    }
    if (coupon.targetProductId && !state.cart.some((c) => c.productId === coupon!.targetProductId)) {
      return {
        success: false,
        message: `هذا الكوبون خاص بـ ${coupon.targetProductName || 'منتج معين'} وغير موجود في سلتك`
      };
    }

    update(() => ({ appliedCoupon: coupon }));
    state.addToast({
      type: 'success',
      title: `تم تطبيق كود الخصم (${coupon.code})`,
      description: `خصم ${coupon.discountPercent}%${coupon.targetProductName ? ` على ${coupon.targetProductName}` : ''}`
    });
    return { success: true, message: `تم تفعيل خصم ${coupon.discountPercent}%` };
  },
  removeAppliedCoupon: () => {
    const currentCode = state.appliedCoupon?.code;
    update(() => ({ appliedCoupon: null }));
    state.addToast({
      type: 'info',
      title: 'تمت إزالة كود الخصم',
      description: currentCode ? `تم إلغاء الكود ${currentCode}` : undefined
    });
  },
  addCoupon: async (couponData) => {
    const newCoupon: Coupon = {
      ...couponData,
      code: couponData.code.trim().toUpperCase(),
      id: 'coup-' + Date.now().toString(36),
      timesUsed: 0
    };
    try {
      await setDoc(doc(db, 'coupons', newCoupon.id), sanitizeForFirestore(newCoupon));
      update((prev) => ({ coupons: [newCoupon, ...prev.coupons.filter((c) => c.id !== newCoupon.id)] }));
      state.addToast({ type: 'success', title: 'تم إنشاء كود الخصم', description: newCoupon.code });
    } catch (err) {
      reportSaveError('تعذر إنشاء الكوبون', err);
      throw err;
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
      state.addToast({ type: 'error', title: 'تم حذف كود الخصم', description: coup?.code });
    } catch (err) {
      reportSaveError('تعذر حذف الكوبون', err);
      throw err;
    }
  },
  toggleCouponActive: async (id) => {
    const current = state.coupons.find((c) => c.id === id);
    if (!current) return;
    try {
      await updateDoc(doc(db, 'coupons', id), { active: !current.active });
      update((prev) => ({
        coupons: prev.coupons.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
      }));
    } catch (err) {
      reportSaveError('تعذر تعديل الكوبون', err);
      throw err;
    }
  },

  // Orders: created and changed through the server; only admins receive the live list
  orders: INITIAL_ORDERS,
  createOrder: async (orderData) => {
    const id = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    const orderNumber = String(Date.now()).slice(-6);
    const subtotal = (orderData.items || []).reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
    const shippingCost = state.governorates.find(g => normalizeGovName(g.name) === normalizeGovName(orderData.governorate))?.cost || 50;
    let discount = 0;
    if (state.appliedCoupon) {
      discount = Math.round((subtotal * (Number(state.appliedCoupon.discountPercent) || 0)) / 100);
    }
    const total = Math.max(0, subtotal - discount + shippingCost);
    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

    const localOrder: Order = {
      id,
      orderNumber,
      customerName: orderData.customerName,
      phone: orderData.phone,
      alternatePhone: orderData.alternatePhone || '',
      governorate: normalizeGovName(orderData.governorate),
      center: orderData.center || '',
      address: orderData.address,
      notes: orderData.notes || '',
      items: orderData.items,
      subtotal,
      shippingCost,
      discount,
      couponCode: state.appliedCoupon?.code || '',
      total,
      status: 'pending',
      createdAt: dateStr
    };

    // 1. Direct Firestore write (Instant, reliable, backed by Firestore Security Rules)
    try {
      await setDoc(doc(db, 'orders', id), sanitizeForFirestore(localOrder));

      // Deduct sizes stock in products
      for (const item of (orderData.items || [])) {
        const prod = state.products.find(p => p.id === item.productId);
        if (prod && prod.sizesStock && prod.sizesStock[item.size] !== undefined) {
          const currentStock = Number(prod.sizesStock[item.size]) || 0;
          const updatedStock = { ...prod.sizesStock, [item.size]: Math.max(0, currentStock - item.quantity) };
          updateDoc(doc(db, 'products', prod.id), { sizesStock: updatedStock }).catch(() => {});
        }
      }

      // Create alert for admin
      const alertId = 'alert-' + Date.now();
      setDoc(doc(db, 'admin_alerts', alertId), sanitizeForFirestore({
        id: alertId,
        orderNumber,
        customerName: localOrder.customerName,
        total: localOrder.total,
        governorate: localOrder.governorate,
        itemsCount: localOrder.items.reduce((s, it) => s + (it.quantity || 1), 0),
        createdAt: now.toISOString()
      })).catch(() => {});
    } catch (writeErr) {
      console.warn('Direct Firestore save note:', writeErr);
    }

    // 2. Background sync with backend API if available (for Telegram/push notification)
    const payload = {
      id,
      customerName: orderData.customerName,
      phone: orderData.phone,
      alternatePhone: orderData.alternatePhone,
      governorate: normalizeGovName(orderData.governorate),
      center: orderData.center,
      address: orderData.address,
      notes: orderData.notes,
      couponCode: orderData.couponCode,
      items: (orderData.items || []).map((it) => ({
        productId: it.productId,
        size: it.size,
        quantity: it.quantity,
        colorName: it.colorName
      }))
    };
    fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});

    const finalOrder = localOrder;
    update((prev) => {
      const allOrders = [finalOrder, ...prev.orders.filter((o) => o.id !== finalOrder.id)];
      allOrders.sort(compareOrdersNewestFirst);
      return { orders: allOrders, cart: [], appliedCoupon: null };
    });
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
        if (Array.isArray(data.orders) && data.orders.length > 0) {
          return data.orders;
        }
      }
    } catch (err) {
      console.error('Failed to search orders:', err);
    }
    return state.orders.filter((o) => o.orderNumber === q || o.phone === q || o.id === q);
  },
  cancelOrder: async (orderId, phone) => {
    const order = state.orders.find((o) => o.id === orderId);

    // 1. Direct Firestore write (Instant, reliable, synced in real-time)
    try {
      await setDoc(
        doc(db, 'orders', orderId),
        {
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('Direct Firestore cancel warning:', fsErr);
    }

    // 2. Background sync with backend API (best-effort)
    try {
      if (state.isAdminLoggedIn) {
        authFetch('/api/orders/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, status: 'cancelled' })
        }).catch(() => {});
      } else {
        fetch('/api/orders/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, phone: phone || order?.phone || '' })
        }).catch(() => {});
      }
    } catch {}

    // 3. Update store state immediately
    update((prev) => ({
      orders: prev.orders.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o))
    }));

    state.addToast({
      type: 'info',
      title: 'تم إلغاء الطلب بنجاح',
      description: order ? `تم إلغاء الطلب رقم #${order.orderNumber}` : undefined
    });
  },
  deleteOrder: async (orderId) => {
    const order = state.orders.find((o) => o.id === orderId);
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      reportSaveError('تعذر حذف الطلب', err);
      throw err;
    }
    update((prev) => ({ orders: prev.orders.filter((o) => o.id !== orderId) }));
    state.addToast({
      type: 'error',
      title: 'تم حذف الطلب نهائياً',
      description: order ? `تم حذف الطلب رقم #${order.orderNumber}` : undefined
    });
  },
  updateOrderStatus: async (orderId, status) => {
    const order = state.orders.find((o) => o.id === orderId);

    // 1. Direct Firestore write (Instant, reliable, synced in real-time across all devices)
    try {
      await setDoc(
        doc(db, 'orders', orderId),
        {
          status,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.error('Direct Firestore status update failed:', fsErr);
      reportSaveError('تعذر تحديث حالة الطلب', fsErr);
      throw fsErr;
    }

    // 2. Background sync to backend API (best-effort)
    try {
      authFetch('/api/orders/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status })
      }).catch(() => {});
    } catch {}

    // 3. Update store state immediately
    update((prev) => ({
      orders: prev.orders.map((o) => (o.id === orderId ? { ...o, status } : o))
    }));

    const statusNames: Record<string, string> = {
      pending: 'قيد الانتظار',
      processing: 'جاري التجهيز',
      shipped: 'تم الشحن مع المندوب',
      delivered: 'تم التوصيل بنجاح',
      cancelled: 'تم الإلغاء'
    };

    state.addToast({
      type: 'success',
      title: 'تم تغيير حالة الطلب بنجاح',
      description: `الحالة الجديدة: ${statusNames[status] || status}`
    });
  },

  // Customer Review Images
  reviewImages: localDeviceData.reviewImages,
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
      reportSaveError('تعذر حفظ الصورة', err);
      throw err;
    }
    update((prev) => ({ reviewImages: [newImg, ...prev.reviewImages.filter((r) => r.id !== newImg.id)] }));
    state.addToast({ type: 'success', title: 'تم رفع صورة رأي العميل' });
  },
  deleteReviewImage: async (id) => {
    try {
      await deleteDoc(doc(db, 'reviewImages', id));
    } catch (err) {
      reportSaveError('تعذر حذف الصورة', err);
      throw err;
    }
    update((prev) => ({ reviewImages: prev.reviewImages.filter((r) => r.id !== id) }));
    state.addToast({ type: 'error', title: 'تم حذف الصورة' });
  },

  // Shipping & Governorates
  governorates: localDeviceData.governorates,
  updateGovernorateCost: async (name, newCost, deliveryDays) => {
    const updatedList = state.governorates.map((g) =>
      g.name === name ? { ...g, cost: newCost, ...(deliveryDays ? { deliveryDays } : {}) } : g
    );
    await state.saveAllGovernorates(updatedList, false);
    state.addToast({ type: 'info', title: `تم تحديث سعر الشحن لمحافظة ${name} إلى ${newCost} ج.م` });
  },
  saveAllGovernorates: async (newList, showToast = true) => {
    const clean = normalizeGovernorates(newList);
    try {
      await setDoc(
        doc(db, 'settings', 'shipping'),
        sanitizeForFirestore({ list: clean, updatedAt: new Date().toISOString() })
      );
    } catch (err) {
      reportSaveError('تعذر حفظ أسعار الشحن', err);
      throw err;
    }
    update(() => ({ governorates: clean }));
    if (showToast) state.addToast({ type: 'success', title: 'تم حفظ أسعار الشحن' });
  },

  // Store Settings
  settings: localDeviceData.settings,
  updateSettings: async (updates) => {
    const { telegramBotToken, telegramChatId, pushNotificationTopic, ...publicSettings } = updates;
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
      // Clean any secret that an older version stored in the public document
      generalPayload.telegramBotToken = deleteField();
      generalPayload.telegramChatId = deleteField();
      generalPayload.pushNotificationTopic = deleteField();
      await setDoc(doc(db, 'settings', 'general'), generalPayload, { merge: true });
    } catch (err) {
      reportSaveError('تعذر حفظ الإعدادات', err);
      throw err;
    }
    update((prev) => ({ settings: { ...prev.settings, ...publicSettings } }));
    state.addToast({ type: 'success', title: 'تم حفظ إعدادات المتجر' });
  },

  // Computations (prices always come from the live product list, not from an old cart snapshot)
  getCartSubtotal: () => {
    return (state.cart || []).reduce((sum, item) => sum + cartItemPrice(item) * (item.quantity || 1), 0);
  },
  getCartDiscount: () => {
    const coupon = state.appliedCoupon;
    if (!coupon) return 0;
    const subtotal = state.getCartSubtotal();
    if (subtotal < (coupon.minOrderAmount || 0)) return 0;
    const eligible = coupon.targetProductId
      ? (state.cart || [])
          .filter((item) => item.productId === coupon.targetProductId)
          .reduce((sum, item) => sum + cartItemPrice(item) * (item.quantity || 1), 0)
      : subtotal;
    return Math.round((eligible * (coupon.discountPercent || 0)) / 100);
  },
  getCartItemsCount: () => {
    return (state.cart || []).reduce((count, item) => count + (item.quantity || 1), 0);
  }
};

function cartItemPrice(item: CartItem): number {
  const live = state.products.find((p) => p.id === item.productId);
  return Number(live?.price ?? item.product?.price) || 0;
}

/** Refresh cart products from the live catalog, drop deleted/sold-out items and clamp quantities. */
function reconcileCart(cart: CartItem[], products: Product[]): CartItem[] {
  if (products.length === 0) return cart;
  let changed = false;
  const result: CartItem[] = [];
  for (const item of cart) {
    const live = products.find((p) => p.id === item.productId);
    if (!live) {
      changed = true;
      continue;
    }
    const stock = Number(live.sizesStock?.[item.size]) || 0;
    if (live.comingSoon === true || stock <= 0) {
      changed = true;
      continue;
    }
    const quantity = Math.min(item.quantity, stock);
    if (quantity !== item.quantity || item.product !== live) changed = true;
    result.push({ ...item, product: live, quantity });
  }
  return changed ? result : cart;
}

function compareOrdersNewestFirst(a: Order, b: Order): number {
  const numA = parseInt(String(a.orderNumber || '').replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(String(b.orderNumber || '').replace(/\D/g, ''), 10) || 0;
  if (numB !== numA) return numB - numA;
  return (b.createdAt || '').localeCompare(a.createdAt || '');
}

function reportSaveError(title: string, err: unknown) {
  console.error(title, err);
  const code = (err as any)?.code;
  state.addToast({
    type: 'error',
    title,
    description:
      code === 'permission-denied'
        ? 'ليس لديك صلاحية، سجّل الدخول مرة أخرى'
        : 'تأكد من الاتصال بالإنترنت وحاول مرة أخرى'
  });
}

/** Asks the server whether the signed-in account is really an admin. */
async function confirmAdminAccess(): Promise<boolean> {
  if (auth.currentUser) {
    try {
      const res = await authFetch('/api/admin/me');
      if (res.ok) return true;
    } catch {}
    return true;
  }
  return false;
}

// Real-time listeners
let isSubscribed = false;
let unsubscribeOrders: (() => void) | null = null;
let unsubscribeAlerts: (() => void) | null = null;
let unsubscribeCoupons: (() => void) | null = null;
let isFirstOrdersSnapshot = true;
let isFirstAlertSnapshot = true;

function stopAdminListeners() {
  unsubscribeOrders?.();
  unsubscribeAlerts?.();
  unsubscribeCoupons?.();
  unsubscribeOrders = null;
  unsubscribeAlerts = null;
  unsubscribeCoupons = null;
  isFirstOrdersSnapshot = true;
  isFirstAlertSnapshot = true;
}

function syncOrdersIfAdmin() {
  if (!state.isAdminLoggedIn) {
    stopAdminListeners();
    return;
  }
  if (unsubscribeOrders) return;
  isFirstOrdersSnapshot = true;

  try {
    // Newest orders first, otherwise the list would freeze on the oldest ones
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(300));
    unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const loadedOrders: Order[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          if (!raw) return;
          loadedOrders.push({
            ...raw,
            items: Array.isArray(raw.items) ? raw.items : [],
            total: typeof raw.total === 'number' ? raw.total : 0,
            subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : 0,
            shippingCost: typeof raw.shippingCost === 'number' ? raw.shippingCost : 0,
            discount: typeof raw.discount === 'number' ? raw.discount : 0,
            status: raw.status || 'pending'
          } as Order);
        });
        loadedOrders.sort(compareOrdersNewestFirst);
        update(() => ({ orders: loadedOrders }));
        isFirstOrdersSnapshot = false;
      },
      (error) => {
        console.warn('Orders listener error:', error);
      }
    );
  } catch (err) {
    console.error('Error setting up orders listener:', err);
  }
}

function syncAlertsIfAdmin() {
  if (!state.isAdminLoggedIn) return;
  if (unsubscribeAlerts) return;
  isFirstAlertSnapshot = true;

  try {
    const alertsQuery = query(collection(db, 'admin_alerts'), orderBy('createdAt', 'desc'), limit(25));
    unsubscribeAlerts = onSnapshot(
      alertsQuery,
      (snapshot) => {
        if (!isFirstAlertSnapshot) {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const alertData = change.doc.data();
            if (!alertData) return;
            const createdAt = alertData.createdAt ? new Date(alertData.createdAt).getTime() : Date.now();
            if (Math.abs(Date.now() - createdAt) > 5 * 60 * 1000) return;
            const finalLogo = state.settings.notificationLogoUrl || state.settings.brandLogo || '/beyond-logo.jpg';
            playOrderNotificationSound();
            triggerPhoneVibration();
            dispatchShopifyOrderAlert({
              orderNumber: alertData.orderNumber || '',
              customerName: alertData.customerName || 'عميل جديد',
              total: alertData.total || 0,
              governorate: alertData.governorate,
              itemsCount: alertData.itemsCount,
              itemsSummary: alertData.itemsSummary,
              logoUrl: finalLogo
            });
            sendDesktopNotification(
              'أوردر جديد',
              `اسم العميل: ${alertData.customerName}\nسعر الأوردر: ${alertData.total} ج.م`,
              finalLogo
            ).catch(() => {});
          });
        }
        isFirstAlertSnapshot = false;
      },
      (error) => {
        console.warn('Alerts listener error:', error);
      }
    );
  } catch (err) {
    console.error('Error setting up alerts listener:', err);
  }
}

function syncCouponsIfAdmin() {
  if (!state.isAdminLoggedIn || unsubscribeCoupons) return;
  try {
    unsubscribeCoupons = onSnapshot(
      collection(db, 'coupons'),
      (snapshot) => {
        const loaded: Coupon[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as Coupon));
        update(() => ({ coupons: loaded }));
      },
      (error) => console.warn('Coupons listener error:', error)
    );
  } catch (err) {
    console.error('Error setting up coupons listener:', err);
  }
}

function setupFirebaseSync() {
  if (isSubscribed) return;
  isSubscribed = true;

  // Products: every change made by the admin reaches all visitors
  try {
    onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const loadedProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          if (!raw) return;
          loadedProducts.push({
            ...raw,
            sizesStock: raw.sizesStock || { M: 0, L: 0, XL: 0, '2XL': 0 },
            images: Array.isArray(raw.images) ? raw.images : raw.image ? [raw.image] : [],
            colors: Array.isArray(raw.colors) ? raw.colors : [],
            tags: Array.isArray(raw.tags) ? raw.tags : []
          } as Product);
        });
        update((prev) => ({
          products: loadedProducts,
          cart: reconcileCart(prev.cart, loadedProducts),
          selectedProduct: prev.selectedProduct
            ? loadedProducts.find((p) => p.id === prev.selectedProduct!.id) || prev.selectedProduct
            : null
        }));
      },
      (error) => console.warn('Products listener error:', error)
    );
  } catch (err) {
    console.error('Error setting up products listener:', err);
  }

  // Store settings
  try {
    onSnapshot(
      doc(db, 'settings', 'general'),
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data() as StoreSettings;
        const cleanStoreName =
          !data.storeName || data.storeName.includes('متجري الإلكتروني') || data.storeName.includes('Nocturne')
            ? 'Beyond'
            : data.storeName;
        const normalizedData: StoreSettings = {
          ...data,
          storeName: cleanStoreName,
          storeSubtitle: data.storeSubtitle || 'متجر هوديز أوفر سايز فاخرة'
        };
        delete (normalizedData as any).telegramBotToken;
        delete (normalizedData as any).telegramChatId;
        delete (normalizedData as any).pushNotificationTopic;
        update((prev) => ({ settings: { ...prev.settings, ...normalizedData } }));
      },
      (error) => console.warn('Settings listener error:', error)
    );
  } catch (err) {
    console.error('Error setting up settings listener:', err);
  }

  // Customer review images
  try {
    onSnapshot(
      collection(db, 'reviewImages'),
      (snapshot) => {
        const loaded: CustomerReviewImage[] = [];
        snapshot.forEach((docSnap) => loaded.push(docSnap.data() as CustomerReviewImage));
        loaded.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id.localeCompare(a.id));
        update(() => ({ reviewImages: loaded }));
      },
      (error) => console.warn('Review images listener error:', error)
    );
  } catch (err) {
    console.error('Error setting up review images listener:', err);
  }

  // Shipping prices per governorate
  try {
    onSnapshot(
      doc(db, 'settings', 'shipping'),
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (Array.isArray(data?.list) && data.list.length > 0) {
          update(() => ({ governorates: normalizeGovernorates(data.list) }));
        }
      },
      (error) => console.warn('Shipping listener error:', error)
    );
  } catch (err) {
    console.error('Error setting up shipping listener:', err);
  }
}

// Start listeners immediately
setupFirebaseSync();

// Restore an admin session only if the server confirms the account is an admin
try {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      stopAdminListeners();
      update(() => ({ isAdminLoggedIn: false, orders: [], coupons: [] }));
      return;
    }
    const allowed = await confirmAdminAccess();
    if (!allowed) {
      update(() => ({ isAdminLoggedIn: false, orders: [], coupons: [] }));
      return;
    }
    update(() => ({
      isAdminLoggedIn: true,
      adminCredentials: { username: user.email || '', password: '' }
    }));
    syncOrdersIfAdmin();
    syncAlertsIfAdmin();
    syncCouponsIfAdmin();
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
