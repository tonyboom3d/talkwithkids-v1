import wixData from 'wix-data';
import { coupons } from 'wix-marketing-backend';

const CMS_COUPONS_COLLECTION = 'Marketing/Coupons';

/**
 * חישוב הנחה מקופון חנות (Wix specification.type / moneyOffAmount / percentOffRate).
 * לוגיקה מזוהה בפרונטאנד ב־`src/pages/Dashboard.jsx` (לא ניתן לייבא קובץ זה מה-Vite).
 */
export function computeDiscountForSubtotal(subtotal, coupon) {
  if (!coupon || subtotal <= 0) {
    return { discountAmount: 0, discountedTotal: subtotal };
  }
  const t = coupon.type;
  if (t === 'PercentOff' || (coupon.percentOffRate != null && coupon.percentOffRate > 0)) {
    const pct = Math.min(100, Math.max(0, Number(coupon.percentOffRate) || 0));
    const discountAmount = subtotal * (pct / 100);
    return { discountAmount, discountedTotal: subtotal - discountAmount };
  }
  if (t === 'MoneyOff' || (coupon.moneyOffAmount != null && coupon.moneyOffAmount > 0)) {
    const off = Math.min(subtotal, Math.max(0, Number(coupon.moneyOffAmount) || 0));
    return { discountAmount: off, discountedTotal: subtotal - off };
  }
  return { discountAmount: 0, discountedTotal: subtotal };
}

export async function createOrderCoupon(type, value) {
  const code = 'TWK-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  const spec = {
    name: `Dashboard Coupon ${code}`,
    code,
    startTime: new Date(),
    usageLimit: 1,
    scope: { namespace: 'stores' },
  };

  if (type === 'percent') {
    spec.percentOffRate = value;
  } else {
    spec.moneyOffAmount = value;
  }

  const result = await coupons.createCoupon(spec);
  console.log('[VELO-BE] Coupon created:', code);

  return {
    couponId: result.id,
    code,
  };
}

// ─── CMS Marketing/Coupons (wixData) — חיפוש ובחירת קופון קיים ───

function discountTypeLabel(type) {
  if (type === 'MoneyOff') return 'הנחה בסכום קבוע';
  if (type === 'PercentOff') return 'הנחה באחוזים';
  return type || 'קופון';
}

function discountValueText(item) {
  const t = item.type;
  if (t === 'MoneyOff' && item.moneyOffAmount != null && item.moneyOffAmount !== '') {
    return `₪${Number(item.moneyOffAmount).toLocaleString()}`;
  }
  if (t === 'PercentOff' && item.percentOffRate != null && item.percentOffRate !== '') {
    return `${Number(item.percentOffRate)}%`;
  }
  return '—';
}

function buildRulesSummary(item) {
  const parts = [];
  if (item.expired === true) {
    parts.push('פג תוקף');
  }
  if (item.expirationTime) {
    try {
      const d = new Date(item.expirationTime);
      if (!isNaN(d.getTime())) {
        parts.push(`תפוגה: ${d.toLocaleDateString('he-IL')}`);
      }
    } catch (_) { /* ignore */ }
  }
  if (item.limitedToOneItem === true) {
    parts.push('מוגבל לפריט אחד');
  }
  if (item.minimumSubtotal != null && item.minimumSubtotal !== '') {
    parts.push(`מינימום סל: ₪${Number(item.minimumSubtotal).toLocaleString()}`);
  }
  if (item.usageLimit != null && item.usageLimit !== '') {
    parts.push(`מכסת שימושים: ${item.usageLimit}`);
  }
  if (item.limitPerCustomer != null && item.limitPerCustomer !== '') {
    parts.push(`מקס׳ ללקוח: ${item.limitPerCustomer}`);
  }
  if (item.appliesToSubscriptions === true) {
    parts.push('כולל מנויים');
  }
  return parts.length ? parts.join(' · ') : null;
}

export function mapStoreCouponFromCms(item) {
  const scopeNs = item.scope?.namespace || '';
  return {
    id: item._id,
    code: item.code || '',
    name: item.name || '',
    scopeNamespace: scopeNs,
    type: item.type || '',
    moneyOffAmount: item.moneyOffAmount,
    percentOffRate: item.percentOffRate,
    active: item.active === true,
    expired: item.expired === true,
    expirationTime: item.expirationTime,
    limitedToOneItem: item.limitedToOneItem,
    limitPerCustomer: item.limitPerCustomer,
    usageLimit: item.usageLimit,
    numberOfUsages: item.numberOfUsages,
    minimumSubtotal: item.minimumSubtotal,
    appliesToSubscriptions: item.appliesToSubscriptions,
    startTime: item.startTime,
    discountTypeLabel: discountTypeLabel(item.type),
    discountValueText: discountValueText(item),
    rulesSummary: buildRulesSummary(item),
  };
}

export async function searchStoreCoupons(search) {
  let items;
  try {
    const results = await wixData.query(CMS_COUPONS_COLLECTION)
      .eq('active', true)
      .eq('scope.namespace', 'stores')
      .limit(100)
      .find({ suppressAuth: true });
    items = results.items || [];
  } catch (err) {
    console.warn('[VELO-BE] searchStoreCoupons: nested scope filter failed, using memory filter:', err.message || err);
    const results = await wixData.query(CMS_COUPONS_COLLECTION)
      .eq('active', true)
      .limit(100)
      .find({ suppressAuth: true });
    items = (results.items || []).filter((row) => row.scope?.namespace === 'stores');
  }

  let mapped = items
    .filter((row) => row.expired !== true)
    .map(mapStoreCouponFromCms);

  const q = (search || '').trim().toLowerCase();
  if (q.length >= 1) {
    mapped = mapped.filter((c) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.code || '').toLowerCase().includes(q)
    );
  }

  return mapped.slice(0, 50);
}

export async function validateExistingStoreCoupon(couponId, expectedCode) {
  try {
    const item = await wixData.get(CMS_COUPONS_COLLECTION, couponId, { suppressAuth: true });
    if (!item) return null;
    if (item.active !== true) return null;
    if (item.scope?.namespace !== 'stores') return null;
    if (item.expired === true) return null;
    if (expectedCode && item.code !== expectedCode) return null;
    return mapStoreCouponFromCms(item);
  } catch (err) {
    console.error('[VELO-BE] validateExistingStoreCoupon:', err);
    return null;
  }
}
