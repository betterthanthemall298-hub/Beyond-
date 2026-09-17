import { useSyncExternalStore } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, testFirebaseConnection } from '../lib/firebase';
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
  cancelOrder: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;

  // Review Images (synced with Firebase Firestore)
  reviewImages: CustomerReviewImage[];
  addReviewImage: (imageUrl: string, caption?: string) => Promise<void>;
  deleteReviewImage: (id: string) => Promise<void>;

  // Shipping & Governorates (synced with Firebase Firestore)
  governorates: GovernorateShipping[];
  updateGovernorateCost: (name: string, newCost: number) => Promise<void>;

  // Store Settings (synced with Firebase Firestore)
  settings: StoreSettings;
  updateSettings: (updates: Partial<StoreSettings>) => Promise<void>;

  // Admin Authentication & Credentials (synced with Firebase Firestore)
  adminCredentials: AdminCredentials;
  updateAdminCredentials: (newUsername: string, newPassword: string) => Promise<boolean>;
  verifyAdminLogin: (usernameInput: string, passwordInput: string) => boolean;

  // Cloud status
  isFirebaseConnected: boolean;

  // Computed / Helpers
  getCartSubtotal: () => number;
  getCartDiscount: () => number;
  getCartItemsCount: () => number;
}

const STORAGE_KEY_V4 = 'nocturne_hoodies_storage_v4_clean';

function loadLocalDeviceData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V4);
    if (!raw) return { cart: [], wishlist: [] };
    const parsed = JSON.parse(raw);
    return {
      cart: parsed.cart || [],
      wishlist: parsed.wishlist || []
    };
  } catch (e) {
    console.error('Failed to load local storage:', e);
    return { cart: [], wishlist: [] };
  }
}

function saveLocalDeviceData(s: StoreState) {
  try {
    const dataToSave = {
      cart: s.cart,
      wishlist: s.wishlist
    };
    localStorage.setItem(STORAGE_KEY_V4, JSON.stringify(dataToSave));
  } catch (e) {
    console.error('Failed to save to local storage:', e);
  }
}

const localDeviceData = loadLocalDeviceData();
const listeners = new Set<() => void>();

function notify() {
  saveLocalDeviceData(state);
  listeners.forEach((listener) => listener());
}

function update(fn: (prev: StoreState) => Partial<StoreState>) {
  const updates = fn(state);
  state = { ...state, ...updates };
  notify();
}

let state: StoreState = {
  activeView: 'home',
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
  setIsCheckoutOpen: (open) => update(() => ({ isCheckoutOpen: open })),
  isAdminLoggedIn: false,
  setIsAdminLoggedIn: (logged) => update(() => ({ isAdminLoggedIn: logged })),

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

  // Admin Credentials (default: admin / admin123 until changed by owner)
  adminCredentials: {
    username: 'admin',
    password: 'admin123'
  },
  updateAdminCredentials: async (newUsername, newPassword) => {
    try {
      const cleanUser = newUsername.trim();
      const cleanPass = newPassword.trim();
      if (!cleanUser || !cleanPass) {
        state.addToast({
          type: 'error',
          title: 'خطأ',
          description: 'يجب إدخال اسم مستخدم وكلمة مرور صالحة'
        });
        return false;
      }
      await setDoc(doc(db, 'admin_auth', 'credentials'), {
        username: cleanUser,
        password: cleanPass,
        updatedAt: new Date().toISOString()
      });
      update(() => ({
        adminCredentials: {
          username: cleanUser,
          password: cleanPass,
          updatedAt: new Date().toISOString()
        }
      }));
      state.addToast({
        type: 'success',
        title: 'تم تحديث بيانات الدخول بنجاح',
        description: 'يمكنك الآن تسجيل الدخول بالبيانات الجديدة من أي جهاز'
      });
      return true;
    } catch (err) {
      console.error('Failed to update admin credentials in Firestore:', err);
      state.addToast({
        type: 'error',
        title: 'تعذر الحفظ السحابي',
        description: 'يرجى المحاولة مرة أخرى'
      });
      return false;
    }
  },
  verifyAdminLogin: (userInput, passInput) => {
    const cleanUser = userInput.trim();
    const cleanPass = passInput.trim();
    const creds = state.adminCredentials;
    if (cleanUser === creds.username && cleanPass === creds.password) {
      update(() => ({ isAdminLoggedIn: true }));
      state.addToast({
        type: 'success',
        title: 'مرحباً بك في لوحة الإدارة',
        description: `تم تسجيل الدخول بنجاح كـ ${creds.username}`
      });
      return true;
    }
    return false;
  },

  // Products (initially empty clean list)
  products: INITIAL_PRODUCTS,
  addProduct: async (productData) => {
    const newProduct: Product = {
      ...productData,
      id: 'h-' + Date.now().toString(36),
      rating: 5.0,
      reviewsCount: 1
    };
    try {
      await setDoc(doc(db, 'products', newProduct.id), newProduct);
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
        title: 'تمت الإضافة محلياً (سيتم المزامنة تلقائياً)',
        description: newProduct.name
      });
    }
  },
  updateProduct: async (id, updates) => {
    try {
      await updateDoc(doc(db, 'products', id), updates);
      update((prev) => ({
        products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        selectedProduct:
          prev.selectedProduct?.id === id
            ? { ...prev.selectedProduct, ...updates }
            : prev.selectedProduct
      }));
      state.addToast({
        type: 'info',
        title: 'تم تحديث بيانات المنتج ومزامنتها'
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
    const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0] : undefined;
    const finalColorName = colorName || defaultColor?.name;
    const finalColorHex = colorHex || defaultColor?.hex;

    const cartItemId = `${product.id}-${size}-${finalColorName || 'default'}`;
    const existingIndex = state.cart.findIndex((item) => item.id === cartItemId);

    if (existingIndex > -1) {
      update((prev) => {
        const updated = [...prev.cart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return { cart: updated };
      });
    } else {
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
  },
  updateCartQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      state.removeFromCart(itemId);
      return;
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
  coupons: INITIAL_COUPONS,
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
      await setDoc(doc(db, 'coupons', newCoupon.id), newCoupon);
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
    const nextOrderNum = (state.orders.length + 1).toString();
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newOrder: Order = {
      ...orderData,
      id: 'ord-' + Date.now(),
      orderNumber: nextOrderNum,
      createdAt: dateStr,
      status: 'pending'
    };

    try {
      // Write to Firebase Firestore cloud database
      await setDoc(doc(db, 'orders', newOrder.id), newOrder);
    } catch (err) {
      console.error('Failed to save order to Firestore:', err);
    }

    update((prev) => ({
      orders: [newOrder, ...prev.orders.filter((o) => o.id !== newOrder.id)],
      cart: [],
      appliedCoupon: null,
      isCheckoutOpen: false
    }));

    state.addToast({
      type: 'success',
      title: 'تم تأكيد طلبك ومزامنته سحابياً! 🎉',
      description: `رقم الطلب الخاص بك: #${nextOrderNum}`
    });

    return newOrder;
  },
  cancelOrder: async (orderId) => {
    const order = state.orders.find((o) => o.id === orderId);
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled' });
    } catch (err) {
      console.error('Failed to cancel order in Firestore:', err);
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
      console.error('Failed to delete order from Firestore:', err);
    }
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
      console.error('Failed to update order status in Firestore:', err);
    }
    update((prev) => ({
      orders: prev.orders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      )
    }));
    state.addToast({
      type: 'info',
      title: 'تم تحديث ومزامنة حالة الطلب سحابياً'
    });
  },

  // Customer Review Images
  reviewImages: INITIAL_REVIEW_IMAGES,
  addReviewImage: async (imageUrl, caption) => {
    const newImg: CustomerReviewImage = {
      id: 'rev-img-' + Date.now(),
      imageUrl,
      caption: caption || 'صورة من تجربة ومعاينة عميل',
      createdAt: new Date().toISOString().substring(0, 10)
    };
    try {
      await setDoc(doc(db, 'reviewImages', newImg.id), newImg);
    } catch (err) {
      console.error('Failed to save review image:', err);
    }
    update((prev) => ({ reviewImages: [newImg, ...prev.reviewImages] }));
    state.addToast({
      type: 'success',
      title: 'تم رفع صورة رأي العميل ومزامنتها بنجاح'
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
  governorates: INITIAL_GOVERNORATES,
  updateGovernorateCost: async (name, newCost) => {
    try {
      await setDoc(doc(db, 'governorates', name), { name, cost: newCost });
    } catch (err) {
      console.error('Failed to update governorate cost:', err);
    }
    update((prev) => ({
      governorates: prev.governorates.map((g) =>
        g.name === name ? { ...g, cost: newCost } : g
      )
    }));
    state.addToast({
      type: 'info',
      title: `تم تحديث سعر الشحن لمحافظة ${name} إلى ${newCost} ج.م`
    });
  },

  // Store Settings
  settings: INITIAL_SETTINGS,
  updateSettings: async (updates) => {
    try {
      await setDoc(doc(db, 'settings', 'general'), updates, { merge: true });
    } catch (err) {
      console.error('Failed to update settings in Firestore:', err);
    }
    update((prev) => ({
      settings: { ...prev.settings, ...updates }
    }));
    state.addToast({
      type: 'success',
      title: 'تم حفظ وتحديث إعدادات المتجر سحابياً للجميع'
    });
  },

  // Computations
  getCartSubtotal: () => {
    return state.cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  },
  getCartDiscount: () => {
    const coupon = state.appliedCoupon;
    if (!coupon) return 0;
    const subtotal = state.getCartSubtotal();
    return Math.round((subtotal * coupon.discountPercent) / 100);
  },
  getCartItemsCount: () => {
    return state.cart.reduce((count, item) => count + item.quantity, 0);
  }
};

// Setup Firebase Real-Time Synchronization Listeners
let isSubscribed = false;

function setupFirebaseSync() {
  if (isSubscribed) return;
  isSubscribed = true;

  // Test connection
  testFirebaseConnection().catch(() => {});

  // 1. Orders Listener (Real-time updates across all devices)
  try {
    onSnapshot(collection(db, 'orders'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedOrders: Order[] = [];
        snapshot.forEach((docSnap) => {
          loadedOrders.push(docSnap.data() as Order);
        });
        // Sort descending by creation date or order number
        loadedOrders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        update(() => ({ orders: loadedOrders }));
      } else {
        update(() => ({ orders: [] }));
      }
    }, (error) => {
      console.warn('Orders onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up orders listener:', err);
  }

  // 2. Products Listener (Any change made by admin appears to everyone)
  try {
    onSnapshot(collection(db, 'products'), (snapshot) => {
      if (!snapshot.empty) {
        const loadedProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          loadedProducts.push(docSnap.data() as Product);
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
        update((prev) => ({ settings: { ...prev.settings, ...data } }));
      }
    }, (error) => {
      console.warn('Settings onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up settings listener:', err);
  }

  // 4. Admin Credentials Listener
  try {
    onSnapshot(doc(db, 'admin_auth', 'credentials'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AdminCredentials;
        if (data.username && data.password) {
          update(() => ({ adminCredentials: data }));
        }
      }
    }, (error) => {
      console.warn('Admin credentials onSnapshot error:', error);
    });
  } catch (err) {
    console.error('Error setting up admin credentials listener:', err);
  }

  // 5. Coupons Listener
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
}

// Start listeners immediately
setupFirebaseSync();

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
