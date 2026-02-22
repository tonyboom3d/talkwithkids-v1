import { handleOrderCompleted } from 'backend/dashboardApi.jsw';

export async function wix_ecom_onOrderApproved(event) {
  const order = event.entity;
  console.log('[VELO-BE] onOrderApproved fired, checkoutId:', order?.checkoutId);

  try {
    await handleOrderCompleted(order);
  } catch (err) {
    console.error('[VELO-BE] handleOrderCompleted failed:', err);
  }
}
