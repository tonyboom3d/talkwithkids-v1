/**
 * חישוב הנחה מקופון חנות (Wix specification.type / moneyOffAmount / percentOffRate).
 */
export function computeDiscountForSubtotal(subtotal, coupon) {
  if (!coupon || subtotal <= 0) {
    return { discountAmount: 0, discountedTotal: subtotal };
  }
  const t = coupon.type;
  if (t === "PercentOff" || (coupon.percentOffRate != null && coupon.percentOffRate > 0)) {
    const pct = Math.min(100, Math.max(0, Number(coupon.percentOffRate) || 0));
    const discountAmount = subtotal * (pct / 100);
    return { discountAmount, discountedTotal: subtotal - discountAmount };
  }
  if (t === "MoneyOff" || (coupon.moneyOffAmount != null && coupon.moneyOffAmount > 0)) {
    const off = Math.min(subtotal, Math.max(0, Number(coupon.moneyOffAmount) || 0));
    return { discountAmount: off, discountedTotal: subtotal - off };
  }
  return { discountAmount: 0, discountedTotal: subtotal };
}
