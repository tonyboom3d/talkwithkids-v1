import { checkout } from 'wix-ecom-backend';

/** מזהה אפליקציית Wix Stores לקטלוג (מתועד ב-createCheckout) */
const WIX_STORES_CATALOG_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

/**
 * מבנה טיוטת checkout לאחסון ב-CMS.
 * נוצר בעת יצירת ההזמנה; ה-checkout האמיתי נוצר רק בלחיצת הלקוח.
 */
export function buildCheckoutSessionData({ products, orderChangeNotes, couponCode, lockCouponCode }) {
  return {
    version: 1,
    draft: {
      products: products || [],
      orderChangeNotes: orderChangeNotes || '',
      couponCode: couponCode || null,
      lockCouponCode: !!lockCouponCode,
    },
    history: [],
    latest: null,
  };
}

/**
 * מוסיף checkout חדש להיסטוריה ומעדכן latest.
 * מחזיר את ה-checkoutSessionData המעודכן (אובייקט, לא JSON).
 */
export function appendCheckoutToHistory(sessionData, checkoutId, checkoutUrl, source) {
  const entry = {
    checkoutId,
    checkoutUrl,
    createdAt: new Date().toISOString(),
    source: source || 'public_click',
  };
  const history = Array.isArray(sessionData.history) ? [...sessionData.history, entry] : [entry];
  return {
    ...sessionData,
    history,
    latest: entry,
  };
}

export async function createDashboardCheckout(orderData) {
  const lineItems = (orderData.products || []).map((p) => {
    const catalogItemId = p.id || p.productId;
    if (!catalogItemId) {
      throw new Error('חסר מזהה מוצר (id) — נדרש מוצר מהקטלוג');
    }
    return {
      quantity: Math.max(1, Number(p.quantity) || 1),
      catalogReference: {
        appId: WIX_STORES_CATALOG_APP_ID,
        catalogItemId: String(catalogItemId),
      },
    };
  });

  if (lineItems.length === 0) {
    throw new Error('אין פריטים לחיוב');
  }

  const checkoutInfo = {};

  if (orderData.orderChangeNotes) {
    checkoutInfo.customFields = [{
      title: 'הערות לשינוי הזמנה',
      value: orderData.orderChangeNotes,
    }];
  }

  const checkoutOptions = {
    channelType: 'OTHER_PLATFORM',
    lineItems,
    checkoutInfo,
  };

  if (orderData.couponCode) {
    checkoutOptions.couponCode = orderData.couponCode;
  }
  if (orderData.lockCouponCode != null) {
    checkoutOptions.lockCouponCode = !!orderData.lockCouponCode;
  }

  const checkoutObj = await checkout.createCheckout(checkoutOptions);
  const urlResult = await checkout.getCheckoutUrl(checkoutObj._id);

  return {
    checkoutId: checkoutObj._id,
    checkoutUrl: urlResult.checkoutUrl,
  };
}
