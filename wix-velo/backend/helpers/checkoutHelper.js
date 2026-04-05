import { checkout } from 'wix-ecom-backend';

/** מזהה אפליקציית Wix Stores לקטלוג (מתועד ב-createCheckout) */
const WIX_STORES_CATALOG_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

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

  if (orderData.contactId) {
    checkoutInfo.buyerInfo = {
      contactId: orderData.contactId,
    };
  }

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

  const checkoutObj = await checkout.createCheckout(checkoutOptions);
  const urlResult = await checkout.getCheckoutUrl(checkoutObj._id);

  return {
    checkoutId: checkoutObj._id,
    checkoutUrl: urlResult.checkoutUrl,
  };
}
