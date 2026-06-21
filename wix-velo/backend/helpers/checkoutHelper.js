import { checkout } from 'wix-ecom-backend';
import { elevate } from 'wix-auth';

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
  const elevatedCreateCheckout = elevate(checkout.createCheckout);

  const lineItems = (orderData.products || []).map((p) => {
    const catalogItemId = p.id || p.productId;
    if (!catalogItemId) {
      throw new Error('חסר מזהה מוצר (id) — נדרש מוצר מהקטלוג');
    }

    const lineItem = {
      quantity: Math.max(1, Number(p.quantity) || 1),
      catalogReference: {
        appId: WIX_STORES_CATALOG_APP_ID,
        catalogItemId: String(catalogItemId),
      },
    };

    const effectivePrice = Number(p.price);
    const catalogPrice = Number(p.catalogPrice);
    if (Number.isFinite(effectivePrice) && effectivePrice >= 0) {
      const fullPriceBase =
        Number.isFinite(catalogPrice) && catalogPrice > 0
          ? catalogPrice
          : effectivePrice;
      lineItem.catalogOverrideFields = {
        fullPrice: fullPriceBase.toFixed(2),
        price: effectivePrice.toFixed(2),
      };
    }

    return lineItem;
  });

  if (lineItems.length === 0) {
    throw new Error('אין פריטים לחיוב');
  }

  const checkoutInfo = {};

  const notesBase = (orderData.orderChangeNotes || '').trim();
  if (notesBase) {
    checkoutInfo.customFields = [{
      title: 'הערות לשינוי הזמנה',
      value: notesBase,
    }];
  }

  const checkoutOptions = {
    channelType: 'WEB',
    lineItems,
    checkoutInfo,
  };

  if (orderData.couponCode) {
    checkoutOptions.couponCode = orderData.couponCode;
  }
  if (orderData.lockCouponCode != null) {
    checkoutOptions.lockCouponCode = !!orderData.lockCouponCode;
  }

  const checkoutObj = await elevatedCreateCheckout(checkoutOptions);
  const urlResult = await checkout.getCheckoutUrl(checkoutObj._id, {});

  return {
    checkoutId: checkoutObj._id,
    checkoutUrl: urlResult.checkoutUrl,
  };
}
