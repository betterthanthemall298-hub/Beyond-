import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  ShoppingBag,
  Heart,
  Search,
  SlidersHorizontal,
  Package,
  ShieldCheck,
  Lock,
  MessageCircle,
  Menu,
  X
} from 'lucide-react';
import { ActiveView } from '../types';

export const Navbar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    getCartItemsCount,
    setIsCartOpen,
    wishlist,
    setIsWishlistOpen,
    searchQuery,
    setSearchQuery,
    settings,
    isAdminLoggedIn
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = getCartItemsCount();
  const wishlistCount = wishlist.length;

  const storeInitial = (settings.storeName || 'Beyond').trim().charAt(0).toUpperCase();

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-950/95 backdrop-blur-md border-b border-stone-800/80">
      {/* Top Announcement Bar - Calm, luxurious dark stone with amber highlight, NOT garish */}
      <div className="bg-stone-900/90 text-stone-300 border-b border-stone-800/60 py-1.5 px-4 text-center text-xs font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <span className="text-amber-400 font-bold">{settings.storeName || 'Beyond'}</span>
          <span className="text-stone-600">|</span>
          <span className="truncate">{settings.announcementText}</span>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3 sm:gap-6">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
            onClick={() => handleNavClick('home')}
          >
            {settings.brandLogo ? (
              <div className="h-10 sm:h-11 flex items-center justify-center">
                <img
                  src={settings.brandLogo}
                  alt={settings.storeName || 'Beyond Logo'}
                  className="max-h-10 sm:max-h-11 max-w-[120px] sm:max-w-[140px] object-contain rounded-lg"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stone-800 to-stone-900 border border-amber-600/40 flex items-center justify-center shadow-lg shadow-black/60">
                <span className="font-serif font-black text-amber-400 text-xl tracking-tighter">{storeInitial}</span>
              </div>
            )}
            <div>
              <span className="text-base sm:text-xl font-black text-stone-100 tracking-wide font-['Tajawal'] line-clamp-1">
                {settings.storeName || 'Beyond'}
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              id="nav-home-btn"
              type="button"
              onClick={() => handleNavClick('home')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'home'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              الرئيسية
            </button>
            <button
              id="nav-catalog-btn"
              type="button"
              onClick={() => handleNavClick('catalog')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeView === 'catalog'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              الهوديز
            </button>
            <button
              id="nav-tracking-btn"
              type="button"
              onClick={() => handleNavClick('tracking')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'tracking'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>تتبع طلبك</span>
            </button>
            <button
              id="nav-reviews-btn"
              type="button"
              onClick={() => handleNavClick('reviews')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'reviews'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'text-stone-300 hover:text-white hover:bg-stone-900'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-amber-400" />
              <span>آراء العملاء</span>
            </button>
          </nav>

          {/* Action Icons (Wishlist, Cart, Admin) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Wishlist Button -> Open Dedicated Wishlist Page */}
            <button
              id="navbar-wishlist-btn"
              type="button"
              onClick={() => handleNavClick('wishlist')}
              className={`relative p-2.5 rounded-xl border transition-all ${
                activeView === 'wishlist'
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                  : 'bg-stone-900 border-stone-800 text-stone-300 hover:text-rose-400 hover:border-stone-700'
              }`}
              title="المنتجات المفضلة"
            >
              <Heart className={`w-5 h-5 ${wishlistCount > 0 ? 'text-rose-400 fill-rose-400/30' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart Button */}
            <button
              id="navbar-cart-btn"
              type="button"
              onClick={() => handleNavClick('cart')}
              className={`relative p-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                activeView === 'cart'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-stone-900 border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-700/60'
              }`}
              title="سلة المشتريات"
            >
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <span className="hidden sm:inline text-xs font-bold text-stone-200">السلة</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[11px] font-extrabold flex items-center justify-center shadow-md">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Admin Dashboard Entry */}
            <button
              id="navbar-admin-btn"
              type="button"
              onClick={() => handleNavClick('admin')}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-medium ${
                activeView === 'admin'
                  ? 'bg-amber-950/40 border-amber-600/60 text-amber-300'
                  : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
              }`}
              title="لوحة الإدارة"
            >
              <Lock className="w-4 h-4" />
              <span className="hidden md:inline">الإدارة</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              id="mobile-menu-toggle-btn"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="lg:hidden pb-3">
          <div className="relative">
            <input
              id="mobile-search-input"
              type="text"
              placeholder="ابحث عن هودي، لون، مقاس..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeView !== 'catalog') setActiveView('catalog');
              }}
              className="w-full bg-stone-900/90 border border-stone-800 rounded-xl px-3 py-2 pl-9 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-800/80 py-3 space-y-1.5">
            <button
              type="button"
              onClick={() => handleNavClick('home')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-semibold ${
                activeView === 'home' ? 'bg-amber-500/10 text-amber-400' : 'text-stone-300 hover:bg-stone-900'
              }`}
            >
              الرئيسية
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('catalog')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-semibold ${
                activeView === 'catalog' ? 'bg-amber-500/10 text-amber-400' : 'text-stone-300 hover:bg-stone-900'
              }`}
            >
              الهوديز
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('tracking')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                activeView === 'tracking' ? 'bg-amber-500/10 text-amber-400' : 'text-stone-300 hover:bg-stone-900'
              }`}
            >
              <span>تتبع الطلب</span>
              <Package className="w-4 h-4 text-stone-500" />
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('cart')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                activeView === 'cart' ? 'bg-amber-500/10 text-amber-400' : 'text-stone-300 hover:bg-stone-900'
              }`}
            >
              <span>السلة {cartCount > 0 ? `(${cartCount})` : ''}</span>
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('reviews')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                activeView === 'reviews' ? 'bg-amber-500/10 text-amber-400' : 'text-stone-300 hover:bg-stone-900'
              }`}
            >
              <span>آراء وتجارب العملاء</span>
              <MessageCircle className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('admin')}
              className={`w-full text-right px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                activeView === 'admin' ? 'bg-amber-500/10 text-amber-400' : 'text-stone-300 hover:bg-stone-900'
              }`}
            >
              <span>لوحة الإدارة الشاملة</span>
              <Lock className="w-4 h-4 text-stone-500" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
