import { useSyncExternalStore } from 'react';
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
  ActiveView
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_REVIEW_IMAGES,
  INITIAL_COUPONS,
  INITIAL_ORDERS,
  INITIAL_SETTINGS,
  INITIAL_GOVERNORATES
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

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'rating' | 'reviewsCount'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Cart
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

  // Wishlist
  wishlist: string[]; // product IDs
  toggleWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;

  // Coupons
  coupons: Coupon[];
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeAppliedCoupon: () => void;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'timesUsed'>) => void;
  deleteCoupon: (id: string) => void;
  toggleCouponActive: (id: string) => void;

  // Orders
  orders: Order[];
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => Order;
  cancelOrder: (orderId: string) => void;
  deleteOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;

  // Review Images (Images only as requested by user)
  reviewImages: CustomerReviewImage[];
  addReviewImage: (imageUrl: string, caption?: string) => void;
  deleteReviewImage: (id: string) => void;

  // Shipping & Governorates
  governorates: GovernorateShipping[];
  updateGovernorateCost: (name: string, newCost: number) => void;

  // Store Settings (including Instagram, WhatsApp, TikTok, Facebook links)
  settings: StoreSettings;
  updateSettings: (updates: Partial<StoreSettings>) => void;

  // Computed / Helpers
  getCartSubtotal: () => number;
  getCartDiscount: () => number;
  getCartItemsCount: () => number;
}

const STORAGE_KEY = 'nocturne_hoodies_storage_v3';

function loadPersistedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load local storage:', e);
    return {};
  }
}

function savePersistedData(s: StoreState) {
  try {
    const dataToSave = {
      cart: s.cart,
      wishlist: s.wishlist,
      products: s.products,
      orders: s.orders,
      coupons: s.coupons,
      reviewImages: s.reviewImages,
      governorates: s.governorates,
      settings: s.settings,
      appliedCoupon: s.appliedCoupon
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e) {
    console.error('Failed to save to local storage:', e);
  }
}

const persisted = loadPersistedData();
const listeners = new Set<() => void>();

function notify() {
  savePersistedData(state);
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

  // Products
  products: persisted.products || INITIAL_PRODUCTS,
  addProduct: (productData) => {
    const newProduct: Product = {
      ...productData,
      id: 'h-' + Date.now().toString(36),
      rating: 5.0,
      reviewsCount: 1
    };
    update((prev) => ({ products: [newProduct, ...prev.products] }));
    state.addToast({
      type: 'success',
      title: 'تمت إضافة الهودي بنجاح',
      description: newProduct.name
    });
  },
  updateProduct: (id, updates) => {
    update((prev) => ({
      products: prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      selectedProduct:
        prev.selectedProduct?.id === id
          ? { ...prev.selectedProduct, ...updates }
          : prev.selectedProduct
    }));
    state.addToast({
      type: 'info',
      title: 'تم تحديث بيانات الهودي بنجاح'
    });
  },
  deleteProduct: (id) => {
    const prod = state.products.find((p) => p.id === id);
    update((prev) => ({
      products: prev.products.filter((p) => p.id !== id),
      cart: prev.cart.filter((c) => c.productId !== id),
      wishlist: prev.wishlist.filter((wId) => wId !== id),
      selectedProduct: prev.selectedProduct?.id === id ? null : prev.selectedProduct
    }));
    state.addToast({
      type: 'error',
      title: 'تم حذف الهودي بنجاح',
      description: prod?.name || 'تم الحذف من المتجر'
    });
  },

  // Cart
  cart: persisted.cart || [],
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
  wishlist: persisted.wishlist || ['h-nocturne-charcoal', 'h-desert-sand'],
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
      description: product?.name || 'تم إزالة الهودي من قائمتك'
    });
  },

  // Coupons
  coupons: persisted.coupons || INITIAL_COUPONS,
  appliedCoupon: persisted.appliedCoupon || null,
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
  addCoupon: (couponData) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: 'coup-' + Date.now().toString(36),
      timesUsed: 0
    };
    update((prev) => ({ coupons: [newCoupon, ...prev.coupons] }));
    state.addToast({
      type: 'success',
      title: 'تم إنشاء كود الخصم بنجاح',
      description: newCoupon.code
    });
  },
  deleteCoupon: (id) => {
    const coup = state.coupons.find((c) => c.id === id);
    update((prev) => ({
      coupons: prev.coupons.filter((c) => c.id !== id),
      appliedCoupon: prev.appliedCoupon?.id === id ? null : prev.appliedCoupon
    }));
    state.addToast({
      type: 'error',
      title: 'تم حذف كود الخصم بنجاح',
      description: coup?.code
    });
  },
  toggleCouponActive: (id) => {
    update((prev) => ({
      coupons: prev.coupons.map((c) =>
        c.id === id ? { ...c, active: !c.active } : c
      )
    }));
  },

  // Orders
  orders: persisted.orders || INITIAL_ORDERS,
  createOrder: (orderData) => {
    // Sequential order numbering starting from 1
    const nextOrderNum = (state.orders.length + 1).toString();
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newOrder: Order = {
      ...orderData,
      id: 'ord-' + Date.now(),
      orderNumber: nextOrderNum,
      createdAt: dateStr,
      status: 'pending'
    };

    update((prev) => ({
      orders: [newOrder, ...prev.orders],
      cart: [],
      appliedCoupon: null,
      isCheckoutOpen: false
    }));

    state.addToast({
      type: 'success',
      title: 'تم تأكيد طلبك بنجاح! 🎉',
      description: `رقم الطلب الخاص بك: #${nextOrderNum}`
    });

    return newOrder;
  },
  cancelOrder: (orderId) => {
    const order = state.orders.find((o) => o.id === orderId);
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
  deleteOrder: (orderId) => {
    const order = state.orders.find((o) => o.id === orderId);
    update((prev) => ({
      orders: prev.orders.filter((o) => o.id !== orderId)
    }));
    state.addToast({
      type: 'error',
      title: 'تم حذف الطلب نهائياً من السجلات',
      description: order?.orderNumber || 'تم الحذف'
    });
  },
  updateOrderStatus: (orderId, status) => {
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

  // Customer Review Images (Images only)
  reviewImages: persisted.reviewImages || INITIAL_REVIEW_IMAGES,
  addReviewImage: (imageUrl, caption) => {
    const newImg: CustomerReviewImage = {
      id: 'rev-img-' + Date.now(),
      imageUrl,
      caption: caption || 'صورة من تجربة ومعاينة عميل',
      createdAt: new Date().toISOString().substring(0, 10)
    };
    update((prev) => ({ reviewImages: [newImg, ...prev.reviewImages] }));
    state.addToast({
      type: 'success',
      title: 'تم رفع صورة رأي العميل بنجاح'
    });
  },
  deleteReviewImage: (id) => {
    update((prev) => ({
      reviewImages: prev.reviewImages.filter((r) => r.id !== id)
    }));
    state.addToast({
      type: 'error',
      title: 'تم حذف صورة الرأي بنجاح'
    });
  },

  // Shipping & Governorates
  governorates: persisted.governorates || INITIAL_GOVERNORATES,
  updateGovernorateCost: (name, newCost) => {
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

  // Store Settings (with social media URLs)
  settings: persisted.settings || INITIAL_SETTINGS,
  updateSettings: (updates) => {
    update((prev) => ({
      settings: { ...prev.settings, ...updates }
    }));
    state.addToast({
      type: 'success',
      title: 'تم حفظ إعدادات وروابط المتجر بنجاح'
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
