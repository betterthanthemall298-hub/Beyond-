/**
 * Utilities for Egyptian Governorates and Phone Numbers
 */

export const EGYPTIAN_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'الغربية',
  'المنوفية',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'كفر الشيخ',
  'البحيرة',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'مطروح',
  'الوادي الجديد',
  'شمال سيناء',
  'جنوب سيناء'
] as const;

/**
 * Cleans any governorate name to retain ONLY the pure governorate name,
 * removing any attached city, district, or area (e.g. "الدقهلية (المنصورة)" -> "الدقهلية").
 */
export function cleanGovernorateName(rawName: string): string {
  if (!rawName) return '';
  let cleaned = String(rawName).trim();

  // Remove parentheses and their contents, e.g. "الدقهلية (المنصورة)" -> "الدقهلية"
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '').trim();

  // Remove trailing dashes or slashes with area, e.g. "الجيزة - الدقي" -> "الجيزة"
  cleaned = cleaned.replace(/\s*[-/].*$/g, '').trim();

  // Normalize variants
  if (cleaned === 'مرسى مطروح') {
    cleaned = 'مطروح';
  }

  // Exact match to known Egyptian governorate if starts with or contains
  for (const gov of EGYPTIAN_GOVERNORATES) {
    if (cleaned === gov) return gov;
  }

  // Fuzzy match for common prefixes
  for (const gov of EGYPTIAN_GOVERNORATES) {
    if (cleaned.startsWith(gov) || cleaned.endsWith(gov)) {
      return gov;
    }
  }

  return cleaned;
}

/**
 * Normalizes an Egyptian phone number:
 * - Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits to standard Western ASCII digits (0-9)
 * - Removes spaces, dashes, dots, and parentheses
 * - Normalizes +20 or 0020 or 20 prefixes to standard local 01XXXXXXXXX format
 */
export function normalizeEgyptianPhone(phone: string): string {
  if (!phone) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  let normalized = String(phone).trim();
  for (let i = 0; i < 10; i++) {
    normalized = normalized.split(arabicDigits[i]).join(String(i));
    normalized = normalized.split(persianDigits[i]).join(String(i));
  }

  // Strip all non-digit characters except leading plus if any
  normalized = normalized.replace(/[\s\-\(\)\.]+/g, '');

  if (normalized.startsWith('+20')) {
    normalized = '0' + normalized.substring(3);
  } else if (normalized.startsWith('0020')) {
    normalized = '0' + normalized.substring(4);
  } else if (normalized.startsWith('20') && normalized.length === 12) {
    normalized = '0' + normalized.substring(2);
  }

  return normalized;
}

/**
 * Validates if the phone number is a valid Egyptian mobile number (11 digits starting with 010, 011, 012, or 015)
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const normalized = normalizeEgyptianPhone(phone);
  return /^01[0125][0-9]{8}$/.test(normalized);
}
