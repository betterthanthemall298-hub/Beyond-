import { authFetch } from './authFetch';
import { Order } from '../types';

export interface DailyAnalyticsDoc {
  date: string; // YYYY-MM-DD
  visits: number;
  uniqueVisitors: number;
  cartAdditions: number;
  checkoutStarts: number;
  hourlyVisits?: Record<string, number>;
  hourlyCartAdds?: Record<string, number>;
  deviceTypes?: { mobile: number; desktop: number };
  topProducts?: Record<string, { name: string; count: number }>;
}

export interface AnalyticsSummary {
  period: 'today' | 'week' | 'month';
  totalVisits: number;
  uniqueVisitors: number;
  cartAdditions: number;
  abandonedCarts: number;
  abandonedCartRate: number; // percentage
  ordersCount: number;
  totalRevenue: number;
  conversionRate: number; // percentage (orders / uniqueVisitors)
  averageOrderValue: number;
  chartData: Array<{
    timeLabel: string;
    visits: number;
    cartAdds: number;
    orders: number;
    revenue: number;
  }>;
  funnelData: Array<{
    stage: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    mobilePercent: number;
    desktopPercent: number;
  };
  topProductsStats: Array<{
    name: string;
    addCount: number;
    salesCount: number;
    conversionRate: number;
  }>;
}

export function getTodayDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function sendTrack(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  // Fire-and-forget: analytics must never block or break the shopping experience
  try {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Track a page visit, once per browser tab per day.
 */
export async function trackVisit(): Promise<void> {
  if (typeof window === 'undefined') return;
  const today = getTodayDateString();
  if (sessionStorage.getItem(`beyond_visit_${today}`)) return;
  sessionStorage.setItem(`beyond_visit_${today}`, '1');
  sendTrack({ type: 'visit', isMobile: isMobileDevice() });
}

/**
 * Track add to cart event
 */
export async function trackAddToCart(item: { productId: string; productName: string; price: number }): Promise<void> {
  sendTrack({ type: 'cart_add', productId: item.productId, productName: item.productName });
}

/**
 * Track checkout initiation
 */
export async function trackInitiateCheckout(): Promise<void> {
  sendTrack({ type: 'checkout_start' });
}

/**
 * Order completion is derived from the orders themselves on the server,
 * so nothing needs to be tracked here. Kept so existing imports still work.
 */
export async function trackOrderCompleted(_order: { orderNumber: string; total: number }): Promise<void> {
  // no-op
}

function getDatesInRange(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(getTodayDateString(d));
  }
  return dates;
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/**
 * Fetch and aggregate analytics data for the admin dashboard.
 * All visit/cart/checkout numbers come from the server; order/revenue numbers
 * come from the live orders list already loaded in the store.
 */
export async function getAnalyticsSummary(
  period: 'today' | 'week' | 'month',
  realOrders: Order[]
): Promise<AnalyticsSummary> {
  const todayStr = getTodayDateString();
  const daysToFetch = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  const targetDates = getDatesInRange(daysToFetch);

  const dailyDataMap = new Map<string, DailyAnalyticsDoc>();
  try {
    const res = await authFetch(`/api/analytics/daily?days=${daysToFetch}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.days)) {
        data.days.forEach((d: DailyAnalyticsDoc) => {
          if (d && d.date) dailyDataMap.set(d.date, d);
        });
      }
    }
  } catch (err) {
    console.warn('Failed to load analytics from server:', err);
  }

  const now = new Date();
  const periodCutoff = new Date(now);
  if (period === 'today') periodCutoff.setHours(0, 0, 0, 0);
  else if (period === 'week') periodCutoff.setDate(periodCutoff.getDate() - 7);
  else periodCutoff.setDate(periodCutoff.getDate() - 30);

  const safeRealOrders = Array.isArray(realOrders) ? realOrders : [];
  const periodOrders = safeRealOrders.filter((o) => {
    if (!o || o.status === 'cancelled') return false;
    const od = new Date(o.createdAt);
    return od >= periodCutoff;
  });

  const periodOrdersCount = periodOrders.length;
  const periodRevenue = periodOrders.reduce((sum, o) => sum + (o?.total || 0), 0);
  const averageOrderValue = periodOrdersCount > 0 ? Math.round(periodRevenue / periodOrdersCount) : 0;

  let rawVisits = 0;
  let rawCartAdds = 0;
  let rawCheckoutStarts = 0;
  let mobileCount = 0;
  let desktopCount = 0;
  const productAddCounts: Record<string, { name: string; count: number }> = {};

  targetDates.forEach((dateStr) => {
    const d = dailyDataMap.get(dateStr);
    if (!d) return;
    rawVisits += d.visits || 0;
    rawCartAdds += d.cartAdditions || 0;
    rawCheckoutStarts += d.checkoutStarts || 0;
    mobileCount += d.deviceTypes?.mobile || 0;
    desktopCount += d.deviceTypes?.desktop || 0;
    if (d.topProducts) {
      Object.entries(d.topProducts).forEach(([pId, val]) => {
        if (!productAddCounts[pId]) productAddCounts[pId] = { name: val.name, count: 0 };
        productAddCounts[pId].count += val.count || 0;
      });
    }
  });

  const totalVisits = rawVisits;
  const uniqueVisitors = rawVisits;
  const cartAdditions = rawCartAdds;
  const checkoutStarts = rawCheckoutStarts;

  const abandonedCarts = Math.max(0, cartAdditions - periodOrdersCount);
  const abandonedCartRate = cartAdditions > 0 ? Math.round((abandonedCarts / cartAdditions) * 100) : 0;
  const conversionRate =
    totalVisits > 0 ? Number(((periodOrdersCount / totalVisits) * 100).toFixed(1)) : periodOrdersCount > 0 ? 100 : 0;

  const chartData: AnalyticsSummary['chartData'] = [];

  if (period === 'today') {
    const todayDoc = dailyDataMap.get(todayStr);
    for (let h = 0; h <= 23; h++) {
      const hourStr = String(h);
      const hourLabel = `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'ص' : 'م'}`;
      const hourVisits = todayDoc?.hourlyVisits?.[hourStr] || 0;
      let hourOrders = 0;
      let hourRevenue = 0;
      periodOrders.forEach((o) => {
        const od = new Date(o.createdAt);
        if (getTodayDateString(od) === todayStr && od.getHours() === h) {
          hourOrders++;
          hourRevenue += o.total || 0;
        }
      });
      chartData.push({
        timeLabel: hourLabel,
        visits: hourVisits,
        cartAdds: todayDoc?.hourlyCartAdds?.[hourStr] || 0,
        orders: hourOrders,
        revenue: hourRevenue
      });
    }
  } else {
    targetDates.forEach((dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const dayDoc = dailyDataMap.get(dateStr);
      let dayOrders = 0;
      let dayRevenue = 0;
      periodOrders.forEach((o) => {
        const od = new Date(o.createdAt);
        if (getTodayDateString(od) === dateStr) {
          dayOrders++;
          dayRevenue += o.total || 0;
        }
      });
      const label =
        period === 'week'
          ? `${ARABIC_DAYS[new Date(year, month - 1, day).getDay()]} (${day}/${month})`
          : `${day}/${month}`;
      chartData.push({
        timeLabel: label,
        visits: dayDoc?.visits || 0,
        cartAdds: dayDoc?.cartAdditions || 0,
        orders: dayOrders,
        revenue: dayRevenue
      });
    });
  }

  const totalDeviceLogs = mobileCount + desktopCount;
  const mobilePercent = totalDeviceLogs > 0 ? Math.round((mobileCount / totalDeviceLogs) * 100) : 0;
  const desktopPercent = totalDeviceLogs > 0 ? 100 - mobilePercent : 0;

  const funnelData = [
    { stage: 'إجمالي الزيارات', count: totalVisits, percentage: totalVisits > 0 ? 100 : 0, color: '#f59e0b' },
    {
      stage: 'إضافة للسلة',
      count: cartAdditions,
      percentage: totalVisits > 0 ? Math.min(100, Math.round((cartAdditions / totalVisits) * 100)) : 0,
      color: '#3b82f6'
    },
    {
      stage: 'بدء إتمام الطلب',
      count: checkoutStarts,
      percentage: totalVisits > 0 ? Math.min(100, Math.round((checkoutStarts / totalVisits) * 100)) : 0,
      color: '#a855f7'
    },
    {
      stage: 'تأكيد الشراء الفعلي',
      count: periodOrdersCount,
      percentage:
        totalVisits > 0 ? Math.min(100, Math.round((periodOrdersCount / totalVisits) * 100)) : periodOrdersCount > 0 ? 100 : 0,
      color: '#10b981'
    }
  ];

  const productSalesCount: Record<string, { name: string; sales: number }> = {};
  periodOrders.forEach((o) => {
    o.items?.forEach((it) => {
      const pName = it.productName || 'منتج';
      if (!productSalesCount[pName]) productSalesCount[pName] = { name: pName, sales: 0 };
      productSalesCount[pName].sales += it.quantity || 1;
    });
  });

  const topProductsStats: AnalyticsSummary['topProductsStats'] = Object.values(productSalesCount).map((p) => {
    const recordedAdds = productAddCounts[p.name]?.count || 0;
    const addCount = Math.max(p.sales, recordedAdds);
    return { name: p.name, salesCount: p.sales, addCount, conversionRate: addCount > 0 ? Math.round((p.sales / addCount) * 100) : 0 };
  });
  topProductsStats.sort((a, b) => b.salesCount - a.salesCount);

  return {
    period,
    totalVisits,
    uniqueVisitors,
    cartAdditions,
    abandonedCarts,
    abandonedCartRate,
    ordersCount: periodOrdersCount,
    totalRevenue: periodRevenue,
    conversionRate,
    averageOrderValue,
    chartData,
    funnelData,
    deviceBreakdown: { mobile: mobileCount, desktop: desktopCount, mobilePercent, desktopPercent },
    topProductsStats: topProductsStats.slice(0, 5)
  };
}
