import wixData from 'wix-data';
import { checkout } from 'wix-pricing-plans-backend';

export async function assignPricingPlansToMember(memberId, orderProducts) {
  const productIds = orderProducts.map(p => p.id || p.productId);

  const mappings = await wixData.query('ProductPlanMapping')
    .hasSome('productId', productIds)
    .find({ suppressAuth: true });

  if (mappings.items.length === 0) {
    console.log('[VELO-BE] No pricing plan mappings found for products');
    return;
  }

  for (const mapping of mappings.items) {
    try {
      await checkout.createOfflineOrder(
        mapping.pricingPlanId,
        memberId,
        {
          startDate: new Date(),
          paid: true,
          suppressAuth: true,
        }
      );

      console.log(`[VELO-BE] Pricing plan ${mapping.pricingPlanId} assigned to member ${memberId}`);
    } catch (err) {
      console.error(`[VELO-BE] Failed to assign plan ${mapping.pricingPlanId}:`, err.message);
    }
  }
}
