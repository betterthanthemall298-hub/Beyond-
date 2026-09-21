import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  Lock,
  LogOut,
  Package,
  ShoppingBag,
  Tag,
  MessageCircle,
  Truck,
  Settings,
  Trash2,
  Plus,
  Check,
  Upload,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
  X,
  Instagram,
  Facebook,
  Pencil,
  Palette,
  Search,
  Download,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Ban,
  Eye,
  Maximize2
} from 'lucide-react';
import { HoodieCategory, HoodieSize, OrderStatus, Product, ProductColor, OrderItem } from '../types';
import { compressImageFile } from '../lib/imageCompressor';
import {
  exportOrdersToCSV,
  exportOrdersByStatus,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_FILE_NAMES
} from '../lib/orderExporter';
import {
  playOrderNotificationSound,
  isSoundNotificationEnabled,
  setSoundNotificationEnabled,
  requestNotificationPermission,
  getNotificationPermission,
  testPhoneNotification
} from '../lib/notifications';

export const AdminDashboard: React.FC = () => {
  const {
    isAdminLoggedIn,
    setIsAdminLoggedIn,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    orders,
    updateOrderStatus,
    deleteOrder,
    coupons,
    addCoupon,
    deleteCoupon,
    toggleCouponActive,
    reviewImages,
    addReviewImage,
    deleteReviewImage,
    governorates,
    updateGovernorateCost,
    settings,
    updateSettings,
    openDeleteModal,
    adminCredentials,
    updateAdminCredentials,
    verifyAdminLogin,
    seedSampleProduct,
    isFirebaseConnected
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    'products' | 'orders' | 'coupons' | 'reviews' | 'shipping' | 'settings' | 'security'
  >('products');

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Change Credentials States
  const [newUsername, setNewUsername] = useState(adminCredentials.username);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [isUpdatingCreds, setIsUpdatingCreds] = useState(false);

  // Order Search State
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Order Item Inspection Modal (for verifying image, color, size, and print)
  const [inspectingOrderItem, setInspectingOrderItem] = useState<{
    item: OrderItem;
    orderNumber: string;
    customerName: string;
    orderDate: string;
  } | null>(null);
  const [inspectingImageIndex, setInspectingImageIndex] = useState(0);

  // Image Processing & Product Submitting States
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Add Product Form States
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pName, setPName] = useState('');
  const [pSubtitle, setPSubtitle] = useState('');
  const [pCategory, setPCategory] = useState<HoodieCategory>('oversized');
  const [pPrice, setPPrice] = useState<number | string>(890);
  const [pOriginalPrice, setPOriginalPrice] = useState<number | string>('');
  const [pDescription, setPDescription] = useState('');
  const [pFabric, setPFabric] = useState('ميلتون قطن مصري 100% مبطن - وزن 450 جرام');
  const [pFit, setPFit] = useState('أوفر سايز واسع ومريح (Dropped Shoulder)');
  const [pWeightRange, setPWeightRange] = useState('مناسب للأوزان من 60 حتى 110 كجم');
  const [pCare, setPCare] = useState('غسيل على البارد بدون مبيضات، كوي على ظهر القماش');
  const [pStockM, setPStockM] = useState(15);
  const [pStockL, setPStockL] = useState(25);
  const [pStockXL, setPStockXL] = useState(20);
  const [pStock2XL, setPStock2XL] = useState(10);
  // Size measurements (length/width in cm)
  const [pLengthM, setPLengthM] = useState<number | string>(72);
  const [pWidthM, setPWidthM] = useState<number | string>(62);
  const [pLengthL, setPLengthL] = useState<number | string>(74);
  const [pWidthL, setPWidthL] = useState<number | string>(65);
  const [pLengthXL, setPLengthXL] = useState<number | string>(76);
  const [pWidthXL, setPWidthXL] = useState<number | string>(68);
  const [pLength2XL, setPLength2XL] = useState<number | string>(78);
  const [pWidth2XL, setPWidth2XL] = useState<number | string>(72);
  // Add Product Colors
  const [pColors, setPColors] = useState<ProductColor[]>([
    { name: 'أسود كربوني', hex: '#171717' },
    { name: 'رمادي غامق', hex: '#374151' }
  ]);
  const [pNewColorName, setPNewColorName] = useState('');
  const [pNewColorHex, setPNewColorHex] = useState('#171717');
  const [uploadedProductImages, setUploadedProductImages] = useState<string[]>([]);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  // Edit Product States
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editCategory, setEditCategory] = useState<HoodieCategory>('oversized');
  const [editPrice, setEditPrice] = useState<number | string>(0);
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | string>('');
  const [editDescription, setEditDescription] = useState('');
  const [editFabric, setEditFabric] = useState('');
  const [editFit, setEditFit] = useState('');
  const [editWeightRange, setEditWeightRange] = useState('');
  const [editCare, setEditCare] = useState('');
  const [editBadge, setEditBadge] = useState('');
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editStockM, setEditStockM] = useState<number>(0);
  const [editStockL, setEditStockL] = useState<number>(0);
  const [editStockXL, setEditStockXL] = useState<number>(0);
  const [editStock2XL, setEditStock2XL] = useState<number>(0);
  // Edit size measurements
  const [editLengthM, setEditLengthM] = useState<number | string>(72);
  const [editWidthM, setEditWidthM] = useState<number | string>(62);
  const [editLengthL, setEditLengthL] = useState<number | string>(74);
  const [editWidthL, setEditWidthL] = useState<number | string>(65);
  const [editLengthXL, setEditLengthXL] = useState<number | string>(76);
  const [editWidthXL, setEditWidthXL] = useState<number | string>(68);
  const [editLength2XL, setEditLength2XL] = useState<number | string>(78);
  const [editWidth2XL, setEditWidth2XL] = useState<number | string>(72);
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editColors, setEditColors] = useState<ProductColor[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#171717');
  const editProductFileInputRef = useRef<HTMLInputElement>(null);

  // Review Image Upload States
  const [reviewCaption, setReviewCaption] = useState('');
  const reviewFileInputRef = useRef<HTMLInputElement>(null);

  // Add Coupon Form States
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [cCode, setCCode] = useState('');
  const [cDiscount, setCDiscount] = useState(15);
  const [cMinOrder, setCMinOrder] = useState(600);
  const [cTargetScope, setCTargetScope] = useState<'all' | 'specific'>('all');
  const [cTargetProductId, setCTargetProductId] = useState<string>('');

  // Orders Classification & Notification States
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [soundNotificationOn, setSoundNotificationOn] = useState<boolean>(isSoundNotificationEnabled());
  const [notificationPerm, setNotificationPerm] = useState<string>(getNotificationPermission());

  // Settings state
  const [storeName, setStoreName] = useState(settings.storeName);
  const [brandLogo, setBrandLogo] = useState(settings.brandLogo || '');
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [announcementText, setAnnouncementText] = useState(settings.announcementText);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [whatsappUrl, setWhatsappUrl] = useState(settings.whatsappUrl || '');
  const [instagramUrl, setInstagramUrl] = useState(settings.instagramUrl || '');
  const [tiktokUrl, setTiktokUrl] = useState(settings.tiktokUrl || '');
  const [facebookUrl, setFacebookUrl] = useState(settings.facebookUrl || '');

  // Synchronize form states when settings or credentials load/update from Firestore
  useEffect(() => {
    setStoreName(settings.storeName || '');
    setBrandLogo(settings.brandLogo || '');
    setAnnouncementText(settings.announcementText || '');
    setWhatsappNumber(settings.whatsappNumber || '');
    setWhatsappUrl(settings.whatsappUrl || '');
    setInstagramUrl(settings.instagramUrl || '');
    setTiktokUrl(settings.tiktokUrl || '');
    setFacebookUrl(settings.facebookUrl || '');
  }, [settings]);

  useEffect(() => {
    setNewUsername(adminCredentials.username || 'admin');
  }, [adminCredentials.username]);

  // Stats calculation
  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'processing'
  ).length;
  const totalStockCount = products.reduce((acc, p) => {
    return (
      acc +
      Object.values(p.sizesStock).reduce((s: number, v: number) => s + (v || 0), 0)
    );
  }, 0);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = verifyAdminLogin(username, password);
    if (success) {
      setLoginError('');
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات والمحاولة مجدداً.');
    }
  };

  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (!newUsername.trim()) {
      setSecurityError('يرجى كتابة اسم المستخدم الجديد');
      return;
    }
    if (!newPassword.trim()) {
      setSecurityError('يرجى كتابة كلمة المرور الجديدة');
      return;
    }
    if (newPassword.trim().length < 4) {
      setSecurityError('يجب ألا تقل كلمة المرور عن 4 أحرف');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setSecurityError('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    setIsUpdatingCreds(true);
    const success = await updateAdminCredentials(newUsername.trim(), newPassword.trim());
    setIsUpdatingCreds(false);

    if (success) {
      setSecuritySuccess('تم حفظ بيانات الدخول سحابياً بنجاح! يمكنك الآن استخدامها لتسجيل الدخول من أي جهاز.');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setSecurityError('حدث خطأ أثناء الحفظ السحابي، يرجى المحاولة مرة أخرى.');
    }
  };

  // Device file upload handler for product images
  const handleProductImageUploadFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImages(true);
    try {
      for (const file of Array.from(files) as File[]) {
        const compressed = await compressImageFile(file, 1200, 0.82);
        setUploadedProductImages((prev) => [...prev, compressed]);
      }
    } catch (err) {
      console.error('Failed to process product image:', err);
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const removeUploadedProductImage = (indexToRemove: number) => {
    setUploadedProductImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddPColor = () => {
    if (!pNewColorName.trim()) return;
    setPColors((prev) => [
      ...prev,
      { name: pNewColorName.trim(), hex: pNewColorHex || '#171717' }
    ]);
    setPNewColorName('');
    setPNewColorHex('#171717');
  };

  const handleRemovePColor = (indexToRemove: number) => {
    setPColors((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Device file upload handler for review screenshots
  const handleReviewImageUploadFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImages(true);
    try {
      for (const file of Array.from(files) as File[]) {
        const compressed = await compressImageFile(file, 1000, 0.82);
        await addReviewImage(compressed, reviewCaption.trim() || undefined);
        setReviewCaption('');
      }
    } catch (err) {
      console.error('Failed to process review image:', err);
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pDescription.trim()) return;

    setIsSavingProduct(true);
    try {
      const imagesToUse =
        uploadedProductImages.length > 0
          ? uploadedProductImages
          : ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=1000&auto=format&fit=crop'];

      const numOriginalPrice = pOriginalPrice !== '' && Number(pOriginalPrice) > 0 ? Number(pOriginalPrice) : undefined;

      await addProduct({
        name: pName.trim(),
        subtitle: pSubtitle.trim() || 'Nocturne Oversized Hoodie',
        category: pCategory,
        price: Number(pPrice),
        originalPrice: numOriginalPrice,
        description: pDescription.trim(),
        fabric: pFabric.trim(),
        fit: pFit.trim(),
        weightRange: pWeightRange.trim(),
        careInstructions: pCare.trim(),
        sizesStock: {
          M: Number(pStockM),
          L: Number(pStockL),
          XL: Number(pStockXL),
          '2XL': Number(pStock2XL)
        },
        sizeMeasurements: {
          M: { length: Number(pLengthM) || 72, width: Number(pWidthM) || 62 },
          L: { length: Number(pLengthL) || 74, width: Number(pWidthL) || 65 },
          XL: { length: Number(pLengthXL) || 76, width: Number(pWidthXL) || 68 },
          '2XL': { length: Number(pLength2XL) || 78, width: Number(pWidth2XL) || 72 }
        },
        colors: pColors.length > 0 ? pColors : [
          { name: 'أسود كربوني', hex: '#171717' }
        ],
        images: imagesToUse,
        isFeatured: true,
        badge: 'جديد'
      });

      setPName('');
      setPSubtitle('');
      setPDescription('');
      setPOriginalPrice('');
      setUploadedProductImages([]);
      setShowAddProduct(false);
    } catch (err) {
      console.error('Error saving product:', err);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleStartEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditSubtitle(product.subtitle || '');
    setEditCategory(product.category);
    setEditPrice(product.price);
    setEditOriginalPrice(product.originalPrice ? product.originalPrice : '');
    setEditDescription(product.description || '');
    setEditFabric(product.fabric || '');
    setEditFit(product.fit || '');
    setEditWeightRange(product.weightRange || '');
    setEditCare(product.careInstructions || '');
    setEditBadge(product.badge || '');
    setEditIsFeatured(Boolean(product.isFeatured));
    setEditStockM(product.sizesStock?.M ?? 0);
    setEditStockL(product.sizesStock?.L ?? 0);
    setEditStockXL(product.sizesStock?.XL ?? 0);
    setEditStock2XL(product.sizesStock?.['2XL'] ?? 0);
    // Measurements
    const m = product.sizeMeasurements || {};
    setEditLengthM(m.M?.length ?? 72);
    setEditWidthM(m.M?.width ?? 62);
    setEditLengthL(m.L?.length ?? 74);
    setEditWidthL(m.L?.width ?? 65);
    setEditLengthXL(m.XL?.length ?? 76);
    setEditWidthXL(m.XL?.width ?? 68);
    setEditLength2XL(m['2XL']?.length ?? 78);
    setEditWidth2XL(m['2XL']?.width ?? 72);

    setEditImages(product.images ? [...product.images] : []);
    setEditColors(product.colors ? [...product.colors] : []);
    setNewColorName('');
    setNewColorHex('#171717');
  };

  const handleEditProductImageUploadFromDevice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImages(true);
    try {
      for (const file of Array.from(files) as File[]) {
        const compressed = await compressImageFile(file, 1200, 0.82);
        setEditImages((prev) => [...prev, compressed]);
      }
    } catch (err) {
      console.error('Failed to process edit product image:', err);
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const removeEditImage = (indexToRemove: number) => {
    setEditImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddEditColor = () => {
    if (!newColorName.trim()) return;
    setEditColors((prev) => [
      ...prev,
      { name: newColorName.trim(), hex: newColorHex || '#171717' }
    ]);
    setNewColorName('');
    setNewColorHex('#171717');
  };

  const handleRemoveEditColor = (indexToRemove: number) => {
    setEditColors((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim()) return;

    setIsSavingProduct(true);
    try {
      const numOriginalPrice = editOriginalPrice !== '' && Number(editOriginalPrice) > 0 ? Number(editOriginalPrice) : undefined;

      await updateProduct(editingProduct.id, {
        name: editName.trim(),
        subtitle: editSubtitle.trim(),
        category: editCategory,
        price: Number(editPrice),
        originalPrice: numOriginalPrice,
        description: editDescription.trim(),
        fabric: editFabric.trim(),
        fit: editFit.trim(),
        weightRange: editWeightRange.trim(),
        careInstructions: editCare.trim(),
        badge: editBadge.trim() || undefined,
        isFeatured: editIsFeatured,
        sizesStock: {
          M: Number(editStockM),
          L: Number(editStockL),
          XL: Number(editStockXL),
          '2XL': Number(editStock2XL)
        },
        sizeMeasurements: {
          M: { length: Number(editLengthM) || 72, width: Number(editWidthM) || 62 },
          L: { length: Number(editLengthL) || 74, width: Number(editWidthL) || 65 },
          XL: { length: Number(editLengthXL) || 76, width: Number(editWidthXL) || 68 },
          '2XL': { length: Number(editLength2XL) || 78, width: Number(editWidth2XL) || 72 }
        },
        images: editImages.length > 0 ? editImages : editingProduct.images,
        colors: editColors.length > 0 ? editColors : editingProduct.colors
      });

      setEditingProduct(null);
    } catch (err) {
      console.error('Error saving product edit:', err);
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cCode.trim()) return;

    const targetProduct =
      cTargetScope === 'specific' && cTargetProductId
        ? products.find((p) => p.id === cTargetProductId)
        : null;

    addCoupon({
      code: cCode.trim().toUpperCase(),
      discountPercent: Number(cDiscount),
      active: true,
      minOrderAmount: Number(cMinOrder),
      targetProductId: targetProduct ? targetProduct.id : undefined,
      targetProductName: targetProduct ? targetProduct.name : undefined
    });

    setCCode('');
    setCTargetScope('all');
    setCTargetProductId('');
    setShowAddCoupon(false);
  };

  // Explicit Deletion Triggers with Confirmation Dialogs
  const handleDeleteProductPrompt = (productId: string, productName: string) => {
    openDeleteModal({
      title: 'حذف الهودي نهائياً من المتجر',
      description: 'هل أنت متأكد من حذف هذا الهودي نهائياً؟ سيتم إزالته من تشكيلة العرض وسلال العملاء.',
      itemLabel: productName,
      onConfirm: () => {
        deleteProduct(productId);
      }
    });
  };

  const handleDeleteOrderPrompt = (orderId: string, orderNumber: string) => {
    openDeleteModal({
      title: 'حذف سجل الطلب',
      description: 'هل أنت متأكد من حذف هذا الطلب نهائياً من سجلات المبيعات؟',
      itemLabel: `رقم الطلب: ${orderNumber}`,
      onConfirm: () => {
        deleteOrder(orderId);
      }
    });
  };

  const handleDeleteCouponPrompt = (couponId: string, couponCode: string) => {
    openDeleteModal({
      title: 'حذف كود الخصم',
      description: 'هل تريد حذف هذا الكوبون الترويجي نهائياً؟ لن يتمكن العملاء من استخدامه بعد الآن.',
      itemLabel: `كود الخصم: ${couponCode}`,
      onConfirm: () => {
        deleteCoupon(couponId);
      }
    });
  };

  const handleDeleteReviewPrompt = (reviewId: string) => {
    openDeleteModal({
      title: 'حذف صورة تجربة العميل',
      description: 'هل تريد حذف هذه الصورة نهائياً من معرض آراء وتجارب العملاء؟',
      itemLabel: 'صورة رأي العميل',
      onConfirm: () => {
        deleteReviewImage(reviewId);
      }
    });
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImages(true);
    try {
      const compressed = await compressImageFile(file, 600, 0.85);
      setBrandLogo(compressed);
    } catch (err) {
      console.error('Failed to compress logo:', err);
    } finally {
      setIsProcessingImages(false);
      e.target.value = '';
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      storeName,
      brandLogo,
      announcementText,
      whatsappNumber,
      whatsappUrl,
      instagramUrl,
      tiktokUrl,
      facebookUrl
    });
  };

  // If not logged in, show secure login box
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-stone-400 to-amber-500" />

          <div className="w-12 h-12 rounded-2xl bg-amber-950/60 border border-amber-800/40 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-stone-100 text-center">لوحة الإدارة والمخازن</h2>
          <p className="text-xs text-stone-400 text-center mt-1 mb-6">
            تسجيل الدخول لإدارة الهوديز والطلبات والكوبونات والشحن
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                اسم المستخدم
              </label>
              <input
                id="admin-username-input"
                type="text"
                required
                placeholder="أدخل اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                كلمة المرور
              </label>
              <input
                id="admin-password-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 px-1 py-1 text-[11px] text-amber-400/90 bg-amber-950/20 border border-amber-900/30 rounded-xl">
              <Check className="w-4 h-4 text-amber-400 shrink-0 ml-1" />
              <span>تذكر الدخول مفعل تلقائياً — لن تحتاج لكتابة البيانات مجدداً على هذا الجهاز.</span>
            </div>

            {loginError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/40">
                {loginError}
              </p>
            )}

            <button
              id="admin-login-submit-btn"
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-extrabold text-xs transition-colors shadow-md shadow-amber-950/40"
            >
              دخول إلى لوحة التحكم
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Logged-in Admin Dashboard View
  return (
    <div id="admin-dashboard-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header with Realtime Cloud Sync Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400">قاعدة بيانات Firebase سحابية متصلة</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-mono">
                مزامنة حية للجميع
              </span>
            </div>
            <p className="text-[11px] text-stone-400">أي تعديل تجريه هنا يظهر فوراً وبشكل لحظي لجميع الزوار على كافة الأجهزة</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="text-right hidden sm:flex items-center gap-2">
            <span className="text-[10px] px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-400 flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              جلسة دائمة محفوظة
            </span>
            <div className="text-right">
              <span className="text-[10px] text-stone-500 block">المستخدم</span>
              <span className="text-xs font-mono font-bold text-amber-400">{adminCredentials.username}</span>
            </div>
          </div>
          <button
            id="admin-logout-btn"
            type="button"
            onClick={() => setIsAdminLoggedIn(false)}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-stone-900/80 border border-stone-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>إجمالي المبيعات المؤكدة</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-lg sm:text-2xl font-mono font-black text-stone-100 mt-2">
            {totalRevenue.toLocaleString()} ج.م
          </p>
          <span className="text-[10px] text-stone-500">من الطلبات غير الملغاة</span>
        </div>

        <div className="bg-stone-900/80 border border-stone-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>إجمالي الطلبات</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg sm:text-2xl font-mono font-black text-stone-100 mt-2">
            {totalOrdersCount}
          </p>
          <span className="text-[10px] text-amber-500 font-semibold">{pendingOrdersCount} قيد التنفيذ والتجهيز</span>
        </div>

        <div className="bg-stone-900/80 border border-stone-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>موديلات الهوديز المعروضة</span>
            <Package className="w-4 h-4 text-stone-300" />
          </div>
          <p className="text-lg sm:text-2xl font-mono font-black text-stone-100 mt-2">
            {products.length}
          </p>
          <span className="text-[10px] text-stone-500">{totalStockCount} قطعة بالمخزن</span>
        </div>

        <div className="bg-stone-900/80 border border-stone-800/80 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>صور تجارب العملاء</span>
            <ImageIcon className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg sm:text-2xl font-mono font-black text-stone-100 mt-2">
            {reviewImages.length}
          </p>
          <span className="text-[10px] text-stone-500">صور وتجارب مرفوعة</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-800/80">
        <button
          id="admin-tab-products"
          type="button"
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'products'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>إدارة الهوديز ({products.length})</span>
        </button>

        <button
          id="admin-tab-orders"
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'orders'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>الطلبات والشحنات ({orders.length})</span>
        </button>

        <button
          id="admin-tab-coupons"
          type="button"
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'coupons'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>كوبونات الخصم ({coupons.length})</span>
        </button>

        <button
          id="admin-tab-reviews"
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'reviews'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>صور آراء العملاء ({reviewImages.length})</span>
        </button>

        <button
          id="admin-tab-shipping"
          type="button"
          onClick={() => setActiveTab('shipping')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'shipping'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>أسعار الشحن بالمحافظات</span>
        </button>

        <button
          id="admin-tab-settings"
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>إعدادات وروابط المتجر</span>
        </button>

        <button
          id="admin-tab-security"
          type="button"
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'security'
              ? 'bg-amber-500 text-black shadow-sm'
              : 'bg-stone-900 border border-stone-800 text-stone-300 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>تغيير كلمة السر واسم المستخدم</span>
        </button>
      </div>

      {/* TAB CONTENT: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-200">كتالوج الهوديز الحالية</h3>
            <button
              id="admin-add-product-toggle-btn"
              type="button"
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة هودي جديد</span>
            </button>
          </div>

          {/* Add Product Form with Local Device Upload */}
          {showAddProduct && (
            <form
              onSubmit={handleCreateProduct}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-4 animate-in fade-in"
            >
              <h4 className="text-sm font-bold text-amber-400">إضافة هودي جديد إلى المتجر</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">اسم الهودي</label>
                  <input
                    type="text"
                    required
                    placeholder="هودي نوكتورن..."
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">العنوان الفرعي الإنجليزي</label>
                  <input
                    type="text"
                    placeholder="Nocturne Charcoal Boxy"
                    value={pSubtitle}
                    onChange={(e) => setPSubtitle(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">السعر (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={pPrice}
                    onChange={(e) => setPPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">السعر الأصلي قبل الخصم (ج.م - اختياري)</label>
                  <input
                    type="number"
                    placeholder="اتركه فارغاً إن لم يوجد خصم"
                    value={pOriginalPrice}
                    onChange={(e) => setPOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">النوع / الفئة</label>
                  <select
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value as HoodieCategory)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  >
                    <option value="oversized">أوفر سايز (Oversized)</option>
                    <option value="basic">بيسيك كلاسيك (Basic)</option>
                    <option value="zipup">بسحاب كامل (Zip-Up)</option>
                  </select>
                </div>

                {/* Local Device Image Upload (As requested: رفع الصور من الجهاز عادي مش من لينك) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-stone-300 font-bold mb-1.5">
                    رفع صور الهودي من جهازك مباشرة:
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <input
                      ref={productFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleProductImageUploadFromDevice}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isProcessingImages}
                      onClick={() => productFileInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 disabled:opacity-50 border border-dashed border-amber-500/50 hover:border-amber-400 text-stone-200 text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                      {isProcessingImages ? (
                        <>
                          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span>جاري ضغط ومعالجة الصور...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-amber-400" />
                          <span>اختر صور من جهازك (كمبيوتر أو هاتف)</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-stone-500">
                      يمكنك تحديد صورة أو عدة صور وسيتم تحويلها وحفظها مع الهودي
                    </span>
                  </div>

                  {/* Uploaded Images Preview Strip */}
                  {uploadedProductImages.length > 0 && (
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {uploadedProductImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative w-20 h-24 rounded-xl overflow-hidden border border-stone-700 bg-stone-950 group"
                        >
                          <img
                            src={img}
                            alt={`صورة ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeUploadedProductImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                            title="حذف هذه الصورة"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-stone-400 mb-1">وصف الهودي والمميزات</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="هودي شتوي ثقيل..."
                    value={pDescription}
                    onChange={(e) => setPDescription(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs text-stone-400 mb-1">مواصفات الخامة</label>
                  <input
                    type="text"
                    value={pFabric}
                    onChange={(e) => setPFabric(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">نوع القصة</label>
                  <input
                    type="text"
                    value={pFit}
                    onChange={(e) => setPFit(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>

                {/* Stock Per Size */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-stone-400 mb-1">
                    المخزون المتوفر لكل مقاس:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[11px] text-stone-500">M:</span>
                      <input
                        type="number"
                        value={pStockM}
                        onChange={(e) => setPStockM(Number(e.target.value))}
                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-center text-stone-100"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500">L:</span>
                      <input
                        type="number"
                        value={pStockL}
                        onChange={(e) => setPStockL(Number(e.target.value))}
                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-center text-stone-100"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500">XL:</span>
                      <input
                        type="number"
                        value={pStockXL}
                        onChange={(e) => setPStockXL(Number(e.target.value))}
                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-center text-stone-100"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-500">2XL:</span>
                      <input
                        type="number"
                        value={pStock2XL}
                        onChange={(e) => setPStock2XL(Number(e.target.value))}
                        className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-center text-stone-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Measurements (Length and Width) */}
                <div className="sm:col-span-2 p-3 bg-stone-950/60 border border-stone-800 rounded-xl">
                  <label className="block text-xs text-amber-400 font-bold mb-2">
                    جدول قياسات الهودي (الطول والعرض بالسنتيمتر cm):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                      <span className="text-xs font-bold text-amber-400 block mb-1.5 text-center">مقاس M</span>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-stone-400">الطول (cm):</span>
                          <input
                            type="number"
                            value={pLengthM}
                            onChange={(e) => setPLengthM(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400">العرض (cm):</span>
                          <input
                            type="number"
                            value={pWidthM}
                            onChange={(e) => setPWidthM(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                      <span className="text-xs font-bold text-amber-400 block mb-1.5 text-center">مقاس L</span>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-stone-400">الطول (cm):</span>
                          <input
                            type="number"
                            value={pLengthL}
                            onChange={(e) => setPLengthL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400">العرض (cm):</span>
                          <input
                            type="number"
                            value={pWidthL}
                            onChange={(e) => setPWidthL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                      <span className="text-xs font-bold text-amber-400 block mb-1.5 text-center">مقاس XL</span>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-stone-400">الطول (cm):</span>
                          <input
                            type="number"
                            value={pLengthXL}
                            onChange={(e) => setPLengthXL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400">العرض (cm):</span>
                          <input
                            type="number"
                            value={pWidthXL}
                            onChange={(e) => setPWidthXL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                      <span className="text-xs font-bold text-amber-400 block mb-1.5 text-center">مقاس 2XL</span>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-stone-400">الطول (cm):</span>
                          <input
                            type="number"
                            value={pLength2XL}
                            onChange={(e) => setPLength2XL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400">العرض (cm):</span>
                          <input
                            type="number"
                            value={pWidth2XL}
                            onChange={(e) => setPWidth2XL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colors Management in Add Form */}
                <div className="sm:col-span-2 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                      <Palette className="w-4 h-4" />
                      <span>الألوان المتاحة لهذا الهودي:</span>
                    </label>
                    <span className="text-[11px] text-stone-500">
                      ({pColors.length} ألوان مضافة)
                    </span>
                  </div>

                  {pColors.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {pColors.map((clr, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-200"
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-stone-700 inline-block shrink-0"
                            style={{ backgroundColor: clr.hex }}
                          />
                          <span className="font-medium">{clr.name}</span>
                          <span className="text-[10px] text-stone-500 font-mono">({clr.hex})</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePColor(idx)}
                            className="text-stone-500 hover:text-rose-400 p-0.5 rounded transition-colors mr-1"
                            title="حذف هذا اللون"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">لم تتم إضافة ألوان بعد.</p>
                  )}

                  {/* Add New Color Row */}
                  <div className="pt-2 border-t border-stone-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="اسم اللون (مثال: كحلي داكن، بيج)"
                      value={pNewColorName}
                      onChange={(e) => setPNewColorName(e.target.value)}
                      className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1">
                        <input
                          type="color"
                          value={pNewColorHex}
                          onChange={(e) => setPNewColorHex(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                        />
                        <span className="text-[11px] font-mono text-stone-400">{pNewColorHex}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPColor}
                        disabled={!pNewColorName.trim()}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-400 text-xs font-bold transition-colors"
                      >
                        + إضافة اللون
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  id="admin-submit-new-product-btn"
                  type="submit"
                  disabled={isSavingProduct || isProcessingImages}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-2"
                >
                  {isSavingProduct ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحفظ والمزامنة السحابية...</span>
                    </>
                  ) : (
                    <span>حفظ ونشر الهودي في المتجر</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Products Table or Empty State */}
          {products.length === 0 ? (
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-10 text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 rounded-2xl bg-amber-950/40 border border-amber-800/40 text-amber-400 flex items-center justify-center mx-auto">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-base font-bold text-stone-200">لا توجد منتجات مضافة حتى الآن</h4>
                <p className="text-xs text-stone-400 max-w-md mx-auto mt-1">
                  المتجر فارغ وجاهز لرفع تشكيلتك وهودياتك الخاصة. يمكنك الضغط على "إضافة هودي جديد" لرفع منتجاتك، أو استخدام الزر التجريبي للمعاينة.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(true)}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة أول هودي يدوياً</span>
                </button>
                <button
                  type="button"
                  onClick={() => seedSampleProduct()}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs border border-stone-700 transition-colors"
                >
                  <span>إضافة منتج تجريبي للمعاينة</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-stone-300">
                  <thead className="bg-stone-950 text-stone-400 uppercase text-[11px] border-b border-stone-800">
                    <tr>
                      <th className="p-3.5">المنتج</th>
                      <th className="p-3.5">الفئة</th>
                      <th className="p-3.5">السعر</th>
                      <th className="p-3.5">المخزون (M/L/XL/2XL)</th>
                      <th className="p-3.5 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80">
                    {products.map((p) => {
                      const totalStock = Object.values(p.sizesStock).reduce((a, b) => a + (b || 0), 0);
                      return (
                        <tr key={p.id} className="hover:bg-stone-900/90 transition-colors">
                          <td className="p-3.5 flex items-center gap-3">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-14 rounded-lg object-cover border border-stone-800 bg-stone-950 shrink-0"
                            />
                            <div>
                              <p className="font-bold text-stone-200">{p.name}</p>
                              <p className="text-stone-500 text-[11px]">{p.subtitle}</p>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-300 text-[11px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-400">
                            {p.price} ج.م
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="text-stone-300">{p.sizesStock.M}</span>
                              <span className="text-stone-600">/</span>
                              <span className="text-stone-300">{p.sizesStock.L}</span>
                              <span className="text-stone-600">/</span>
                              <span className="text-stone-300">{p.sizesStock.XL}</span>
                              <span className="text-stone-600">/</span>
                              <span className="text-stone-300">{p.sizesStock['2XL']}</span>
                              <span className="text-stone-500 text-[10px] mr-1">
                                (إجمالي {totalStock})
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-2 justify-center">
                              <button
                                id={`admin-edit-product-btn-${p.id}`}
                                type="button"
                                onClick={() => handleStartEditProduct(p)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 transition-colors text-xs font-semibold"
                                title="تعديل بيانات الهودي"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>تعديل</span>
                              </button>
                              <button
                                id={`admin-delete-product-btn-${p.id}`}
                                type="button"
                                onClick={() => handleDeleteProductPrompt(p.id, p.name)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 text-rose-400 border border-rose-900/50 hover:border-rose-700 transition-colors text-xs font-semibold"
                                title="حذف هذا الهودي نهائياً"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (() => {
        const statusCounts = {
          all: orders.length,
          pending: orders.filter((o) => o.status === 'pending').length,
          processing: orders.filter((o) => o.status === 'processing').length,
          shipped: orders.filter((o) => o.status === 'shipped').length,
          delivered: orders.filter((o) => o.status === 'delivered').length,
          cancelled: orders.filter((o) => o.status === 'cancelled').length
        };

        const filteredByStatus =
          orderStatusFilter === 'all'
            ? orders
            : orders.filter((o) => o.status === orderStatusFilter);

        const cleanQuery = orderSearchQuery.trim().toLowerCase();
        const filteredOrders = filteredByStatus.filter((order) => {
          if (!cleanQuery) return true;
          const num = (order.orderNumber || '').toLowerCase();
          const matchNum = num === cleanQuery || num.includes(cleanQuery) || `#${num}` === cleanQuery;
          const matchName = (order.customerName || '').toLowerCase().includes(cleanQuery);
          const matchPhone = (order.phone || '').includes(cleanQuery);
          const matchCenter = (order.center || '').toLowerCase().includes(cleanQuery);
          const matchAddress = (order.address || '').toLowerCase().includes(cleanQuery);
          return matchNum || matchName || matchPhone || matchCenter || matchAddress;
        });

        const statusTabs: Array<{ id: 'all' | OrderStatus; label: string; count: number }> = [
          { id: 'all', label: 'كافة الطلبات', count: statusCounts.all },
          { id: 'pending', label: 'قيد الانتظار', count: statusCounts.pending },
          { id: 'processing', label: 'جاري التجهيز', count: statusCounts.processing },
          { id: 'shipped', label: 'تم الشحن', count: statusCounts.shipped },
          { id: 'delivered', label: 'تم التوصيل', count: statusCounts.delivered },
          { id: 'cancelled', label: 'ملغي', count: statusCounts.cancelled }
        ];

        return (
          <div className="space-y-6">
            {/* Top Bar with Title and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-200">سجل طلبات العملاء والشحنات</h3>
                <p className="text-xs text-stone-400">إجمالي الطلبات المسجلة: {orders.length} طلب</p>
              </div>

              {/* Order Search Input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-search-orders-input"
                  type="text"
                  placeholder="ابحث برقم الطلب (مثال: 1 أو 2) أو الهاتف..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pr-9 pl-8 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                {orderSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-0.5"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Notification Alert Controls Card */}
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <BellRing className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-stone-100">
                      نظام التنبيهات الفورية للطلبات الجديدة
                    </h4>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      مباشر ومزامن سحابياً
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    ستسمع نغمة تنبيه صوتية ويصلك إشعار بالمتصفح لأي شخص متواجد على لوحة التحكم فور وصول أي أوردر جديد.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                {/* Sound Toggle */}
                <button
                  id="admin-toggle-sound-btn"
                  type="button"
                  onClick={() => {
                    const next = !soundNotificationOn;
                    setSoundNotificationOn(next);
                    setSoundNotificationEnabled(next);
                    if (next) {
                      playOrderNotificationSound();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border ${
                    soundNotificationOn
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:bg-stone-800'
                  }`}
                  title={soundNotificationOn ? 'كتم صوت التنبيه' : 'تشغيل صوت التنبيه'}
                >
                  {soundNotificationOn ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>صوت النغمة (مفعّل)</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>صوت النغمة (مكتوم)</span>
                    </>
                  )}
                </button>

                {/* Test Sound */}
                <button
                  id="admin-test-sound-btn"
                  type="button"
                  onClick={() => playOrderNotificationSound()}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="تجربة صوت النغمة"
                >
                  <span>🔊 تجربة النغمة</span>
                </button>

                {/* Request Browser Notifications */}
                {notificationPerm !== 'granted' ? (
                  <button
                    id="admin-enable-browser-notifications-btn"
                    type="button"
                    onClick={async () => {
                      const res = await requestNotificationPermission();
                      setNotificationPerm(res);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>تفعيل إشعارات الهاتف / المتصفح</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700 text-stone-300 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>الإشعارات مفعلة</span>
                    </span>
                    <button
                      id="admin-test-phone-notification-btn"
                      type="button"
                      onClick={() => testPhoneNotification()}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="تجربة وصول إشعار فوري كرسائل الواتساب على الهاتف"
                    >
                      <span>📱 إشعار تجريبي</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Order Classification Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-800 pb-3">
              {statusTabs.map((tab) => {
                const isActive = orderStatusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`admin-order-status-tab-${tab.id}`}
                    type="button"
                    onClick={() => setOrderStatusFilter(tab.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                        : 'bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-black/20 text-stone-950'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Export and Summary Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-950/70 border border-stone-800/90 p-3.5 rounded-2xl">
              <div className="text-xs text-stone-300 flex flex-wrap items-center gap-2">
                <span className="font-bold text-stone-100">
                  {orderStatusFilter === 'all'
                    ? 'عرض كافة الطلبات'
                    : `عرض تصنيف: ${ORDER_STATUS_LABELS[orderStatusFilter]}`}
                </span>
                <span className="text-stone-600">|</span>
                <span>
                  العدد: <strong className="text-amber-400 font-mono">{filteredByStatus.length}</strong> طلب
                </span>
                <span className="text-stone-600">|</span>
                <span>
                  إجمالي التحصيل:{' '}
                  <strong className="text-emerald-400 font-mono">
                    {filteredByStatus.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0)} ج.م
                  </strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Download Current View File */}
                <button
                  id="admin-export-current-file-btn"
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    if (orderStatusFilter === 'all') {
                      exportOrdersToCSV(orders, `طلبات_نوكتورن_كافة_الطلبات_${today}`);
                    } else {
                      exportOrdersByStatus(orders, orderStatusFilter);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  title="تنزيل ملف Excel / CSV للطلبات المعروضة حالياً"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>
                    {orderStatusFilter === 'all'
                      ? 'تنزيل ملف كافة الطلبات (Excel)'
                      : `تنزيل ملف (${ORDER_STATUS_LABELS[orderStatusFilter]})`}
                  </span>
                </button>

                {/* Dropdown to download separate file for each status */}
                <div className="relative">
                  <button
                    id="admin-export-dropdown-toggle-btn"
                    type="button"
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>تنزيل ملف منفصل لكل تصنيف</span>
                  </button>

                  {showExportDropdown && (
                    <div
                      id="admin-export-dropdown-menu"
                      className="absolute left-0 sm:right-auto sm:left-0 top-full mt-2 w-64 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-2 z-30 space-y-1"
                    >
                      <div className="px-3 py-1.5 text-[11px] font-bold text-stone-400 border-b border-stone-800">
                        اختر تصنيفاً لتنزيل ملفه بشكل منفصل:
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          exportOrdersToCSV(orders, `طلبات_نوكتورن_كافة_الطلبات_${today}`);
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-stone-200 hover:bg-stone-800 flex items-center justify-between"
                      >
                        <span>ملف كافة الطلبات (الكل)</span>
                        <span className="font-mono text-stone-400 text-[10px]">({orders.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'pending');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-amber-400 hover:bg-amber-950/40 flex items-center justify-between"
                      >
                        <span>ملف قيد الانتظار (جديدة)</span>
                        <span className="font-mono text-[10px]">({statusCounts.pending})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'processing');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-blue-400 hover:bg-blue-950/40 flex items-center justify-between"
                      >
                        <span>ملف جاري التجهيز والتغليف</span>
                        <span className="font-mono text-[10px]">({statusCounts.processing})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'shipped');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-purple-400 hover:bg-purple-950/40 flex items-center justify-between"
                      >
                        <span>ملف تم التسليم لشركة الشحن</span>
                        <span className="font-mono text-[10px]">({statusCounts.shipped})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'delivered');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-emerald-400 hover:bg-emerald-950/40 flex items-center justify-between"
                      >
                        <span>ملف تم التوصيل بنجاح</span>
                        <span className="font-mono text-[10px]">({statusCounts.delivered})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          exportOrdersByStatus(orders, 'cancelled');
                          setShowExportDropdown(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-950/40 flex items-center justify-between"
                      >
                        <span>ملف الطلبات الملغاة</span>
                        <span className="font-mono text-[10px]">({statusCounts.cancelled})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-stone-900/40 border border-stone-800 rounded-2xl">
                  <p className="text-xs text-stone-400">
                    {orderSearchQuery
                      ? `لا توجد أي نتائج مطابقة لرقم أو تفاصيل الطلب "${orderSearchQuery}"`
                      : 'لا توجد طلبات مسجلة حتى الآن.'}
                  </p>
                  {orderSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOrderSearchQuery('')}
                      className="mt-2 text-xs text-amber-400 hover:underline"
                    >
                      إلغاء البحث وإظهار كافة الطلبات
                    </button>
                  )}
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 space-y-4"
                  >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-stone-400">{order.createdAt}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        id={`order-status-select-${order.id}`}
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                        className="bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-200 focus:border-amber-500"
                      >
                        <option value="pending">قيد الانتظار</option>
                        <option value="processing">جاري التجهيز والتغليف</option>
                        <option value="shipped">تم التسليم لشركة الشحن</option>
                        <option value="delivered">تم التوصيل بنجاح</option>
                        <option value="cancelled">ملغي</option>
                      </select>

                      {/* Working Delete Order Button */}
                      <button
                        id={`admin-delete-order-btn-${order.id}`}
                        type="button"
                        onClick={() => handleDeleteOrderPrompt(order.id, order.orderNumber)}
                        className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/80 text-rose-400 border border-rose-900/50 transition-colors"
                        title="حذف هذا الطلب نهائياً"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Customer Info & Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-bold text-stone-200">{order.customerName}</p>
                      <p className="text-stone-400 font-mono mt-0.5">الهاتف: {order.phone}</p>
                      {order.alternatePhone && (
                        <p className="text-stone-400 font-mono text-[11px] mt-0.5">هاتف بديل: {order.alternatePhone}</p>
                      )}
                      <p className="text-stone-400 mt-1">
                        <span>المحافظة: <strong className="text-stone-200 font-medium">{order.governorate}</strong></span>
                        {order.center && (
                          <span className="mr-2"> | المركز: <strong className="text-amber-400 font-medium">{order.center}</strong></span>
                        )}
                      </p>
                      <p className="text-stone-400 mt-1">العنوان بالتفصيل: <span className="text-stone-200">{order.address}</span></p>
                      {order.notes && (
                        <p className="text-amber-400/90 text-[11px] mt-1.5 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20">
                          ملاحظات العميل: {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-stone-300 font-bold text-xs flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-amber-500" />
                          <span>محتويات الشحنة ({order.items.reduce((s, it) => s + (it.quantity || 1), 0)} قطعة):</span>
                        </p>
                        <span className="text-[10px] text-stone-500 hidden sm:inline">انقر على الصورة لمعاينة الطبعة</span>
                      </div>

                      <div className="space-y-2">
                        {order.items.map((item, idx) => {
                          const matchingProduct = products.find((p) => p.id === item.productId);
                          const printSubtitle = item.subtitle || matchingProduct?.subtitle;
                          const itemImg = item.image || item.images?.[0] || matchingProduct?.images?.[0] || '';
                          const colorName = item.colorName || (matchingProduct?.colors && matchingProduct.colors[0]?.name);
                          const colorHex = item.colorHex || (matchingProduct?.colors && matchingProduct.colors[0]?.hex) || '#171717';

                          return (
                            <div
                              key={idx}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl bg-stone-950/90 border border-stone-800/90 hover:border-stone-700 transition-all text-xs"
                            >
                              {/* Thumbnail & Title/Print/Color/Size */}
                              <div className="flex items-start sm:items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectingOrderItem({
                                      item: {
                                        ...item,
                                        subtitle: printSubtitle,
                                        image: itemImg,
                                        images: item.images && item.images.length > 0 ? item.images : (matchingProduct?.images || [itemImg]),
                                        colorName: colorName,
                                        colorHex: colorHex
                                      },
                                      orderNumber: order.orderNumber,
                                      customerName: order.customerName,
                                      orderDate: order.createdAt
                                    });
                                    setInspectingImageIndex(0);
                                  }}
                                  className="relative w-12 h-14 sm:w-14 sm:h-16 rounded-xl overflow-hidden border border-stone-700/80 bg-stone-900 shrink-0 group/img focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  title="انقر لتكبير صورة الهودي وفحص تفاصيل الطبعة"
                                >
                                  {itemImg ? (
                                    <img
                                      src={itemImg}
                                      alt={item.productName}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-stone-600">
                                      <ImageIcon className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                                  </div>
                                </button>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-bold text-stone-100 text-xs sm:text-sm">{item.productName}</span>
                                    {printSubtitle && (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                                        طبعة: {printSubtitle}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                    <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-200 font-bold font-mono">
                                      مقاس: <strong className="text-amber-400">{item.size}</strong>
                                    </span>

                                    {colorName && (
                                      <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-300 flex items-center gap-1">
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-stone-600 shadow-sm shrink-0 inline-block"
                                          style={{ backgroundColor: colorHex }}
                                        />
                                        <span>لون: <strong className="text-stone-200">{colorName}</strong></span>
                                      </span>
                                    )}

                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/25 text-amber-300 font-bold font-mono">
                                      {item.quantity} {item.quantity > 1 ? 'قطع' : 'قطعة'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Price & Action */}
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-stone-850">
                                <span className="font-mono text-amber-400 font-bold text-xs sm:text-sm">
                                  {item.price * item.quantity} ج.م
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInspectingOrderItem({
                                      item: {
                                        ...item,
                                        subtitle: printSubtitle,
                                        image: itemImg,
                                        images: item.images && item.images.length > 0 ? item.images : (matchingProduct?.images || [itemImg]),
                                        colorName: colorName,
                                        colorHex: colorHex
                                      },
                                      orderNumber: order.orderNumber,
                                      customerName: order.customerName,
                                      orderDate: order.createdAt
                                    });
                                    setInspectingImageIndex(0);
                                  }}
                                  className="text-[10px] text-stone-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                                >
                                  <Eye className="w-3 h-3 text-amber-500" />
                                  <span>فحص الطبعة</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold text-stone-200 pt-2 border-t border-stone-800">
                        <span>الإجمالي المطلوب تحصيله:</span>
                        <span className="font-mono text-amber-400 text-sm font-black">{order.total} ج.م</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        );
      })()}

      {/* TAB CONTENT: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-200">كوبونات الخصم الترويجية</h3>
            <button
              id="admin-add-coupon-toggle-btn"
              type="button"
              onClick={() => setShowAddCoupon(!showAddCoupon)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء كوبون جديد</span>
            </button>
          </div>

          {showAddCoupon && (
            <form
              onSubmit={handleCreateCoupon}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3 max-w-xl animate-in fade-in"
            >
              <h4 className="text-sm font-bold text-amber-400">إضافة كود خصم</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">كود الخصم</label>
                  <input
                    type="text"
                    required
                    placeholder="WINTER25"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">نسبة الخصم (%)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="90"
                    value={cDiscount}
                    onChange={(e) => setCDiscount(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">الحد الأدنى للطلب</label>
                  <input
                    type="number"
                    value={cMinOrder}
                    onChange={(e) => setCMinOrder(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-100"
                  />
                </div>
              </div>

              {/* Product Target Option */}
              <div className="space-y-2 pt-2 border-t border-stone-800/80">
                <label className="block text-xs font-bold text-stone-300">
                  صلاحية ونطاق تطبيق الكوبون:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCTargetScope('all');
                      setCTargetProductId('');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      cTargetScope === 'all'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    شامل كافة منتجات المتجر
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCTargetScope('specific');
                      if (!cTargetProductId && products.length > 0) {
                        setCTargetProductId(products[0].id);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                      cTargetScope === 'specific'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    مخصص لهودي معين فقط
                  </button>
                </div>

                {cTargetScope === 'specific' && (
                  <div className="mt-2 space-y-1.5 bg-stone-950/80 border border-amber-500/20 p-3 rounded-xl">
                    <label className="block text-xs font-bold text-amber-400">
                      اختر الهودي الذي سيطبق عليه الخصم فقط:
                    </label>
                    <select
                      id="admin-coupon-target-product-select"
                      value={cTargetProductId}
                      onChange={(e) => setCTargetProductId(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-medium"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.price} ج.م)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-stone-400">
                      💡 ملاحظة: عند تفعيل هذا الكوبون، سيتم خصم الـ {cDiscount}% من سعر هذا الهودي فقط، دون التأثير على بقية العناصر في سلة المشتريات.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCoupon(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white text-xs font-medium"
                >
                  إلغاء
                </button>
                <button
                  id="admin-submit-new-coupon-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
                >
                  تفعيل وحفظ الكوبون
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-black text-amber-400 text-lg">
                      {coupon.code}
                    </span>
                    <p className="text-xs text-stone-400 mt-0.5">
                      خصم {coupon.discountPercent}%
                    </p>
                    {coupon.targetProductId && coupon.targetProductName ? (
                      <span className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-bold text-amber-400">
                        مخصص لهودي: {coupon.targetProductName}
                      </span>
                    ) : (
                      <span className="inline-block mt-2 px-2.5 py-1 rounded-lg bg-stone-800 text-[11px] text-stone-400">
                        شامل جميع منتجات المتجر
                      </span>
                    )}
                  </div>

                  {/* Working Delete Coupon Button */}
                  <button
                    id={`admin-delete-coupon-btn-${coupon.id}`}
                    type="button"
                    onClick={() => handleDeleteCouponPrompt(coupon.id, coupon.code)}
                    className="text-rose-400 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-950/80 p-1.5 rounded-lg border border-rose-900/50 transition-colors"
                    title="حذف الكوبون نهائياً"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-stone-800/80 pt-3">
                  <span className="text-xs text-stone-400">حالة التفعيل:</span>
                  <button
                    type="button"
                    onClick={() => toggleCouponActive(coupon.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      coupon.active
                        ? 'bg-emerald-950/60 border border-emerald-800/50 text-emerald-400'
                        : 'bg-stone-800 text-stone-500'
                    }`}
                  >
                    {coupon.active ? 'مفعل وشغال' : 'معطل مؤقتاً'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CUSTOMER REVIEW IMAGES (Images only as requested) */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-stone-200">
                معرض صور آراء وتجارب العملاء ({reviewImages.length})
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                ارفع سكرين شوتس محادثات واتساب أو صور تجارب العملاء مباشرة من جهازك
              </p>
            </div>

            {/* Device file upload for review screenshots */}
            <div>
              <input
                ref={reviewFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleReviewImageUploadFromDevice}
                className="hidden"
              />
              <button
                id="admin-upload-review-image-btn"
                type="button"
                onClick={() => reviewFileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-2 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                <span>رفع صور آراء من جهازك</span>
              </button>
            </div>
          </div>

          {/* Grid of review images with delete button */}
          {reviewImages.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-10">
              لا توجد صور آراء حالياً. اضغط على الزر بالأعلى لرفع صور من جهازك.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {reviewImages.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden group relative flex flex-col justify-between"
                >
                  <div className="aspect-[3/4] bg-stone-950 overflow-hidden">
                    <img
                      src={rev.imageUrl}
                      alt={rev.caption || 'رأي عميل'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-3 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-stone-400 truncate">
                      {rev.caption || 'صورة تجربة عميل'}
                    </span>

                    {/* Working Delete Review Image Button */}
                    <button
                      id={`admin-delete-review-btn-${rev.id}`}
                      type="button"
                      onClick={() => handleDeleteReviewPrompt(rev.id)}
                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950 text-rose-400 border border-rose-900/40 transition-colors shrink-0"
                      title="حذف هذه الصورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SHIPPING RATES (Governorate Name only as requested) */}
      {activeTab === 'shipping' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-stone-200">أسعار الشحن لمحافظات مصر الـ 27</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              تحديد تكلفة الشحن لكل محافظة (تظهر في خانة المحافظات بالموقع)
            </p>
          </div>

          <div className="bg-stone-900/60 border border-stone-800 rounded-2xl overflow-hidden shadow-xl max-w-xl">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-right text-xs text-stone-300">
                <thead className="sticky top-0 bg-stone-950 text-stone-400 uppercase text-[11px] border-b border-stone-800">
                  <tr>
                    <th className="p-3.5">المحافظة</th>
                    <th className="p-3.5 text-center">تكلفة الشحن (ج.م)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/80">
                  {governorates.map((gov) => (
                    <tr key={gov.name} className="hover:bg-stone-900/90 transition-colors">
                      <td className="p-3.5 font-bold text-stone-200">{gov.name}</td>
                      <td className="p-3.5 text-center">
                        <input
                          id={`shipping-rate-${gov.name}`}
                          type="number"
                          value={gov.cost}
                          onChange={(e) => updateGovernorateCost(gov.name, Number(e.target.value))}
                          className="w-24 bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-amber-400 font-mono text-center focus:border-amber-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: STORE & SOCIAL MEDIA SETTINGS */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-5 max-w-2xl"
        >
          <div>
            <h3 className="text-sm font-bold text-stone-200">تخصيص بيانات وروابط التواصل للمتجر</h3>
            <p className="text-xs text-stone-400 mt-0.5">
              يتم تحديث جميع الروابط والشعار في الواجهة الرئيسية فوراً بعد الحفظ
            </p>
          </div>

          <div className="space-y-4">
            {/* Brand Logo Upload Section */}
            <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800/90 space-y-3">
              <label className="block text-xs font-bold text-amber-400">
                شعار البراند (Brand Logo)
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Logo Preview */}
                <div className="w-16 h-16 rounded-xl bg-stone-900 border border-stone-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {brandLogo ? (
                    <img
                      src={brandLogo}
                      alt="Brand Logo Preview"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="font-serif font-black text-amber-400 text-2xl">N</span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>رفع لوجو من جهازك</span>
                    </button>

                    {brandLogo && (
                      <button
                        type="button"
                        onClick={() => setBrandLogo('')}
                        className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>إزالة الشعار</span>
                      </button>
                    )}
                  </div>

                  {/* Or image url input */}
                  <div>
                    <input
                      id="brand-logo-url-input"
                      type="url"
                      placeholder="أو ضع رابط صورة اللوجو هنا (URL)..."
                      value={brandLogo}
                      onChange={(e) => setBrandLogo(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500">
                    يظهر اللوجو مباشرة في أعلى المتجر (شريط التنقل) وبجوار اسم المتجر.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">اسم المتجر / البراند</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">شريط الإعلانات العلوي</label>
              <input
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs text-stone-400 mb-1">
                رقم واتساب المتجر (مع كود الدولة مثل 201012345678)
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono"
              />
            </div>

            {/* Social Media Links Section */}
            <div className="pt-3 border-t border-stone-800 space-y-3">
              <h4 className="text-xs font-bold text-amber-400">
                روابط التواصل الاجتماعي الرسمية:
              </h4>

              <div>
                <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-rose-400" />
                  <span>رابط حساب إنستجرام (Instagram URL)</span>
                </label>
                <input
                  id="settings-instagram-input"
                  type="url"
                  placeholder="https://instagram.com/your_account"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>رابط محادثة واتساب (WhatsApp URL)</span>
                </label>
                <input
                  id="settings-whatsapp-input"
                  type="url"
                  placeholder="https://wa.me/201012345678"
                  value={whatsappUrl}
                  onChange={(e) => setWhatsappUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-cyan-400 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.28 6.28 0 0 0 1.87-4.47V8.52a8.27 8.27 0 0 0 4.9 1.62V6.69z" />
                  </svg>
                  <span>رابط حساب تيك توك (TikTok URL)</span>
                </label>
                <input
                  id="settings-tiktok-input"
                  type="url"
                  placeholder="https://tiktok.com/@your_account"
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-300 mb-1 flex items-center gap-1.5">
                  <Facebook className="w-3.5 h-3.5 text-blue-400" />
                  <span>رابط صفحة فيسبوك (Facebook URL)</span>
                </label>
                <input
                  id="settings-facebook-input"
                  type="url"
                  placeholder="https://facebook.com/your_page"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              id="save-settings-btn"
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md shadow-amber-950/40"
            >
              حفظ الروابط والتعديلات
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT: SECURITY & CREDENTIALS */}
      {activeTab === 'security' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-6 max-w-2xl animate-in fade-in shadow-xl">
          <div>
            <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              <span>إدارة بيانات حساب لوحة الإدارة وكلمة السر</span>
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              يمكنك هنا تغيير اسم المستخدم وكلمة المرور الخاصة بلوحة الإدارة. يتم حفظ البيانات مشفرة وسحابياً في قاعدة بيانات Firebase، بحيث يمكنك الدخول بها من هاتفك أو الكمبيوتر أو أي جهاز آخر في أي وقت.
            </p>
          </div>

          <div className="bg-stone-950/80 border border-stone-800/90 rounded-xl p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-400">اسم المستخدم الحالي المسجل:</span>
              <span className="font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-stone-900 border border-stone-800">
                {adminCredentials.username}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-400">حالة المزامنة السحابية:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                متصل سحابياً (Firebase Firestore)
              </span>
            </div>
          </div>

          <form onSubmit={handleChangeCredentials} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                اسم المستخدم الجديد
              </label>
              <input
                id="security-new-username"
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم الجديد"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                كلمة المرور الجديدة
              </label>
              <input
                id="security-new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة مرور جديدة (4 أحرف على الأقل)"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                id="security-confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد كتابة كلمة المرور للتأكيد"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            {securityError && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-3 rounded-xl border border-rose-900/40">
                {securityError}
              </p>
            )}

            {securitySuccess && (
              <p className="text-xs text-emerald-400 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/40">
                {securitySuccess}
              </p>
            )}

            <div className="pt-2">
              <button
                id="save-security-credentials-btn"
                type="submit"
                disabled={isUpdatingCreds}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-xs transition-colors shadow-md shadow-amber-950/40 disabled:opacity-50"
              >
                {isUpdatingCreds ? 'جاري الحفظ السحابي...' : 'حفظ بيانات الدخول الجديدة سحابياً'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div
            id="admin-edit-product-modal"
            className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl relative my-6 max-h-[92vh] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-stone-100">
                    تعديل الهودي: {editingProduct.name}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    قم بتعديل الأسعار والمقاسات والألوان والصور
                  </p>
                </div>
              </div>
              <button
                id="close-edit-product-modal-btn"
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-lg bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Form */}
            <form onSubmit={handleSaveProductEdit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-right">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">اسم الهودي</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Product Subtitle */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">العنوان الفرعي الإنجليزي</label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">السعر الحالي (ج.م)</label>
                  <input
                    type="number"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Original Price */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">
                    السعر الأصلي قبل الخصم (ج.م - اختياري)
                  </label>
                  <input
                    type="number"
                    placeholder="اتركه فارغاً إن لم يوجد خصم"
                    value={editOriginalPrice}
                    onChange={(e) => setEditOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">الفئة</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as HoodieCategory)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="oversized">أوفر سايز (Oversized)</option>
                    <option value="basic">بيسيك كلاسيك (Basic)</option>
                    <option value="zipup">بسحاب كامل (Zip-Up)</option>
                  </select>
                </div>

                {/* Badge */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">شارة التمييز (Badge اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: الأكثر طلباً، جديد، خصم 20%"
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Featured Checkbox */}
                <div className="sm:col-span-2 flex items-center gap-2 py-1">
                  <input
                    id="edit-is-featured"
                    type="checkbox"
                    checked={editIsFeatured}
                    onChange={(e) => setEditIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-800 bg-stone-950 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="edit-is-featured" className="text-xs text-stone-300 cursor-pointer">
                    تمييز هذا الهودي وعرضه في المعرض الرئيسي بالصفحة الأولى (Featured)
                  </label>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-stone-300 font-medium mb-1">وصف الهودي</label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Fabric */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">الخامة والوزن</label>
                  <input
                    type="text"
                    value={editFabric}
                    onChange={(e) => setEditFabric(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Fit */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">القصة (Fit)</label>
                  <input
                    type="text"
                    value={editFit}
                    onChange={(e) => setEditFit(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Weight Range */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">الأوزان المناسبة</label>
                  <input
                    type="text"
                    value={editWeightRange}
                    onChange={(e) => setEditWeightRange(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Care Instructions */}
                <div>
                  <label className="block text-xs text-stone-300 font-medium mb-1">تعليمات الغسيل</label>
                  <input
                    type="text"
                    value={editCare}
                    onChange={(e) => setEditCare(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Stock Per Size */}
                <div className="sm:col-span-2 p-3 bg-stone-950/60 border border-stone-800 rounded-xl">
                  <label className="block text-xs text-amber-400 font-bold mb-2">
                    المخزون المتوفر لكل مقاس:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <span className="text-[11px] text-stone-400 block mb-0.5">مقاس M</span>
                      <input
                        type="number"
                        min="0"
                        value={editStockM}
                        onChange={(e) => setEditStockM(Number(e.target.value))}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-center text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block mb-0.5">مقاس L</span>
                      <input
                        type="number"
                        min="0"
                        value={editStockL}
                        onChange={(e) => setEditStockL(Number(e.target.value))}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-center text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block mb-0.5">مقاس XL</span>
                      <input
                        type="number"
                        min="0"
                        value={editStockXL}
                        onChange={(e) => setEditStockXL(Number(e.target.value))}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-center text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-stone-400 block mb-0.5">مقاس 2XL</span>
                      <input
                        type="number"
                        min="0"
                        value={editStock2XL}
                        onChange={(e) => setEditStock2XL(Number(e.target.value))}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1.5 text-xs text-center text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Measurements in Edit Modal (Length and Width) */}
                <div className="sm:col-span-2 p-3 bg-stone-950/60 border border-stone-800 rounded-xl">
                  <label className="block text-xs text-amber-400 font-bold mb-2">
                    جدول قياسات الهودي (الطول والعرض بالسنتيمتر cm):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                      <span className="text-xs font-bold text-amber-400 block mb-1.5 text-center">مقاس M</span>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-stone-400">الطول (cm):</span>
                          <input
                            type="number"
                            value={editLengthM}
                            onChange={(e) => setEditLengthM(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400">العرض (cm):</span>
                          <input
                            type="number"
                            value={editWidthM}
                            onChange={(e) => setEditWidthM(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                      <span className="text-xs font-bold text-amber-400 block mb-1.5 text-center">مقاس L</span>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-stone-400">الطول (cm):</span>
                          <input
                            type="number"
                            value={editLengthL}
                            onChange={(e) => setEditLengthL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400">العرض (cm):</span>
                          <input
                            type="number"
                            value={editWidthL}
                            onChange={(e) => setEditWidthL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                      <span className="text-xs font-bold text-amber-400 block mb-1.5 text-center">مقاس XL</span>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-stone-400">الطول (cm):</span>
                          <input
                            type="number"
                            value={editLengthXL}
                            onChange={(e) => setEditLengthXL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400">العرض (cm):</span>
                          <input
                            type="number"
                            value={editWidthXL}
                            onChange={(e) => setEditWidthXL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg">
                      <span className="text-xs font-bold text-amber-400 block mb-1.5 text-center">مقاس 2XL</span>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-stone-400">الطول (cm):</span>
                          <input
                            type="number"
                            value={editLength2XL}
                            onChange={(e) => setEditLength2XL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400">العرض (cm):</span>
                          <input
                            type="number"
                            value={editWidth2XL}
                            onChange={(e) => setEditWidth2XL(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full bg-stone-950 border border-stone-800 rounded px-2 py-1 text-xs text-center text-stone-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colors Management */}
                <div className="sm:col-span-2 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                      <Palette className="w-4 h-4" />
                      <span>الألوان المتاحة لهذا الهودي:</span>
                    </label>
                    <span className="text-[11px] text-stone-500">
                      ({editColors.length} لون متاح)
                    </span>
                  </div>

                  {/* List of current colors */}
                  {editColors.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {editColors.map((clr, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-xs text-stone-200"
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-stone-700 inline-block shrink-0"
                            style={{ backgroundColor: clr.hex }}
                          />
                          <span className="font-medium">{clr.name}</span>
                          <span className="text-[10px] text-stone-500 font-mono">({clr.hex})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEditColor(idx)}
                            className="text-stone-500 hover:text-rose-400 p-0.5 rounded transition-colors mr-1"
                            title="حذف هذا اللون"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">لم تتم إضافة ألوان بعد.</p>
                  )}

                  {/* Add New Color Row */}
                  <div className="pt-2 border-t border-stone-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="اسم اللون (مثال: أزرق نيلي، زيتي)"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-800 rounded-lg px-2 py-1">
                        <input
                          type="color"
                          value={newColorHex}
                          onChange={(e) => setNewColorHex(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-[11px] font-mono text-stone-400">{newColorHex}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEditColor}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة اللون</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Images Management */}
                <div className="sm:col-span-2 p-3.5 bg-stone-950/60 border border-stone-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>صور الهودي ({editImages.length} صور):</span>
                    </label>
                    <button
                      type="button"
                      disabled={isProcessingImages}
                      onClick={() => editProductFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-50 border border-dashed border-amber-500/50 hover:border-amber-400 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {isProcessingImages ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                          <span>جاري المعالجة...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع صور من الجهاز</span>
                        </>
                      )}
                    </button>
                  </div>

                  <input
                    ref={editProductFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleEditProductImageUploadFromDevice}
                    className="hidden"
                  />

                  {/* Thumbnails grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-1">
                    {editImages.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-[3/4] rounded-xl overflow-hidden border border-stone-800 bg-stone-950 group shadow-sm"
                      >
                        <img
                          src={img}
                          alt={`صورة ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeEditImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center shadow transition-all opacity-90 hover:opacity-100"
                          title="حذف هذه الصورة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] text-amber-400 font-bold">
                            الرئيسية
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 text-xs font-semibold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  id="save-edit-product-btn"
                  type="submit"
                  disabled={isSavingProduct || isProcessingImages}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold transition-colors shadow-md shadow-amber-950/40 flex items-center gap-2"
                >
                  {isSavingProduct ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحفظ والمزامنة السحابية...</span>
                    </>
                  ) : (
                    <span>حفظ التعديلات</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER ITEM INSPECTION & PRINT VERIFICATION MODAL */}
      {inspectingOrderItem && (() => {
        const item = inspectingOrderItem.item;
        const matchingProduct = products.find((p) => p.id === item.productId);
        const imagesList = Array.from(
          new Set([
            ...(item.images && item.images.length > 0 ? item.images : []),
            item.image,
            ...(matchingProduct?.images || [])
          ])
        ).filter(Boolean) as string[];

        const currentImg = imagesList[inspectingImageIndex] || imagesList[0] || '';
        const printSubtitle = item.subtitle || matchingProduct?.subtitle;
        const colorName = item.colorName || (matchingProduct?.colors && matchingProduct.colors[0]?.name);
        const colorHex = item.colorHex || (matchingProduct?.colors && matchingProduct.colors[0]?.hex) || '#171717';
        const currentStock = matchingProduct?.sizesStock?.[item.size];

        return (
          <div
            id="order-item-inspection-modal"
            className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in"
            onClick={() => setInspectingOrderItem(null)}
          >
            <div
              className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-800 bg-stone-950/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
                      <span>فحص وتأكيد تفاصيل القطعة المطلوبة</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/25">
                        #{inspectingOrderItem.orderNumber}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      العميل: <strong className="text-stone-200">{inspectingOrderItem.customerName}</strong> • {inspectingOrderItem.orderDate}
                    </p>
                  </div>
                </div>

                <button
                  id="close-order-inspection-modal-btn"
                  type="button"
                  onClick={() => setInspectingOrderItem(null)}
                  className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors"
                  title="إغلاق المعاينة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                  {/* Left Column: Image with gallery switcher */}
                  <div className="space-y-3">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-stone-800 bg-stone-950 shadow-inner group">
                      {currentImg ? (
                        <img
                          src={currentImg}
                          alt={item.productName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-600">
                          <ImageIcon className="w-12 h-12 mb-2" />
                          <span className="text-xs">لا توجد صورة</span>
                        </div>
                      )}

                      {/* Print Overlay Badge */}
                      {printSubtitle && (
                        <div className="absolute bottom-2 inset-x-2 bg-stone-950/90 backdrop-blur-md border border-stone-800 p-2 rounded-xl text-center shadow-lg">
                          <span className="text-[10px] text-stone-400 block">طبعة وتفاصيل الموديل:</span>
                          <span className="text-xs font-bold text-amber-400">{printSubtitle}</span>
                        </div>
                      )}
                    </div>

                    {/* Image thumbnails if multiple */}
                    {imagesList.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {imagesList.map((imgUrl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setInspectingImageIndex(i)}
                            className={`w-14 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                              (inspectingImageIndex === i || (!imagesList[inspectingImageIndex] && i === 0))
                                ? 'border-amber-500 scale-105 shadow-md shadow-amber-950/50'
                                : 'border-stone-800 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`زاوية ${i + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Exact Specifications */}
                  <div className="space-y-3.5 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Product Name & Subtitle */}
                      <div className="bg-stone-950/70 border border-stone-800/90 p-3.5 rounded-2xl space-y-1.5">
                        <div className="text-[11px] text-stone-400 font-semibold">اسم الموديل المطلوب:</div>
                        <h4 className="text-base font-black text-stone-100">{item.productName}</h4>
                        {printSubtitle ? (
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold flex items-center gap-2">
                            <span>🎨</span>
                            <span>الطباعة المحددة: <strong>{printSubtitle}</strong></span>
                          </div>
                        ) : (
                          <div className="text-xs text-stone-400">
                            الهودي بالتصميم الأساسي.
                          </div>
                        )}
                      </div>

                      {/* Color & Size & Quantity Grid */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Chosen Color */}
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <span className="text-[11px] text-stone-400">اللون المطلوب:</span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-stone-600 shadow-sm shrink-0"
                              style={{ backgroundColor: colorHex }}
                            />
                            <span className="font-bold text-xs text-stone-100">
                              {colorName || 'اللون الافتراضي'}
                            </span>
                          </div>
                        </div>

                        {/* Chosen Size */}
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <span className="text-[11px] text-stone-400">المقاس المطلوب:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-stone-950 font-black font-mono text-xs">
                              {item.size}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {item.size === 'M' ? 'وسط' : item.size === 'L' ? 'لارج' : item.size === 'XL' ? 'إكس لارج' : '2 إكس لارج'}
                            </span>
                          </div>
                        </div>

                        {/* Quantity */}
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <span className="text-[11px] text-stone-400">الكمية:</span>
                          <div className="font-mono font-black text-sm text-amber-400">
                            {item.quantity} {item.quantity > 1 ? 'قطع' : 'قطعة'}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <span className="text-[11px] text-stone-400">الإجمالي:</span>
                          <div className="font-mono font-black text-sm text-emerald-400">
                            {item.price * item.quantity} ج.م
                          </div>
                        </div>
                      </div>

                      {/* Catalog Inventory Match Status */}
                      {matchingProduct && (
                        <div className="bg-stone-950/70 border border-stone-800/90 p-3 rounded-2xl space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-stone-400">
                            <span>المخزون المتوفر لمقاس ({item.size}):</span>
                            <strong className={`font-mono text-xs px-2 py-0.5 rounded-md ${
                              (currentStock ?? 0) > 0
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            }`}>
                              {currentStock ?? 0} قطعة
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Close Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setInspectingOrderItem(null)}
                        className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-950/30"
                      >
                        <Check className="w-4 h-4" />
                        <span>تمت مراجعة تفاصيل القطعة</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
