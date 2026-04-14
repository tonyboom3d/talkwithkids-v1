/**
 * סכום לתצוגה אחרי הנחת קופון (totalPrice נשמר כסכום סל לפני הנחה).
 */
export function computeDisplayTotalAfterCoupon(subtotal, couponDetails) {
  const s = Math.max(0, Number(subtotal) || 0);
  if (!couponDetails || s <= 0) return s;
  if (couponDetails.discountedTotal != null && Number.isFinite(Number(couponDetails.discountedTotal))) {
    return Math.max(0, Number(couponDetails.discountedTotal));
  }
  if (couponDetails.source === "auto_paid") {
    const actualPaidAmount = Number(couponDetails.actualPaidAmount);
    if (Number.isFinite(actualPaidAmount) && actualPaidAmount > 0) {
      return Math.max(0, actualPaidAmount);
    }
    return 0;
  }
  if (couponDetails.source === "create" || couponDetails.source === "partial_paid") {
    if (couponDetails.type === "percent") {
      const pct = Math.min(100, Math.max(0, Number(couponDetails.value) || 0));
      return s * (1 - pct / 100);
    }
    if (couponDetails.type === "fixed") {
      const off = Math.min(s, Math.max(0, Number(couponDetails.value) || 0));
      return Math.max(0, s - off);
    }
  }
  return s;
}
