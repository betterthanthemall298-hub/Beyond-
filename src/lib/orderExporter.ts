import { Order, OrderStatus } from '../types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  processing: 'جاري التجهيز والتغليف',
  shipped: 'تم التسليم لشركة الشحن',
  delivered: 'تم التوصيل بنجاح',
  cancelled: 'ملغي'
};

export const ORDER_STATUS_FILE_NAMES: Record<OrderStatus, string> = {
  pending: 'قيد_الانتظار',
  processing: 'جاري_التجهيز',
  shipped: 'تم_الشحن',
  delivered: 'تم_التوصيل',
  cancelled: 'ملغي'
};

/**
 * Exports an array of Orders to a UTF-8 CSV file compatible with Microsoft Excel and Google Sheets.
 */
export function exportOrdersToCSV(orders: Order[], customFileName?: string) {
  if (orders.length === 0) {
    alert('لا توجد طلبات لتصديرها في هذا التصنيف حالياً.');
    return;
  }

  // 1. Column Headers in Arabic
  const headers = [
    'رقم الطلب',
    'تاريخ ووقت الطلب',
    'حالة الطلب',
    'اسم العميل',
    'رقم الهاتف الأساسي',
    'رقم الهاتف البديل',
    'المحافظة',
    'المركز / المدينة',
    'العنوان بالتفصيل',
    'ملاحظات العميل',
    'محتويات وتفاصيل الهوديز المطلوبة',
    'إجمالي عدد القطع',
    'المجموع الفرعي (ج.م)',
    'كود الخصم',
    'قيمة الخصم (ج.م)',
    'تكلفة الشحن (ج.م)',
    'المبلغ الإجمالي المطلوب تحصيله (ج.م)'
  ];

  // Helper to escape cells for standard CSV
  const escapeCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [];
  rows.push(headers.map(escapeCell).join(','));

  const sortedOrders = [...orders].sort((a, b) => {
    const numA = parseInt(String(a.orderNumber || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.orderNumber || '').replace(/\D/g, ''), 10) || 0;
    if (numB !== numA) return numB - numA;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  sortedOrders.forEach((order) => {
    const orderItems = order.items || [];
    const itemsDescription = orderItems
      .map(
        (it) =>
          `${it.productName}${it.subtitle ? ` (${it.subtitle})` : ''} [مقاس: ${it.size}${it.colorName ? ` - لون: ${it.colorName}` : ''}] × ${it.quantity || 1} (${(it.price || 0) * (it.quantity || 1)} ج.م)`
      )
      .join(' | ');

    const totalQuantity = orderItems.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const statusLabel = ORDER_STATUS_LABELS[order.status] || order.status;

    const row = [
      order.orderNumber,
      order.createdAt,
      statusLabel,
      order.customerName,
      // Prefix with \t or ' so Excel does not strip leading zero from Egyptian phone numbers (01xxxxxxxxx)
      `="${order.phone}"`,
      order.alternatePhone ? `="${order.alternatePhone}"` : '',
      order.governorate,
      order.center || '',
      order.address,
      order.notes || '',
      itemsDescription,
      totalQuantity,
      order.subtotal,
      order.couponCode || 'بدون كوبون',
      order.discount || 0,
      order.shippingCost,
      order.total
    ];

    rows.push(row.map(escapeCell).join(','));
  });

  // UTF-8 BOM (\uFEFF) ensures Arabic letters display properly in Excel
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const finalFileName = customFileName || `طلبات_المتجر_الكل_${dateStr}`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${finalFileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export orders filtered by a specific status
 */
export function exportOrdersByStatus(orders: Order[], status: OrderStatus) {
  const filtered = orders.filter((o) => o.status === status);
  const statusName = ORDER_STATUS_FILE_NAMES[status] || status;
  const dateStr = new Date().toISOString().split('T')[0];
  exportOrdersToCSV(filtered, `طلبات_Beyond_${statusName}_${dateStr}`);
}
