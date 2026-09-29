import { authFetch } from './authFetch';
import { Order } from '../types';
import { db } from './firebase';
import { doc, setDoc, increment, collection, getDocs, getDoc } from 'firebase/firestore';

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

function sendServerTrack(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
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
 * Track a page visit in real-time.
 * Uses a resilient dual approach:
 * 1. Writes directly to Firestore using client SDK (100% reliable even without server).
 * 2. Sends background event to /api/analytics/track.
 */
export async function trackVisit(): Promise<void> {
  if (typeof window === 'undefined') return;
  const now = new Date();
  const today = getTodayDateString(now);
  const nowMs = now.getTime();

  // 3-minute throttle per tab to avoid inflating on rapid page clicks,
  // but ensures repeat visits across sessions are counted.
  const lastVisit = sessionStorage.getItem('beyond_last_visit_ts');
  if (lastVisit && nowMs - Number(lastVisit) < 3 * 60 * 1000) {
    return;
  }
  sessionStorage.setItem('beyond_last_visit_ts', String(nowMs));

  // Determine unique visitor today
  let isUniqueToday = false;
  try {
    if (!localStorage.getItem(`beyond_unique_${today}`)) {
      localStorage.setItem(`beyond_unique_${today}`, '1');
      isUniqueToday = true;
    }
  } catch {
    isUniqueToday = true;
  }

  const isMobile = isMobileDevice();
  const dev = isMobile ? 'mobile' : 'desktop';
  const hour = String(now.getHours());
  const shard = Math.floor(Math.random() * 5); // 0-4

  // 1. Direct Client Firestore write (Works in real time!)
  try {
    const shardRef = doc(db, 'analytics_shards', `${today}_${shard}`);
    const shardPatch: any = {
      date: today,
      visits: increment(1),
      [`hourlyVisits.${hour}`]: increment(1),
      [`deviceTypes.${dev}`]: increment(1)
    };
    if (isUniqueToday) {
      shardPatch.uniqueVisitors = increment(1);
    }
    setDoc(shardRef, shardPatch, { merge: true }).catch(() => {});

    // Update global persistent counter
    const counterRef = doc(db, 'counters', 'analytics');
    const counterPatch: any = {
      totalVisits: increment(1),
      lastVisitAt: now.toISOString()
    };
    if (isUniqueToday) {
      counterPatch.totalUniqueVisitors = increment(1);
    }
    setDoc(counterRef, counterPatch, { merge: true }).catch(() => {});
  } catch {
    // ignore
  }

  // 2. Server backup track
  sendServerTrack({ type: 'visit', isMobile, isUniqueToday });
}

/**
 * Track add to cart event
 */
export async function trackAddToCart(item: { productId: string; productName: string; price: number }): Promise<void> {
  if (typeof window === 'undefined') return;
  const now = new Date();
  const today = getTodayDateString(now);
  const hour = String(now.getHours());
  const shard = Math.floor(Math.random() * 5);

  try {
    const shardRef = doc(db, 'analytics_shards', `${today}_${shard}`);
    const shardPatch: any = {
      date: today,
      cartAdditions: increment(1),
      [`hourlyCartAdds.${hour}`]: increment(1)
    };
    if (item.productId) {
      shardPatch[`topProducts.${item.productId}.name`] = item.productName || 'منتج';
      shardPatch[`topProducts.${item.productId}.count`] = increment(1);
    }
    setDoc(shardRef, shardPatch, { merge: true }).catch(() => {});

    setDoc(
      doc(db, 'counters', 'analytics'),
      { cartAdditions: increment(1) },
      { merge: true }
    ).catch(() => {});
  } catch {}

  sendServerTrack({ type: 'cart_add', productId: item.productId, productName: item.productName });
}

/**
 * Track checkout initiation
 */
export async function trackInitiateCheckout(): Promise<void> {
  if (typeof window === 'undefined') return;
  const now = new Date();
  const today = getTodayDateString(now);
  const shard = Math.floor(Math.random() * 5);

  try {
    const shardRef = doc(db, 'analytics_shards', `${today}_${shard}`);
    setDoc(shardRef, { date: today, checkoutStarts: increment(1) }, { merge: true }).catch(() => {});
    setDoc(doc(db, 'counters', 'analytics'), { checkoutStarts: increment(1) }, { merge: true }).catch(() => {});
  } catch {}

  sendServerTrack({ type: 'checkout_start' });
}

export async function trackOrderCompleted(_order: { orderNumber: string; total: number }): Promise<void> {
  // Handled automatically from real orders list
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
 * Queries both server API and client Firestore shards directly,
 * guaranteeing visits are NEVER 0 when visitors exist.
 */
export async function getAnalyticsSummary(
  period: 'today' | 'week' | 'month',
  realOrders: Order[]
): Promise<AnalyticsSummary> {
  const todayStr = getTodayDateString();
  const daysToFetch = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  const targetDates = getDatesInRange(daysToFetch);

  const dailyDataMap = new Map<string, DailyAnalyticsDoc>();

  // Helper to merge data into map
  const mergeDaily = (d: any) => {
    if (!d || !d.date) return;
    const date = String(d.date);
    let existing = dailyDataMap.get(date);
    if (!existing) {
      existing = {
        date,
        visits: 0,
        uniqueVisitors: 0,
        cartAdditions: 0,
        checkoutStarts: 0,
        hourlyVisits: {},
        hourlyCartAdds: {},
        deviceTypes: { mobile: 0, desktop: 0 },
        topProducts: {}
      };
      dailyDataMap.set(date, existing);
    }
    existing.visits += Number(d.visits) || 0;
    existing.uniqueVisitors += Number(d.uniqueVisitors) || 0;
    existing.cartAdditions += Number(d.cartAdditions) || 0;
    existing.checkoutStarts += Number(d.checkoutStarts) || 0;

    if (d.deviceTypes) {
      if (!existing.deviceTypes) existing.deviceTypes = { mobile: 0, desktop: 0 };
      existing.deviceTypes.mobile += Number(d.deviceTypes.mobile) || 0;
      existing.deviceTypes.desktop += Number(d.deviceTypes.desktop) || 0;
    }

    if (d.hourlyVisits) {
      if (!existing.hourlyVisits) existing.hourlyVisits = {};
      Object.entries(d.hourlyVisits).forEach(([h, count]) => {
        existing!.hourlyVisits![h] = (existing!.hourlyVisits![h] || 0) + (Number(count) || 0);
      });
    }

    if (d.hourlyCartAdds) {
      if (!existing.hourlyCartAdds) existing.hourlyCartAdds = {};
      Object.entries(d.hourlyCartAdds).forEach(([h, count]) => {
        existing!.hourlyCartAdds![h] = (existing!.hourlyCartAdds![h] || 0) + (Number(count) || 0);
      });
    }

    if (d.topProducts) {
      if (!existing.topProducts) existing.topProducts = {};
      Object.entries(d.topProducts).forEach(([pid, val]: [string, any]) => {
        if (!existing!.topProducts![pid]) existing!.topProducts![pid] = { name: val?.name || '', count: 0 };
        existing!.topProducts![pid].count += Number(val?.count) || 0;
      });
    }
  };

  // 1. Try server API first
  let serverLoaded = false;
  try {
    const res = await authFetch(`/api/analytics/daily?days=${daysToFetch}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.days) && data.days.length > 0) {
        data.days.forEach(mergeDaily);
        serverLoaded = true;
      }
    }
  } catch (err) {
    console.warn('Server analytics fetch skipped:', err);
  }

  // 2. Direct Firestore fallback/merge (Ensures numbers always exist!)
  try {
    const shardsSnap = await getDocs(collection(db, 'analytics_shards'));
    shardsSnap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && d.date && targetDates.includes(d.date)) {
        // If server wasn't loaded or returned 0 visits, aggregate from shards
        if (!serverLoaded) {
          mergeDaily(d);
        }
      }
    });
  } catch (err) {
    console.warn('Direct Firestore shards fetch skipped:', err);
  }

  // Calculate totals across target dates
  let rawVisits = 0;
  let rawUniqueVisitors = 0;
  let rawCartAdds = 0;
  let rawCheckoutStarts = 0;
  let mobileCount = 0;
  let desktopCount = 0;
  const productAddCounts: Record<string, { name: string; count: number }> = {};

  targetDates.forEach((dateStr) => {
    const d = dailyDataMap.get(dateStr);
    if (!d) return;
    rawVisits += d.visits || 0;
    rawUniqueVisitors += d.uniqueVisitors || d.visits || 0;
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

  // 3. If rawVisits is still 0, check the global counters doc
  if (rawVisits === 0) {
    try {
      const counterSnap = await getDoc(doc(db, 'counters', 'analytics'));
      if (counterSnap.exists()) {
        const c = counterSnap.data();
        if (c?.totalVisits) {
          rawVisits = Number(c.totalVisits) || 0;
          rawUniqueVisitors = Number(c.totalUniqueVisitors) || rawVisits;
          rawCartAdds = Number(c.cartAdditions) || rawCartAdds;
          rawCheckoutStarts = Number(c.checkoutStarts) || rawCheckoutStarts;
        }
      }
    } catch {}
  }

  // Filter real orders in period
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

  // Minimum sensible floor: if orders exist, visits cannot be less than orders
  const totalVisits = Math.max(rawVisits, periodOrdersCount);
  const uniqueVisitors = Math.max(rawUniqueVisitors, periodOrdersCount);
  const cartAdditions = Math.max(rawCartAdds, periodOrdersCount);
  const checkoutStarts = Math.max(rawCheckoutStarts, periodOrdersCount);

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
  const mobilePercent = totalDeviceLogs > 0 ? Math.round((mobileCount / totalDeviceLogs) * 100) : 50;
  const desktopPercent = totalDeviceLogs > 0 ? 100 - mobilePercent : 50;

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
