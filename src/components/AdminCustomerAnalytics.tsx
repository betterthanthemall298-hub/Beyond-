import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingCart,
  ShoppingBag,
  TrendingUp,
  Percent,
  Smartphone,
  Laptop,
  ArrowUpRight,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { useStore } from '../store/useStore';
import { getAnalyticsSummary, AnalyticsSummary } from '../lib/analytics';

export const AdminCustomerAnalytics: React.FC = () => {
  const { orders } = useStore();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async (selectedPeriod: 'today' | 'week' | 'month') => {
    setIsLoading(true);
    try {
      const summary = await getAnalyticsSummary(selectedPeriod, orders);
      setData(summary);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period, orders]);

  return (
    <div id="admin-customer-analytics-section" className="space-y-6">
      {/* Header and Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/80 border border-stone-800 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="w-4 h-4" />
            </span>
            <h2 className="text-base font-extrabold text-stone-100">تحليل العملاء وأداء المتجر</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-bold">
              مباشر وخفيف
            </span>
          </div>
          <p className="text-xs text-stone-400">
            متابعة حركة الزوار، السلات المتروكة، ومسار التحويل البيعي بدقة ورسومات تفاعلية سريعة.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2 bg-stone-950 p-1.5 rounded-xl border border-stone-800 self-start sm:self-auto">
          <button
            id="analytics-tab-today"
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'today'
                ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            اليوم (24 ساعة)
          </button>
          <button
            id="analytics-tab-week"
            type="button"
            onClick={() => setPeriod('week')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'week'
                ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            هذا الأسبوع
          </button>
          <button
            id="analytics-tab-month"
            type="button"
            onClick={() => setPeriod('month')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              period === 'month'
                ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            هذا الشهر
          </button>

          <button
            type="button"
            onClick={() => loadData(period)}
            title="تحديث البيانات"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Unique Visitors */}
        <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-2xl relative overflow-hidden group hover:border-stone-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-400">إجمالي الزوار</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-stone-100">
              {data ? data.uniqueVisitors.toLocaleString() : '...'}
            </span>
            <span className="text-[11px] text-stone-400">عميل فريد</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-stone-400">
            <span>إجمالي الزيارات:</span>
            <span className="font-mono text-stone-300 font-bold">{data?.totalVisits || 0}</span>
          </div>
        </div>

        {/* Card 2: Add to Cart */}
        <div className="bg-stone-900/60 border border-stone-800 p-4 rounded-2xl relative overflow-hidden group hover:border-stone-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-400">أضافوا للسلة</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-400">
              {data ? data.cartAdditions.toLocaleString() : '...'}
            </span>
            <span className="text-[11px] text-stone-400">عميل</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-stone-400">
            <span>نسبة الإضافة للسلة:</span>
            <span className="font-mono text-amber-400 font-bold">
              {data && data.totalVisits > 0
                ? `${Math.round((data.cartAdditions / data.totalVisits) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: Abandoned Carts (Requested Feature) */}
        <div className="bg-rose-950/20 border border-rose-900/30 p-4 rounded-2xl relative overflow-hidden group hover:border-rose-800/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-rose-300">سلات متروكة (لم يؤكدوا)</span>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-rose-400">
              {data ? data.abandonedCarts.toLocaleString() : '...'}
            </span>
            <span className="text-[11px] text-rose-300/80">عميل ترك السلة</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-rose-900/30 flex items-center justify-between text-[11px]">
            <span className="text-rose-300/70">معدل السلات المتروكة:</span>
            <span className="font-mono text-rose-400 font-extrabold">{data?.abandonedCartRate || 0}%</span>
          </div>
        </div>

        {/* Card 4: Orders & Conversion */}
        <div className="bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-800/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-300">الطلبات المؤكدة</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {data ? data.ordersCount.toLocaleString() : '...'}
            </span>
            <span className="text-[11px] text-emerald-300/80">أوردر ناجح</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-emerald-900/30 flex items-center justify-between text-[11px]">
            <span className="text-emerald-300/70">معدل التحويل (Conversion):</span>
            <span className="font-mono text-emerald-400 font-extrabold">{data?.conversionRate || 0}%</span>
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-900/40 border border-stone-800/80 p-3.5 rounded-2xl">
        <div className="text-center sm:text-right border-l border-stone-800 last:border-none pl-3">
          <span className="text-[10px] text-stone-500 block mb-0.5">إجمالي المبيعات</span>
          <span className="text-sm font-black font-mono text-stone-200">
            {data ? data.totalRevenue.toLocaleString() : 0} ج.م
          </span>
        </div>
        <div className="text-center sm:text-right border-l border-stone-800 last:border-none pl-3">
          <span className="text-[10px] text-stone-500 block mb-0.5">متوسط قيمة الأوردر</span>
          <span className="text-sm font-black font-mono text-amber-400">
            {data ? data.averageOrderValue.toLocaleString() : 0} ج.م
          </span>
        </div>
        <div className="text-center sm:text-right border-l border-stone-800 last:border-none pl-3">
          <span className="text-[10px] text-stone-500 block mb-0.5">تصفح الموبايل</span>
          <span className="text-sm font-black font-mono text-stone-200">
            {data ? `${data.deviceBreakdown.mobilePercent}%` : '85%'}
          </span>
        </div>
        <div className="text-center sm:text-right">
          <span className="text-[10px] text-stone-500 block mb-0.5">تصفح الكمبيوتر</span>
          <span className="text-sm font-black font-mono text-stone-400">
            {data ? `${data.deviceBreakdown.desktopPercent}%` : '15%'}
          </span>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): Interactive Traffic & Activity Chart */}
        <div className="lg:col-span-2 bg-stone-900/60 border border-stone-800 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                  <span>منحنى الزيارات مقابل السلات المتروكة والطلبات</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400">
                    {period === 'today' ? 'مدار 24 ساعة اليوم' : period === 'week' ? 'أيام الأسبوع' : 'أيام الشهر'}
                  </span>
                </h3>
                <p className="text-xs text-stone-500">
                  {period === 'today'
                    ? 'يعرض توزيع ساعات الذروة لنشاط زوارك وإضافاتهم للسلة'
                    : 'تتبع تصاعد الزيارات والأوردرات اليومية'}
                </p>
              </div>

              {/* Legend Badges */}
              <div className="flex items-center gap-3 text-[11px] self-start sm:self-auto">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  الزيارات
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  إضافة للسلة
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  الطلبات
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-2">
              {data && data.chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCartAdds" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis
                      dataKey="timeLabel"
                      stroke="#737373"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#404040' }}
                    />
                    <YAxis
                      stroke="#737373"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#404040' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#404040',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#f5f5f5',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                      }}
                      labelStyle={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '4px' }}
                      formatter={(val: any, name: string) => {
                        const labels: Record<string, string> = {
                          visits: 'الزيارات',
                          cartAdds: 'إضافة للسلة',
                          orders: 'الطلبات المؤكدة',
                          revenue: 'الإيراد'
                        };
                        return [val, labels[name] || name];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorVisits)"
                    />
                    <Area
                      type="monotone"
                      dataKey="cartAdds"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCartAdds)"
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-stone-500">
                  جاري تجهيز الرسم البياني...
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between text-xs text-stone-400 gap-2">
            <span className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>أوقات الذروة عادةً ما تكون بين 7:00 م و 11:30 م بتوقيت مصر</span>
            </span>
            <span className="text-[11px] text-stone-500">تحديث تلقائي لحظة بلحظة</span>
          </div>
        </div>

        {/* Right (1 col): Conversion Funnel */}
        <div className="bg-stone-900/60 border border-stone-800 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                <span>مسار التحويل (Funnel)</span>
              </h3>
              <span className="text-[10px] text-stone-400">من الزيارة للشراء</span>
            </div>
            <p className="text-xs text-stone-400 mb-5">
              متابعة تدرج العملاء واكتشاف مرحلة التسرب بدقة لمعرفة سبب عدم تأكيد الطلب:
            </p>

            {/* Funnel Visual Steps */}
            <div className="space-y-4">
              {data?.funnelData.map((step, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-300">{step.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-stone-400 text-[11px]">{step.count} عميل</span>
                      <span className="font-mono font-bold text-stone-100 bg-stone-800 px-2 py-0.5 rounded text-[10px]">
                        {step.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-stone-950 h-2.5 rounded-full overflow-hidden border border-stone-800">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(4, step.percentage)}%`,
                        backgroundColor: step.color
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Funnel Dropoff / Opportunity Box */}
          <div className="mt-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>فرصة سريعة لزيادة المبيعات:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-200/80">
              لديك <strong className="text-amber-300 font-mono">{data?.abandonedCarts || 0}</strong> عميل أضافوا الهودي للسلة ولم يكملوا. نسبة نجاح إرجاعهم تزيد عند إظهار عرض شحن مجاني أو كود خصم في شريط الإعلانات أعلى المتجر!
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Added Products & Device Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Added & Abandoned Products */}
        <div className="lg:col-span-2 bg-stone-900/60 border border-stone-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-100">أكثر المنتجات تفاعلاً وإضافة للسلة</h3>
              <p className="text-xs text-stone-400">المنتجات الأكثر جذباً للعملاء ونسب تحويلها لطلبات فعلية</p>
            </div>
            <span className="text-[11px] text-amber-400 font-semibold">أفضل 5 منتجات</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-500 text-[11px]">
                  <th className="pb-3 font-semibold">اسم المنتج</th>
                  <th className="pb-3 font-semibold text-center">مرات الإضافة للسلة</th>
                  <th className="pb-3 font-semibold text-center">الطلبات المكتملة</th>
                  <th className="pb-3 font-semibold text-center">نسبة التحويل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {data?.topProductsStats.map((prod, idx) => (
                  <tr key={idx} className="hover:bg-stone-800/30 transition-colors">
                    <td className="py-3 font-semibold text-stone-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 flex items-center justify-center text-[10px] font-mono">
                        {idx + 1}
                      </span>
                      <span>{prod.name}</span>
                    </td>
                    <td className="py-3 text-center font-mono text-amber-400 font-bold">
                      {prod.addCount}
                    </td>
                    <td className="py-3 text-center font-mono text-emerald-400 font-bold">
                      {prod.salesCount}
                    </td>
                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono text-[10px] font-bold">
                        {prod.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Breakdown & Smart Advice */}
        <div className="bg-stone-900/60 border border-stone-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-stone-100 mb-1">توزيع أجهزة الزوار</h3>
            <p className="text-xs text-stone-400 mb-4">نوع الجهاز المستخدم أثناء تصفح المتجر</p>

            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-200 block">الهواتف الذكية (Mobile)</span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {data ? data.deviceBreakdown.mobile : 0} زيارة
                    </span>
                  </div>
                </div>
                <span className="text-base font-black font-mono text-amber-400">
                  {data ? `${data.deviceBreakdown.mobilePercent}%` : '85%'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-200 block">الكمبيوتر واللابتوب</span>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {data ? data.deviceBreakdown.desktop : 0} زيارة
                    </span>
                  </div>
                </div>
                <span className="text-base font-black font-mono text-stone-300">
                  {data ? `${data.deviceBreakdown.desktopPercent}%` : '15%'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-800/80 text-[11px] text-stone-400 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              تصميم المتجر خفيف ومهيأ بنسبة 100% للسرعة الفائقة على شبكات الموبايل 4G/5G بدون استهلاك باقة العميل.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
