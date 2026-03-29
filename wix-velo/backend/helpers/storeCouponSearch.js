import { coupons } from 'wix-marketing.v2';
import { elevate } from 'wix-auth';

const elevatedQueryCoupons = elevate(coupons.queryCoupons);

/**
 * ממפה אובייקט קופון מ-API לשדות בשימוש הדאשבורד.
 * scope לחנות: specification.scope.namespace או scope.namespace (תלוי גרסה).
 */
export function mapStoreCoupon(c) {
    const spec = c.specification || {};
    const scopeNs = spec.scope?.namespace || c.scope?.namespace || '';
    return {
        id: c.id || c._id,
        code: spec.code || '',
        name: spec.name || '',
        scopeNamespace: scopeNs,
        type: spec.type || '',
        moneyOffAmount: spec.moneyOffAmount,
        percentOffRate: spec.percentOffRate,
        active: spec.active !== false,
    };
}

function isStoresCoupon(mapped) {
    return mapped.active && String(mapped.scopeNamespace).toLowerCase() === 'stores';
}

/**
 * מחזיר קופונים פעילים לחנות (stores), עם סינון טקסט בשם/קוד (בזיכרון).
 */
export async function searchStoreCoupons(search) {
    let items;
    try {
        const raw = await elevatedQueryCoupons({
            filter: {
                'specification.active': true,
                'scope.namespace': 'stores',
            },
            paging: { limit: 100 },
        });
        items = raw.coupons ?? raw.items ?? [];
    } catch (e1) {
        console.warn('[VELO-BE] searchStoreCoupons stores filter failed, falling back:', e1.message || e1);
        const raw = await elevatedQueryCoupons({
            filter: { 'specification.active': true },
            paging: { limit: 100 },
        });
        items = raw.coupons ?? raw.items ?? [];
    }

    let mapped = items.map(mapStoreCoupon).filter(isStoresCoupon);

    const q = (search || '').trim().toLowerCase();
    if (q.length >= 1) {
        mapped = mapped.filter((c) =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.code || '').toLowerCase().includes(q)
        );
    }

    return mapped.slice(0, 50);
}

/**
 * מאמת שקופון קיים, פעיל, לחנות, ותואם לקוד — לפני שימוש בצ'קאאוט.
 */
export async function validateExistingStoreCoupon(couponId, expectedCode) {
    let raw;
    try {
        raw = await elevatedQueryCoupons({
            filter: { id: couponId },
            paging: { limit: 1 },
        });
    } catch (e1) {
        try {
            raw = await elevatedQueryCoupons({
                filter: { _id: couponId },
                paging: { limit: 1 },
            });
        } catch (e2) {
            console.error('[VELO-BE] validateExistingStoreCoupon query failed:', e2.message || e2);
            return null;
        }
    }

    const items = raw.coupons ?? raw.items ?? [];
    const c = items[0];
    if (!c) return null;

    const m = mapStoreCoupon(c);
    if (!isStoresCoupon(m)) return null;
    if (expectedCode && m.code !== expectedCode) return null;
    return m;
}
