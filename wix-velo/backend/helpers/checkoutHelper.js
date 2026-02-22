import { checkout } from 'wix-ecom-backend';

export async function createDashboardCheckout(orderData) {
  const customLineItems = orderData.products.map(p => ({
    productName: { original: p.name },
    quantity: p.quantity,
    price: String(orderData.isPaid ? 0 : p.price),
  }));

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
    customLineItems,
    checkoutInfo,
  };

  if (orderData.couponCode) {
    checkoutOptions.couponCode = orderData.couponCode;
  }

  // @ts-ignore - channelType is a valid string enum value accepted by the API
  const checkoutObj = await checkout.createCheckout(checkoutOptions);
  const urlResult = await checkout.getCheckoutUrl(checkoutObj._id);

  return {
    checkoutId: checkoutObj._id,
    checkoutUrl: urlResult.checkoutUrl,
  };
}
