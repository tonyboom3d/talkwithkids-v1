import { coupons } from 'wix-marketing-backend';

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
