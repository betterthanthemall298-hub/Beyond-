const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'إبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر'
];

export function getOrderTimestamp(createdAt?: string, createdAtMs?: number): number {
  if (typeof createdAtMs === 'number' && createdAtMs > 0) return createdAtMs;
  if (!createdAt) return 0;
  const parsed = new Date(createdAt).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

export function formatOrderDateTime(
  createdAt?: string,
  createdAtMs?: number
): {
  relative: string;
  timeOnly: string;
  dateOnly: string;
  full: string;
} {
  const time = getOrderTimestamp(createdAt, createdAtMs);
  if (!time) {
    return {
      relative: createdAt || 'غير محدد',
      timeOnly: '',
      dateOnly: createdAt || '',
      full: createdAt || ''
    };
  }

  const d = new Date(time);
  const now = Date.now();
  const diffMinutes = Math.floor((now - time) / (60 * 1000));

  // Time in 12-hour format: e.g. 03:45 م
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const timeOnly = `${hour12}:${minutes} ${period}`;

  // Date in Arabic: e.g. 30 سبتمبر 2026
  const dateOnly = `${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const full = `${dateOnly} - ${timeOnly}`;

  const isToday = d.toDateString() === new Date(now).toDateString();
  const yesterday = new Date(now - 86400000);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  let relative = full;
  if (diffMinutes < 1) {
    relative = 'الآن (منذ لحظات)';
  } else if (diffMinutes < 60) {
    relative = `منذ ${diffMinutes} دقيقة`;
  } else if (isToday) {
    relative = `اليوم، ${timeOnly}`;
  } else if (isYesterday) {
    relative = `أمس، ${timeOnly}`;
  } else {
    relative = `${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]} (${timeOnly})`;
  }

  return { relative, timeOnly, dateOnly, full };
}
