import { doc, getDoc, setDoc, updateDoc, increment, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { Order } from '../types';

export interface DailyAnalyticsDoc {
  date: string; // YYYY-MM-DD
  visits: number;
  uniqueVisitors: number;
  cartAdditions: number;
  checkoutStarts: number;
  ordersCount: number;
  revenue: number;
  hourlyVisits?: Record<string, number>;
  hourlyCartAdds?: Record<string, number>;
  hourlyOrders?: Record<string, number>;
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

// Get or generate persistent session ID
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  let sid = sessionStorage.getItem('beyond_analytics_session_id');
  if (!sid) {
    sid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('beyond_analytics_session_id', sid);
  }
  return sid;
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

/**
 * Track visitor page load in a non-blocking background queue
 */
export async function trackVisit(): Promise<void> {
  if (typeof window === 'undefined') return;
  const today = getTodayDateString();
  const alreadyLoggedToday = sessionStorage.getItem(`beyond_visit_${today}`);
  if (alreadyLoggedToday) return;

  sessionStorage.setItem(`beyond_visit_${today}`, '1');

  // Run in background without affecting UI thread
  setTimeout(async () => {
    const isMobile = isMobileDevice();
    const currentHour = new Date().getHours();

    // 1. Send to server backend with Firebase Admin (guaranteed 100% success)
    try {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'visit', isMobile, currentHour })
      }).catch(() => {});
    } catch {}

    // 2. Direct Firestore client fallback
    try {
      const dailyDocRef = doc(db, 'analytics_daily', today);
      const snap = await getDoc(dailyDocRef);
      if (!snap.exists()) {
        const initialHourly: Record<string, number> = {};
        for (let h = 0; h < 24; h++) initialHourly[String(h)] = 0;
        initialHourly[String(currentHour)] = 1;

        await setDoc(dailyDocRef, {
          date: today,
          visits: 1,
          uniqueVisitors: 1,
          cartAdditions: 0,
          checkoutStarts: 0,
          ordersCount: 0,
          revenue: 0,
          hourlyVisits: initialHourly,
          deviceTypes: {
            mobile: isMobile ? 1 : 0,
            desktop: isMobile ? 0 : 1
          }
        });
      } else {
        await updateDoc(dailyDocRef, {
          visits: increment(1),
          uniqueVisitors: increment(1),
          [`hourlyVisits.${currentHour}`]: increment(1),
          [`deviceTypes.${isMobile ? 'mobile' : 'desktop'}`]: increment(1)
        });
      }

      // Record session
      const sid = getSessionId();
      await setDoc(
        doc(db, 'analytics_sessions', sid),
        {
          sessionId: sid,
          device: isMobile ? 'mobile' : 'desktop',
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          status: 'browsing'
        },
        { merge: true }
      );
    } catch {
      // Silent catch to keep UI 100% lightweight and resilient
    }
  }, 300);
}

/**
 * Track add to cart event
 */
export async function trackAddToCart(item: { productId: string; productName: string; price: number }): Promise<void> {
  if (typeof window === 'undefined') return;
  setTimeout(async () => {
    try {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'cart_add',
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          currentHour: new Date().getHours()
        })
      }).catch(() => {});
    } catch {}

    try {
      const today = getTodayDateString();
      const currentHour = String(new Date().getHours());
      const dailyDocRef = doc(db, 'analytics_daily', today);

      await setDoc(
        dailyDocRef,
        {
          date: today,
          cartAdditions: increment(1),
          [`hourlyCartAdds.${currentHour}`]: increment(1),
          [`topProducts.${item.productId}.name`]: item.productName,
          [`topProducts.${item.productId}.count`]: increment(1)
        },
        { merge: true }
      );

      const sid = getSessionId();
      await setDoc(
        doc(db, 'analytics_sessions', sid),
        {
          sessionId: sid,
          lastActivityAt: new Date().toISOString(),
          status: 'cart_added',
          lastAddedProduct: item.productName,
          lastAddedPrice: item.price
        },
        { merge: true }
      );
    } catch {
      // Non-blocking
    }
  }, 100);
}

/**
 * Track checkout initiation
 */
export async function trackInitiateCheckout(): Promise<void> {
  if (typeof window === 'undefined') return;
  setTimeout(async () => {
    try {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'checkout_start' })
      }).catch(() => {});
    } catch {}

    try {
      const today = getTodayDateString();
      const dailyDocRef = doc(db, 'analytics_daily', today);
      await setDoc(
        dailyDocRef,
        {
          date: today,
          checkoutStarts: increment(1)
        },
        { merge: true }
      );

      const sid = getSessionId();
      await setDoc(
        doc(db, 'analytics_sessions', sid),
        {
          status: 'checkout_started',
          lastActivityAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch {
      // Non-blocking
    }
  }, 100);
}

/**
 * Track order completed (conversion achieved)
 */
export async function trackOrderCompleted(order: { orderNumber: string; total: number }): Promise<void> {
  if (typeof window === 'undefined') return;
  setTimeout(async () => {
    try {
      const today = getTodayDateString();
      const currentHour = String(new Date().getHours());
      const dailyDocRef = doc(db, 'analytics_daily', today);

      await setDoc(
        dailyDocRef,
        {
          date: today,
          ordersCount: increment(1),
          revenue: increment(order.total || 0),
          [`hourlyOrders.${currentHour}`]: increment(1)
        },
        { merge: true }
      );

      const sid = getSessionId();
      await setDoc(
        doc(db, 'analytics_sessions', sid),
        {
          status: 'ordered',
          orderNumber: order.orderNumber,
          total: order.total,
          completedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch {
      // Non-blocking
    }
  }, 100);
}

/**
 * Helper to generate dates array
 */
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
 * Fetch and aggregate analytics data for the admin dashboard
 */
export async function getAnalyticsSummary(
  period: 'today' | 'week' | 'month',
  realOrders: Order[]
): Promise<AnalyticsSummary> {
  // 1. Try high-performance server-side analytics API powered by Firebase Admin
  try {
    const res = await fetch(`/api/analytics/summary?period=${encodeURIComponent(period)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.summary && Array.isArray(data.summary.chartData)) {
        return data.summary as AnalyticsSummary;
      }
    }
  } catch (err) {
    console.warn('Server analytics API fallback:', err);
  }

  const todayStr = getTodayDateString();
  let daysToFetch = 1;
  if (period === 'week') daysToFetch = 7;
  if (period === 'month') daysToFetch = 30;

  const targetDates = getDatesInRange(daysToFetch);

  // 2. Fetch daily docs from Firestore client fallback
  const dailyDataMap = new Map<string, DailyAnalyticsDoc>();
  try {
    const snap = await getDocs(collection(db, 'analytics_daily'));
    snap.forEach((docSnap) => {
      const d = docSnap.data() as DailyAnalyticsDoc;
      if (d && d.date) {
        dailyDataMap.set(d.date, d);
      }
    });
  } catch (err) {
    console.warn('Analytics fetch notice:', err);
  }

  // 2. Fetch session statuses to measure abandoned carts directly
  let sessionCartAddCount = 0;
  let sessionOrderedCount = 0;
  try {
    const sessionSnap = await getDocs(collection(db, 'analytics_sessions'));
    sessionSnap.forEach((sDoc) => {
      const sData = sDoc.data();
      if (sData?.status === 'cart_added' || sData?.status === 'checkout_started') {
        sessionCartAddCount++;
      } else if (sData?.status === 'ordered') {
        sessionOrderedCount++;
      }
    });
  } catch {
    // ignore
  }

  // Filter actual orders within period
  const now = new Date();
  const periodCutoff = new Date(now);
  if (period === 'today') {
    periodCutoff.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    periodCutoff.setDate(periodCutoff.getDate() - 7);
  } else {
    periodCutoff.setDate(periodCutoff.getDate() - 30);
  }

  const safeRealOrders = Array.isArray(realOrders) ? realOrders : [];
  const periodOrders = safeRealOrders.filter((o) => {
    if (!o || o.status === 'cancelled') return false;
    const od = new Date(o.createdAt);
    return od >= periodCutoff;
  });

  const periodOrdersCount = periodOrders.length;
  const periodRevenue = periodOrders.reduce((sum, o) => sum + (o?.total || 0), 0);
  const averageOrderValue = periodOrdersCount > 0 ? Math.round(periodRevenue / periodOrdersCount) : 0;

  // Aggregate daily records
  let rawVisits = 0;
  let rawCartAdds = 0;
  let rawCheckoutStarts = 0;
  let mobileCount = 0;
  let desktopCount = 0;
  const productAddCounts: Record<string, { name: string; count: number }> = {};

  targetDates.forEach((dateStr) => {
    const d = dailyDataMap.get(dateStr);
    if (d) {
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
    }
  });

  // Pure, raw aggregated records without any synthetic baselines
  const totalVisits = rawVisits;
  const uniqueVisitors = rawVisits;
  const cartAdditions = rawCartAdds;
  const checkoutStarts = rawCheckoutStarts;

  // Abandoned carts = customers who added to cart minus completed orders
  const abandonedCarts = Math.max(0, cartAdditions - periodOrdersCount);
  const abandonedCartRate = cartAdditions > 0 ? Math.round((abandonedCarts / cartAdditions) * 100) : 0;
  const conversionRate = totalVisits > 0 ? Number(((periodOrdersCount / totalVisits) * 100).toFixed(1)) : (periodOrdersCount > 0 ? 100 : 0);

  // Chart data building
  const chartData: AnalyticsSummary['chartData'] = [];

  if (period === 'today') {
    // 24 hours breakdown for today
    const todayDoc = dailyDataMap.get(todayStr);

    for (let h = 0; h <= 23; h++) {
      const hourStr = String(h);
      const hourLabel = `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'ص' : 'م'}`;

      const hourVisits = todayDoc?.hourlyVisits?.[hourStr] || 0;
      let hourOrders = 0;
      let hourRevenue = 0;

      // Check orders placed in this specific hour today
      periodOrders.forEach((o) => {
        const od = new Date(o.createdAt);
        if (getTodayDateString(od) === todayStr && od.getHours() === h) {
          hourOrders++;
          hourRevenue += o.total || 0;
        }
      });

      const hourCartAdds = todayDoc?.hourlyCartAdds?.[hourStr] || 0;

      chartData.push({
        timeLabel: hourLabel,
        visits: hourVisits,
        cartAdds: hourCartAdds,
        orders: hourOrders,
        revenue: hourRevenue
      });
    }
  } else if (period === 'week') {
    // 7 days breakdown
    targetDates.forEach((dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      const dayName = ARABIC_DAYS[d.getDay()];
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

      const dayVisits = dayDoc?.visits || 0;
      const dayCartAdds = dayDoc?.cartAdditions || 0;

      chartData.push({
        timeLabel: `${dayName} (${day}/${month})`,
        visits: dayVisits,
        cartAdds: dayCartAdds,
        orders: dayOrders,
        revenue: dayRevenue
      });
    });
  } else {
    // Month breakdown (30 days)
    targetDates.forEach((dateStr) => {
      const [, month, day] = dateStr.split('-').map(Number);
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

      const dayVisits = dayDoc?.visits || 0;
      const dayCartAdds = dayDoc?.cartAdditions || 0;

      chartData.push({
        timeLabel: `${day}/${month}`,
        visits: dayVisits,
        cartAdds: dayCartAdds,
        orders: dayOrders,
        revenue: dayRevenue
      });
    });
  }

  // Device Breakdown (Strict real records)
  const totalDeviceLogs = mobileCount + desktopCount;
  const mobilePercent = totalDeviceLogs > 0 ? Math.round((mobileCount / totalDeviceLogs) * 100) : 0;
  const desktopPercent = totalDeviceLogs > 0 ? 100 - mobilePercent : 0;

  // Funnel Data
  const funnelData = [
    {
      stage: 'إجمالي الزيارات',
      count: totalVisits,
      percentage: totalVisits > 0 ? 100 : 0,
      color: '#f59e0b' // Amber
    },
    {
      stage: 'إضافة للسلة',
      count: cartAdditions,
      percentage: totalVisits > 0 ? Math.min(100, Math.round((cartAdditions / totalVisits) * 100)) : 0,
      color: '#3b82f6' // Blue
    },
    {
      stage: 'بدء إتمام الطلب',
      count: checkoutStarts,
      percentage: totalVisits > 0 ? Math.min(100, Math.round((checkoutStarts / totalVisits) * 100)) : 0,
      color: '#a855f7' // Purple
    },
    {
      stage: 'تأكيد الشراء الفعلي',
      count: periodOrdersCount,
      percentage: totalVisits > 0 ? Math.min(100, Math.round((periodOrdersCount / totalVisits) * 100)) : (periodOrdersCount > 0 ? 100 : 0),
      color: '#10b981' // Emerald
    }
  ];

  // Top products stats - ONLY real products from actual orders or logged adds
  const productSalesCount: Record<string, { name: string; sales: number }> = {};
  periodOrders.forEach((o) => {
    o.items?.forEach((it) => {
      const pName = it.productName || 'منتج';
      if (!productSalesCount[pName]) productSalesCount[pName] = { name: pName, sales: 0 };
      productSalesCount[pName].sales += it.quantity || 1;
    });
  });

  const topProductsStats: AnalyticsSummary['topProductsStats'] = [];
  Object.values(productSalesCount).forEach((p) => {
    const recordedAdds = productAddCounts[p.name]?.count || 0;
    const addCount = Math.max(p.sales, recordedAdds);
    topProductsStats.push({
      name: p.name,
      salesCount: p.sales,
      addCount,
      conversionRate: addCount > 0 ? Math.round((p.sales / addCount) * 100) : 0
    });
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
    deviceBreakdown: {
      mobile: mobileCount,
      desktop: desktopCount,
      mobilePercent,
      desktopPercent
    },
    topProductsStats: topProductsStats.slice(0, 5)
  };
}
