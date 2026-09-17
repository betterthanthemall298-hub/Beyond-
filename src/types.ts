export type HoodieSize = 'M' | 'L' | 'XL' | '2XL';

export type HoodieCategory = 'oversized' | 'basic' | 'zipup';

export interface ProductColor {
  name: string;
  hex: string;
}

export interface SizeMeasurement {
  length: number; // الطول بالسنتيمتر
  width: number;  // العرض بالسنتيمتر
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  category: HoodieCategory;
  price: number;
  originalPrice?: number;
  description: string;
  fabric?: string;
  fit: string; // القصة أو النوع يكتبه المسؤول
  weightRange?: string;
  careInstructions?: string;
  sizesStock: Record<HoodieSize, number>;
  sizeMeasurements?: Partial<Record<HoodieSize, SizeMeasurement>>;
  colors: ProductColor[];
  images: string[];
  isFeatured: boolean;
  rating: number;
  reviewsCount: number;
  badge?: string;
}

export interface CartItem {
  id: string; // unique item id in cart (productId + size + color)
  productId: string;
  product: Product;
  size: HoodieSize;
  colorName?: string;
  colorHex?: string;
  quantity: number;
  addedAt: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: string;
  productName: string;
  image: string;
  size: HoodieSize;
  colorName?: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "ORD-7821"
  customerName: string;
  phone: string;
  alternatePhone?: string;
  governorate: string;
  center?: string; // المركز / المدينة
  address: string; // العنوان بالتفصيل
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  couponCode?: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

// Review is image-only as requested by the user
export interface CustomerReviewImage {
  id: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  minOrderAmount: number;
  timesUsed: number;
}

export interface GovernorateShipping {
  name: string;
  cost: number;
  deliveryDays?: string;
}

export interface StoreSettings {
  storeName: string;
  storeSubtitle: string;
  announcementText: string;
  brandLogo?: string;
  whatsappNumber: string;
  whatsappUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  freeShippingThreshold: number;
}

export type ActiveView = 'home' | 'catalog' | 'tracking' | 'reviews' | 'admin' | 'cart' | 'product' | 'wishlist';
