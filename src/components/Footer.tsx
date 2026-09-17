import React from 'react';
import { useStore } from '../store/useStore';
import {
  MessageCircle,
  Lock,
  ArrowUp,
  Instagram,
  Facebook,
  ShoppingBag
} from 'lucide-react';

export const Footer: React.FC = () => {
  const { setActiveView, settings } = useStore();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const whatsappHref =
    settings.whatsappUrl ||
    (settings.whatsappNumber ? `https://wa.me/${settings.whatsappNumber}` : 'https://wa.me');

  const storeInitial = (settings.storeName || 'N').trim().charAt(0).toUpperCase();

  return (
    <footer className="bg-stone-950 border-t border-stone-800/80 pt-12 pb-8 text-stone-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-10 border-b border-stone-800/80">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              {settings.brandLogo ? (
                <div className="h-9 flex items-center justify-center">
                  <img
                    src={settings.brandLogo}
                    alt={settings.storeName || 'Brand Logo'}
                    className="max-h-9 max-w-[120px] object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-stone-900 border border-amber-600/40 flex items-center justify-center">
                  <span className="font-serif font-black text-amber-400 text-lg">{storeInitial}</span>
                </div>
              )}
              <span className="text-lg font-black text-stone-100 tracking-wider">
                {settings.storeName || 'NOCTURNE HOODIES'}
              </span>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed max-w-md">
              متجر متخصص في تقديم هوديز الأوفر سايز الراقية والمريحة بأعلى معايير الأناقة والجودة.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-stone-200 text-sm">روابط المتجر</h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('home');
                    scrollToTop();
                  }}
                  className="hover:text-amber-400 transition-colors"
                >
                  الرئيسية
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('catalog');
                    scrollToTop();
                  }}
                  className="hover:text-amber-400 transition-colors"
                >
                  تشكيلة الهوديز الشتوية
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('cart');
                    scrollToTop();
                  }}
                  className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>سلة المشتريات</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('tracking');
                    scrollToTop();
                  }}
                  className="hover:text-amber-400 transition-colors"
                >
                  تتبع حالة الشحنة
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('reviews');
                    scrollToTop();
                  }}
                  className="hover:text-amber-400 transition-colors"
                >
                  آراء وتجارب العملاء
                </button>
              </li>
              <li className="pt-2">
                <button
                  id="footer-admin-login-btn"
                  type="button"
                  onClick={() => {
                    setActiveView('admin');
                    scrollToTop();
                  }}
                  className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-300 text-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>دخول لوحة الإدارة</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Centered Social Media Section (في نص الشاشة) */}
        <div className="py-8 border-b border-stone-800/80 flex flex-col items-center justify-center text-center">
          <span className="text-xs sm:text-sm font-bold text-stone-200 mb-3 tracking-wide">
            تواصل معنا وتابع حسابات المتجر الرسمية
          </span>
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            {/* Instagram */}
            <a
              id="footer-social-instagram"
              href={settings.instagramUrl || 'https://instagram.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl bg-stone-900 border border-stone-800 hover:border-rose-600/70 hover:bg-rose-950/40 text-stone-300 hover:text-rose-400 flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
              title="إنستجرام"
            >
              <Instagram className="w-5 h-5" />
            </a>

            {/* WhatsApp */}
            <a
              id="footer-social-whatsapp"
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl bg-stone-900 border border-stone-800 hover:border-emerald-600/70 hover:bg-emerald-950/40 text-stone-300 hover:text-emerald-400 flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
              title="واتساب"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>

            {/* TikTok */}
            <a
              id="footer-social-tiktok"
              href={settings.tiktokUrl || 'https://tiktok.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl bg-stone-900 border border-stone-800 hover:border-cyan-600/70 hover:bg-cyan-950/40 text-stone-300 hover:text-cyan-400 flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
              title="تيك توك"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.28 6.28 0 0 0 1.87-4.47V8.52a8.27 8.27 0 0 0 4.9 1.62V6.69z" />
              </svg>
            </a>

            {/* Facebook */}
            <a
              id="footer-social-facebook"
              href={settings.facebookUrl || 'https://facebook.com'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-2xl bg-stone-900 border border-stone-800 hover:border-blue-600/70 hover:bg-blue-950/40 text-stone-300 hover:text-blue-400 flex items-center justify-center transition-all duration-300 shadow-lg hover:scale-105"
              title="فيسبوك"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-500 text-[11px]">
          <p>© 2026 نوكتورن هوديز (Nocturne Hoodies). جميع الحقوق محفوظة.</p>
          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1 hover:text-stone-300 transition-colors"
          >
            <span>العودة للأعلى</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
