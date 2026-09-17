import {
  Product,
  CustomerReviewImage,
  Coupon,
  GovernorateShipping,
  StoreSettings,
  Order
} from '../types';

export const INITIAL_GOVERNORATES: GovernorateShipping[] = [
  { name: 'القاهرة', cost: 45 },
  { name: 'الجيزة', cost: 45 },
  { name: 'الإسكندرية', cost: 50 },
  { name: 'القليوبية', cost: 50 },
  { name: 'الشرقية', cost: 55 },
  { name: 'الدقهلية (المنصورة)', cost: 55 },
  { name: 'الغربية (طنطا)', cost: 55 },
  { name: 'المنوفية', cost: 55 },
  { name: 'دمياط', cost: 60 },
  { name: 'بورسعيد', cost: 60 },
  { name: 'الإسماعيلية', cost: 60 },
  { name: 'السويس', cost: 60 },
  { name: 'كفر الشيخ', cost: 60 },
  { name: 'البحيرة (دمنهور)', cost: 60 },
  { name: 'الفيوم', cost: 65 },
  { name: 'بني سويف', cost: 65 },
  { name: 'المنيا', cost: 70 },
  { name: 'أسيوط', cost: 70 },
  { name: 'سوهاج', cost: 75 },
  { name: 'قنا', cost: 80 },
  { name: 'الأقصر', cost: 80 },
  { name: 'أسوان', cost: 85 },
  { name: 'البحر الأحمر (الغردقة)', cost: 85 },
  { name: 'مرسى مطروح', cost: 85 },
  { name: 'الوادي الجديد', cost: 95 },
  { name: 'شمال سيناء', cost: 95 },
  { name: 'جنوب سيناء (شرم الشيخ)', cost: 95 }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'h-nocturne-signature',
    name: 'هودي نوكتورن أوفر سايز',
    subtitle: 'Nocturne Signature Oversized Hoodie',
    category: 'oversized',
    price: 890,
    originalPrice: 1150,
    description: 'هودي شتوي أنيق بقصة أوفر سايز مريحة بأكتاف ساقطة وغطاء رأس مزدوج مع جيب أمامي متين. تصميم عصري فاخر للاستخدام اليومي.',
    fit: 'أوفر سايز مريح (Dropped Shoulder)',
    weightRange: 'مناسب للأوزان من 60 حتى 115 كجم',
    careInstructions: 'غسيل آلي على البارد (30 درجة)، بدون مبيضات، الكي على ظهر القماش',
    sizesStock: { M: 18, L: 26, XL: 22, '2XL': 12 },
    sizeMeasurements: {
      M: { length: 72, width: 58 },
      L: { length: 75, width: 62 },
      XL: { length: 78, width: 66 },
      '2XL': { length: 81, width: 70 }
    },
    colors: [
      { name: 'أسود كربوني', hex: '#141414' },
      { name: 'رمادي غامق', hex: '#374151' },
      { name: 'زيتي مدخن', hex: '#2f3b2d' },
      { name: 'بيج رملي', hex: '#d6c7b2' },
      { name: 'كحلي داكن', hex: '#1e293b' }
    ],
    images: [
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=1000&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=1000&auto=format&fit=crop'
    ],
    isFeatured: true,
    rating: 4.9,
    reviewsCount: 142,
    badge: 'الأكثر طلباً'
  }
];

// Initial Customer Review Images (Images only as requested by the user)
export const INITIAL_REVIEW_IMAGES: CustomerReviewImage[] = [
  {
    id: 'rev-img-1',
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop',
    caption: 'معاينة هودي الأسود الكربوني بعد الاستلام',
    createdAt: '2026-09-12'
  },
  {
    id: 'rev-img-2',
    imageUrl: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=800&auto=format&fit=crop',
    caption: 'صورة من عميل بعد استلام الهودي الرملي في الإسكندرية',
    createdAt: '2026-09-13'
  },
  {
    id: 'rev-img-3',
    imageUrl: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop',
    caption: 'صورة الهودي وتناسق القياسات والمقاس',
    createdAt: '2026-09-14'
  },
  {
    id: 'rev-img-4',
    imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=800&auto=format&fit=crop',
    caption: 'صورة الطلب بعد الاستلام في القاهرة',
    createdAt: '2026-09-15'
  }
];

export const INITIAL_COUPONS: Coupon[] = [
  {
    id: 'c-winter20',
    code: 'WINTER20',
    discountPercent: 20,
    active: true,
    minOrderAmount: 700,
    timesUsed: 64
  },
  {
    id: 'c-nocturne15',
    code: 'NOCTURNE15',
    discountPercent: 15,
    active: true,
    minOrderAmount: 500,
    timesUsed: 112
  },
  {
    id: 'c-freehoodie',
    code: 'VIP10',
    discountPercent: 10,
    active: true,
    minOrderAmount: 400,
    timesUsed: 43
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-101',
    orderNumber: '1',
    customerName: 'كريم أحمد الشرقاوي',
    phone: '01012345678',
    governorate: 'القاهرة',
    center: 'مدينة نصر',
    address: 'الحي السابع - عمارة 14 - الدور 4 شقة 8',
    notes: 'برجاء الاتصال قبل الميعاد بساعة',
    items: [
      {
        productId: 'h-nocturne-signature',
        productName: 'هودي نوكتورن أوفر سايز',
        image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000&auto=format&fit=crop',
        size: 'L',
        colorName: 'أسود كربوني',
        price: 890,
        quantity: 1
      }
    ],
    subtotal: 890,
    shippingCost: 45,
    discount: 178,
    couponCode: 'WINTER20',
    total: 757,
    status: 'processing',
    createdAt: '2026-09-15 13:20'
  },
  {
    id: 'ord-102',
    orderNumber: '2',
    customerName: 'محمود سامي خليل',
    phone: '01234567890',
    governorate: 'الإسكندرية',
    center: 'قسم سيدي جابر / سموحة',
    address: 'ش فوزي معاذ - برج السلام',
    items: [
      {
        productId: 'h-nocturne-signature',
        productName: 'هودي نوكتورن أوفر سايز',
        image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=1000&auto=format&fit=crop',
        size: 'XL',
        colorName: 'بيج رملي',
        price: 890,
        quantity: 1
      }
    ],
    subtotal: 890,
    shippingCost: 50,
    discount: 0,
    total: 940,
    status: 'pending',
    createdAt: '2026-09-16 10:45'
  }
];

export const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'نوكتورن هوديز | Nocturne Hoodies',
  storeSubtitle: 'هوديز أوفر سايز - راحة وأناقة عصرية',
  announcementText: 'شحن لجميع المحافظات | كود الخصم: WINTER20 | الدفع عند الاستلام مع حق المعاينة',
  brandLogo: '',
  whatsappNumber: '201012345678',
  whatsappUrl: 'https://wa.me/201012345678',
  instagramUrl: 'https://instagram.com/nocturne.hoodies',
  tiktokUrl: 'https://tiktok.com/@nocturne.hoodies',
  facebookUrl: 'https://facebook.com/nocturne.hoodies',
  freeShippingThreshold: 2000
};
