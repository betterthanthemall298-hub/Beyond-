import { HoodieSize, Product } from '../types';

/**
 * Returns available stock for a specific size of a given color,
 * falling back to the product's general sizesStock if color-specific stock is not defined.
 */
export function getColorSizeStock(product: Product | undefined, colorName?: string, size?: HoodieSize): number {
  if (!product) return 0;
  if (colorName && product.colors && product.colors.length > 0) {
    const matchedColor = product.colors.find((c) => c.name === colorName);
    if (matchedColor?.sizesStock && size && matchedColor.sizesStock[size] !== undefined) {
      return Math.max(0, Number(matchedColor.sizesStock[size]) || 0);
    }
  }
  if (size && product.sizesStock && product.sizesStock[size] !== undefined) {
    return Math.max(0, Number(product.sizesStock[size]) || 0);
  }
  return 0;
}

export function getTotalStock(product: Product | undefined): number {
  if (!product) return 0;
  const hasColorStock = product.colors?.some((c) => c.sizesStock && Object.keys(c.sizesStock).length > 0);
  if (hasColorStock && product.colors) {
    return product.colors.reduce((total, c) => {
      if (!c.sizesStock) return total;
      return total + Object.values(c.sizesStock).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
    }, 0);
  }
  return Object.values(product?.sizesStock || {}).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
}

/** المنتج يظهر في قسم "قريباً" لو الأدمن اختار كده، أو لو كل المقاسات خلصت. */
export function isComingSoon(product: Product): boolean {
  return product?.comingSoon === true || getTotalStock(product) <= 0;
}
