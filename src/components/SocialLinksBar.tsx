import React from 'react';
import { useStore } from '../store/useStore';
import { MessageCircle, Instagram, Facebook } from 'lucide-react';

export const SocialLinksBar: React.FC = () => {
  const { settings } = useStore();

  const socialLinks = [
    {
      id: 'instagram',
      name: 'إنستجرام',
      subtitle: 'تابع الكولكشن الجديد والستوري اليومي',
      url: settings.instagramUrl || 'https://instagram.com',
      icon: <Instagram className="w-5 h-5 text-rose-400" />,
      badgeClass: 'hover:border-rose-800/60 hover:bg-rose-950/20'
    },
    {
      id: 'tiktok',
      name: 'تيك توك',
      subtitle: 'فيديوهات تفاصيل الخامة والمقاسات ع الطبيعة',
      url: settings.tiktokUrl || 'https://tiktok.com',
      icon: (
        <svg
          className="w-5 h-5 text-cyan-400 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.47 6.28 6.28 0 0 0 1.87-4.47V8.52a8.27 8.27 0 0 0 4.9 1.62V6.69z" />
        </svg>
      ),
      badgeClass: 'hover:border-cyan-800/60 hover:bg-cyan-950/20'
    },
    {
      id: 'whatsapp',
      name: 'واتساب',
      subtitle: 'تواصل مباشر للطلبات والاستفسارات الفورية',
      url:
        settings.whatsappUrl ||
        (settings.whatsappNumber ? `https://wa.me/${settings.whatsappNumber}` : 'https://wa.me'),
      icon: <MessageCircle className="w-5 h-5 text-emerald-400" />,
      badgeClass: 'hover:border-emerald-800/60 hover:bg-emerald-950/20'
    },
    {
      id: 'facebook',
      name: 'فيسبوك',
      subtitle: 'مجتمع عملاء نوكتورن والمراجعات الحصرية',
      url: settings.facebookUrl || 'https://facebook.com',
      icon: <Facebook className="w-5 h-5 text-blue-400" />,
      badgeClass: 'hover:border-blue-800/60 hover:bg-blue-950/20'
    }
  ];

  return (
    <section id="social-channels-section" className="py-12 border-t border-stone-800/80 bg-stone-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h3 className="text-xl sm:text-2xl font-black text-stone-100">
            تواصل وتابع نوكتورن على منصاتنا
          </h3>
          <p className="text-xs sm:text-sm text-stone-400 mt-2">
            تابع مقاطع الفيديو والتصوير الواقعي للهوديز والتحديثات اليومية لأحدث القطع
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {socialLinks.map((item) => (
            <a
              key={item.id}
              id={`social-link-${item.id}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-4 rounded-2xl bg-stone-900/60 border border-stone-800/80 transition-all duration-300 flex items-center gap-3.5 group shadow-lg ${item.badgeClass}`}
            >
              <div className="w-12 h-12 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-stone-200 group-hover:text-white transition-colors">
                    {item.name}
                  </h4>
                  <span className="text-[10px] text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    زيارة ↗
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 truncate mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
