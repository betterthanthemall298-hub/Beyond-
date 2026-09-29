import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp, normalizeGovName, cairoDateTimeString } from '../api/index';
import { FakeDb, FakeAuth, increment } from './fake';

const db = new FakeDb();
const auth = new FakeAuth();
const pushes: any[] = [];
const posts: Array<{ url: string; headers: any; body: string }> = [];
let pushFail: Record<string, number> = {};
const deps: any = {
  db, auth, increment,
  sendPush: async (sub: any, payload: string) => {
    if (pushFail[sub.endpoint]) { const e: any = new Error('gone'); e.statusCode = pushFail[sub.endpoint]; throw e; }
    pushes.push({ sub, payload: JSON.parse(payload) });
  },
  httpPost: async (url: string, headers: any, body: string) => { posts.push({ url, headers, body }); },
  vapidPublicKey: () => 'PUBKEY',
  now: () => new Date()
};

const app = createApp(() => deps);
const server = http.createServer(app).listen(0);
const port = (server.address() as any).port;
const base = `http://127.0.0.1:${port}`;

let ipCounter = 0;
async function call(method: string, path: string, body?: any, opts: { token?: string; ip?: string } = {}) {
  const headers: any = { 'Content-Type': 'application/json', 'x-forwarded-for': opts.ip || `10.0.0.${++ipCounter}` };
  if (opts.token) headers.Authorization = 'Bearer ' + opts.token;
  const r = await fetch(base + path, { method, headers, body: body && method !== 'GET' ? JSON.stringify(body) : undefined });
  let json: any = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, json };
}

function seed() {
  db.data.clear();
  db.seed('products', 'p1', { id: 'p1', name: 'هودي كلاسيك', subtitle: 'أسود', price: 890, images: ['data:image/jpeg;base64,AAA', 'https://img.example/p1.jpg'], colors: [{ name: 'أسود', hex: '#111111' }], sizesStock: { M: 5, L: 3, XL: 0, '2XL': 2 } });
  db.seed('products', 'p2', { id: 'p2', name: 'هودي زيب', subtitle: 'رمادي', price: 1000, images: ['https://img.example/p2.jpg'], colors: [], sizesStock: { M: 10, L: 10, XL: 10, '2XL': 10 } });
  db.seed('settings', 'shipping', { list: [{ name: 'القاهرة', cost: 45 }, { name: 'الدقهلية (المنصورة)', cost: 55 }, { name: 'أسوان', cost: 85 }] });
  db.seed('settings', 'general', { brandLogo: 'https://cdn.example/logo.png' });
  db.seed('coupons', 'c1', { id: 'c1', code: 'SAVE10', discountPercent: 10, active: true, minOrderAmount: 0, timesUsed: 0 });
  db.seed('coupons', 'c2', { id: 'c2', code: 'P2ONLY', discountPercent: 50, active: true, minOrderAmount: 0, timesUsed: 0, targetProductId: 'p2' });
  db.seed('coupons', 'c3', { id: 'c3', code: 'BIG', discountPercent: 20, active: true, minOrderAmount: 5000, timesUsed: 0 });
  db.seed('coupons', 'c4', { id: 'c4', code: 'OFF', discountPercent: 20, active: false, minOrderAmount: 0, timesUsed: 0 });
  db.seed('orders', 'ord-old-1', { id: 'ord-old-1', orderNumber: '7', phone: '01000000000', status: 'pending', items: [], createdAt: '2026-01-01 10:00' });
  db.seed('push_subscriptions', 's1', { endpoint: 'https://push/1', keys: { p256dh: 'a', auth: 'b' } });
  db.seed('push_subscriptions', 's2', { endpoint: 'https://push/gone', keys: { p256dh: 'a', auth: 'b' } });
  db.seed('private_settings', 'notifications', { telegramBotToken: 'TOKEN123', telegramChatId: '555', pushNotificationTopic: 'my_topic' });
  pushes.length = 0; posts.length = 0; pushFail = { 'https://push/gone': 410 };
}

const validOrder = (over: any = {}) => ({
  customerName: 'أحمد محمد', phone: '01012345678', governorate: 'القاهرة', center: 'مدينة نصر', address: 'شارع التحرير عمارة 5',
  items: [{ productId: 'p1', size: 'M', quantity: 2, colorName: 'أسود', price: 1, productName: 'hacked' }],
  subtotal: 1, shippingCost: 0, discount: 999999, total: 1, ...over
});

let passed = 0;
async function t(name: string, fn: () => Promise<void>) {
  seed();
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e: any) { console.error('  ✗', name, '\n    ', e.message); process.exitCode = 1; }
}

(async () => {
  console.log('helpers');
  await t('normalizeGovName strips parentheses', async () => {
    assert.equal(normalizeGovName('الدقهلية (المنصورة)'), 'الدقهلية');
    assert.equal(normalizeGovName('جنوب سيناء (شرم الشيخ)'), 'جنوب سيناء');
    assert.equal(normalizeGovName('القاهرة'), 'القاهرة');
  });
  await t('cairo time format', async () => {
    assert.match(cairoDateTimeString(new Date('2026-07-01T10:30:00Z')), /^2026-07-01 1[34]:30$/);
  });

  console.log('basic + auth');
  await t('health', async () => { const r = await call('GET', '/api/health'); assert.equal(r.status, 200); assert.deepEqual(r.json, { status: 'ok', service: 'beyond-store' }); });
  await t('unknown api route 404', async () => { assert.equal((await call('GET', '/api/nope')).status, 404); });
  await t('vapid key public', async () => { assert.equal((await call('GET', '/api/push/vapid-public-key')).json.publicKey, 'PUBKEY'); });
  for (const [m, p] of [['GET', '/api/admin/users'], ['GET', '/api/admin/me'], ['POST', '/api/admin/create-user'], ['POST', '/api/admin/delete-user'], ['POST', '/api/push/test'], ['POST', '/api/push/subscribe'], ['GET', '/api/push/status'], ['POST', '/api/orders/status'], ['GET', '/api/analytics/daily']] as const) {
    await t(`${p} rejects anonymous / non-admin`, async () => {
      assert.equal((await call(m, p, {})).status, 401);
      assert.equal((await call(m, p, {}, { token: 'bad' })).status, 401);
      assert.equal((await call(m, p, {}, { token: 'user-token' })).status, 403);
    });
  }

  console.log('create order');
  await t('happy path recomputes everything server-side', async () => {
    const r = await call('POST', '/api/orders/create', validOrder());
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const o = r.json.order;
    assert.equal(o.orderNumber, '8', 'counter must start after the highest existing number');
    assert.equal(o.subtotal, 1780);
    assert.equal(o.discount, 0);
    assert.equal(o.shippingCost, 45);
    assert.equal(o.total, 1825);
    assert.equal(o.items[0].price, 890);
    assert.equal(o.items[0].productName, 'هودي كلاسيك');
    assert.equal(o.items[0].image, 'https://img.example/p1.jpg', 'base64 images are not copied into orders');
    assert.equal(o.items[0].colorHex, '#111111');
    assert.equal(o.status, 'pending');
    assert.equal(db.get('products', 'p1').sizesStock.M, 3);
    assert.equal(db.get('counters', 'orders').currentNumber, 8);
    assert.ok(db.get('orders', o.id));
  });
  await t('order numbers are sequential', async () => {
    const a = await call('POST', '/api/orders/create', validOrder());
    const b = await call('POST', '/api/orders/create', validOrder({ phone: '01111111111' }));
    assert.equal(a.json.order.orderNumber, '8'); assert.equal(b.json.order.orderNumber, '9');
  });
  await t('legacy governorate name resolves', async () => {
    const r = await call('POST', '/api/orders/create', validOrder({ governorate: 'الدقهلية' }));
    assert.equal(r.status, 201); assert.equal(r.json.order.shippingCost, 55); assert.equal(r.json.order.governorate, 'الدقهلية');
    const r2 = await call('POST', '/api/orders/create', validOrder({ governorate: 'الدقهلية (المنصورة)', phone: '01122222222' }));
    assert.equal(r2.status, 201); assert.equal(r2.json.order.governorate, 'الدقهلية');
  });
  await t('rejects over-stock and leaves stock untouched', async () => {
    const r = await call('POST', '/api/orders/create', validOrder({ items: [{ productId: 'p1', size: 'L', quantity: 4 }] }));
    assert.equal(r.status, 409);
    assert.equal(db.get('products', 'p1').sizesStock.L, 3);
    assert.equal(db.get('counters', 'orders')?.currentNumber ?? 7, 7);
  });
  await t('coming-soon product cannot be ordered even if it has stock', async () => {
    db.seed('products', 'p9', { id: 'p9', name: 'جديد', price: 500, images: [], colors: [], comingSoon: true, sizesStock: { M: 5, L: 5, XL: 5, '2XL': 5 } });
    const r = await call('POST', '/api/orders/create', validOrder({ items: [{ productId: 'p9', size: 'M', quantity: 1 }] }));
    assert.equal(r.status, 409); assert.equal(db.get('products', 'p9').sizesStock.M, 5);
  });
  await t('rejects sold-out size', async () => {
    assert.equal((await call('POST', '/api/orders/create', validOrder({ items: [{ productId: 'p1', size: 'XL', quantity: 1 }] }))).status, 409);
  });
  await t('same product+size across lines is summed for stock check', async () => {
    const r = await call('POST', '/api/orders/create', validOrder({ items: [{ productId: 'p1', size: 'L', quantity: 2 }, { productId: 'p1', size: 'L', quantity: 2 }] }));
    assert.equal(r.status, 409);
  });
  await t('validation errors', async () => {
    const cases: any[] = [
      [{ phone: '123' }, 400], [{ customerName: '' }, 400], [{ address: 'abc' }, 400], [{ governorate: 'المريخ' }, 400], [{ items: [] }, 400],
      [{ items: [{ productId: 'nope', size: 'M', quantity: 1 }] }, 400], [{ items: [{ productId: 'p1', size: 'XXL', quantity: 1 }] }, 400],
      [{ items: [{ productId: 'p1', size: 'M', quantity: 0 }] }, 400], [{ items: [{ productId: 'p1', size: 'M', quantity: 1.5 }] }, 400],
      [{ items: [{ productId: 'p1', size: 'M', quantity: 99 }] }, 400], [{ alternatePhone: '12' }, 400], [{ notes: 'x'.repeat(501) }, 400],
      [{ items: Array(31).fill({ productId: 'p2', size: 'M', quantity: 1 }) }, 400]
    ];
    for (const [over, status] of cases) assert.equal((await call('POST', '/api/orders/create', validOrder(over))).status, status, JSON.stringify(over).slice(0, 80));
    assert.equal(db.get('products', 'p1').sizesStock.M, 5);
  });
  await t('coupon: percent on whole cart', async () => {
    const r = await call('POST', '/api/orders/create', validOrder({ couponCode: 'save10' }));
    assert.equal(r.status, 201); assert.equal(r.json.order.discount, 178); assert.equal(r.json.order.total, 1780 - 178 + 45);
    assert.equal(db.get('coupons', 'c1').timesUsed, 1);
  });
  await t('coupon: product-specific only discounts that product', async () => {
    const r = await call('POST', '/api/orders/create', validOrder({ couponCode: 'P2ONLY', items: [{ productId: 'p1', size: 'M', quantity: 1 }, { productId: 'p2', size: 'M', quantity: 1 }] }));
    assert.equal(r.status, 201); assert.equal(r.json.order.discount, 500); assert.equal(r.json.order.subtotal, 1890);
  });
  await t('coupon: product-specific rejected when product not in cart', async () => {
    assert.equal((await call('POST', '/api/orders/create', validOrder({ couponCode: 'P2ONLY' }))).status, 400);
    assert.equal(db.get('products', 'p1').sizesStock.M, 5);
  });
  await t('coupon: min order, inactive, unknown', async () => {
    assert.equal((await call('POST', '/api/orders/create', validOrder({ couponCode: 'BIG' }))).status, 400);
    assert.equal((await call('POST', '/api/orders/create', validOrder({ couponCode: 'OFF' }))).status, 400);
    assert.equal((await call('POST', '/api/orders/create', validOrder({ couponCode: 'NOPE' }))).status, 400);
  });
  await t('client cannot fake a discount without a coupon', async () => {
    const r = await call('POST', '/api/orders/create', validOrder({ discount: 500 }));
    assert.equal(r.json.order.discount, 0);
  });
  await t('idempotent retry with same id does not duplicate or double-deduct', async () => {
    const body = validOrder({ id: 'ord-1700000000000-abcde' });
    const a = await call('POST', '/api/orders/create', body);
    const b = await call('POST', '/api/orders/create', body);
    assert.equal(a.status, 201); assert.equal(b.status, 201);
    assert.equal(a.json.order.orderNumber, b.json.order.orderNumber);
    assert.equal(db.get('products', 'p1').sizesStock.M, 3);
    assert.equal(pushes.length, 1, 'duplicate must not notify twice');
  });
  await t('survives transaction contention (retries)', async () => {
    db.failNextTx = 2;
    const r = await call('POST', '/api/orders/create', validOrder());
    assert.equal(r.status, 201, JSON.stringify(r.json)); assert.equal(db.get('products', 'p1').sizesStock.M, 3);
  });
  await t('parallel orders for the last unit: exactly one wins', async () => {
    db.seed('products', 'p3', { id: 'p3', name: 'x', price: 100, images: [], colors: [], sizesStock: { M: 1, L: 0, XL: 0, '2XL': 0 } });
    // FakeDb transactions are synchronous per callback, so this checks logic not Firestore locking
    const rs = [] as any[];
    for (let i = 0; i < 3; i++) rs.push(await call('POST', '/api/orders/create', validOrder({ phone: '0101234567' + i, items: [{ productId: 'p3', size: 'M', quantity: 1 }] })));
    assert.deepEqual(rs.map((r) => r.status).sort(), [201, 409, 409]);
    assert.equal(db.get('products', 'p3').sizesStock.M, 0);
  });
  await t('rate limit per IP (20/10min) and per phone (6/h)', async () => {
    for (let i = 0; i < 6; i++) assert.equal((await call('POST', '/api/orders/create', validOrder({ items: [{ productId: 'p2', size: 'M', quantity: 1 }] }), { ip: '9.9.9.1' })).status, 201);
    assert.equal((await call('POST', '/api/orders/create', validOrder(), { ip: '9.9.9.2' })).status, 429, 'phone limit');
    for (let i = 0; i < 20; i++) await call('POST', '/api/orders/create', { items: [] }, { ip: '7.7.7.7' });
    assert.equal((await call('POST', '/api/orders/create', { items: [] }, { ip: '7.7.7.7' })).status, 429, 'ip limit');
  });

  await t('coupon validate endpoint exposes only what the cart needs', async () => {
    const ok = await call('POST', '/api/coupons/validate', { code: ' save10 ' });
    assert.equal(ok.status, 200); assert.deepEqual(ok.json.coupon, { id: 'c1', code: 'SAVE10', discountPercent: 10, minOrderAmount: 0 });
    assert.equal((await call('POST', '/api/coupons/validate', { code: 'OFF' })).status, 404);
    assert.equal((await call('POST', '/api/coupons/validate', { code: 'NOPE' })).status, 404);
    assert.equal((await call('POST', '/api/coupons/validate', { code: '' })).status, 400);
    const p2 = await call('POST', '/api/coupons/validate', { code: 'P2ONLY' }); assert.equal(p2.json.coupon.targetProductId, 'p2');
    for (let i = 0; i < 30; i++) await call('POST', '/api/coupons/validate', { code: 'X' }, { ip: '5.5.5.5' });
    assert.equal((await call('POST', '/api/coupons/validate', { code: 'X' }, { ip: '5.5.5.5' })).status, 429);
  });
  await t('duplicate push subscription docs for one device notify once', async () => {
    db.seed('push_subscriptions', 's1b', { endpoint: 'https://push/1', keys: { p256dh: 'a', auth: 'b' } });
    await call('POST', '/api/orders/create', validOrder());
    assert.equal(pushes.length, 1);
  });

  console.log('notifications');
  await t('new order notifies alerts, web push, telegram, ntfy; drops dead subscriptions', async () => {
    const r = await call('POST', '/api/orders/create', validOrder());
    assert.equal(r.status, 201);
    assert.equal(pushes.length, 1); assert.equal(pushes[0].payload.orderNumber, '8'); assert.equal(pushes[0].payload.icon, 'https://cdn.example/logo.png');
    assert.equal(db.get('push_subscriptions', 's2'), undefined, '410 subscription removed');
    assert.ok(posts.find((p) => p.url.includes('api.telegram.org/botTOKEN123')));
    assert.ok(!posts.find((p) => p.url.includes('api.telegram.org'))!.body.includes('parse_mode'));
    const ntfy = posts.find((p) => p.url === 'https://ntfy.sh/my_topic')!; assert.ok(ntfy); assert.match(ntfy.headers.Title, /^=\?UTF-8\?B\?/);
    assert.equal(db.col('admin_alerts').size, 1);
  });
  await t('no secrets configured => no external posts, still 201', async () => {
    db.data.delete('private_settings');
    const r = await call('POST', '/api/orders/create', validOrder());
    assert.equal(r.status, 201); assert.equal(posts.length, 0);
  });
  await t('push test endpoint (admin)', async () => {
    const r = await call('POST', '/api/push/test', {}, { token: 'owner-token' });
    assert.equal(r.status, 200); assert.equal(r.json.sentCount, 1); assert.equal(r.json.totalSubscribers, 2);
  });
  await t('subscribe / unsubscribe / status', async () => {
    const sub = { subscription: { endpoint: 'https://push/new', keys: { p256dh: 'k', auth: 'a' } }, userAgent: 'UA' };
    assert.equal((await call('POST', '/api/push/subscribe', { subscription: { endpoint: 'x' } }, { token: 'owner-token' })).status, 400);
    const r = await call('POST', '/api/push/subscribe', sub, { token: 'owner-token' }); assert.equal(r.json.activeCount, 3);
    assert.equal((await call('GET', '/api/push/status', undefined, { token: 'claim-token' })).json.subscriptionsCount, 3);
    assert.equal((await call('POST', '/api/push/unsubscribe', { endpoint: 'https://push/new' }, { token: 'owner-token' })).json.activeCount, 2);
  });

  console.log('tracking + cancel');
  await t('track by phone hides PII and lists newest first', async () => {
    await call('POST', '/api/orders/create', validOrder());
    await call('POST', '/api/orders/create', validOrder({ items: [{ productId: 'p2', size: 'M', quantity: 1 }] }));
    const r = await call('POST', '/api/orders/track', { query: '01012345678' });
    assert.equal(r.json.orders.length, 2); assert.equal(r.json.orders[0].orderNumber, '9');
    for (const o of r.json.orders) for (const f of ['customerName', 'address', 'notes', 'alternatePhone']) assert.equal(o[f], undefined, f);
  });
  await t('track by order number hides phone too', async () => {
    await call('POST', '/api/orders/create', validOrder());
    const r = await call('POST', '/api/orders/track', { query: '#8' });
    assert.equal(r.json.orders.length, 1); assert.equal(r.json.orders[0].phone, undefined); assert.equal(r.json.orders[0].customerName, undefined);
  });
  await t('track: empty / garbage / unknown', async () => {
    assert.deepEqual((await call('POST', '/api/orders/track', { query: '' })).json.orders, []);
    assert.deepEqual((await call('POST', '/api/orders/track', { query: "'; drop" })).json.orders, []);
    assert.deepEqual((await call('POST', '/api/orders/track', { query: '999999' })).json.orders, []);
  });
  await t('cancel: wrong phone, ok (restores stock), twice, shipped', async () => {
    const o = (await call('POST', '/api/orders/create', validOrder())).json.order;
    assert.equal(db.get('products', 'p1').sizesStock.M, 3);
    assert.equal((await call('POST', '/api/orders/cancel', { orderId: o.id, phone: '01099999999' })).status, 403);
    assert.equal((await call('POST', '/api/orders/cancel', { orderId: o.id, phone: '0101 2345678' })).status, 200);
    assert.equal(db.get('products', 'p1').sizesStock.M, 5);
    assert.equal(db.get('orders', o.id).status, 'cancelled');
    assert.equal((await call('POST', '/api/orders/cancel', { orderId: o.id, phone: '01012345678' })).status, 400);
    assert.equal(db.get('products', 'p1').sizesStock.M, 5, 'no double restore');
    const o2 = (await call('POST', '/api/orders/create', validOrder())).json.order;
    await call('POST', '/api/orders/status', { orderId: o2.id, status: 'shipped' }, { token: 'owner-token' });
    assert.equal((await call('POST', '/api/orders/cancel', { orderId: o2.id, phone: '01012345678' })).status, 400);
    assert.equal((await call('POST', '/api/orders/cancel', { orderId: 'ord-missing', phone: '01012345678' })).status, 404);
  });
  await t('admin status change: cancel restores, reactivate deducts, insufficient -> 409', async () => {
    const o = (await call('POST', '/api/orders/create', validOrder())).json.order; // M: 5 -> 3
    assert.equal((await call('POST', '/api/orders/status', { orderId: o.id, status: 'processing' }, { token: 'claim-token' })).status, 200);
    assert.equal(db.get('products', 'p1').sizesStock.M, 3);
    await call('POST', '/api/orders/status', { orderId: o.id, status: 'cancelled' }, { token: 'owner-token' });
    assert.equal(db.get('products', 'p1').sizesStock.M, 5);
    await call('POST', '/api/orders/status', { orderId: o.id, status: 'pending' }, { token: 'owner-token' });
    assert.equal(db.get('products', 'p1').sizesStock.M, 3);
    await call('POST', '/api/orders/status', { orderId: o.id, status: 'cancelled' }, { token: 'owner-token' });
    db.get('products', 'p1').sizesStock.M = 1;
    assert.equal((await call('POST', '/api/orders/status', { orderId: o.id, status: 'pending' }, { token: 'owner-token' })).status, 409);
    assert.equal(db.get('orders', o.id).status, 'cancelled');
    assert.equal((await call('POST', '/api/orders/status', { orderId: o.id, status: 'bogus' }, { token: 'owner-token' })).status, 400);
  });

  console.log('analytics');
  await t('track events are sharded and summed back per day', async () => {
    for (let i = 0; i < 25; i++) await call('POST', '/api/analytics/track', { type: 'visit', isMobile: i % 5 !== 0 });
    for (let i = 0; i < 7; i++) await call('POST', '/api/analytics/track', { type: 'cart_add', productId: 'p1', productName: 'هودي' });
    await call('POST', '/api/analytics/track', { type: 'checkout_start' });
    assert.equal((await call('POST', '/api/analytics/track', { type: 'evil' })).status, 400);
    db.seed('analytics_daily', '2026-01-01', { date: '2026-01-01', visits: 3 });
    assert.ok(db.col('analytics_shards').size > 1 && db.col('analytics_shards').size <= 10);
    const r = await call('GET', '/api/analytics/daily?days=3', undefined, { token: 'owner-token' });
    assert.equal(r.status, 200); assert.equal(r.json.days.length, 1);
    const d = r.json.days[0];
    assert.equal(d.visits, 25); assert.equal(d.uniqueVisitors, 25); assert.equal(d.cartAdditions, 7); assert.equal(d.checkoutStarts, 1);
    assert.equal(d.deviceTypes.mobile, 20); assert.equal(d.deviceTypes.desktop, 5);
    assert.equal(d.topProducts.p1.count, 7); assert.equal(d.topProducts.p1.name, 'هودي');
    assert.equal(Object.values(d.hourlyVisits).reduce((a: any, b: any) => a + b, 0), 25);
    assert.match(d.date, /^\d{4}-\d{2}-\d{2}$/);
  });

  console.log('admin accounts');
  await t('admin/me confirms access for admins only', async () => {
    const r = await call('GET', '/api/admin/me', undefined, { token: 'owner-token' });
    assert.equal(r.status, 200); assert.equal(r.json.isOwner, true);
    assert.equal((await call('GET', '/api/admin/me', undefined, { token: 'claim-token' })).json.isOwner, false);
  });
  await t('list shows admins only, flags owner', async () => {
    const r = await call('GET', '/api/admin/users', undefined, { token: 'owner-token' });
    assert.deepEqual(r.json.users.map((u: any) => u.email), ['vdbbdv1234567889@gmail.com']); assert.equal(r.json.users[0].isOwner, true);
  });
  await t('create grants claim; duplicate rejected; delete owner blocked', async () => {
    const r = await call('POST', '/api/admin/create-user', { email: 'New@X.com', password: '123456', displayName: 'N' }, { token: 'owner-token' });
    assert.equal(r.status, 201); assert.equal(auth.users.find((u) => u.email === 'new@x.com').customClaims.admin, true);
    assert.equal((await call('POST', '/api/admin/create-user', { email: 'new@x.com', password: '123456' }, { token: 'owner-token' })).status, 400);
    assert.equal((await call('POST', '/api/admin/create-user', { email: 'a@b.com', password: '123' }, { token: 'owner-token' })).status, 400);
    assert.equal((await call('POST', '/api/admin/delete-user', { uid: 'u-owner' }, { token: 'claim-token' })).status, 403);
    assert.equal((await call('POST', '/api/admin/delete-user', { uid: r.json.user.uid }, { token: 'owner-token' })).status, 200);
  });

  console.log('robustness');
  await t('malformed JSON body returns 400 not a crash', async () => {
    const r = await fetch(base + '/api/orders/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
    assert.equal(r.status, 400);
  });
  await t('oversized body rejected', async () => {
    const r = await fetch(base + '/api/orders/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: 'x'.repeat(200000) }) });
    assert.ok([400, 413].includes(r.status));
  });
  await t('no service account => 503, health still ok', async () => {
    const broken = createApp(() => { const e: any = new Error('x'); e.status = 503; throw e; });
    const s2 = http.createServer(broken).listen(0); const p2 = (s2.address() as any).port;
    const a = await fetch(`http://127.0.0.1:${p2}/api/orders/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const b = await fetch(`http://127.0.0.1:${p2}/api/health`);
    s2.close(); assert.equal(a.status, 503); assert.equal(b.status, 200);
  });

  server.close();
  console.log(`\n${passed} passed${process.exitCode ? ' — WITH FAILURES' : ''}`);
})();
