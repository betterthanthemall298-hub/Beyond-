import { Product } from '../types';

export function getTotalStock(product: Product): number {
  return Object.values(product?.sizesStock || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

/** المنتج يظهر في قسم "قريباً" لو الأدمن اختار كده، أو لو كل المقاسات خلصت. */
export function isComingSoon(product: Product): boolean {
  return product?.comingSoon === true || getTotalStock(product) <= 0;
}
